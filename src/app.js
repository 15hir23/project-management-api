/**
 * Express Application Setup
 *
 * Separated from server.js so that tests can import the app
 * without starting the HTTP server (avoids port conflicts).
 */

const path = require('path');
const express = require('express');
const projectRoutes = require('./routes/projects.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ---------- Global Middleware ----------

// Parse JSON request bodies
app.use(express.json());

// ---------- Routes ----------

app.use('/projects', projectRoutes);

// Health check (useful during development / deployment)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Optional Web UI (for local testing — same actions as CLI)
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- 404 catch-all for unmatched routes ----------
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// ---------- Error Handler (must be last) ----------
app.use(errorHandler);

module.exports = app;
