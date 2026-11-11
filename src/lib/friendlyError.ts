// Maps technical/backend error text to plain language for non-technical caregivers.
// Falls back to the original message (trimmed) when nothing matches, so it's always
// safe to wrap any error string before showing it.
const PATTERNS: [RegExp, string][] = [
  [/invalid login credentials/i, "That email or password doesn't match. Check for typos, or use “Forgot password” below."],
  [/email not confirmed/i, "Check your email and click the confirmation link before signing in."],
  [/user already registered|already been registered/i, "An account already exists for that email. Try signing in instead."],
  [/password should be at least/i, "Password needs to be at least 6 characters."],
  [/rate limit|too many requests/i, "Too many attempts — please wait a minute and try again."],
  [/failed to fetch|networkerror|load failed/i, "Couldn't reach the server. Check your internet connection and try again."],
  [/not a member of that home/i, "You're not a member of that home anymore."],
  [/jwt|token.*(expired|invalid)/i, "Your session expired. Please sign in again."],
];

export function friendlyError(message: string | null | undefined): string {
  const text = (message ?? "").trim();
  if (!text) return "Something went wrong. Please try again.";
  for (const [pattern, friendly] of PATTERNS) if (pattern.test(text)) return friendly;
  return text;
}
