export function formatAuthError(message: string): string {
    const normalized = message.toLowerCase();
    if (/(user_already_exists|email_exists|already registered|already exists)/.test(normalized))
        return 'An account may already exist with this email. Try signing in or resetting your password.';
    if (/(invalid login credentials|invalid_credentials)/.test(normalized))
        return 'Email or password is incorrect.';
    if (/(email not confirmed|email_not_confirmed)/.test(normalized))
        return 'Please confirm your email before signing in.';
    return message;
}

export const SIGNUP_CONFIRMATION_MESSAGE =
    'Check your email for a confirmation link. If you already have an account, sign in or reset your password.';
