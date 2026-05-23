/**
 * Property lifecycle — phases and steps (easy to change without DB migrations).
 * `phaseId` / `stepId` strings are stored on `Property.lifecyclePhase` / `Property.lifecycleStep`.
 *
 * To add a phase: push an object to `LIFECYCLE_PHASES`.
 * To add steps: edit that phase’s `steps` array.
 */

export const LIFECYCLE_PHASES = [
  {
    phaseId: "clientOnboardingAndPropertySetup",
    title: "Client Onboarding & Property Setup",
    steps: [
      { stepId: "prospectIdentification", label: "Prospect Identification" },
      { stepId: "propertyInformationCollection", label: "Property Information Collection" },
      { stepId: "cadDataRetrieval", label: "CAD Data Retrieval" },
      { stepId: "agreementPreparation", label: "Agreement Preparation" },
      { stepId: "agreementExecution", label: "Agreement Execution" },
    ],
  },
  {
    phaseId: "protestAuthorization",
    title: "Protest Authorization",
    steps: [
      { stepId: "authorizationPreparation", label: "Authorization Preparation" },
      { stepId: "authorizationFiling", label: "Authorization Filing" },
    ],
  },
  {
    phaseId: "valuationAndProtestInitiation",
    title: "Valuation & Protest Initiation",
    steps: [
      { stepId: "noticeValueReceipt", label: "Notice Value Receipt" },
      { stepId: "valueEntryAndRecording", label: "Value Entry & Recording" },
      { stepId: "documentFilingAndStorage", label: "Document Filing & Storage" },
      { stepId: "protestReportGeneration", label: "Protest Report Generation" },
      { stepId: "protestSubmissionToCounty", label: "Protest Submission to County (CAD)" },
    ],
  },
  {
    phaseId: "hearingManagement",
    title: "Hearing Management",
    steps: [
      { stepId: "hearingScheduleReceipt", label: "Hearing Schedule Receipt" },
      { stepId: "calendarIntegration", label: "Calendar Integration" },
      { stepId: "preHearingVerification", label: "Pre-Hearing Verification" },
    ],
  },
  {
    phaseId: "hearingOutcomeAndResolution",
    title: "Hearing Outcome & Resolution",
    steps: [
      { stepId: "hearingConducted", label: "Hearing Conducted" },
      { stepId: "outcomeSettlement", label: "Outcome: Settlement (value reduction agreed)" },
      { stepId: "outcomeBoardOrder", label: "Outcome: Board Order (final decision issued)" },
    ],
  },
  {
    phaseId: "postHearingFinancialProcess",
    title: "Post-Hearing Financial Process",
    steps: [
      { stepId: "invoicePreparation", label: "Invoice Preparation" },
      { stepId: "invoiceIssuance", label: "Invoice Issuance" },
      { stepId: "paymentCollection", label: "Payment Collection" },
    ],
  },
  {
    phaseId: "keyOperationalCharacteristics",
    title: "Key Operational Characteristics",
    steps: [
      {
        stepId: "individualAndBulkActions",
        label: "Combination of Individual + Bulk Actions (authorization/protest filing bulk; hearings per property)",
      },
      { stepId: "multiStepDependencyProcess", label: "Multi-Step Dependency Process" },
      { stepId: "highImportanceOfTimelines", label: "High Importance of Timelines" },
    ],
  },
];

export const LIFECYCLE_PHASE_IDS = new Set(
  LIFECYCLE_PHASES.map((p) => p.phaseId)
);

/** Phase where hearings are scheduled (`hearings` table). */
export const HEARING_MANAGEMENT_PHASE_ID = "hearingManagement";

export const LIFECYCLE_STEP_IDS = new Set(
  LIFECYCLE_PHASES.flatMap((p) => p.steps.map((s) => s.stepId))
);

/** If old rows had Prisma enum labels, map them to current `phaseId` strings after a one-time migration. */
export const LEGACY_LIFECYCLE_PHASE_ENUM_TO_ID = {
  CLIENT_ONBOARDING_AND_PROPERTY_SETUP: "clientOnboardingAndPropertySetup",
  PROTEST_AUTHORIZATION: "protestAuthorization",
  VALUATION_AND_PROTEST_INITIATION: "valuationAndProtestInitiation",
  HEARING_MANAGEMENT: "hearingManagement",
  HEARING_OUTCOME_AND_RESOLUTION: "hearingOutcomeAndResolution",
  POST_HEARING_FINANCIAL_PROCESS: "postHearingFinancialProcess",
  KEY_OPERATIONAL_CHARACTERISTICS: "keyOperationalCharacteristics",
};
