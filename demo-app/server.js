// Tiny demo app (no dependencies) that looks like a typical AI-builder app:
// sign up, log in, a protected dashboard and one core feature (notes).
// Set DEMO_BUG to make it break the way real apps break after an update:
//   DEMO_BUG=auth  dashboard no longer checks the session
//   DEMO_BUG=save  new notes are not saved
//   DEMO_BUG=leak  a secret key ends up in the page JavaScript
const http = require('node:http');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 4173);
const BUG = process.env.DEMO_BUG || '';

// email -> { salt, hash }
const users = new Map();
// session token -> email
const sessions = new Map();
// email -> [note]
const notes = new Map();

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

function addUser(email, password) {
  const salt = crypto.randomBytes(16).toString('hex');
  users.set(email, { salt, hash: hashPassword(password, salt) });
  notes.set(email, []);
}

function checkPassword(email, password) {
  const user = users.get(email);
  if (!user) return false;
  const given = Buffer.from(hashPassword(password, user.salt), 'hex');
  return crypto.timingSafeEqual(given, Buffer.from(user.hash, 'hex'));
}

// Seed user for the login test (test values only, see .env.example).
addUser('test@example.com', 'test-password-123');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} | NoteNest</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 480px; margin: 40px auto; padding: 0 16px; }
  label { display: block; margin-top: 12px; }
  input { width: 100%; padding: 8px; box-sizing: border-box; }
  button { margin-top: 16px; padding: 8px 16px; }
  .error { color: #b00020; }
</style>
<script src="/app.js" defer></script>
</head>
<body>
<nav><a href="/">NoteNest</a></nav>
${body}
</body>
</html>`;
}

function getSession(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)sid=([a-f0-9]+)/);
  return match ? sessions.get(match[1]) : undefined;
}

function readForm(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 10_000) {
        reject(new Error('body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(Object.fromEntries(new URLSearchParams(data))));
    req.on('error', reject);
  });
}

function send(res, status, html, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(html);
}

function redirect(res, location, headers = {}) {
  res.writeHead(303, { Location: location, ...headers });
  res.end();
}

function startSession(res, email) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, email);
  redirect(res, '/dashboard', { 'Set-Cookie': `sid=${token}; HttpOnly; SameSite=Lax; Path=/` });
}

function authForm(kind, error = '') {
  const isSignup = kind === 'signup';
  return page(isSignup ? 'Sign up' : 'Log in', `
<h1>${isSignup ? 'Create your account' : 'Log in'}</h1>
${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ''}
<form method="post" action="/${kind}">
  <label for="email">Email</label>
  <input id="email" name="email" type="email" required>
  <label for="password">Password</label>
  <input id="password" name="password" type="password" minlength="8" required>
  <button type="submit">${isSignup ? 'Sign up' : 'Log in'}</button>
</form>
<p>${isSignup ? 'Have an account? <a href="/login">Log in</a>' : 'New here? <a href="/signup">Sign up</a>'}</p>`);
}

const appJs = () => {
  // The publishable key is meant to be public. The leak bug adds a secret one,
  // built from parts so this file itself does not trip secret scanners.
  const lines = ["window.APP_CONFIG = { stripePublishableKey: 'pk_test_demo' };"];
  if (BUG === 'leak') lines.push(`window.APP_CONFIG.stripeSecret = '${'sk_' + 'live_' + 'D3m0'.repeat(6)}';`);
  return lines.join('\n');
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const email = getSession(req);

  try {
    if (req.method === 'GET' && url.pathname === '/') {
      return send(res, 200, page('Home', `
<h1>NoteNest</h1>
<p>Keep your notes in one place.</p>
<p>${email ? '<a href="/dashboard">Go to dashboard</a>' : '<a href="/signup">Sign up</a> or <a href="/login">Log in</a>'}</p>`));
    }

    if (req.method === 'GET' && url.pathname === '/app.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      return res.end(appJs());
    }

    if (req.method === 'GET' && (url.pathname === '/signup' || url.pathname === '/login')) {
      return send(res, 200, authForm(url.pathname.slice(1)));
    }

    if (req.method === 'POST' && url.pathname === '/signup') {
      const form = await readForm(req);
      const newEmail = String(form.email || '').trim().toLowerCase();
      const password = String(form.password || '');
      if (!/^[^@\s]+@[^@\s]+$/.test(newEmail) || password.length < 8) {
        return send(res, 400, authForm('signup', 'Enter a valid email and a password of 8+ characters.'));
      }
      if (users.has(newEmail)) return send(res, 409, authForm('signup', 'That email is already registered.'));
      addUser(newEmail, password);
      return startSession(res, newEmail);
    }

    if (req.method === 'POST' && url.pathname === '/login') {
      const form = await readForm(req);
      const loginEmail = String(form.email || '').trim().toLowerCase();
      if (!checkPassword(loginEmail, String(form.password || ''))) {
        return send(res, 401, authForm('login', 'Wrong email or password.'));
      }
      return startSession(res, loginEmail);
    }

    if (req.method === 'POST' && url.pathname === '/logout') {
      const match = (req.headers.cookie || '').match(/(?:^|;\s*)sid=([a-f0-9]+)/);
      if (match) sessions.delete(match[1]);
      return redirect(res, '/', { 'Set-Cookie': 'sid=; Max-Age=0; Path=/' });
    }

    if (url.pathname === '/dashboard') {
      if (!email && BUG !== 'auth') return redirect(res, '/login');
      const owner = email || 'test@example.com';
      if (req.method === 'POST') {
        const form = await readForm(req);
        const text = String(form.note || '').trim().slice(0, 200);
        if (text && BUG !== 'save') notes.get(owner).push(text);
        return redirect(res, '/dashboard');
      }
      const list = notes.get(owner).map((n) => `<li>${escapeHtml(n)}</li>`).join('');
      return send(res, 200, page('Dashboard', `
<h1>Your notes</h1>
<p>Signed in as ${escapeHtml(owner)}</p>
<form method="post" action="/dashboard">
  <label for="note">New note</label>
  <input id="note" name="note" required maxlength="200">
  <button type="submit">Add note</button>
</form>
<ul aria-label="Notes">${list}</ul>
<form method="post" action="/logout"><button type="submit">Log out</button></form>`));
    }

    send(res, 404, page('Not found', '<h1>Page not found</h1>'));
  } catch {
    send(res, 500, page('Error', '<h1>Something went wrong</h1>'));
  }
});

server.listen(PORT, () => {
  console.log(`Demo app on http://localhost:${PORT}${BUG ? ` (DEMO_BUG=${BUG})` : ''}`);
});
