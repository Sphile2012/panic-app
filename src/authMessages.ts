export function formatAuthError(message: string): string {
    const normalized = message.toLowerCase();
    if (/(user_already_exists|email_exists|already registered|already exists)/.test(normalized))
        return 'An account may already exist with this email. Try signing in with a verification code.';
    if (/(invalid login credentials|invalid_credentials)/.test(normalized))
        return 'Could not verify this code. Check it and try again.';
    if (/(email not confirmed|email_not_confirmed)/.test(normalized))
        return 'Please confirm your email using the code we sent.';
    return message;
}

export const SIGNUP_CONFIRMATION_MESSAGE =
    'Enter the verification code sent to your email.';
