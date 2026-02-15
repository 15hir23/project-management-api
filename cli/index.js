/**
 * Terminal CLI for Project Management API
 *
 * UI added only for local testing convenience. Not part of assignment scope.
 *
 * Menu-driven interface that communicates with the running API via HTTP requests.
 * Uses the built-in Node.js `readline` module and native `fetch` (Node 18+).
 *
 * Usage:
 *   1. Start the API server:  npm start
 *   2. In another terminal:   npm run cli
 */

const readline = require('readline');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// ---------- HTTP Helper ----------

/**
 * Make an HTTP request to the API and return parsed JSON.
 * Handles non-2xx responses by printing the error body.
 */
async function apiRequest(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, options);
    // 204 No Content (e.g. delete)
    if (response.status === 204) {
      return { success: true, status: 204 };
    }
    const data = await response.json();
    if (!response.ok) {
      return { success: false, status: response.status, error: data.error };
    }
    return { success: true, status: response.status, data: data.data };
  } catch (err) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: err.message } };
  }
}

// ---------- Readline Setup ----------

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

// ---------- Menu Actions ----------

async function createProject() {
  console.log('\n--- Create Project ---');
  const name = await ask('Project name: ');
  const clientName = await ask('Client name: ');
  const startDate = await ask('Start date (YYYY-MM-DD): ');
  const endDate = await ask('End date (YYYY-MM-DD, or leave empty): ');
  const status = await ask('Status (active/on_hold/completed, or leave empty for active): ');

  const body = {
    name,
    clientName,
    startDate,
  };
  if (endDate.trim()) body.endDate = endDate.trim();
  if (status.trim()) body.status = status.trim();

  const result = await apiRequest('POST', '/projects', body);
  if (result.success) {
    console.log('\nProject created successfully:');
    console.table(result.data);
  } else {
    console.log(`\nError [${result.error.code}]: ${result.error.message}`);
  }
}

async function listProjects() {
  console.log('\n--- List Projects ---');
  const status = await ask('Filter by status (active/on_hold/completed, or leave empty): ');
  const search = await ask('Search (name or client, or leave empty): ');
  const sort = await ask('Sort by (createdAt/startDate, or leave empty): ');
  const order = await ask('Order (asc/desc, or leave empty): ');

  const params = new URLSearchParams();
  if (status.trim()) params.set('status', status.trim());
  if (search.trim()) params.set('search', search.trim());
  if (sort.trim()) params.set('sort', sort.trim());
  if (order.trim()) params.set('order', order.trim());

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const result = await apiRequest('GET', `/projects${queryString}`);

  if (result.success) {
    if (result.data.length === 0) {
      console.log('\nNo projects found.');
    } else {
      console.log(`\nFound ${result.data.length} project(s):\n`);
      result.data.forEach((p, i) => {
        console.log(`  ${i + 1}. [${p.status.toUpperCase()}] ${p.name} — ${p.clientName} (ID: ${p.id})`);
        console.log(`     Start: ${p.startDate} | End: ${p.endDate || 'N/A'}`);
      });
    }
  } else {
    console.log(`\nError [${result.error.code}]: ${result.error.message}`);
  }
}

async function getProject() {
  console.log('\n--- Get Project by ID ---');
  const id = await ask('Project ID: ');

  const result = await apiRequest('GET', `/projects/${id.trim()}`);
  if (result.success) {
    console.log('\nProject details:');
    console.table(result.data);
  } else {
    console.log(`\nError [${result.error.code}]: ${result.error.message}`);
  }
}

async function updateStatus() {
  console.log('\n--- Update Project Status ---');
  const id = await ask('Project ID: ');
  console.log('Allowed transitions:');
  console.log('  active   → on_hold | completed');
  console.log('  on_hold  → active  | completed');
  console.log('  completed → (none)');
  const status = await ask('New status: ');

  const result = await apiRequest('PATCH', `/projects/${id.trim()}/status`, {
    status: status.trim(),
  });
  if (result.success) {
    console.log('\nStatus updated successfully:');
    console.table(result.data);
  } else {
    console.log(`\nError [${result.error.code}]: ${result.error.message}`);
  }
}

async function deleteProject() {
  console.log('\n--- Delete Project ---');
  const id = await ask('Project ID: ');
  const confirm = await ask('Are you sure? (y/n): ');

  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    return;
  }

  const result = await apiRequest('DELETE', `/projects/${id.trim()}`);
  if (result.success) {
    console.log('\nProject deleted (soft delete) successfully.');
  } else {
    console.log(`\nError [${result.error.code}]: ${result.error.message}`);
  }
}

// ---------- Main Menu ----------

async function showMenu() {
  console.log('\n====================================');
  console.log('  Project Management API — CLI');
  console.log('====================================');
  console.log('  1. Create project');
  console.log('  2. List projects');
  console.log('  3. Get project by ID');
  console.log('  4. Update project status');
  console.log('  5. Delete project');
  console.log('  0. Exit');
  console.log('------------------------------------');

  const choice = await ask('Choose an option: ');

  switch (choice.trim()) {
    case '1':
      await createProject();
      break;
    case '2':
      await listProjects();
      break;
    case '3':
      await getProject();
      break;
    case '4':
      await updateStatus();
      break;
    case '5':
      await deleteProject();
      break;
    case '0':
      console.log('Goodbye!');
      rl.close();
      process.exit(0);
    default:
      console.log('Invalid option. Please try again.');
  }

  // Loop back to menu
  await showMenu();
}

// ---------- Start ----------

console.log('Connecting to API at:', BASE_URL);
console.log('Make sure the server is running (npm start).\n');
showMenu();
