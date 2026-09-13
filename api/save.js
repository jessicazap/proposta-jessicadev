// /api/save — recebe o HTML editado no painel e commita direto em
// index.html e admin.html no repositório do GitHub (os dois ficam sempre
// idênticos — admin.html só existe pra /admin funcionar nativamente pelo
// cleanUrls da Vercel). A Vercel já está conectada ao GitHub, então esse
// commit sozinho dispara um novo deploy automático (~30-60s).
//
// Segurança: a proteção de verdade está AQUI, não no painel visual. Só aceita
// a gravação se o header Authorization trouxer exatamente o ADMIN_SECRET
// configurado nas variáveis de ambiente da Vercel.

const OWNER = 'jessicazap';
const REPO = 'proposta-jessicadev';
const FILE_PATHS = ['index.html', 'admin.html'];
const BRANCH = 'main';

async function writeFile(path, html, ghHeaders) {
  const apiBase = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + path;

  const getResp = await fetch(apiBase + '?ref=' + BRANCH, { headers: ghHeaders });
  if (!getResp.ok) {
    const detail = await getResp.text();
    return { ok: false, error: 'github_read_failed', status: getResp.status, detail: detail.slice(0, 400), path };
  }
  const current = await getResp.json();

  const contentB64 = Buffer.from(html, 'utf-8').toString('base64');
  const putResp = await fetch(apiBase, {
    method: 'PUT',
    headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders),
    body: JSON.stringify({
      message: 'Editado via painel — ' + new Date().toISOString(),
      content: contentB64,
      sha: current.sha,
      branch: BRANCH
    })
  });
  if (!putResp.ok) {
    const detail = await putResp.text();
    return { ok: false, error: 'github_write_failed', status: putResp.status, detail: detail.slice(0, 400), path };
  }
  const result = await putResp.json();
  return { ok: true, path, commit: result.commit && result.commit.sha };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const secret = (process.env.ADMIN_SECRET || '').trim();
  if (!secret || token !== secret) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const ghToken = process.env.GITHUB_TOKEN;
  if (!ghToken) {
    res.status(500).json({ error: 'server_misconfigured', detail: 'GITHUB_TOKEN ausente nas variáveis de ambiente' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  const html = body && body.html;
  if (!html || typeof html !== 'string' || html.length < 200) {
    res.status(400).json({ error: 'invalid_html' });
    return;
  }
  if (html.length > 3 * 1024 * 1024) {
    res.status(413).json({ error: 'too_large' });
    return;
  }

  const ghHeaders = {
    'Authorization': 'Bearer ' + ghToken,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'jessicadev-proposta-editor'
  };

  try {
    // grava index.html e admin.html em sequência (dois commits pequenos) —
    // mantém os dois sempre idênticos, sem precisar de rewrite/middleware.
    const results = [];
    for (const path of FILE_PATHS) {
      const r = await writeFile(path, html, ghHeaders);
      results.push(r);
      if (!r.ok) {
        res.status(502).json({ error: r.error, status: r.status, detail: r.detail, path: r.path, partial: results });
        return;
      }
    }
    res.status(200).json({ ok: true, files: results.map(r => ({ path: r.path, commit: r.commit })) });
  } catch (err) {
    res.status(500).json({ error: 'exception', detail: String(err && err.message || err).slice(0, 400) });
  }
}
