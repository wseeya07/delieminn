// Verify auth token
function verifyAuth(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  const token = auth.split(' ')[1];
  return token === btoa(`${env.ADMIN_USER}:${env.ADMIN_PASS}`);
}

const REPO = 'wseeya07/delieminn';

function ghHeaders(token) {
  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'DeliEminn-Admin'
  };
}

// POST /api/upload
export async function onRequestPost(context) {
  const { GITHUB_TOKEN } = context.env;
  if (!verifyAuth(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { filename, base64 } = await context.request.json();
  if (!filename || !base64) {
    return Response.json({ error: 'Dosya bilgisi eksik.' }, { status: 400 });
  }

  // Güvenli dosya adı oluştur ve timestamp ekle ki çakışmasın
  const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
  const filePath = `public/images/projects/${safeFilename}`;

  // Eğer base64 verisi 'data:image/jpeg;base64,' gibi bir prefix ile gelirse, onu temizle
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
      method: 'PUT',
      headers: ghHeaders(GITHUB_TOKEN),
      body: JSON.stringify({
        message: `Upload image: ${safeFilename}`,
        content: base64Data
      })
    });

    if (!res.ok) {
      const err = await res.json();
      return Response.json({ error: err.message || 'GitHub resim yükleme hatası' }, { status: 500 });
    }
    
    // Yüklenen resmin ana sitedeki relative path'ini dön
    return Response.json({ url: `/images/projects/${safeFilename}` });
  } catch {
    return Response.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
