# Project Management API

A RESTful API for managing internal projects. Built with Node.js and Express.

## Setup Instructions

### Prerequisites

- Node.js 18+ (uses built-in `crypto.randomUUID()`)
- npm

### Install & Run

```bash
# Install dependencies
npm install

# Start the server (port 3000 by default)
npm start

# Start with file-watching for development (Node 18+)
npm run dev

# Run tests
npm test

# To perform API actions, choose one (server must be running):
#   Terminal:  npm run cli
#   Browser:   open http://localhost:3000
```

The server starts at `http://localhost:3000`. Set the `PORT` environment variable to change it.

### Troubleshooting: Port 3000 already in use

If you see **"Port 3000 is already in use"**, another process (often a previous server instance) is using that port.

**Option A — Stop the process using port 3000 (Windows)**

```powershell
# Find the process ID (PID) using port 3000
netstat -ano | findstr :3000

# Stop it (replace <PID> with the number from the last column)
taskkill /PID <PID> /F
```

Then run `npm start` again.

**Option B — Use a different port**

```powershell
# PowerShell
$env:PORT=3001; npm start
```

Then open **http://localhost:3001** in your browser (or run `npm run cli` with `$env:API_URL="http://localhost:3001"` if using the CLI).

### Deploy on Vercel

1. Push this repo to GitHub (if you haven’t).
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import your `project-management-api` repo.
3. Leave **Build Command** and **Output Directory** empty. Click **Deploy**.

Vercel will detect the Express app from `src/app.js` ([Express on Vercel](https://vercel.com/guides/using-express-with-vercel)). The Web UI is served from the `public/` folder.

**Note:** On Vercel the app runs as serverless functions. The **in-memory store does not persist** across requests or instances — data may be lost between requests. For a demo or assignment submission this is fine; for real persistence you’d add a database.

---

## Project Structure

```
src/
├── server.js                  # Entry point — starts the HTTP server
├── app.js                     # Express app setup (routes, middleware)
├── routes/
│   └── projects.routes.js     # Route definitions (thin — no logic)
├── controllers/
│   └── projects.controller.js # Request/response handling
├── services/
│   └── projects.service.js    # Business logic & state transitions
├── data/
│   └── projects.store.js      # In-memory data store (DB-swappable)
├── validators/
│   └── projects.validator.js  # Input validation (manual, no libraries)
├── middleware/
│   └── errorHandler.js        # Global error-handling middleware
└── utils/
    └── errors.js              # Custom AppError class

cli/
└── index.js                   # Terminal UI for manual testing

public/
└── index.html                 # Optional Web UI (plain HTML + JS)

tests/
└── projects.test.js           # Integration tests (33 tests)
```

---

## API Documentation

### Base URL

```
http://localhost:3000
```

### Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

### Endpoints

---

#### 1. Create Project

```
POST /projects
```

**Request Body:**

```json
{
  "name": "Website Redesign",
  "clientName": "Acme Corp",
  "status": "active",
  "startDate": "2026-01-15",
  "endDate": "2026-06-30"
}
```

| Field        | Required | Notes                                         |
|-------------|----------|-----------------------------------------------|
| name        | Yes      | Non-empty string                              |
| clientName  | Yes      | Non-empty string                              |
| status      | No       | Defaults to `"active"`. Must be one of: `active`, `on_hold`, `completed` |
| startDate   | Yes      | Valid ISO date string                         |
| endDate     | No       | Must be >= startDate if provided              |

**Success Response (201):**

```json
{
  "data": {
    "id": "a1b2c3d4-...",
    "name": "Website Redesign",
    "clientName": "Acme Corp",
    "status": "active",
    "startDate": "2026-01-15",
    "endDate": "2026-06-30",
    "isDeleted": false,
    "createdAt": "2026-02-14T10:00:00.000Z",
    "updatedAt": "2026-02-14T10:00:00.000Z"
  }
}
```

**Error Response (400):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "name is required and must be a non-empty string; startDate is required"
  }
}
```

---

#### 2. List Projects

```
GET /projects
```

**Query Parameters (all optional):**

| Param   | Description                                      |
|---------|--------------------------------------------------|
| status  | Filter by status: `active`, `on_hold`, `completed` |
| search  | Case-insensitive match on `name` OR `clientName` |
| sort    | Sort field: `createdAt` (default) or `startDate` |
| order   | Sort order: `desc` (default) or `asc`            |

Filters work together (AND logic). Soft-deleted projects are always excluded.

**Example:**

```
GET /projects?status=active&search=acme&sort=startDate&order=asc
```

**Success Response (200):**

```json
{
  "data": [
    {
      "id": "...",
      "name": "Website Redesign",
      "clientName": "Acme Corp",
      "status": "active",
      "startDate": "2026-01-15",
      "endDate": "2026-06-30",
      "isDeleted": false,
      "createdAt": "2026-02-14T10:00:00.000Z",
      "updatedAt": "2026-02-14T10:00:00.000Z"
    }
  ]
}
```

---

#### 3. Get Project by ID

```
GET /projects/:id
```

**Success Response (200):**

```json
{
  "data": {
    "id": "a1b2c3d4-...",
    "name": "Website Redesign",
    ...
  }
}
```

**Error Response (404):**

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project with id 'abc' not found"
  }
}
```

