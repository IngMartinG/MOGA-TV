const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
  // CORS headers for everything
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const parsed = url.parse(req.url, true);

  // ── Serve index.html ──────────────────────────────────────
  if (parsed.pathname === '/' || parsed.pathname === '/index.html') {
    const file = path.join(__dirname, 'index.html');
    if (fs.existsSync(file)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200);
      fs.createReadStream(file).pipe(res);
    } else {
      res.writeHead(404); res.end('index.html not found');
    }
    return;
  }

  // ── Proxy M3U lists: /proxy?url=... ──────────────────────
  if (parsed.pathname === '/proxy') {
    const targetUrl = parsed.query.url;
    if (!targetUrl) { res.writeHead(400); res.end('Missing url param'); return; }

    console.log('[PROXY] Fetching:', targetUrl);

    const target = url.parse(targetUrl);
    const options = {
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: target.path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (IPTV Player)',
        'Accept': '*/*',
      },
      timeout: 20000,
    };

    const proto = target.protocol === 'https:' ? https : http;
    const proxyReq = proto.request(options, (proxyRes) => {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.writeHead(proxyRes.statusCode);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (e) => {
      console.error('[PROXY ERROR]', e.message);
      res.writeHead(502);
      res.end('Proxy error: ' + e.message);
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.writeHead(504);
      res.end('Timeout');
    });

    proxyReq.end();
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║          MOGA TV - Servidor           ║');
  console.log('║                                       ║');
  console.log(`║  Abre en tu navegador:                ║`);
  console.log(`║  http://localhost:${PORT}              ║`);
  console.log('║                                       ║');
  console.log('║  Para cerrar: Ctrl + C                ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
});
