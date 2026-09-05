/**
 * Decides whether a request should be redirected based on sign-in state.
 * Pure so proxy.ts stays thin and this can be unit tested.
 */

/** Routes that require a session. Everything else is public. */
const APP_PREFIXES = ["/home", "/service-center", "/ops", "/report", "/settings"];

export const SIGN_IN_PATH = "/sign-in";
export const AFTER_SIGN_IN_PATH = "/home";

export function isAppPath(pathname: string): boolean {
  return APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function authRedirect(pathname: string, signedIn: boolean): string | null {
  if (!signedIn && isAppPath(pathname)) return SIGN_IN_PATH;
  if (signedIn && pathname === SIGN_IN_PATH) return AFTER_SIGN_IN_PATH;
  return null;
}
