/**
 * Server Entry Point
 *
 * Starts the Express HTTP server.
 * Separated from app.js so tests can import the app without binding a port.
 */

const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Project Management API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('Leave this terminal open. Press Ctrl+C to stop.');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process or set PORT to another number.`);
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});
