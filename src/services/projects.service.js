/**
 * Project Service — Business Logic Layer
 *
 * This layer sits between controllers and the data store.
 * It contains all business rules:
 *   - Orchestrating validation
 *   - Enforcing state transition rules
 *   - Deciding what "soft delete" means
 *
 * It never touches req/res — that is the controller's job.
 * It never mutates data directly — that is the store's job.
 */

const projectStore = require('../data/projects.store');
const { validateCreateProject, validateStatusUpdate } = require('../validators/projects.validator');
const { AppError } = require('../utils/errors');

// ---------- State Transition Map ----------
// Explicit allowlist: key = current status, value = array of allowed next statuses.
// "completed" maps to an empty array — no transitions out of it.

const ALLOWED_TRANSITIONS = {
  active: ['on_hold', 'completed'],
  on_hold: ['active', 'completed'],
  completed: [], // terminal state
};

// ---------- Service Functions ----------

/**
 * Create a new project.
 *
 * @param {Object} body - Raw request body
 * @returns {Promise<Object>} The created project
 */
async function createProject(body) {
  // Validate and sanitize input (throws AppError on failure)
  const projectData = validateCreateProject(body);

  // Delegate persistence to the data layer
  const project = await projectStore.create(projectData);
  return project;
}

/**
 * List projects with optional filters and sorting.
 * Soft-deleted projects are excluded by the data layer.
 *
 * @param {Object} query - Query parameters from the request
 * @returns {Promise<Array<Object>>}
 */
async function listProjects(query = {}) {
  const { status, search, sort, order } = query;

  // Validate status filter if provided
  const validStatuses = ['active', 'on_hold', 'completed'];
  if (status && !validStatuses.includes(status)) {
    throw new AppError(
      `Invalid status filter: ${status}. Must be one of: ${validStatuses.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }

  // Validate sort field if provided
  const validSortFields = ['createdAt', 'startDate'];
  if (sort && !validSortFields.includes(sort)) {
    throw new AppError(
      `Invalid sort field: ${sort}. Must be one of: ${validSortFields.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }

  // Validate order if provided
  if (order && !['asc', 'desc'].includes(order)) {
    throw new AppError(
      `Invalid order: ${order}. Must be 'asc' or 'desc'`,
      400,
      'VALIDATION_ERROR'
    );
  }

  return projectStore.findAll({ status, search, sort, order });
}

/**
 * Get a single project by ID.
 * Returns 404 if not found or soft-deleted.
 *
 * @param {string} id
 * @returns {Promise<Object>}
 */
async function getProjectById(id) {
  const project = await projectStore.findById(id);

  if (!project || project.isDeleted) {
    throw new AppError(`Project with id '${id}' not found`, 404, 'PROJECT_NOT_FOUND');
  }

  return project;
}

/**
 * Update a project's status with explicit transition validation.
 *
 * State transition rules:
 *   active     → on_hold | completed
 *   on_hold    → active  | completed
 *   completed  → (none — terminal state)
 *
 * @param {string} id   - Project ID
 * @param {Object} body - Request body containing { status }
 * @returns {Promise<Object>} Updated project
 */
async function updateProjectStatus(id, body) {
  // Validate input shape
  const newStatus = validateStatusUpdate(body);

  // Fetch existing project (will throw 404 if missing/deleted)
  const project = await getProjectById(id);

  const currentStatus = project.status;

  // Same status — no-op is fine, return as-is
  if (currentStatus === newStatus) {
    return project;
  }

  // Check explicit transition rules
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new AppError(
      `Cannot transition from '${currentStatus}' to '${newStatus}'`,
      400,
      'INVALID_STATUS_TRANSITION'
    );
  }

  // Persist the change
  const updated = await projectStore.update(id, { status: newStatus });
  return updated;
}

/**
 * Soft-delete a project.
 * Sets isDeleted = true. The project will no longer appear in listings
 * and will return 404 when accessed by ID.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
async function deleteProject(id) {
  // Verify it exists and is not already deleted
  await getProjectById(id);

  await projectStore.update(id, { isDeleted: true });
}

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  updateProjectStatus,
  deleteProject,
  ALLOWED_TRANSITIONS,
};
