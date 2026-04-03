// Auth endpoint - simple username/password check
export async function onRequestPost(context) {
  const { ADMIN_USER, ADMIN_PASS } = context.env;
  const { username, password } = await context.request.json();

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    // Simple token = base64 of user:pass (good enough for this use case)
    const token = btoa(`${username}:${password}`);
    return Response.json({ token });
  }

  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
