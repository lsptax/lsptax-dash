/**
 * DocuSign environment checks aligned with the eSignature Go-Live guide:
 * https://developers.docusign.com/docs/esign-rest-api/go-live/
 *
 * Summary (operational — must be done in DocuSign Admin / accounts):
 * - Promote the integration key and complete Go-Live review; status becomes Live.
 * - Re-create secrets, RSA keypair, and redirect URIs in production to match the developer app.
 * - Use a paid production account (or ISV management account) with admin access.
 * - Point Connect webhooks at a public HTTPS URL and verify with HMAC (DOCUSIGN_HMAC_SECRET).
 *
 * Technical pairing (enforced here when DocuSign is configured):
 * - Developer: REST host demo.docusign.net + OAuth account-d.docusign.com
 * - Production: REST host *.docusign.net (not demo) + OAuth host without account-d (e.g. account.docusign.com)
 */

const DEMO_REST_HOST = "demo.docusign.net";

function isDocusignConfigured() {
  return Boolean(
    (process.env.DOCUSIGN_CLIENT_ID || "").trim() ||
      (process.env.DOCUSIGN_ACCOUNT_ID || "").trim()
  );
}

/**
 * @param {string} raw
 * @param {string} envName
 * @returns {{ ok: true, url: URL } | { ok: false, message: string }}
 */
function parseHttpsUrl(raw, envName) {
  if (raw == null || String(raw).trim() === "") {
    return { ok: false, message: `${envName} is not set` };
  }
  const s = String(raw).trim();
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    if (url.protocol !== "https:") {
      return { ok: false, message: `${envName} must use https:// (Go-Live / production security)` };
    }
    return { ok: true, url };
  } catch {
    return { ok: false, message: `${envName} is not a valid URL` };
  }
}

function isDemoRestHost(host) {
  return host === DEMO_REST_HOST || host.endsWith(`.${DEMO_REST_HOST}`);
}

function isProductionRestHost(host) {
  return host.endsWith(".docusign.net") && !isDemoRestHost(host);
}

/** Developer OAuth uses account-d (see Go-Live API endpoints table). */
function isDeveloperOAuthHost(host) {
  return host.includes("account-d.");
}

/**
 * @returns {{ tier: 'development' | 'production' | 'unknown', restHost: string, authHost: string }}
 */
export function getDocusignEndpointProfile() {
  const restRaw =
    process.env.DOCUSIGN_REST_BASE_URL || "https://demo.docusign.net/restapi";
  const authRaw = process.env.DOCUSIGN_AUTH_SERVER || "";

  const rest = parseHttpsUrl(restRaw, "DOCUSIGN_REST_BASE_URL");
  const auth = parseHttpsUrl(authRaw, "DOCUSIGN_AUTH_SERVER");

  const restHost = rest.ok ? rest.url.hostname : "";
  const authHost = auth.ok ? auth.url.hostname : "";

  let tier = "unknown";
  if (rest.ok) {
    if (isDemoRestHost(restHost)) tier = "development";
    else if (isProductionRestHost(restHost)) tier = "production";
  }

  return { tier, restHost, authHost, restParse: rest, authParse: auth };
}

/**
 * Validate DocuSign env for Go-Live endpoint pairing and production safety.
 * @returns {{ ok: boolean, errors: string[], warnings: string[], logLines: string[] }}
 */
