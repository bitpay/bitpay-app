/**
 * Tests for src/utils/passkey.ts
 *
 * All network I/O (fetch, Passkey native module, BitPayIdApi) is mocked so
 * that the pure orchestration logic in each exported function can be exercised
 * without hitting real endpoints.
 */

// ─── Mock react-native-passkey ───────────────────────────────────────────────
const mockPasskeyCreate = jest.fn();
const mockPasskeyGet = jest.fn();
jest.mock('react-native-passkey', () => ({
  Passkey: {
    create: (...args: any[]) => mockPasskeyCreate(...args),
    get: (...args: any[]) => mockPasskeyGet(...args),
  },
}));

// ─── Mock BitPayIdApi ────────────────────────────────────────────────────────
const mockPub = 'test-pub-key';
jest.mock('../api/bitpay', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({identity: {pub: mockPub}}),
  },
}));

import {Network} from '../constants';
import {
  registerPasskey,
  signInWithPasskey,
  removePasskey,
  getPasskeyStatus,
  getPasskeyCredentials,
} from './passkey';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeOkResponse(body: object): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function makeErrorResponse(
  status: number,
  statusText: string,
  body?: object | string,
): Response {
  const bodyStr =
    body === undefined
      ? ''
      : typeof body === 'string'
      ? body
      : JSON.stringify(body);
  return {
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(bodyStr),
  } as unknown as Response;
}

let fetchMock: jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock;
  jest.clearAllMocks();
});

// ─── registerPasskey ──────────────────────────────────────────────────────────

describe('registerPasskey', () => {
  it('returns true when the server reports success', async () => {
    const creationOptions = {challenge: 'abc'};
    const passkeyResult = {id: 'cred-id', response: {}};

    fetchMock
      .mockResolvedValueOnce(makeOkResponse(creationOptions))
      .mockResolvedValueOnce(makeOkResponse({success: true}));
    mockPasskeyCreate.mockResolvedValue(passkeyResult);

    const result = await registerPasskey(
      'user@example.com',
      Network.mainnet,
      'csrf-token',
    );

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns false when the server reports success: false', async () => {
    fetchMock
      .mockResolvedValueOnce(makeOkResponse({challenge: 'abc'}))
      .mockResolvedValueOnce(makeOkResponse({success: false}));
    mockPasskeyCreate.mockResolvedValue({id: 'cred-id'});

    const result = await registerPasskey(
      'user@example.com',
      Network.mainnet,
      'csrf-token',
    );

    expect(result).toBe(false);
  });

  it('sends the csrf token in the x-csrf-token header', async () => {
    fetchMock
      .mockResolvedValueOnce(makeOkResponse({challenge: 'x'}))
      .mockResolvedValueOnce(makeOkResponse({success: true}));
    mockPasskeyCreate.mockResolvedValue({id: 'c'});

    await registerPasskey('u@e.com', Network.mainnet, 'my-csrf');

    const [, firstCallOptions] = fetchMock.mock.calls[0];
    expect((firstCallOptions as RequestInit).headers).toMatchObject({
      'x-csrf-token': 'my-csrf',
    });
  });

  it('throws when the challenge request returns a non-ok response with JSON error', async () => {
    fetchMock.mockResolvedValueOnce(
      makeErrorResponse(401, 'Unauthorized', {message: 'Not logged in'}),
    );

    await expect(
      registerPasskey('u@e.com', Network.mainnet, 'token'),
    ).rejects.toThrow('Not logged in');
  });

  it('throws when the verify request returns a non-ok response with plain text', async () => {
    fetchMock
      .mockResolvedValueOnce(makeOkResponse({challenge: 'x'}))
      .mockResolvedValueOnce(
        makeErrorResponse(400, 'Bad Request', 'plain error text'),
      );
    mockPasskeyCreate.mockResolvedValue({id: 'c'});

    await expect(
      registerPasskey('u@e.com', Network.mainnet, 'token'),
    ).rejects.toThrow('plain error text');
  });

  it('uses testnet base URL for Network.testnet', async () => {
    fetchMock
      .mockResolvedValueOnce(makeOkResponse({challenge: 'x'}))
      .mockResolvedValueOnce(makeOkResponse({success: true}));
    mockPasskeyCreate.mockResolvedValue({id: 'c'});

    await registerPasskey('u@e.com', Network.testnet, 'token');

    const [firstUrl] = fetchMock.mock.calls[0];
    expect(String(firstUrl)).toContain('test.bitpay.com');
  });

  it('passes the email in the challenge request body', async () => {
    fetchMock
      .mockResolvedValueOnce(makeOkResponse({challenge: 'x'}))
      .mockResolvedValueOnce(makeOkResponse({success: true}));
    mockPasskeyCreate.mockResolvedValue({id: 'c'});

    await registerPasskey('hello@world.com', Network.mainnet, 'token');

    const [, callOptions] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse((callOptions as RequestInit).body as string);
    expect(sentBody).toEqual({email: 'hello@world.com'});
  });

  it('passes the passkey credential in the verify request body', async () => {
    const cred = {id: 'cred-123', response: {clientDataJSON: 'x'}};
    fetchMock
      .mockResolvedValueOnce(makeOkResponse({challenge: 'x'}))
      .mockResolvedValueOnce(makeOkResponse({success: true}));
    mockPasskeyCreate.mockResolvedValue(cred);

    await registerPasskey('u@e.com', Network.mainnet, 'token');

    const [, verifyOptions] = fetchMock.mock.calls[1];
    const sentBody = JSON.parse((verifyOptions as RequestInit).body as string);
    expect(sentBody.credential).toEqual(cred);
  });
});

