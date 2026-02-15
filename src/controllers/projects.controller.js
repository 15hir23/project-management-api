/**
 * Project Controller — HTTP Request/Response Layer
 *
 * Each function:
 *   1. Extracts data from the Express request (params, query, body)
 *   2. Delegates to the service layer
 *   3. Sends an appropriate HTTP response
 *   4. Passes errors to the next() middleware (never swallows them)
 *
 * This layer does NOT contain business logic.
 */

const projectService = require('../services/projects.service');

/**
 * POST /projects
 * Create a new project.
 */
async function createProject(req, res, next) {
  try {
    const project = await projectService.createProject(req.body);
    return res.status(201).json({ data: project });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /projects
 * List all projects (with optional filters and sorting).
 */
async function listProjects(req, res, next) {
  try {
    const projects = await projectService.listProjects(req.query);
    return res.status(200).json({ data: projects });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /projects/:id
 * Get a single project by ID.
 */
async function getProjectById(req, res, next) {
  try {
    const project = await projectService.getProjectById(req.params.id);
    return res.status(200).json({ data: project });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /projects/:id/status
 * Update a project's status (with transition validation).
 */
async function updateProjectStatus(req, res, next) {
  try {
    const project = await projectService.updateProjectStatus(req.params.id, req.body);
    return res.status(200).json({ data: project });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /projects/:id
 * Soft-delete a project.
 */
async function deleteProject(req, res, next) {
  try {
    await projectService.deleteProject(req.params.id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  updateProjectStatus,
  deleteProject,
};
