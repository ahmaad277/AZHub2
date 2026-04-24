export type LoginErrorCode =
  | "auth_missing_code"
  | "auth_callback_failed"
  | "auth_invalid_link"
  | "auth_unauthorized_email"
  | "auth_reset_required";

export function sanitizeNextPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export function getLoginErrorMessage(code: string | null | undefined) {
  switch (code) {
    case "auth_missing_code":
      return "The recovery link is missing its authorization code. Please request a new reset email.";
    case "auth_callback_failed":
      return "The recovery link could not be completed. Please request a new reset email.";
    case "auth_invalid_link":
      return "That recovery link is invalid or has already been used. Please request a new reset email.";
    case "auth_unauthorized_email":
      return "You are signed in with an email that is not allowed for this app.";
    case "auth_reset_required":
      return "Your session is ready for a PIN reset. Enter a new PIN to continue.";
    default:
      return null;
  }
}
