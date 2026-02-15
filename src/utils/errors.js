/**
 * Custom Application Error
 *
 * Extends the native Error class with:
 *   - statusCode: HTTP status code to return
 *   - code:       Machine-readable error code (e.g. 'VALIDATION_ERROR')
 *
 * This is thrown inside services/validators and caught by the error-handling middleware.
 * Separating validation errors from server errors starts here — the statusCode tells the
 * middleware whether this was a client mistake (4xx) or a server problem (5xx).
 */
class AppError extends Error {
  /**
   * @param {string} message  - Human-readable description
   * @param {number} statusCode - HTTP status code (default 400)
   * @param {string} code     - Machine-readable error code (default 'BAD_REQUEST')
   */
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

module.exports = { AppError };
