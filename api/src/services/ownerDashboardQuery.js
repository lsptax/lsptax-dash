import { Prisma } from "@prisma/client";
import prisma from "../../prisma/prismaClient.js";
import { roundMoney } from "../utils/invoiceYearlyData.js";
import { intersectDateRange, taxYearsFromFilters, countiesFromFilters } from "../utils/reportFilters.js";

const UNPAID_CLIENT_LIMIT = 25;

function safeDate(column) {
  const trimmed = Prisma.sql`btrim(${Prisma.raw(column)})`;
  return Prisma.sql`(
    CASE
      WHEN ${trimmed} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        AND split_part(${trimmed}, '-', 1)::int BETWEEN 1 AND 9999
        AND split_part(${trimmed}, '-', 2)::int BETWEEN 1 AND 12
      THEN
        CASE
          WHEN split_part(${trimmed}, '-', 3)::int BETWEEN 1 AND EXTRACT(
            DAY FROM (
              make_date(split_part(${trimmed}, '-', 1)::int, split_part(${trimmed}, '-', 2)::int, 1)
              + INTERVAL '1 month - 1 day'
            )
          )::int
          THEN make_date(
            split_part(${trimmed}, '-', 1)::int,
            split_part(${trimmed}, '-', 2)::int,
            split_part(${trimmed}, '-', 3)::int
          )
        END
      WHEN ${trimmed} ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$'
        AND split_part(${trimmed}, '/', 3)::int BETWEEN 1 AND 9999
        AND split_part(${trimmed}, '/', 1)::int BETWEEN 1 AND 12
      THEN
        CASE
          WHEN split_part(${trimmed}, '/', 2)::int BETWEEN 1 AND EXTRACT(
            DAY FROM (
              make_date(split_part(${trimmed}, '/', 3)::int, split_part(${trimmed}, '/', 1)::int, 1)
              + INTERVAL '1 month - 1 day'
            )
          )::int
          THEN make_date(
            split_part(${trimmed}, '/', 3)::int,
            split_part(${trimmed}, '/', 1)::int,
            split_part(${trimmed}, '/', 2)::int
          )
        END
    END
  )`;
}

function cents(value) {
  return roundMoney(Number(value) || 0);
}

function dateRange(column, range) {
  if (!range) return Prisma.sql`FALSE`;
  return Prisma.sql`${Prisma.raw(column)} BETWEEN ${range.start}::date AND ${range.end}::date`;
}

function entityWhere(filters, invoiceAlias = "i", propertyAlias = "p", clientAlias = "c") {
  const invoice = Prisma.raw(invoiceAlias);
  const property = Prisma.raw(propertyAlias);
  const client = Prisma.raw(clientAlias);
  const parts = [
    Prisma.sql`NOT ${invoice}."isArchived"`,
    Prisma.sql`NOT ${property}."isArchived"`,
    Prisma.sql`NOT ${client}."isArchived"`,
  ];
  const taxYears = taxYearsFromFilters(filters);
  if (taxYears.length) parts.push(Prisma.sql`${invoice}.year IN (${Prisma.join(taxYears)})`);
  if (filters.clientId != null) parts.push(Prisma.sql`${property}."clientId" = ${filters.clientId}`);
  if (filters.propertyId != null) parts.push(Prisma.sql`${invoice}."propertyId" = ${filters.propertyId}`);
  const counties = countiesFromFilters(filters).map((county) => county.toLowerCase());
  if (counties.length) {
    parts.push(Prisma.sql`lower(btrim(${property}."cadCounty")) IN (${Prisma.join(counties)})`);
  }
  return Prisma.join(parts, " AND ");
}

function propertyWhere(filters) {
  const parts = [Prisma.sql`NOT p."isArchived"`, Prisma.sql`NOT c."isArchived"`];
  if (filters.clientId != null) parts.push(Prisma.sql`p."clientId" = ${filters.clientId}`);
  if (filters.propertyId != null) parts.push(Prisma.sql`p.id = ${filters.propertyId}`);
  const counties = countiesFromFilters(filters).map((county) => county.toLowerCase());
  if (counties.length) {
    parts.push(Prisma.sql`lower(btrim(p."cadCounty")) IN (${Prisma.join(counties)})`);
  }
  return Prisma.join(parts, " AND ");
}

/**
 * One round trip. Sums happen in Postgres so the API does not download every invoice.
 * Date text is parsed with the same calendar rules as parseInvoiceCalendarDate.
 */
