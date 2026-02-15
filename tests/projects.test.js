/**
 * Project Management API — Integration Tests
 *
 * Uses supertest to exercise the Express app without starting a real server.
 * The in-memory store is cleared before each test for isolation.
 *
 * Focus areas (per spec):
 *   - Status transition rules
 *   - Validation failures
 *   - Filtering + sorting combinations
 *   - Soft delete behavior
 */

const request = require('supertest');
const app = require('../src/app');
const projectStore = require('../src/data/projects.store');

// ---------- Test Data Helpers ----------

function validProject(overrides = {}) {
  return {
    name: 'Test Project',
    clientName: 'Test Client',
    startDate: '2026-01-01',
    ...overrides,
  };
}

async function createTestProject(overrides = {}) {
  const res = await request(app)
    .post('/projects')
    .send(validProject(overrides));
  return res.body.data;
}

// ---------- Setup ----------

beforeEach(async () => {
  await projectStore.clear();
});

// ============================================================
// 1. CREATE PROJECT
// ============================================================

describe('POST /projects', () => {
  test('creates a project with valid data and defaults status to active', async () => {
    const res = await request(app)
      .post('/projects')
      .send(validProject())
      .expect(201);

    expect(res.body.data).toMatchObject({
      name: 'Test Project',
      clientName: 'Test Client',
      status: 'active',
      startDate: '2026-01-01',
    });
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.createdAt).toBeDefined();
  });

  test('creates a project with explicit status', async () => {
    const res = await request(app)
      .post('/projects')
      .send(validProject({ status: 'on_hold' }))
      .expect(201);

    expect(res.body.data.status).toBe('on_hold');
  });

  test('rejects missing name', async () => {
    const res = await request(app)
      .post('/projects')
      .send(validProject({ name: '' }))
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rejects missing clientName', async () => {
    const res = await request(app)
      .post('/projects')
      .send({ name: 'A', startDate: '2026-01-01' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rejects invalid status', async () => {
    const res = await request(app)
      .post('/projects')
      .send(validProject({ status: 'invalid' }))
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rejects endDate before startDate', async () => {
    const res = await request(app)
      .post('/projects')
      .send(validProject({ startDate: '2026-06-01', endDate: '2026-01-01' }))
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('endDate cannot be before startDate');
  });

  test('rejects missing startDate', async () => {
    const res = await request(app)
      .post('/projects')
      .send({ name: 'A', clientName: 'B' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ============================================================
// 2. LIST PROJECTS
// ============================================================

describe('GET /projects', () => {
  test('returns empty array when no projects exist', async () => {
    const res = await request(app).get('/projects').expect(200);
    expect(res.body.data).toEqual([]);
  });

  test('returns all non-deleted projects', async () => {
    await createTestProject({ name: 'P1' });
    await createTestProject({ name: 'P2' });

    const res = await request(app).get('/projects').expect(200);
    expect(res.body.data).toHaveLength(2);
  });

  test('filters by status', async () => {
    await createTestProject({ name: 'Active', status: 'active' });
    await createTestProject({ name: 'OnHold', status: 'on_hold' });

    const res = await request(app).get('/projects?status=on_hold').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('OnHold');
  });

  test('searches by name (case-insensitive)', async () => {
    await createTestProject({ name: 'Alpha Project' });
    await createTestProject({ name: 'Beta Project' });

    const res = await request(app).get('/projects?search=alpha').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Alpha Project');
  });

  test('searches by clientName', async () => {
    await createTestProject({ name: 'P1', clientName: 'Acme Corp' });
    await createTestProject({ name: 'P2', clientName: 'Other Inc' });

    const res = await request(app).get('/projects?search=acme').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].clientName).toBe('Acme Corp');
  });

  test('combines status filter and search', async () => {
    await createTestProject({ name: 'Alpha', clientName: 'Acme', status: 'active' });
    await createTestProject({ name: 'Alpha Two', clientName: 'Beta', status: 'on_hold' });
    await createTestProject({ name: 'Gamma', clientName: 'Acme', status: 'active' });

    const res = await request(app)
      .get('/projects?status=active&search=alpha')
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Alpha');
  });

  test('sorts by startDate ascending', async () => {
    await createTestProject({ name: 'Later', startDate: '2026-06-01' });
    await createTestProject({ name: 'Earlier', startDate: '2026-01-01' });

    const res = await request(app)
      .get('/projects?sort=startDate&order=asc')
      .expect(200);

    expect(res.body.data[0].name).toBe('Earlier');
    expect(res.body.data[1].name).toBe('Later');
  });

  test('does not return soft-deleted projects', async () => {
    const project = await createTestProject({ name: 'ToDelete' });
    await request(app).delete(`/projects/${project.id}`).expect(204);

    const res = await request(app).get('/projects').expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  test('rejects invalid status filter', async () => {
    const res = await request(app).get('/projects?status=bogus').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ============================================================
// 3. GET PROJECT BY ID
// ============================================================

describe('GET /projects/:id', () => {
  test('returns project if found', async () => {
    const project = await createTestProject();
    const res = await request(app).get(`/projects/${project.id}`).expect(200);
    expect(res.body.data.id).toBe(project.id);
  });

  test('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .get('/projects/non-existent-id')
      .expect(404);

    expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
  });

  test('returns 404 for soft-deleted project', async () => {
    const project = await createTestProject();
    await request(app).delete(`/projects/${project.id}`).expect(204);

    const res = await request(app).get(`/projects/${project.id}`).expect(404);
    expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
  });
});

// ============================================================
// 4. UPDATE PROJECT STATUS (State Transitions)
// ============================================================

describe('PATCH /projects/:id/status', () => {
  // --- Valid transitions ---

  test('active → on_hold', async () => {
    const project = await createTestProject({ status: 'active' });

    const res = await request(app)
      .patch(`/projects/${project.id}/status`)
      .send({ status: 'on_hold' })
      .expect(200);

    expect(res.body.data.status).toBe('on_hold');
  });

  test('active → completed', async () => {
    const project = await createTestProject({ status: 'active' });

    const res = await request(app)
      .patch(`/projects/${project.id}/status`)
      .send({ status: 'completed' })
      .expect(200);

    expect(res.body.data.status).toBe('completed');
  });

  test('on_hold → active', async () => {
    const project = await createTestProject({ status: 'on_hold' });

    const res = await request(app)
      .patch(`/projects/${project.id}/status`)
      .send({ status: 'active' })
      .expect(200);

    expect(res.body.data.status).toBe('active');
  });

  test('on_hold → completed', async () => {
    const project = await createTestProject({ status: 'on_hold' });

    const res = await request(app)
      .patch(`/projects/${project.id}/status`)
      .send({ status: 'completed' })
      .expect(200);

    expect(res.body.data.status).toBe('completed');
  });

  // --- Invalid transitions ---

  test('completed → active is rejected', async () => {
    const project = await createTestProject({ status: 'active' });
    // First move to completed
    await request(app)
      .patch(`/projects/${project.id}/status`)
      .send({ status: 'completed' });

    const res = await request(app)
      .patch(`/projects/${project.id}/status`)
      .send({ status: 'active' })
      .expect(400);

    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    expect(res.body.error.message).toContain('Cannot transition from');
  });

  test('completed → on_hold is rejected', async () => {
    const project = await createTestProject({ status: 'active' });
    await request(app)
      .patch(`/projects/${project.id}/status`)
      .send({ status: 'completed' });

    const res = await request(app)
      .patch(`/projects/${project.id}/status`)
      .send({ status: 'on_hold' })
      .expect(400);

    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  // --- Same status (no-op) ---

  test('same status returns project unchanged', async () => {
    const project = await createTestProject({ status: 'active' });

    const res = await request(app)
      .patch(`/projects/${project.id}/status`)
      .send({ status: 'active' })
      .expect(200);

    expect(res.body.data.status).toBe('active');
  });

  // --- Validation ---

  test('rejects invalid status value', async () => {
    const project = await createTestProject();

    const res = await request(app)
      .patch(`/projects/${project.id}/status`)
      .send({ status: 'invalid' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rejects missing status', async () => {
    const project = await createTestProject();

    const res = await request(app)
      .patch(`/projects/${project.id}/status`)
      .send({})
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('returns 404 for non-existent project', async () => {
    const res = await request(app)
      .patch('/projects/non-existent/status')
      .send({ status: 'active' })
      .expect(404);

    expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
  });
});

// ============================================================
// 5. DELETE PROJECT (Soft Delete)
// ============================================================

describe('DELETE /projects/:id', () => {
  test('soft-deletes a project (returns 204)', async () => {
    const project = await createTestProject();

    await request(app).delete(`/projects/${project.id}`).expect(204);
  });

  test('soft-deleted project returns 404 on direct access', async () => {
    const project = await createTestProject();
    await request(app).delete(`/projects/${project.id}`);

    await request(app).get(`/projects/${project.id}`).expect(404);
  });

  test('returns 404 when deleting non-existent project', async () => {
    const res = await request(app).delete('/projects/non-existent').expect(404);
    expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
  });

  test('returns 404 when deleting already-deleted project', async () => {
    const project = await createTestProject();
    await request(app).delete(`/projects/${project.id}`).expect(204);

    // Second delete should 404
    await request(app).delete(`/projects/${project.id}`).expect(404);
  });
});
