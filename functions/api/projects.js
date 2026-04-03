// Verify auth token from request
function verifyAuth(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  const token = auth.split(' ')[1];
  const expected = btoa(`${env.ADMIN_USER}:${env.ADMIN_PASS}`);
  return token === expected;
}

// GET /api/projects - list existing projects
export async function onRequestGet(context) {
  const { GITHUB_TOKEN } = context.env;
  if (!verifyAuth(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch('https://api.github.com/repos/wseeya07/delieminn/contents/src/content/projects', {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DeliEminn-Admin'
      }
    });

    if (!res.ok) return Response.json([]);

    const files = await res.json();
    const projects = [];

    for (const file of files) {
      if (!file.name.endsWith('.md')) continue;
      const contentRes = await fetch(file.download_url, { headers: { 'User-Agent': 'DeliEminn-Admin' } });
      const content = await contentRes.text();

      // Parse frontmatter
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (!match) continue;

      const frontmatter = {};
      match[1].split('\n').forEach(line => {
        const [key, ...vals] = line.split(':');
        if (key && vals.length) frontmatter[key.trim()] = vals.join(':').trim().replace(/^["']|["']$/g, '');
      });

      projects.push({ ...frontmatter, filename: file.name });
    }

    return Response.json(projects);
  } catch {
    return Response.json([]);
  }
}

// POST /api/projects - create new project
export async function onRequestPost(context) {
  const { GITHUB_TOKEN } = context.env;
  if (!verifyAuth(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, description, videoUrl, category, brand } = await context.request.json();

  if (!title || !description) {
    return Response.json({ error: 'Başlık ve açıklama zorunlu.' }, { status: 400 });
  }

  // Generate slug from title
  const slug = title
    .toLowerCase()
    .replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/Ü/g, 'u').replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ç/g, 'c').replace(/Ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);

  const date = new Date().toISOString().split('T')[0];
  const filename = `${slug}.md`;

  // Build markdown content
  let md = `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndate: ${date}\ndescription: "${description.replace(/"/g, '\\"')}"`;
  if (videoUrl) md += `\nvideoUrl: "${videoUrl}"`;
  md += `\ncategory: "${category || 'Modifiye'}"`;
  if (brand) md += `\nbrand: "${brand}"`;
  md += `\n---\n`;

  // Commit to GitHub
  try {
    const res = await fetch(`https://api.github.com/repos/wseeya07/delieminn/contents/src/content/projects/${filename}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DeliEminn-Admin'
      },
      body: JSON.stringify({
        message: `Yeni proje: ${title}`,
        content: btoa(unescape(encodeURIComponent(md)))
      })
    });

    if (!res.ok) {
      const err = await res.json();
      return Response.json({ error: err.message || 'GitHub hatası' }, { status: 500 });
    }

    return Response.json({ success: true, filename });
  } catch (error) {
    return Response.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
