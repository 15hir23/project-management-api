/**
 * Project Routes
 *
 * Maps HTTP methods + paths to controller functions.
 * This file is intentionally thin — no logic, no middleware beyond routing.
 */

const { Router } = require('express');
const projectController = require('../controllers/projects.controller');

const router = Router();

// POST   /projects              → Create a project
router.post('/', projectController.createProject);

// GET    /projects              → List projects (with filters & sorting)
router.get('/', projectController.listProjects);

// GET    /projects/:id          → Get a single project
router.get('/:id', projectController.getProjectById);

// PATCH  /projects/:id/status   → Update project status
router.patch('/:id/status', projectController.updateProjectStatus);

// DELETE /projects/:id          → Soft-delete a project
router.delete('/:id', projectController.deleteProject);

module.exports = router;
