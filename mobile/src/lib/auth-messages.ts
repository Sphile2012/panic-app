export function formatAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (/(user_already_exists|email_exists|already registered|already exists)/.test(normalized))
    return 'We could not complete that request. Check your details or try again.';
  if (/(invalid login credentials|invalid_credentials)/.test(normalized))
    return 'Email or password is incorrect.';
  if (/(email not confirmed|email_not_confirmed)/.test(normalized))
    return 'Please confirm your email before signing in.';
  return message;
}

export const SIGNUP_CONFIRMATION_MESSAGE =
  'Check your email for a confirmation link to continue.';