// ─── signInWithPasskey ────────────────────────────────────────────────────────

describe('signInWithPasskey', () => {
  it('returns true when sign-in succeeds', async () => {
    const authChallenge = {options: {challenge: 'ch'}};
    const passkeyResult = {id: 'cred', response: {}};

    fetchMock
      .mockResolvedValueOnce(makeOkResponse(authChallenge))
      .mockResolvedValueOnce(makeOkResponse({success: true}));
    mockPasskeyGet.mockResolvedValue(passkeyResult);

    const result = await signInWithPasskey(Network.mainnet, 'csrf');

    expect(result).toBe(true);
  });

  it('returns false when server reports success: false', async () => {
    fetchMock
      .mockResolvedValueOnce(makeOkResponse({options: {challenge: 'ch'}}))
      .mockResolvedValueOnce(makeOkResponse({success: false}));
    mockPasskeyGet.mockResolvedValue({id: 'c'});

    const result = await signInWithPasskey(Network.mainnet, 'csrf');

    expect(result).toBe(false);
  });

  it('includes email in the challenge body when provided', async () => {
    fetchMock
      .mockResolvedValueOnce(makeOkResponse({options: {challenge: 'ch'}}))
      .mockResolvedValueOnce(makeOkResponse({success: true}));
    mockPasskeyGet.mockResolvedValue({id: 'c'});

    await signInWithPasskey(Network.mainnet, 'csrf', 'user@example.com');

    const [, callOptions] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse((callOptions as RequestInit).body as string);
    expect(sentBody).toEqual({email: 'user@example.com'});
  });

  it('sends empty body when email is omitted', async () => {
    fetchMock
      .mockResolvedValueOnce(makeOkResponse({options: {challenge: 'ch'}}))
      .mockResolvedValueOnce(makeOkResponse({success: true}));
    mockPasskeyGet.mockResolvedValue({id: 'c'});

    await signInWithPasskey(Network.mainnet, 'csrf');

    const [, callOptions] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse((callOptions as RequestInit).body as string);
    expect(sentBody).toEqual({});
  });

  it('includes pubKey in the verify body', async () => {
    fetchMock
      .mockResolvedValueOnce(makeOkResponse({options: {challenge: 'ch'}}))
      .mockResolvedValueOnce(makeOkResponse({success: true}));
    mockPasskeyGet.mockResolvedValue({id: 'cred'});

    await signInWithPasskey(Network.mainnet, 'csrf');

    const [, verifyCallOptions] = fetchMock.mock.calls[1];
    const sentBody = JSON.parse(
      (verifyCallOptions as RequestInit).body as string,
    );
    expect(sentBody.pubKey).toBe(mockPub);
  });

  it('throws on a non-ok challenge response', async () => {
    fetchMock.mockResolvedValueOnce(
      makeErrorResponse(403, 'Forbidden', {error: 'Forbidden'}),
    );

    await expect(signInWithPasskey(Network.mainnet, 'csrf')).rejects.toThrow(
      'Forbidden',
    );
  });
});

// ─── removePasskey ────────────────────────────────────────────────────────────

describe('removePasskey', () => {
  it('calls DELETE and returns the response body', async () => {
    const responseBody = {success: true};
    fetchMock.mockResolvedValueOnce(makeOkResponse(responseBody));

    const result = await removePasskey('cred-id-123', Network.mainnet, 'csrf');

    expect(result).toEqual(responseBody);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/cred-id-123');
    expect((options as RequestInit).method).toBe('DELETE');
  });

  it('includes the credential id at the end of the URL path', async () => {
    fetchMock.mockResolvedValueOnce(makeOkResponse({success: true}));

    await removePasskey('abc-def', Network.mainnet, 'csrf');

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/abc-def$/);
  });

  it('throws on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(
      makeErrorResponse(404, 'Not Found', {message: 'Credential not found'}),
    );

    await expect(
      removePasskey('bad-id', Network.mainnet, 'csrf'),
    ).rejects.toThrow('Credential not found');
  });

  it('sends the csrf token in the x-csrf-token header', async () => {
    fetchMock.mockResolvedValueOnce(makeOkResponse({success: true}));

    await removePasskey('id-1', Network.mainnet, 'my-delete-csrf');

    const [, callOptions] = fetchMock.mock.calls[0];
    expect((callOptions as RequestInit).headers).toMatchObject({
      'x-csrf-token': 'my-delete-csrf',
    });
  });
});

