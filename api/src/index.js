import express from "express";
import authRoutes from "./routes/authRoutes.js";
import dataRoutes from "./routes/dataRoutes.js";
import actionRoutes from "./routes/actionRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import csvRoutes from "./routes/csvRoutes.js";
import contractRoutes from "./routes/contractRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import { docusignWebhook } from "./controller/contractController.js";
import { brevoWebhook } from "./controller/invoiceController.js";
import { addProspect } from "./controller/prospectController.js";
import cors from "cors";
import { protect } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { assertDocusignGoLiveConfigOrExit } from "./utils/docusignEnv.js";
import "./utils/loadEnv.js";

const app = express();

// CORS: in development allow all; in production use CORS_ORIGIN (comma-separated).
// On Fly.io: fly secrets set CORS_ORIGIN="https://www.lsptax.com,https://lsptax.com"
// Use CORS_ORIGIN=* to allow any origin in production (e.g. while debugging).
const corsOriginEnv = (process.env.CORS_ORIGIN || "").trim();
const isProd = process.env.NODE_ENV === "production";
const allowAllOrigins = corsOriginEnv === "*";
const allowedOriginsRaw = allowAllOrigins
  ? []
  : corsOriginEnv
      .split(",")
      .map((o) => o.trim().replace(/^"|"$/g, "")) // strip accidental quotes from env
      .filter(Boolean);
// Normalize to canonical origin (no trailing slash, consistent form) for reliable matching
function normalizeOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}
const allowedOrigins = allowedOriginsRaw.map(normalizeOrigin);

if (isProd && allowedOrigins.length === 0 && !allowAllOrigins) {
  console.warn(
    "CORS_ORIGIN is not set in production. Allowing all origins. Set CORS_ORIGIN on Fly.io to restrict (e.g. https://www.lsptax.com,https://lsptax.com)."
  );
}

function corsOrigin(origin, cb) {
  if (!origin) return cb(null, true);
  // Allow all: no list, or explicit CORS_ORIGIN=*
  if (allowedOrigins.length === 0 || allowAllOrigins) return cb(null, true);
  const normalized = normalizeOrigin(origin);
  if (allowedOrigins.includes(normalized)) return cb(null, true);
  console.warn(
    `CORS rejected origin "${origin}" (normalized: "${normalized}"). Allowed: [${allowedOrigins.join(", ")}]. Set CORS_ORIGIN on Fly.io to include your frontend origin.`
  );
  return cb(null, false);
}

app.use(
  cors({
    origin: isProd ? corsOrigin : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// DocuSign Connect webhook must get raw body for HMAC (register before express.json())
app.post(
  "/webhooks/docusign",
  express.raw({ type: "application/json" }),
  docusignWebhook
);

// Brevo transactional email tracking webhook (JSON body)
app.post("/webhooks/brevo", express.json(), brevoWebhook);

// Invoice send posts base64 PDFs (up to 10 MB per file). Default 100kb limit rejects those payloads.
app.use(express.json({ limit: "50mb" }));

// Log every API request
app.use((req, res, next) => {
  const shouldLog = process.env.LOG_REQUESTS === "true" || process.env.NODE_ENV !== "production";
  if (shouldLog) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

app.use("/auth", authRoutes);
app.use("/api", protect, dataRoutes);
// Public landing-page inquiry: allow creating a prospect without JWT
app.post("/action/add-prospect", addProspect);
app.use("/action", protect, actionRoutes);
app.use("/invoice", protect, invoiceRoutes);
app.use("/csv", protect, csvRoutes);
app.use("/report", protect, reportRoutes);
// Contract routes (preview, send, list, poll, download URL) — protected
app.use("/api/contracts", protect, contractRoutes);
app.use("/", (req, res) => {
  res.status(200).send("SERVER RUNNING...");
});

app.use(errorHandler);

assertDocusignGoLiveConfigOrExit();

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
