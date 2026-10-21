type VerifiedUser = { id: string; email: string | null };

export function getApiBaseUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('Set EXPO_PUBLIC_API_URL in mobile/.env to the Express API URL.');
  }
  return baseUrl;
}

export async function verifyApiSession(accessToken: string): Promise<VerifiedUser> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const result: unknown = await response.json();
  if (!response.ok) {
    const detail = typeof result === 'object' && result !== null && 'error' in result
      && typeof result.error === 'string' ? result.error : `API returned HTTP ${response.status}.`;
    throw new Error(detail);
  }

  if (
    typeof result !== 'object' || result === null || !('user' in result)
    || typeof result.user !== 'object' || result.user === null
    || !('id' in result.user) || typeof result.user.id !== 'string'
    || !('email' in result.user)
    || (result.user.email !== null && typeof result.user.email !== 'string')
  ) {
    throw new Error('The API returned an invalid account response.');
  }

  return { id: result.user.id, email: result.user.email };
}
