export default defineEventHandler(async (event) => {
  const backendUrl = useRuntimeConfig().public.backendUrl;
  const path = event.path.replace('/api/auth', '/auth');

  const response = await fetch(`${backendUrl}${path}`, {
    method: event.method,
    headers: {
      'Content-Type': 'application/json',
    },
    body:
      event.method !== 'GET' && event.method !== 'HEAD'
        ? JSON.stringify(await readBody(event))
        : undefined,
  });

  return response.json();
});
