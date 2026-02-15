/**
 * Global Error-Handling Middleware
 *
 * Express recognizes error-handling middleware by its 4-parameter signature:
 *   (err, req, res, next)
 *
 * Responsibilities:
 *   1. If `err` is an AppError → return the structured client error response.
 *   2. Otherwise → treat it as an unexpected server error (500).
 *   3. Always use the consistent error envelope format required by the spec.
 *   4. Log unexpected errors to stderr so they don't go silent.
 */

const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  // Known, intentional application errors (validation, not-found, bad transitions, etc.)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Unexpected / unhandled errors — log for debugging, return generic 500
  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

module.exports = { errorHandler };