export function validateDocusignGoLiveConfig() {
  const errors = [];
  const warnings = [];
  const logLines = [];

  if (!isDocusignConfigured()) {
    logLines.push("DocuSign: not configured (no DOCUSIGN_CLIENT_ID / DOCUSIGN_ACCOUNT_ID); skipping Go-Live env checks.");
    return { ok: true, errors, warnings, logLines };
  }

  const profile = getDocusignEndpointProfile();
  const { restParse, authParse, restHost, authHost, tier } = profile;

  if (!restParse.ok) errors.push(restParse.message);
  if (!authParse.ok) errors.push(authParse.message);

  if (restParse.ok && authParse.ok) {
    const demoRest = isDemoRestHost(restHost);
    const prodRest = isProductionRestHost(restHost);
    const devAuth = isDeveloperOAuthHost(authHost);

    if (demoRest && !devAuth) {
      errors.push(
        "Go-Live: DOCUSIGN_REST_BASE_URL points at the developer API (demo.docusign.net) but DOCUSIGN_AUTH_SERVER is not a developer OAuth host (expected host like account-d.docusign.com). See API endpoints in the Go-Live doc."
      );
    }
    if (prodRest && devAuth) {
      errors.push(
        "Go-Live: production REST host is set but DOCUSIGN_AUTH_SERVER still uses a developer OAuth host (account-d). Use production OAuth (e.g. https://account.docusign.com) after Go-Live."
      );
    }
  }

  const isProd = process.env.NODE_ENV === "production";
  const allowDemoInProd = process.env.DOCUSIGN_ALLOW_DEMO_IN_PRODUCTION === "1";

  if (isProd && restParse.ok && isDemoRestHost(restHost) && !allowDemoInProd) {
    errors.push(
      "NODE_ENV=production but DOCUSIGN_REST_BASE_URL uses the developer REST host (demo.docusign.net). Point to your production REST base (e.g. https://www.docusign.net/restapi or your account’s datacenter host) after Go-Live, or set DOCUSIGN_ALLOW_DEMO_IN_PRODUCTION=1 only for intentional demo-in-prod."
    );
  }

  if (
    isProd &&
    authParse.ok &&
    isDeveloperOAuthHost(authHost) &&
    !allowDemoInProd &&
    restParse.ok &&
    isProductionRestHost(restHost)
  ) {
    errors.push(
      "NODE_ENV=production with production REST host but DOCUSIGN_AUTH_SERVER still uses developer OAuth (account-d). After Go-Live use production OAuth (e.g. https://account.docusign.com)."
    );
  }

  const publicBase = (process.env.DOCUSIGN_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || "").trim();
  if (publicBase) {
    const p = parseHttpsUrl(publicBase, "PUBLIC_APP_URL / DOCUSIGN_PUBLIC_APP_URL");
    if (!p.ok) warnings.push(p.message);
    else if (p.url.protocol !== "https:" && isProd) {
      warnings.push(
        "DocuSign Connect must use a public HTTPS URL in production; set an https:// base in DOCUSIGN_PUBLIC_APP_URL or PUBLIC_APP_URL."
      );
    }
  } else if (isProd) {
    warnings.push(
      "Production: set DOCUSIGN_PUBLIC_APP_URL (or PUBLIC_APP_URL) to your public https origin so operators know the Connect webhook URL should be https://<host>/webhooks/docusign."
    );
  }

  if (isProd && !(process.env.DOCUSIGN_HMAC_SECRET || "").trim()) {
    warnings.push(
      "Set DOCUSIGN_HMAC_SECRET before relying on DocuSign Connect in production; /webhooks/docusign rejects traffic until it is configured."
    );
  }

  if (errors.length === 0) {
    logLines.push(
      `DocuSign endpoints: ${tier === "development" ? "developer (demo)" : tier === "production" ? "production" : "custom/unknown"} — REST ${restHost || "(unset)"}, OAuth ${authHost || "(unset)"}`
    );
  }

  return { ok: errors.length === 0, errors, warnings, logLines };
}

/**
 * Log validation outcome; exit on fatal errors in production.
 */
export function assertDocusignGoLiveConfigOrExit() {
  const { ok, errors, warnings, logLines } = validateDocusignGoLiveConfig();
  for (const line of logLines) console.log(line);
  for (const w of warnings) console.warn(`DocuSign: ${w}`);
  if (!ok) {
    for (const e of errors) console.error(`DocuSign: ${e}`);
    if (process.env.NODE_ENV === "production") {
      console.error("DocuSign: refusing to start in production with invalid Go-Live configuration.");
      process.exit(1);
    }
  }
}
