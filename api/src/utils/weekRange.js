/** Business timezone for hearing schedules (Texas / DFW). */
export const BUSINESS_TZ = "America/Chicago";

/** Calendar date `YYYY-MM-DD` in a timezone. */
export function calendarDateInTz(date, timeZone = BUSINESS_TZ) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

/** Weekday 0=Sun … 6=Sat in a timezone. */
function weekdayInTz(date, timeZone = BUSINESS_TZ) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? 0;
}

function parseCalendarDate(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return { y, m, d };
}

function formatCalendarDate(y, m, d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Add calendar days to a YYYY-MM-DD string (UTC date math on components). */
export function addCalendarDays(yyyyMmDd, days) {
  const { y, m, d } = parseCalendarDate(yyyyMmDd);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return formatCalendarDate(
    dt.getUTCFullYear(),
    dt.getUTCMonth() + 1,
    dt.getUTCDate()
  );
}

/** UTC offset in ms for `timeZone` at `instant` (positive = east of UTC). */
function getTimezoneOffsetMs(instant, timeZone = BUSINESS_TZ) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(instant);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === "+" ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const mins = parseInt(match[3] ?? "0", 10);
  return sign * (hours * 60 + mins) * 60 * 1000;
}

/** Local wall-clock time in `timeZone` → UTC `Date`. */
export function zonedDateTimeToUtc(yyyyMmDd, h, m, s, ms, timeZone = BUSINESS_TZ) {
  const { y, mo, d } = { y: parseCalendarDate(yyyyMmDd).y, mo: parseCalendarDate(yyyyMmDd).m, d: parseCalendarDate(yyyyMmDd).d };
  const utcGuess = Date.UTC(y, mo - 1, d, h, m, s, ms);
  const offset = getTimezoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

export function startOfDayInTz(yyyyMmDd, timeZone = BUSINESS_TZ) {
  return zonedDateTimeToUtc(yyyyMmDd, 0, 0, 0, 0, timeZone);
}

export function endOfDayInTz(yyyyMmDd, timeZone = BUSINESS_TZ) {
  return zonedDateTimeToUtc(yyyyMmDd, 23, 59, 59, 999, timeZone);
}

/**
 * Dashboard "meetings this week": today through the next 6 calendar days
 * (7-day window, inclusive) in America/Chicago.
 */
export function getMeetingsThisWeekRange(referenceDate = new Date()) {
  const today = calendarDateInTz(referenceDate);
  const endDate = addCalendarDays(today, 6);
  return {
    start: startOfDayInTz(today),
    end: endOfDayInTz(endDate),
    startDate: today,
    endDate,
  };
}

/** Monday 00:00:00.000 through Sunday 23:59:59.999 (America/Chicago). */
export function getWeekRange(referenceDate = new Date()) {
  const today = calendarDateInTz(referenceDate);
  const dow = weekdayInTz(referenceDate);
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const mondayDate = addCalendarDays(today, mondayOffset);
  const sundayDate = addCalendarDays(mondayDate, 6);
  return {
    start: startOfDayInTz(mondayDate),
    end: endOfDayInTz(sundayDate),
    startDate: mondayDate,
    endDate: sundayDate,
  };
}

/** Today 00:00:00.000 through 23:59:59.999 (America/Chicago). */
export function getDayRange(referenceDate = new Date()) {
  const today = calendarDateInTz(referenceDate);
  return {
    start: startOfDayInTz(today),
    end: endOfDayInTz(today),
    startDate: today,
    endDate: today,
  };
}
