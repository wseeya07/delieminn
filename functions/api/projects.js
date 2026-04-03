// Verify auth token
function verifyAuth(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  const token = auth.split(' ')[1];
  return token === btoa(`${env.ADMIN_USER}:${env.ADMIN_PASS}`);
}

const REPO = 'wseeya07/delieminn';
const PATH = 'src/content/projects';

function ghHeaders(token) {
  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'DeliEminn-Admin'
  };
}

// GET /api/projects
export async function onRequestGet(context) {
  const { GITHUB_TOKEN } = context.env;
  if (!verifyAuth(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      headers: ghHeaders(GITHUB_TOKEN)
    });
    if (!res.ok) return Response.json([]);

    const files = await res.json();
    const projects = [];

    for (const file of files) {
      if (!file.name.endsWith('.md')) continue;
      const contentRes = await fetch(file.download_url, { headers: { 'User-Agent': 'DeliEminn-Admin' } });
      const content = await contentRes.text();

      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (!match) continue;

      const fm = {};
      match[1].split('\n').forEach(line => {
        const [key, ...vals] = line.split(':');
        if (key && vals.length) fm[key.trim()] = vals.join(':').trim().replace(/^["']|["']$/g, '');
      });

      projects.push({ ...fm, filename: file.name, sha: file.sha });
    }

    projects.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return Response.json(projects);
  } catch {
    return Response.json([]);
  }
}

// POST /api/projects
export async function onRequestPost(context) {
  const { GITHUB_TOKEN } = context.env;
  if (!verifyAuth(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, description, videoUrl, category, brand, date } = await context.request.json();
  if (!title || !description) {
    return Response.json({ error: 'Başlık ve açıklama zorunlu.' }, { status: 400 });
  }

  const slug = title.toLowerCase()
    .replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/Ü/g, 'u').replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ç/g, 'c').replace(/Ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);

  const projDate = date || new Date().toISOString().split('T')[0];

  let md = `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndate: ${projDate}`;
  if (videoUrl) md += `\nvideoUrl: "${videoUrl}"`;
  md += `\ncategory: "${category || 'Modifiye'}"`;
  if (brand) md += `\nbrand: "${brand}"`;
  md += `\n---\n\n${description}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}/${slug}.md`, {
      method: 'PUT',
      headers: ghHeaders(GITHUB_TOKEN),
      body: JSON.stringify({
        message: `Yeni proje: ${title}`,
        content: btoa(unescape(encodeURIComponent(md)))
      })
    });

    if (!res.ok) {
      const err = await res.json();
      return Response.json({ error: err.message || 'GitHub hatası' }, { status: 500 });
    }
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// DELETE /api/projects
export async function onRequestDelete(context) {
  const { GITHUB_TOKEN } = context.env;
  if (!verifyAuth(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { filename, sha } = await context.request.json();
  if (!filename || !sha) {
    return Response.json({ error: 'Dosya bilgisi eksik.' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}/${filename}`, {
      method: 'DELETE',
      headers: ghHeaders(GITHUB_TOKEN),
      body: JSON.stringify({
        message: `Proje silindi: ${filename}`,
        sha: sha
      })
    });

    if (!res.ok) {
      const err = await res.json();
      return Response.json({ error: err.message || 'Silinemedi' }, { status: 500 });
    }
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
