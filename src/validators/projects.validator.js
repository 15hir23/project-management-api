/**
 * Project Validation Logic
 *
 * Pure validation functions that throw AppError on invalid input.
 * No side effects, no data access — just input checking.
 *
 * Why not use a library like Joi/Zod?
 *   The assignment explicitly favors "no magic libraries" and code
 *   that is explainable line-by-line. Manual validation is more verbose
 *   but completely transparent.
 */

const { AppError } = require('../utils/errors');

const VALID_STATUSES = ['active', 'on_hold', 'completed'];

/**
 * Validate the body of a POST /projects request.
 *
 * Rules enforced:
 *   - name is a non-empty string
 *   - clientName is a non-empty string
 *   - status (if provided) must be one of the allowed values
 *   - startDate is a valid ISO date string
 *   - endDate (if provided) must be a valid ISO date and >= startDate
 *
 * @param {Object} body - req.body
 * @returns {Object} Sanitized project data (only allowed fields)
 * @throws {AppError} on validation failure
 */
function validateCreateProject(body) {
  const errors = [];

  // --- Required: name ---
  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    errors.push('name is required and must be a non-empty string');
  }

  // --- Required: clientName ---
  if (!body.clientName || typeof body.clientName !== 'string' || body.clientName.trim() === '') {
    errors.push('clientName is required and must be a non-empty string');
  }

  // --- Optional: status (default handled by store/service) ---
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  // --- Required: startDate ---
  if (!body.startDate) {
    errors.push('startDate is required');
  } else if (!isValidISODate(body.startDate)) {
    errors.push('startDate must be a valid ISO date string');
  }

  // --- Optional: endDate ---
  if (body.endDate !== undefined && body.endDate !== null) {
    if (!isValidISODate(body.endDate)) {
      errors.push('endDate must be a valid ISO date string');
    } else if (body.startDate && isValidISODate(body.startDate)) {
      // endDate cannot be before startDate
      if (new Date(body.endDate) < new Date(body.startDate)) {
        errors.push('endDate cannot be before startDate');
      }
    }
  }

  if (errors.length > 0) {
    throw new AppError(errors.join('; '), 400, 'VALIDATION_ERROR');
  }

  // Return only the fields we accept (whitelist approach — ignore unexpected fields)
  return {
    name: body.name.trim(),
    clientName: body.clientName.trim(),
    status: body.status || 'active',
    startDate: body.startDate,
    endDate: body.endDate || null,
  };
}

/**
 * Validate the body of a PATCH /projects/:id/status request.
 *
 * @param {Object} body - req.body
 * @returns {string} The validated new status
 * @throws {AppError} on validation failure
 */
function validateStatusUpdate(body) {
  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    throw new AppError(
      `status is required and must be one of: ${VALID_STATUSES.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }
  return body.status;
}

// ---------- Helpers ----------

/**
 * Check whether a string is a valid ISO 8601 date.
 * Rejects NaN dates produced by `new Date('garbage')`.
 */
function isValidISODate(value) {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

module.exports = {
  validateCreateProject,
  validateStatusUpdate,
  VALID_STATUSES,
};