---

#### 4. Update Project Status

```
PATCH /projects/:id/status
```

**Request Body:**

```json
{
  "status": "on_hold"
}
```

**Allowed State Transitions:**

```
active     → on_hold | completed
on_hold    → active  | completed
completed  → (no transitions — terminal state)
```

**Success Response (200):**

```json
{
  "data": {
    "id": "...",
    "status": "on_hold",
    "updatedAt": "2026-02-14T12:00:00.000Z",
    ...
  }
}
```

**Error Response (400) — Invalid Transition:**

```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition from 'completed' to 'active'"
  }
}
```

---

#### 5. Delete Project (Soft Delete)

```
DELETE /projects/:id
```

**Success Response:** `204 No Content`

**Error Response (404):**

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project with id 'abc' not found"
  }
}
```

After deletion:
- The project will **not** appear in `GET /projects` results
- Accessing it via `GET /projects/:id` returns **404**
- Deleting it again returns **404**

---

## State Transition Explanation

The project status follows a directed acyclic graph:

```
  ┌─────────┐
  │  active  │──────────────────┐
  └────┬─────┘                  │
       │                        ▼
       ▼                  ┌───────────┐
  ┌─────────┐             │ completed │  (terminal — no exit)
  │ on_hold │─────────────▶           │
  └────┬─────┘             └───────────┘
       │
       ▼
  ┌─────────┐
  │  active  │  (on_hold can return to active)
  └─────────┘
```

**Rules:**
- `completed` is a **terminal state** — once a project is completed, it cannot be changed.
- `active` and `on_hold` can move to each other freely, and both can move to `completed`.
- Requesting the same status (e.g., active → active) is a no-op and returns the project unchanged.
- The transition map is defined as an explicit allowlist in `src/services/projects.service.js`.

---

## Assumptions & Trade-offs

1. **In-memory storage**: Data is lost on restart. The store is structured with async functions to make a future database swap trivial.

2. **`isDeleted` field for soft delete**: This is the ONE additional field added to the entity. It is justified because soft delete is a requirement, and a boolean flag is the simplest correct implementation. It is used by the store's `findAll` (excludes deleted) and the service's `getProjectById` (returns 404 for deleted).

3. **No authentication/authorization**: Not in scope. All endpoints are open.

4. **No pagination**: The assignment doesn't mention it. For an internal tool with in-memory storage, listing all projects is fine.

5. **Manual validation over Joi/Zod**: The spec says "no magic libraries" and "every line must be explainable." Manual validation is more verbose but fully transparent.

6. **`crypto.randomUUID()` over `uuid` package**: Node 18+ provides this natively. Avoids an external dependency for something the runtime already does.

7. **Same-status updates are no-ops**: If you PATCH status to the same value, it succeeds and returns the unchanged project. This is deliberate — it's idempotent and avoids confusing errors.

8. **Multiple validation errors returned at once**: On create, all validation issues are collected and returned in a single response, rather than failing on the first one. This improves the developer experience.

---

## Testing

33 integration tests covering:

- **Create validation**: missing fields, invalid status, endDate before startDate
- **List filtering**: by status, by search, combined filters, sorting, empty results
- **Status transitions**: all 4 valid transitions, 2 invalid transitions (from completed), same-status no-op
- **Soft delete**: 204 on delete, 404 on access after delete, 404 on double-delete

Run tests:

```bash
npm test
```

---

## Testing the API — Choose Your Interface

> **UIs added only for local testing convenience. Not part of assignment scope.**

Start the server first, then use **either** the terminal CLI **or** the web UI to perform actions.

```bash
npm start
```

### Option A — Terminal CLI

In a **second terminal**:

```bash
npm run cli
```

Menu-driven: Create project, List projects, Get by ID, Update status, Delete project.

### Option B — Web UI

In your browser open:

**http://localhost:3000**

Same actions as the CLI: create, list (with filters/sort), get by ID, update status, delete. No frameworks — plain HTML and JavaScript.

---

## AI Usage Disclosure

### Tools Used

- **Cursor** (IDE with integrated AI): Used to implement the project structure, write code, generate documentation, and run commands. AI assistance (e.g. Claude) was used within Cursor for implementation and edits.

### What Was Generated vs. Modified

- The initial code structure, implementations, and tests were generated with AI assistance.
- All code was reviewed, understood, and verified to be correct before inclusion.
- The AI suggested using the `uuid` npm package initially; this was **rejected** in favor of Node's built-in `crypto.randomUUID()` to reduce dependencies.

### What I Fully Understand vs. Partially

- **Fully understand**: Express routing, middleware chain, error handling pattern, REST API design, state machine transitions, soft delete pattern, in-memory store structure, all validation logic, test structure.
- **Partially understand**: N/A — all code in this project uses fundamental Node.js and Express patterns that are straightforward to explain.

### What Was Rejected

- `uuid` npm package — replaced with `crypto.randomUUID()` (zero dependencies)
- Validation libraries (Joi, Zod) — manual validation for transparency
- ORMs — direct data access as required
- Complex project scaffolding — kept minimal and flat
