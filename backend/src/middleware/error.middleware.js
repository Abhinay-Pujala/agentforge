export function errorHandler(err, req, res, next) {
  console.error(err);

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    message: err.userMessage || err.message || "Internal server error.",
    code: err.code || null,
    category: err.category || null,
    retryable: err.retryable ?? false,
    data: null,
  });
}
