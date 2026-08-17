/**
 * Cloudflare interstitial ("Just a moment...") detection.
 *
 * When Cloudflare challenges a request it answers with an HTML page instead of
 * the JSON our API layer expects. Callers that fall back to "use the response
 * body as the error message" end up rendering that whole markup blob to the
 * user, so detection has to happen before any body-to-message coercion.
 */

// Cloudflare stamps this on anything it mitigated (challenge/jschallenge/block).
const CF_MITIGATED_HEADER = 'cf-mitigated';

const CHALLENGE_BODY_MARKERS = [
  'challenges.cloudflare.com',
  '/cdn-cgi/challenge-platform',
  'cf-browser-verification',
  'cf_chl_opt',
  '__cf_chl',
];

// Statuses Cloudflare serves interstitials with. 429 is included because a
// managed challenge can surface as a rate-limit page.
const CHALLENGE_STATUSES = [403, 429, 503];

export class CloudflareChallengeError extends Error {
  readonly url: string;
  readonly status: number;

  constructor(url: string, status: number) {
    super('Additional verification is required to continue.');
    this.name = 'CloudflareChallengeError';
    this.url = url;
    this.status = status;
  }
}

export const isCloudflareChallengeError = (
  err: any,
): err is CloudflareChallengeError =>
  err instanceof CloudflareChallengeError ||
  err?.name === 'CloudflareChallengeError';

/**
 * True when a body is an HTML document rather than an API payload. Used to keep
 * markup out of user-facing error text.
 */
export const looksLikeHtml = (body: unknown): body is string => {
  if (typeof body !== 'string') {
    return false;
  }
  const head = body.trimStart().slice(0, 200).toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html');
};

export const isCloudflareChallengeBody = (body: unknown): boolean => {
  if (typeof body !== 'string') {
    return false;
  }
  // Markers live in the <head>; cap the scan so a large page isn't lowercased.
  const sample = body.slice(0, 4000).toLowerCase();
  return CHALLENGE_BODY_MARKERS.some(marker => sample.includes(marker));
};

/**
 * Reads a header from a fetch `Headers`, an axios header object, or a plain map.
 */
const readHeader = (headers: any, name: string): string | undefined => {
  if (!headers) {
    return undefined;
  }
  if (typeof headers.get === 'function') {
    return headers.get(name) ?? undefined;
  }
  const lower = name.toLowerCase();
  const key = Object.keys(headers).find(k => k.toLowerCase() === lower);
  return key ? String(headers[key]) : undefined;
};

export const isCloudflareChallenge = ({
  status,
  headers,
  body,
}: {
  status?: number;
  headers?: any;
  body?: unknown;
}): boolean => {
  // Authoritative when present — no body sniffing needed.
  if (readHeader(headers, CF_MITIGATED_HEADER)) {
    return true;
  }
  if (status && !CHALLENGE_STATUSES.includes(status)) {
    return false;
  }
  return isCloudflareChallengeBody(body);
};

/**
 * Normalizes anything thrown by our fetch or axios layers into a
 * CloudflareChallengeError, or null when it isn't a challenge.
 */
export const asCloudflareChallenge = (
  err: any,
): CloudflareChallengeError | null => {
  if (isCloudflareChallengeError(err)) {
    return err;
  }

  const response = err?.response;
  if (
    response &&
    isCloudflareChallenge({
      status: response.status,
      headers: response.headers,
      body: response.data,
    })
  ) {
    return new CloudflareChallengeError(
      err?.config?.url || '',
      response.status,
    );
  }

  return null;
};

/**
 * Returns `body` only when it is safe to show a user, otherwise `fallback`.
 * Guards against dumping an HTML error page into a notification.
 */
export const safeErrorMessage = (body: unknown, fallback: string): string => {
  if (typeof body === 'string' && body.trim() && !looksLikeHtml(body)) {
    return body;
  }
  return fallback;
};

/**
 * The origin to load in the challenge WebView. Cloudflare scopes `cf_clearance`
 * to the host, and the challenged path is often a POST-only API route, so the
 * interstitial is solved against the origin root instead.
 */
export const challengeOriginFor = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};
