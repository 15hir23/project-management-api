/**
 * In-Memory Data Store for Projects
 *
 * Structured as a centralized data access layer.
 * All reads and writes go through exported functions — no direct mutation
 * of the internal store from outside this module.
 *
 * Designed to be swappable with a real database later:
 * - Every function is async (returns a Promise) to match DB call patterns
 * - Data is cloned on read to prevent accidental mutation by callers
 * - The internal array is never exposed directly
 */

const { randomUUID } = require('crypto');

// ---------- Internal Storage ----------

/** @type {Array<Object>} */
let projects = [];

// ---------- Helper ----------

/**
 * Deep-clone a project object so callers cannot mutate store data.
 * Using JSON round-trip is simple and sufficient for plain data objects.
 */
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ---------- Data Access Functions ----------

/**
 * Insert a new project into the store.
 * Assigns id, createdAt, updatedAt, and isDeleted automatically.
 *
 * @param {Object} projectData - Validated project fields (name, clientName, status, startDate, endDate)
 * @returns {Promise<Object>} The created project (cloned)
 */
async function create(projectData) {
  const now = new Date().toISOString();
  const project = {
    id: randomUUID(),
    name: projectData.name,
    clientName: projectData.clientName,
    status: projectData.status || 'active',
    startDate: projectData.startDate,
    endDate: projectData.endDate || null,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  projects.push(project);
  return clone(project);
}

/**
 * Find a single project by ID.
 * Returns null if not found (does NOT filter by isDeleted — caller decides).
 *
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function findById(id) {
  const project = projects.find((p) => p.id === id);
  return project ? clone(project) : null;
}

/**
 * Return all projects that are NOT soft-deleted, with optional filters and sorting.
 *
 * @param {Object} options
 * @param {string} [options.status]       - Filter by status value
 * @param {string} [options.search]       - Case-insensitive match against name OR clientName
 * @param {string} [options.sort]         - 'createdAt' or 'startDate' (default: 'createdAt')
 * @param {string} [options.order]        - 'asc' or 'desc' (default: 'desc')
 * @returns {Promise<Array<Object>>}
 */
async function findAll({ status, search, sort = 'createdAt', order = 'desc' } = {}) {
  let result = projects.filter((p) => !p.isDeleted);

  // Filter by status
  if (status) {
    result = result.filter((p) => p.status === status);
  }

  // Search across name and clientName (case-insensitive)
  if (search) {
    const term = search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.clientName.toLowerCase().includes(term)
    );
  }

  // Sort — only allow known fields to avoid unexpected behavior
  const sortField = ['createdAt', 'startDate'].includes(sort) ? sort : 'createdAt';
  result.sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });

  return result.map(clone);
}

/**
 * Update specific fields of a project identified by ID.
 * Only updates fields present in `updates` — does NOT overwrite the entire object.
 * Always bumps `updatedAt`.
 *
 * @param {string} id
 * @param {Object} updates - Key/value pairs to merge into the project
 * @returns {Promise<Object|null>} Updated project or null if not found
 */
async function update(id, updates) {
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return null;

  projects[index] = {
    ...projects[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return clone(projects[index]);
}

/**
 * Reset the store (used by tests).
 */
async function clear() {
  projects = [];
}

module.exports = {
  create,
  findById,
  findAll,
  update,
  clear,
};
