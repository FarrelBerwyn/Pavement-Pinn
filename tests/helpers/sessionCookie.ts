/**
 * Signed-in sessions travel in the HttpOnly `pinn_session` cookie, never in the login response
 * body. Tests act as the browser would: they read the token from Set-Cookie and present it
 * again (as a bearer token, which the server accepts the same way).
 */
export function sessionCookieToken(res: Response): string | null {
  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [res.headers.get('set-cookie') ?? ''];
  for (const cookie of cookies) {
    const match = /(?:^|,\s*)pinn_session=([^;]*)/.exec(cookie);
    if (match && match[1]) return decodeURIComponent(match[1]);
  }
  return null;
}

/** Parsed JSON body with `token` filled from the session cookie when the server set one. */
export async function bodyWithSession(res: Response): Promise<any> {
  const body = (await res.json()) as any;
  const token = sessionCookieToken(res);
  if (token && body && typeof body === 'object' && body.token === undefined) body.token = token;
  return body;
}
