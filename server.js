const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec } = require('child_process');

const HTTP_PORT = 3000;
const HTTPS_PORT = 3443;
const TOKEN_FILE = '/dev/shm/smarthome-tokens.json';

let tokens = new Set();
try { tokens = new Set(JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))); } catch {}

function saveTokens() {
  try { fs.writeFileSync(TOKEN_FILE, JSON.stringify([...tokens])); } catch {}
}

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => resolve(body));
  });
}

function json(res, status, data, corsOrigin) {
  const headers = { 'Content-Type': 'application/json' };
  if (corsOrigin !== undefined) {
    headers['Access-Control-Allow-Origin'] = corsOrigin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Api-Key';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
}

const handler = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;
  const origin = req.headers.origin || '*';

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  // ─── Google Smart Home OAuth ──────────────────────────────────────

  if (url.pathname === '/oauth2/authorize' && method === 'GET') {
    const redirectUri = url.searchParams.get('redirect_uri') || '';
    const state = url.searchParams.get('state') || '';
    const token = crypto.randomBytes(16).toString('hex');
    tokens.add(token);
    saveTokens();
    res.writeHead(302, { Location: `${redirectUri}#access_token=${token}&token_type=bearer&state=${state}` });
    res.end();
    return;
  }

  if (url.pathname === '/oauth2/token' && method === 'POST') {
    const body = await readBody(req);
    const params = new URLSearchParams(body);
    const token = crypto.randomBytes(16).toString('hex');
    tokens.add(token);
    saveTokens();
    json(res, 200, { token_type: 'bearer', access_token: token, expires_in: 86400 }, origin);
    return;
  }

  // ─── Google Smart Home Fulfillment ────────────────────────────────

  if (url.pathname === '/api/smarthome' && method === 'POST') {
    const auth = req.headers['authorization'] || '';
    const token = auth.replace('Bearer ', '').trim();
    if (!tokens.has(token)) {
      json(res, 401, { error: 'unauthorized' }, origin);
      return;
    }

    const body = await readBody(req);
    const request = JSON.parse(body);
    const intent = request.inputs[0].intent;
    const response = { requestId: request.requestId };

    if (intent === 'action.devices.SYNC') {
      response.payload = {
        agentUserId: 'user-1',
        devices: [{
          id: 'server-007',
          type: 'action.devices.types.SWITCH',
          traits: ['action.devices.traits.OnOff'],
          name: { name: 'Server', nicknames: ['server', 'the server', 'my server', 'computer', 'pc'] },
          willReportState: false,
          roomHint: 'office'
        }]
      };
    } else if (intent === 'action.devices.QUERY') {
      response.payload = {
        devices: { 'server-007': { on: true, status: 'SUCCESS' } }
      };
    } else if (intent === 'action.devices.EXECUTE') {
      const command = request.inputs[0].payload.commands[0];
      const execution = command.execution[0];
      const deviceId = command.devices[0].id;

      if (execution.command === 'action.devices.commands.OnOff' && !execution.params.on) {
        setTimeout(() => exec('sudo shutdown -h now', err => {
          if (err) console.error('Shutdown failed:', err.message);
          else console.log('Server shutting down via Google Home...');
        }), 1000);
      }

      response.payload = {
        commands: [{ ids: [deviceId], status: 'SUCCESS', states: { on: execution.params.on } }]
      };
    }

    json(res, 200, response, origin);
    return;
  }

  // ─── Direct shutdown endpoint (for testing / other integrations) ──

  if (url.pathname === '/api/shutdown' && method === 'POST') {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== 'server-shutdown-key') {
      json(res, 401, { error: 'unauthorized' }, origin);
      return;
    }
    exec('sudo shutdown -h now', err => {
      if (err) { json(res, 500, { error: 'shutdown_failed', message: err.message }, origin); return; }
      json(res, 200, { status: 'shutting_down' }, origin);
    });
    return;
  }

  // ─── Existing uptime endpoint ─────────────────────────────────────

  if (url.pathname === '/api/uptime' && method === 'GET') {
    const uptime = os.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    json(res, 200, {
      status: 'ok',
      uptime: `${days}d ${hours}h ${minutes}m`,
      started: new Date(Date.now() - uptime * 1000).toISOString()
    }, '*');
    return;
  }

  // ─── Static files ─────────────────────────────────────────────────

  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - Not Found</h1>');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });
    res.end(data);
  });
};

http.createServer(handler).listen(HTTP_PORT, () => {
  console.log(`HTTP server on http://localhost:${HTTP_PORT}`);
});

const options = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
};
https.createServer(options, handler).listen(HTTPS_PORT, () => {
  console.log(`HTTPS server on https://localhost:${HTTPS_PORT}`);
});