export async function queryOwnerDashboard(filters, scope) {
  const { windows, scopedConstraint, actualAsOf, pastDueAsOf, periodRange, months, monthSelection } = scope;
  const windowsUsed = {
    thisMonth: intersectDateRange(windows.thisMonth, scopedConstraint),
    lastMonth: intersectDateRange(windows.lastMonth, scopedConstraint),
    ytd: intersectDateRange(windows.ytd, scopedConstraint),
    calendarYear: intersectDateRange(windows.calendarYear, scopedConstraint),
  };
  const cashflowRange = scopedConstraint
    ? Prisma.sql`AND billed_on BETWEEN ${scopedConstraint.start}::date AND ${scopedConstraint.end}::date`
    : Prisma.empty;
  const collectedRange = scopedConstraint
    ? Prisma.sql`AND paid_on BETWEEN ${scopedConstraint.start}::date AND ${scopedConstraint.end}::date`
    : Prisma.empty;
  const arWhere = scopedConstraint
    ? Prisma.sql`billed_on BETWEEN ${scopedConstraint.start}::date AND ${scopedConstraint.end}::date`
    : Prisma.sql`TRUE`;
  const countyWhere = monthSelection
    ? Prisma.sql`to_char(billed_on, 'YYYY-MM') IN (${Prisma.join(months)})`
    : scopedConstraint
      ? Prisma.sql`billed_on BETWEEN ${scopedConstraint.start}::date AND ${scopedConstraint.end}::date`
      : Prisma.sql`TRUE`;

  const rows = await prisma.$queryRaw`
    WITH scoped AS (
      SELECT
        i."propertyId" AS property_id,
        i."isPaid" AS is_paid,
        i."invoiceAmount" AS amount,
        i."appraisedReduction" AS reduction,
        i."taxableSavings" AS savings,
        NULLIF(btrim(p."cadCounty"), '') AS county,
        c.id AS client_id,
        COALESCE(c."clientName", '') AS client_name,
        COALESCE(c."clientNumber", '') AS client_number,
        ${safeDate(`i."invoiceDate"`)} AS billed_on,
        ${safeDate(`i."paidDate"`)} AS paid_on,
        ${safeDate(`i."dueDate"`)} AS due_on
      FROM "Invoice" i
      JOIN "Property" p ON p.id = i."propertyId"
      JOIN "Client" c ON c.id = p."clientId"
      WHERE ${entityWhere(filters)}
    ),
    billed_months AS (
      SELECT
        date_trunc('month', billed_on)::date AS month_start,
        round(COALESCE(sum(amount), 0)::numeric, 2) AS billed,
        round(COALESCE(sum(amount) FILTER (WHERE NOT is_paid), 0)::numeric, 2) AS outstanding
      FROM scoped
      WHERE billed_on IS NOT NULL
        AND billed_on <= ${actualAsOf}::date
        ${cashflowRange}
      GROUP BY 1
    ),
    collected_months AS (
      SELECT
        date_trunc('month', paid_on)::date AS month_start,
        round(COALESCE(sum(amount), 0)::numeric, 2) AS collected
      FROM scoped
      WHERE is_paid
        AND paid_on IS NOT NULL
        AND paid_on <= ${actualAsOf}::date
        ${collectedRange}
      GROUP BY 1
    ),
    month_rows AS (
      SELECT
        EXTRACT(YEAR FROM COALESCE(b.month_start, c.month_start))::int AS year,
        EXTRACT(MONTH FROM COALESCE(b.month_start, c.month_start))::int AS month,
        COALESCE(b.billed, 0) AS billed,
        COALESCE(c.collected, 0) AS collected,
        COALESCE(b.outstanding, 0) AS outstanding
      FROM billed_months b
      FULL OUTER JOIN collected_months c ON b.month_start = c.month_start
    ),
    ar AS (
      SELECT * FROM scoped WHERE ${arWhere}
    )
    SELECT
      (
        SELECT count(*)::int
        FROM "Property" p
        JOIN "Client" c ON c.id = p."clientId"
        WHERE ${propertyWhere(filters)}
      ) AS active_properties,
      round(COALESCE(sum(amount) FILTER (WHERE ${dateRange("billed_on", windowsUsed.thisMonth)}), 0)::numeric, 2) AS billed_this_month,
      round(COALESCE(sum(amount) FILTER (WHERE ${dateRange("billed_on", windowsUsed.lastMonth)}), 0)::numeric, 2) AS billed_last_month,
      round(COALESCE(sum(amount) FILTER (WHERE ${dateRange("billed_on", windowsUsed.ytd)}), 0)::numeric, 2) AS billed_ytd,
      round(COALESCE(sum(amount) FILTER (WHERE ${dateRange("billed_on", windowsUsed.calendarYear)}), 0)::numeric, 2) AS billed_calendar_year,
      round(COALESCE(sum(amount) FILTER (WHERE is_paid AND ${dateRange("paid_on", windowsUsed.thisMonth)}), 0)::numeric, 2) AS collected_this_month,
      round(COALESCE(sum(amount) FILTER (WHERE is_paid AND ${dateRange("paid_on", windowsUsed.lastMonth)}), 0)::numeric, 2) AS collected_last_month,
      round(COALESCE(sum(amount) FILTER (WHERE is_paid AND ${dateRange("paid_on", windowsUsed.ytd)}), 0)::numeric, 2) AS collected_ytd,
      round(COALESCE(sum(amount) FILTER (WHERE is_paid AND ${dateRange("paid_on", windowsUsed.calendarYear)}), 0)::numeric, 2) AS collected_calendar_year,
      count(DISTINCT property_id) FILTER (WHERE ${dateRange("billed_on", windowsUsed.thisMonth)})::int AS properties_invoiced_this_month,
      count(DISTINCT property_id) FILTER (WHERE ${dateRange("billed_on", windowsUsed.ytd)})::int AS properties_invoiced_ytd,
      round(COALESCE(sum(amount) FILTER (WHERE billed_on IS NOT NULL AND billed_on <= ${actualAsOf}::date ${cashflowRange}), 0)::numeric, 2) AS total_expected,
      round(COALESCE(sum(amount) FILTER (WHERE NOT is_paid AND billed_on IS NOT NULL AND billed_on <= ${actualAsOf}::date ${cashflowRange}), 0)::numeric, 2) AS still_to_collect,
      count(*) FILTER (WHERE billed_on IS NOT NULL AND billed_on <= ${actualAsOf}::date ${cashflowRange})::int AS sent_invoice_count,
      count(*) FILTER (WHERE NOT is_paid AND billed_on IS NOT NULL AND billed_on <= ${actualAsOf}::date ${cashflowRange})::int AS unpaid_sent_count,
      round(COALESCE(sum(amount) FILTER (WHERE ${dateRange("billed_on", periodRange)}), 0)::numeric, 2) AS period_billed,
      round(COALESCE(sum(amount) FILTER (WHERE is_paid AND ${dateRange("paid_on", periodRange)}), 0)::numeric, 2) AS period_collected,
      (
        SELECT round(COALESCE(sum(amount) FILTER (WHERE NOT is_paid), 0)::numeric, 2) FROM ar
      ) AS total_unpaid,
      (
        SELECT count(*) FILTER (WHERE NOT is_paid)::int FROM ar
      ) AS unpaid_invoice_count,
      (
        SELECT count(DISTINCT client_id) FILTER (WHERE NOT is_paid AND client_id IS NOT NULL)::int FROM ar
      ) AS unpaid_client_count,
      (
        SELECT count(*) FILTER (WHERE is_paid)::int FROM ar
      ) AS paid_invoice_count,
      (
        SELECT round(COALESCE(sum(amount) FILTER (
          WHERE NOT is_paid AND due_on IS NOT NULL AND due_on < ${pastDueAsOf}::date
        ), 0)::numeric, 2) FROM ar
      ) AS past_due_receivables,
      (
        SELECT count(*) FILTER (
          WHERE NOT is_paid AND due_on IS NOT NULL AND due_on < ${pastDueAsOf}::date
        )::int FROM ar
      ) AS past_due_invoice_count,
      (SELECT count(*)::int FROM ar) AS ar_invoice_count,
      (SELECT count(DISTINCT property_id)::int FROM ar) AS properties_protested,
      (SELECT round(COALESCE(sum(reduction), 0)::numeric, 2) FROM ar) AS total_value_reductions,
      (SELECT round(COALESCE(sum(savings), 0)::numeric, 2) FROM ar) AS total_tax_savings,
      (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'year', year,
          'month', month,
          'billed', billed,
          'collected', collected,
          'outstanding', outstanding
        ) ORDER BY year, month), '[]'::jsonb)
        FROM month_rows
      ) AS by_month,
      (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'county', county,
          'label', label,
          'billed', billed,
          'invoiceCount', invoice_count
        ) ORDER BY billed DESC, county), '[]'::jsonb)
        FROM (
          SELECT
            COALESCE(county, '') AS county,
            CASE WHEN county IS NULL THEN '(none)' ELSE county END AS label,
            round(COALESCE(sum(amount), 0)::numeric, 2) AS billed,
            count(*)::int AS invoice_count
          FROM scoped
          WHERE billed_on IS NOT NULL AND ${countyWhere}
          GROUP BY county
        ) county_rows
      ) AS billed_by_county,
      (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'clientId', client_id,
          'clientName', client_name,
          'clientNumber', client_number,
          'unpaidAmount', unpaid_amount,
          'unpaidInvoiceCount', unpaid_invoice_count,
          'status', CASE WHEN past_due_amount > 0 THEN 'Past due' ELSE 'Not due' END
        ) ORDER BY unpaid_amount DESC, client_id), '[]'::jsonb)
        FROM (
          SELECT
            client_id,
            max(client_name) AS client_name,
            max(client_number) AS client_number,
            round(sum(amount)::numeric, 2) AS unpaid_amount,
            count(*)::int AS unpaid_invoice_count,
            round(COALESCE(sum(amount) FILTER (
              WHERE due_on IS NOT NULL AND due_on < ${pastDueAsOf}::date
            ), 0)::numeric, 2) AS past_due_amount
          FROM ar
          WHERE NOT is_paid AND client_id IS NOT NULL
          GROUP BY client_id
          ORDER BY unpaid_amount DESC, client_id
          LIMIT ${UNPAID_CLIENT_LIMIT}
        ) client_rows
      ) AS largest_unpaid
    FROM scoped
  `;

  const row = rows[0] || {};
  const byMonth = asArray(row.by_month).map((month) => ({
    year: Number(month.year),
    month: Number(month.month),
    billed: cents(month.billed),
    collected: cents(month.collected),
    outstanding: cents(month.outstanding),
  }));
  const selectedMonths = monthSelection
    ? months.map((key) => {
        const [year, month] = key.split("-").map(Number);
        return (
          byMonth.find((item) => item.year === year && item.month === month) || {
            year,
            month,
            billed: 0,
            collected: 0,
            outstanding: 0,
          }
        );
      })
    : byMonth;
  const selectedBilled = selectedMonths.reduce((sum, item) => roundMoney(sum + item.billed), 0);
  const selectedCollected = selectedMonths.reduce((sum, item) => roundMoney(sum + item.collected), 0);
  const arCount = Number(row.ar_invoice_count) || 0;
  const totalValueReductions = cents(row.total_value_reductions);

  return {
    activeProperties: Number(row.active_properties) || 0,
    billedThisMonth: monthSelection ? selectedBilled : cents(row.billed_this_month),
    billedLastMonth: cents(row.billed_last_month),
    billedYtd: cents(row.billed_ytd),
    billedCalendarYear: cents(row.billed_calendar_year),
    collectedThisMonth: monthSelection ? selectedCollected : cents(row.collected_this_month),
    collectedLastMonth: cents(row.collected_last_month),
    collectedYtd: cents(row.collected_ytd),
    collectedCalendarYear: cents(row.collected_calendar_year),
    propertiesInvoicedThisMonth: Number(row.properties_invoiced_this_month) || 0,
    propertiesInvoicedYtd: Number(row.properties_invoiced_ytd) || 0,
    totalExpected: cents(row.total_expected),
    stillToCollect: cents(row.still_to_collect),
    sentInvoiceCount: Number(row.sent_invoice_count) || 0,
    unpaidSentCount: Number(row.unpaid_sent_count) || 0,
    periodBilled: cents(row.period_billed),
    periodCollected: cents(row.period_collected),
    totalUnpaid: cents(row.total_unpaid),
    unpaidInvoiceCount: Number(row.unpaid_invoice_count) || 0,
    unpaidClientCount: Number(row.unpaid_client_count) || 0,
    paidInvoiceCount: Number(row.paid_invoice_count) || 0,
    pastDueReceivables: cents(row.past_due_receivables),
    pastDueInvoiceCount: Number(row.past_due_invoice_count) || 0,
    propertiesProtested: Number(row.properties_protested) || 0,
    totalValueReductions,
    totalTaxSavings: cents(row.total_tax_savings),
    averageReduction: arCount ? roundMoney(totalValueReductions / arCount) : null,
    byMonth: selectedMonths,
    billedByCounty: asArray(row.billed_by_county).map((county) => ({
      county: county.county || "",
      label: county.label || "(none)",
      billed: cents(county.billed),
      invoiceCount: Number(county.invoiceCount) || 0,
    })),
    largestOutstandingClients: asArray(row.largest_unpaid).map((client) => ({
      clientId: Number(client.clientId),
      clientName: client.clientName || "",
      clientNumber: client.clientNumber || "",
      unpaidAmount: cents(client.unpaidAmount),
      unpaidInvoiceCount: Number(client.unpaidInvoiceCount) || 0,
      status: client.status === "Past due" ? "Past due" : "Not due",
    })),
  };
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return JSON.parse(value);
  return [];
}