// ─── getPasskeyStatus ─────────────────────────────────────────────────────────

describe('getPasskeyStatus', () => {
  it('returns passkey status from server', async () => {
    fetchMock.mockResolvedValueOnce(makeOkResponse({passkey: true}));

    const result = await getPasskeyStatus(
      'user@example.com',
      Network.mainnet,
      'csrf',
    );

    expect(result).toEqual({passkey: true});
    const [, options] = fetchMock.mock.calls[0];
    expect((options as RequestInit).method).toBe('GET');
  });

  it('URL-encodes the email in the query string', async () => {
    fetchMock.mockResolvedValueOnce(makeOkResponse({passkey: false}));

    await getPasskeyStatus('hello+test@foo.com', Network.mainnet, 'csrf');

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(encodeURIComponent('hello+test@foo.com'));
  });

  it('includes the email query parameter', async () => {
    fetchMock.mockResolvedValueOnce(makeOkResponse({passkey: false}));

    await getPasskeyStatus('user@example.com', Network.mainnet, 'csrf');

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('email=user%40example.com');
  });

  it('throws on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(
      makeErrorResponse(500, 'Server Error', {message: 'Internal error'}),
    );

    await expect(
      getPasskeyStatus('u@e.com', Network.mainnet, 'csrf'),
    ).rejects.toThrow('Internal error');
  });

  it('uses error field from JSON body when message field is absent', async () => {
    fetchMock.mockResolvedValueOnce(
      makeErrorResponse(422, 'Unprocessable', {error: 'validation failed'}),
    );

    await expect(
      getPasskeyStatus('u@e.com', Network.mainnet, 'csrf'),
    ).rejects.toThrow('validation failed');
  });

  it('uses statusText as fallback when body is empty', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: () => Promise.resolve(''),
    } as unknown as Response);

    await expect(
      getPasskeyStatus('u@e.com', Network.mainnet, 'csrf'),
    ).rejects.toThrow('Service Unavailable');
  });

  it('attaches status, url, and body to the thrown error', async () => {
    fetchMock.mockResolvedValueOnce(
      makeErrorResponse(400, 'Bad Request', {message: 'bad stuff', code: 42}),
    );

    let thrown: any;
    try {
      await getPasskeyStatus('u@e.com', Network.mainnet, 'csrf');
    } catch (e) {
      thrown = e;
    }

    expect(thrown.status).toBe(400);
    expect(thrown.url).toContain('bitpay.com');
    expect(thrown.body).toMatchObject({message: 'bad stuff', code: 42});
  });
});

// ─── getPasskeyCredentials ────────────────────────────────────────────────────

describe('getPasskeyCredentials', () => {
  it('returns credentials list from server', async () => {
    const credentials = [
      {id: 'c1', name: 'iPhone'},
      {id: 'c2', name: 'Mac'},
    ];
    fetchMock.mockResolvedValueOnce(makeOkResponse({credentials}));

    const result = await getPasskeyCredentials(
      'user@example.com',
      Network.mainnet,
      'csrf',
    );

    expect(result).toEqual({credentials});
  });

  it('uses GET method', async () => {
    fetchMock.mockResolvedValueOnce(makeOkResponse({credentials: []}));

    await getPasskeyCredentials('u@e.com', Network.mainnet, 'csrf');

    const [, options] = fetchMock.mock.calls[0];
    expect((options as RequestInit).method).toBe('GET');
  });

  it('URL-encodes the email in the query string', async () => {
    fetchMock.mockResolvedValueOnce(makeOkResponse({credentials: []}));

    await getPasskeyCredentials('user+tag@domain.io', Network.mainnet, 'csrf');

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(encodeURIComponent('user+tag@domain.io'));
  });

  it('throws on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(
      makeErrorResponse(401, 'Unauthorized', 'Unauthorized'),
    );

    await expect(
      getPasskeyCredentials('u@e.com', Network.mainnet, 'csrf'),
    ).rejects.toThrow('Unauthorized');
  });

  it('sends the csrf token in the x-csrf-token header', async () => {
    fetchMock.mockResolvedValueOnce(makeOkResponse({credentials: []}));

    await getPasskeyCredentials('u@e.com', Network.mainnet, 'get-csrf');

    const [, callOptions] = fetchMock.mock.calls[0];
    expect((callOptions as RequestInit).headers).toMatchObject({
      'x-csrf-token': 'get-csrf',
    });
  });
});
