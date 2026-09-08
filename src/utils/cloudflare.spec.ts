import {
  asCloudflareChallenge,
  challengeOriginFor,
  CloudflareChallengeError,
  isCloudflareChallenge,
  isCloudflareChallengeBody,
  isCloudflareChallengeError,
  looksLikeHtml,
  safeErrorMessage,
} from './cloudflare';

// Trimmed version of the interstitial that was rendered to users verbatim.
const CHALLENGE_HTML = `<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="robots" content="noindex,nofollow"><meta http-equiv="content-security-policy" content="default-src 'none'; script-src 'nonce-yaG1Fqu84tw5pzQXrwvmw6' 'unsafe-eval' https://challenges.cloudflare.com;"></head><body></body></html>`;

describe('looksLikeHtml', () => {
  it('detects a doctype-prefixed document', () => {
    expect(looksLikeHtml(CHALLENGE_HTML)).toBe(true);
  });

  it('detects a bare <html> document', () => {
    expect(looksLikeHtml('<html><body>nope</body></html>')).toBe(true);
  });

  it('ignores leading whitespace', () => {
    expect(looksLikeHtml('\n  <!doctype html><html></html>')).toBe(true);
  });

  it('does not flag a plain error string', () => {
    expect(looksLikeHtml('Invalid password')).toBe(false);
  });

  it('does not flag non-strings', () => {
    expect(looksLikeHtml({message: 'nope'})).toBe(false);
    expect(looksLikeHtml(undefined)).toBe(false);
  });
});

describe('isCloudflareChallengeBody', () => {
  it('matches the challenges.cloudflare.com marker', () => {
    expect(isCloudflareChallengeBody(CHALLENGE_HTML)).toBe(true);
  });

  it('matches the challenge-platform script path', () => {
    expect(
      isCloudflareChallengeBody('<html>/cdn-cgi/challenge-platform/x</html>'),
    ).toBe(true);
  });

  it('does not match an unrelated HTML error page', () => {
    expect(
      isCloudflareChallengeBody('<html><body>502 Bad Gateway</body></html>'),
    ).toBe(false);
  });

  it('does not match a JSON body', () => {
    expect(isCloudflareChallengeBody('{"message":"Invalid password"}')).toBe(
      false,
    );
  });
});

describe('isCloudflareChallenge', () => {
  it('trusts the cf-mitigated header regardless of body', () => {
    expect(
      isCloudflareChallenge({
        status: 403,
        headers: {'cf-mitigated': 'challenge'},
        body: '',
      }),
    ).toBe(true);
  });

  it('matches the header case-insensitively', () => {
    expect(
      isCloudflareChallenge({
        status: 503,
        headers: {'CF-Mitigated': 'challenge'},
        body: '',
      }),
    ).toBe(true);
  });

  it('reads a fetch Headers object', () => {
    const headers = new Map([['cf-mitigated', 'challenge']]);
    expect(isCloudflareChallenge({status: 403, headers, body: ''})).toBe(true);
  });

  it('falls back to body markers on a challenge status', () => {
    expect(
      isCloudflareChallenge({status: 403, headers: {}, body: CHALLENGE_HTML}),
    ).toBe(true);
  });

  it('ignores challenge markers on a non-challenge status', () => {
    expect(
      isCloudflareChallenge({status: 400, headers: {}, body: CHALLENGE_HTML}),
    ).toBe(false);
  });

  it('does not flag an ordinary 403 with a JSON body', () => {
    expect(
      isCloudflareChallenge({
        status: 403,
        headers: {},
        body: '{"message":"Forbidden"}',
      }),
    ).toBe(false);
  });
});

describe('asCloudflareChallenge', () => {
  it('passes a CloudflareChallengeError straight through', () => {
    const err = new CloudflareChallengeError('https://bitpay.com/x', 403);
    expect(asCloudflareChallenge(err)).toBe(err);
  });

  it('converts an axios-shaped challenge response', () => {
    const err = {
      config: {url: 'https://bitpay.com/auth/login'},
      response: {status: 403, headers: {}, data: CHALLENGE_HTML},
    };
    const challenge = asCloudflareChallenge(err);
    expect(challenge).toBeInstanceOf(CloudflareChallengeError);
    expect(challenge?.url).toBe('https://bitpay.com/auth/login');
    expect(challenge?.status).toBe(403);
  });

  it('returns null for an ordinary API error', () => {
    const err = {
      config: {url: 'https://bitpay.com/auth/login'},
      response: {status: 401, headers: {}, data: {message: 'Bad password'}},
    };
    expect(asCloudflareChallenge(err)).toBeNull();
  });

  it('returns null for a plain Error', () => {
    expect(asCloudflareChallenge(new Error('boom'))).toBeNull();
  });
});

describe('isCloudflareChallengeError', () => {
  it('identifies the error type', () => {
    expect(
      isCloudflareChallengeError(
        new CloudflareChallengeError('https://bitpay.com', 403),
      ),
    ).toBe(true);
  });

  it('rejects a plain Error', () => {
    expect(isCloudflareChallengeError(new Error('boom'))).toBe(false);
  });
});

describe('safeErrorMessage', () => {
  it('suppresses an HTML body in favor of the fallback', () => {
    expect(safeErrorMessage(CHALLENGE_HTML, 'Login failed')).toBe(
      'Login failed',
    );
  });

  it('passes a plain message through', () => {
    expect(safeErrorMessage('Invalid password', 'Login failed')).toBe(
      'Invalid password',
    );
  });

  it('falls back for empty or non-string bodies', () => {
    expect(safeErrorMessage('   ', 'Login failed')).toBe('Login failed');
    expect(safeErrorMessage(undefined, 'Login failed')).toBe('Login failed');
    expect(safeErrorMessage({a: 1}, 'Login failed')).toBe('Login failed');
  });
});

describe('challengeOriginFor', () => {
  it('reduces an API URL to its origin', () => {
    expect(
      challengeOriginFor(
        'https://bitpay.com/auth/passkey/status?email=a%40b.c',
      ),
    ).toBe('https://bitpay.com');
  });

  it('preserves a non-default port', () => {
    expect(challengeOriginFor('https://test.bitpay.com:8443/auth/login')).toBe(
      'https://test.bitpay.com:8443',
    );
  });

  it('returns null for a malformed URL', () => {
    expect(challengeOriginFor('not-a-url')).toBeNull();
  });
});
