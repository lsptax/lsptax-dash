/**
 * Centralized error handler. Attach as the last middleware.
 * Use: app.use(errorHandler);
 */
export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);
  const status = err.statusCode || 500;
  const message = err.message || "Server error";
  res.status(status).json({ message });
};
