/**
 * Client-side enforcement for DocuSign eSignature API limits (per account).
 * @see https://developers.docusign.com/docs/esign-rest-api/esign101/rules-and-limits/
 * @see https://developers.docusign.com/docs/esign-rest-api/go-live/ (production burst limits, endpoint pairing)
 *
 * Defaults: 3,000 requests/hour; burst 200 per 30s (demo) or 500 (production REST host).
 * Responses may include X-RateLimit-* / X-BurstLimit-*; we tighten behavior when present.
 */

const BURST_WINDOW_MS = 30_000;
const HOURLY_WINDOW_MS = 60 * 60 * 1000;
const HEADER_STALE_MS = 120_000;
const MAX_RATE_LIMIT_RETRIES = 6;

function defaultBurstLimit() {
  const raw = process.env.DOCUSIGN_BURST_LIMIT;
  if (raw != null && raw !== "") {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const base = (process.env.DOCUSIGN_REST_BASE_URL || "").toLowerCase();
  return base.includes("demo.docusign.net") ? 200 : 500;
}

function defaultHourlyLimit() {
  const raw = process.env.DOCUSIGN_HOURLY_LIMIT;
  if (raw != null && raw !== "") {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 3000;
}

const burstLimitCap = defaultBurstLimit();
const hourlyLimitCap = defaultHourlyLimit();

/** @type {number[]} */
let burstCallTimes = [];
/** @type {number[]} */
let hourlyCallTimes = [];

/** @type {{ burstRemaining: number|null, hourlyRemaining: number|null, resetAtMs: number|null, ingestedAt: number }} */
let serverHint = {
  burstRemaining: null,
  hourlyRemaining: null,
  resetAtMs: null,
  ingestedAt: 0,
};

/** Serialize slot acquisition (HTTP runs after slot is granted, and may overlap). */
let scheduleChain = Promise.resolve();

function prune(now) {
  burstCallTimes = burstCallTimes.filter((t) => now - t < BURST_WINDOW_MS);
  hourlyCallTimes = hourlyCallTimes.filter((t) => now - t < HOURLY_WINDOW_MS);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, Math.max(0, ms)));
}

function parseHeaderInt(headers, name) {
  if (!headers) return null;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  if (!key) return null;
  const v = parseInt(String(headers[key]), 10);
  return Number.isFinite(v) ? v : null;
}

/**
 * Update internal hints from DocuSign response headers (axios or similar).
 * @param {Record<string, string>|undefined} headers
 */
export function ingestDocuSignResponseHeaders(headers) {
  if (!headers || typeof headers !== "object") return;
  const br = parseHeaderInt(headers, "x-burstlimit-remaining");
  const hr = parseHeaderInt(headers, "x-ratelimit-remaining");
  const reset = parseHeaderInt(headers, "x-ratelimit-reset");
  serverHint = {
    burstRemaining: br,
    hourlyRemaining: hr,
    resetAtMs: reset != null ? reset * 1000 : null,
    ingestedAt: Date.now(),
  };
}

function staleServerHint() {
  return Date.now() - serverHint.ingestedAt > HEADER_STALE_MS;
}

function nextDelayMs(now) {
  prune(now);
  let delay = 0;

  if (!staleServerHint()) {
    if (serverHint.burstRemaining === 0) delay = Math.max(delay, BURST_WINDOW_MS);
    if (serverHint.hourlyRemaining === 0 && serverHint.resetAtMs != null) {
      delay = Math.max(delay, serverHint.resetAtMs - now + 250);
    }
  }

  if (burstCallTimes.length >= burstLimitCap) {
    const oldest = burstCallTimes[0];
    delay = Math.max(delay, BURST_WINDOW_MS - (now - oldest) + 50);
  }
  if (hourlyCallTimes.length >= hourlyLimitCap) {
    const oldest = hourlyCallTimes[0];
    delay = Math.max(delay, HOURLY_WINDOW_MS - (now - oldest) + 50);
  }
  return delay;
}

function recordCall(now) {
  burstCallTimes.push(now);
  hourlyCallTimes.push(now);
  if (!staleServerHint() && serverHint.burstRemaining != null && serverHint.burstRemaining > 0) {
    serverHint = { ...serverHint, burstRemaining: serverHint.burstRemaining - 1 };
  }
  if (!staleServerHint() && serverHint.hourlyRemaining != null && serverHint.hourlyRemaining > 0) {
    serverHint = { ...serverHint, hourlyRemaining: serverHint.hourlyRemaining - 1 };
  }
}

/**
 * Wait until a call is allowed under local windows (and optional server hints), then return.
 */
export async function acquireDocuSignSlot() {
  const run = scheduleChain.then(async () => {
    while (true) {
      const now = Date.now();
      const wait = nextDelayMs(now);
      if (wait <= 0) {
        recordCall(now);
        return;
      }
      await sleep(Math.min(wait, 60_000));
    }
  });
  scheduleChain = run.catch(() => {});
  await run;
}

function isDocuSignRateLimitError(err) {
  const status = err?.response?.status ?? err?.statusCode;
  if (status === 429) return true;
  const code = err?.response?.data?.errorCode ?? err?.body?.errorCode;
  if (typeof code === "string") {
    return (
      code.includes("APIINVOCATION_LIMIT") ||
      code.includes("RATE_LIMIT") ||
      code === "HOURLY_APIINVOCATION_LIMIT_EXCEEDED" ||
      code === "BURST_APIINVOCATION_LIMIT_EXCEEDED"
    );
  }
  return false;
}

function retryDelayMsFromError(err) {
  const h = err?.response?.headers;
  const retryAfter = h && (h["retry-after"] ?? h["Retry-After"]);
  if (retryAfter != null) {
    const sec = parseInt(String(retryAfter), 10);
    if (Number.isFinite(sec)) return sec * 1000;
  }
  ingestDocuSignResponseHeaders(h);
  if (!staleServerHint() && serverHint.resetAtMs != null) {
    const w = serverHint.resetAtMs - Date.now() + 500;
    if (w > 0) return Math.min(w, HOURLY_WINDOW_MS);
  }
  return BURST_WINDOW_MS;
}

/**
 * Run an async DocuSign API operation after acquiring a slot. Retries on rate-limit errors.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withDocuSignLimit(fn) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_RATE_LIMIT_RETRIES; attempt++) {
    await acquireDocuSignSlot();
    try {
      const result = await fn();
      return result;
    } catch (err) {
      lastErr = err;
      const h = err?.response?.headers;
      if (h) ingestDocuSignResponseHeaders(h);
      if (isDocuSignRateLimitError(err) && attempt < MAX_RATE_LIMIT_RETRIES - 1) {
        await sleep(retryDelayMsFromError(err));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export function getDocuSignRateLimitConfig() {
  return {
    burstLimit: burstLimitCap,
    hourlyLimit: hourlyLimitCap,
    burstWindowMs: BURST_WINDOW_MS,
    hourlyWindowMs: HOURLY_WINDOW_MS,
  };
}
