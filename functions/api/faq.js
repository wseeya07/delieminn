// Verify auth token
function verifyAuth(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  const token = auth.split(' ')[1];
  return token === btoa(`${env.ADMIN_USER}:${env.ADMIN_PASS}`);
}

const REPO = 'wseeya07/delieminn';
const PATH = 'src/data/faq.json';

function ghHeaders(token) {
  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'DeliEminn-Admin'
  };
}

// GET /api/faq
export async function onRequestGet(context) {
  const { GITHUB_TOKEN } = context.env;
  if (!verifyAuth(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      headers: ghHeaders(GITHUB_TOKEN)
    });
    
    if (!res.ok) return Response.json({ faq: [], sha: '' });

    const file = await res.json();
    const content = decodeURIComponent(escape(atob(file.content)));
    return Response.json({ faq: JSON.parse(content), sha: file.sha });
  } catch {
    return Response.json({ faq: [], sha: '' });
  }
}

// POST /api/faq
export async function onRequestPost(context) {
  const { GITHUB_TOKEN } = context.env;
  if (!verifyAuth(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { faq, sha } = await context.request.json();
  if (!faq || !Array.isArray(faq) || !sha) {
    return Response.json({ error: 'Geçersiz veri veya SHA eksik.' }, { status: 400 });
  }

  try {
    const content = JSON.stringify(faq, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(content)));

    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      method: 'PUT',
      headers: ghHeaders(GITHUB_TOKEN),
      body: JSON.stringify({
        message: 'Admin: FAQ güncellendi',
        content: base64Content,
        sha: sha
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
