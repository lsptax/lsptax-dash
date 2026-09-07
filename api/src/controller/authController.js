import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../prisma/prismaClient.js";
import { validationResult } from "express-validator";
import { SECRET_KEY, blacklistToken } from "../middleware/auth.js";

// Register a new user
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword },
    });

    const safeUser = { id: user.id, email: user.email, type: user.type || "client" };
    res.status(201).json({ message: "User registered successfully", user: safeUser });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // JWT expiry is configurable via env; default is 3 days.
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? "72h";

    const token = jwt.sign(
      { userId: user.id, jti: crypto.randomUUID(), type: user.type || "client" },
      SECRET_KEY,
      { expiresIn: jwtExpiresIn }
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      type: user.type || "client",
    };
    res.status(200).json({ message: "Logged in successfully", token, user: safeUser });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Logout user — invalidate token by adding jti to blacklist
export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({ message: "Token is missing" });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.decode(token);
      if (decoded?.jti) blacklistToken(decoded.jti);
    } catch (_) {}

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function maskValue(value = "") {
  const str = String(value);
  if (str.length <= 8) return "[redacted]";
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

// OAuth callback endpoint used for DocuSign app configuration/review.
// It intentionally returns HTTP 200 for both success and error responses.
export const docusignOAuthCallback = async (req, res) => {
  try {
    const { code, state, error, error_description: errorDescription } = req.query;
    const queryLog = {
      code: code ? maskValue(code) : null,
      state: state ? maskValue(state) : null,
      error: error || null,
      error_description: errorDescription ? "[present]" : null,
    };
    console.log("DocuSign OAuth callback received:", queryLog);

    const isError = Boolean(error);
    const title = isError ? "DocuSign authorization issue" : "DocuSign authorization complete";
    const description = isError
      ? `Authorization returned an error: ${escapeHtml(errorDescription || error || "Unknown error")}. You can close this tab.`
      : "DocuSign authorization complete. You can close this tab.";

    res.status(200).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; color: #111827; background: #f9fafb; }
      .card { max-width: 640px; margin: 48px auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px 24px; box-shadow: 0 6px 20px rgba(0,0,0,0.04); }
      h1 { margin: 0 0 10px; font-size: 22px; }
      p { margin: 0; line-height: 1.6; }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>${title}</h1>
      <p>${description}</p>
    </main>
  </body>
</html>`);
  } catch (err) {
    console.error("DocuSign OAuth callback handler error:", err);
    res.status(200).type("html").send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>DocuSign authorization complete</title></head>
  <body><p>DocuSign authorization complete. You can close this tab.</p></body>
</html>`);
  }
};
