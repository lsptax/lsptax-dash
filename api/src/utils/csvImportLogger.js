/**
 * Structured console logging for CSV import endpoints.
 * Logs phase timings so long imports don't look hung in the terminal.
 */
export function createCsvImportLogger(kind) {
  const startedAt = Date.now();
  let phaseStartedAt = startedAt;

  const elapsed = (from = startedAt) => `${Date.now() - from}ms`;
  const prefix = `[csv:${kind}]`;

  return {
    phase(message, details = null) {
      const now = Date.now();
      const line = details
        ? `${prefix} ${message} ${JSON.stringify(details)} (+${elapsed(phaseStartedAt)}, total ${elapsed()})`
        : `${prefix} ${message} (+${elapsed(phaseStartedAt)}, total ${elapsed()})`;
      console.log(line);
      phaseStartedAt = now;
    },

    progress(message, details = null) {
      const line = details
        ? `${prefix} ${message} ${JSON.stringify(details)} (total ${elapsed()})`
        : `${prefix} ${message} (total ${elapsed()})`;
      console.log(line);
    },

    error(message, error) {
      console.error(
        `${prefix} ERROR ${message}`,
        error?.stack || error?.message || error
      );
    },

    complete(summary = null) {
      const line = summary
        ? `${prefix} done ${JSON.stringify(summary)} (total ${elapsed()})`
        : `${prefix} done (total ${elapsed()})`;
      console.log(line);
    },
  };
}
