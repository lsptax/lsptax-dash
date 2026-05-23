import "../utils/loadEnv.js";
import jwt from "jsonwebtoken";

export const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY || SECRET_KEY.length < 32) {
  console.warn("JWT_SECRET is missing or too short; set a strong secret in .env");
}

/** In-memory blacklist of invalidated token IDs (jti). For production use Redis/DB. */
const tokenBlacklist = new Set();

export const isTokenBlacklisted = (jti) => tokenBlacklist.has(jti);
export const blacklistToken = (jti) => {
  tokenBlacklist.add(jti);
};

/**
 * Protect routes: require valid JWT in Authorization: Bearer <token>.
 * Sets req.user = { userId, jti, ... } on success.
 */
export const protect = (req, res, next) => {
  if (!SECRET_KEY) {
    return res.status(503).json({ message: "Auth not configured" });
  }
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    if (decoded.jti && isTokenBlacklisted(decoded.jti)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};
