// Petit serveur statique pour tester le jeu en local
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const shotDir = process.env.SHOT_DIR || path.join(require('os').tmpdir(), 'cqr-shots');
http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/__shot')) {
    const name = (req.url.split('name=')[1] || 'shot').replace(/[^a-z0-9_-]/gi, '');
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      fs.mkdirSync(shotDir, { recursive: true });
      const f = path.join(shotDir, name + '.png');
      fs.writeFileSync(f, Buffer.from(body.split(',')[1], 'base64'));
      res.end(f);
    });
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': (types[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(8137, () => console.log('http://localhost:8137'));
