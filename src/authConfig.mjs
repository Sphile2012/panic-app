export function resolveIdentifier(raw) {
  const value = raw.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value.toLowerCase() : null;
}

export function getFrontendRedirectUrl(configuredUrl, currentOrigin, flow) {
  let redirectUrl;
  try {
    redirectUrl = new URL(configuredUrl?.trim() || currentOrigin);
  }
  catch {
    throw new Error('Invalid frontend URL configuration.');
  }
  const isLocalHttp = redirectUrl.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(redirectUrl.hostname);
  if ((redirectUrl.protocol !== 'https:' && !isLocalHttp) ||
      redirectUrl.username || redirectUrl.password) {
    throw new Error('Invalid frontend URL configuration.');
  }
  redirectUrl.pathname = '/';
  redirectUrl.search = flow ? `?flow=${encodeURIComponent(flow)}` : '';
  redirectUrl.hash = '';
  return redirectUrl.toString();
}

export function parseRecoveryLink(search, hash) {
  const queryParams = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
  return {
    isRecoveryLink: queryParams.get('flow') === 'recovery' ||
      hashParams.get('type') === 'recovery',
    hasError: Boolean(hashParams.get('error_code') || hashParams.get('error')),
  };
}

export function isRecoverySessionValid(recoveryLink, hasSession) {
  return recoveryLink.isRecoveryLink && !recoveryLink.hasError && hasSession;
}
