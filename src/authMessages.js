export function formatAuthError(message, context = 'general') {
    const normalized = message.toLowerCase();
    if (/(user_already_exists|email_exists|already registered|already exists)/.test(normalized))
        return 'An account may already exist with this email. Try signing in with a verification code.';
    if (/(email not confirmed|email_not_confirmed)/.test(normalized))
        return 'Please confirm your email using the code we sent.';
    if (context === 'password' && /(invalid login credentials|invalid_credentials)/.test(normalized))
        return 'Email or password is incorrect. Check your details or sign in with an email code.';
    if (context === 'otp' && /(invalid login credentials|invalid_credentials|otp_expired|invalid.*(?:token|otp|code)|(?:token|otp|code).*(?:invalid|expired)|expired.*(?:token|otp|code))/.test(normalized))
        return 'This code is invalid or expired. Request a new code and try again.';
    return message;
}
export const SIGNUP_CONFIRMATION_MESSAGE = 'Enter the verification code sent to your email.';
