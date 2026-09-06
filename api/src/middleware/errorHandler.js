/**
 * Centralized error handler. Attach as the last middleware.
 * Use: app.use(errorHandler);
 */
export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      message:
        "Request body too large. Reduce invoice PDF size or send fewer attachments per request.",
    });
  }
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Server error";
  res.status(status).json({ message });
};
