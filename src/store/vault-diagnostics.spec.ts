import * as Sentry from '@sentry/react-native';
import {
  reportVaultStartupFailure,
  vaultDiagnostic,
  vaultError,
} from './vault-diagnostics';
import {prepareModernVault} from './vault-runtime';
import {transferVault} from './vault-transfer';

jest.mock('@sentry/react-native', () => ({captureException: jest.fn()}));
jest.mock('./vault-transfer', () => ({transferVault: jest.fn()}));
jest.mock('./log', () => ({LogActions: {}}));
jest.mock('./log/initLogs', () => ({add: jest.fn()}));

const capture = jest.mocked(Sentry.captureException);

beforeEach(() => jest.resetAllMocks());

it('reports an unclassified TypeError unchanged, including its stack and cause', () => {
  const error = Object.assign(new TypeError('synthetic startup failure'), {
    stack: 'synthetic startup stack',
    cause: new Error('synthetic cause'),
  });
  reportVaultStartupFailure(error);
  expect(capture).toHaveBeenCalledTimes(1);
  expect(capture.mock.calls[0][0]).toBe(error);
  expect(capture.mock.calls[0][1]).toEqual({level: 'error'});
});

it('does not recognise an unclassified error imitating a vault message', () => {
  const error = new Error('Vault migration failed: STARTUP_FAILURE (startup)');
  reportVaultStartupFailure(error);
  expect(capture.mock.calls[0][0]).toBe(error);
  expect(capture.mock.calls[0][1]).toEqual({level: 'error'});
});

it.each([
  null,
  'synthetic thrown string',
  {message: 'synthetic thrown object'},
])('passes an unclassified non-Error value through unchanged: %p', value => {
  reportVaultStartupFailure(value);
  expect(capture.mock.calls[0][0]).toBe(value);
  expect(capture.mock.calls[0][1]).toEqual({level: 'error'});
});

it('reports a classified error as a fresh sanitised object with its original tags', () => {
  const error = vaultError(
    'REQUIRED_COPY_FAILURE',
    'required-copy',
    'COPY_VERIFICATION',
    'bak',
  );
  Object.assign(error, {
    message: 'synthetic replaced message',
    stack: 'synthetic attached stack',
    cause: new Error('synthetic attached cause'),
    extra: 'synthetic attached property',
  });
  reportVaultStartupFailure(error);
  expect(capture).toHaveBeenCalledTimes(1);
  const [reported, options] = capture.mock.calls[0];
  expect(reported).not.toBe(error);
  expect(reported).toBeInstanceOf(Error);
  expect(reported).toHaveProperty(
    'message',
    'Vault migration failed: REQUIRED_COPY_FAILURE (required-copy)',
  );
  expect(reported).toHaveProperty('stack', undefined);
  expect(reported).not.toHaveProperty('cause');
  expect(reported).not.toHaveProperty('extra');
  expect(options).toEqual({
    level: 'error',
    tags: {
      vaultCode: 'REQUIRED_COPY_FAILURE',
      vaultPhase: 'required-copy',
      vaultReason: 'COPY_VERIFICATION',
      vaultSource: 'bak',
    },
  });
});

it.each([false, true])(
  'swallows reporting failure for a classified=%s error',
  classified => {
    capture.mockImplementationOnce(() => {
      throw new Error('synthetic reporting failure');
    });
    const error = classified
      ? vaultError('STARTUP_FAILURE', 'startup')
      : new Error('synthetic unclassified failure');
    expect(() => reportVaultStartupFailure(error)).not.toThrow();
    expect(capture).toHaveBeenCalledTimes(1);
  },
);

it('classifies a raw migration failure at the real entry point before reporting', async () => {
  const raw = Object.assign(new Error('synthetic raw migration failure'), {
    stack: 'synthetic migration stack',
    cause: new Error('synthetic migration cause'),
    extra: 'synthetic migration property',
  });
  jest.mocked(transferVault).mockRejectedValueOnce(raw);
  // Runtime and diagnostics above are real imports in the same module graph.
  const failure = await prepareModernVault().catch(error => error);
  expect(transferVault).toHaveBeenCalledTimes(1);
  expect(failure).toBeInstanceOf(Error);
  expect(failure).not.toBe(raw);
  expect(vaultDiagnostic(failure)).toEqual({
    code: 'STARTUP_FAILURE',
    phase: 'startup',
  });
  expect(failure.message).toBe(
    'Vault migration failed: STARTUP_FAILURE (startup)',
  );
  expect(failure.stack).toBeUndefined();
  expect(failure).not.toHaveProperty('cause');
  expect(failure).not.toHaveProperty('extra');
  reportVaultStartupFailure(failure);
  expect(capture).toHaveBeenCalledTimes(1);
  const [reported, options] = capture.mock.calls[0];
  expect(reported).not.toBe(raw);
  expect(reported).not.toBe(failure);
  expect(reported).toHaveProperty('message', failure.message);
  expect(reported).toHaveProperty('stack', undefined);
  expect(reported).not.toHaveProperty('cause');
  expect(reported).not.toHaveProperty('extra');
  expect(options).toEqual({
    level: 'error',
    tags: {vaultCode: 'STARTUP_FAILURE', vaultPhase: 'startup'},
  });
});

it('D16: reports only the registered detail on a fresh classified error', () => {
  const error = vaultError(
    'INVALID_LEGACY_INPUT',
    'classify',
    'SOURCE_INVALID',
    undefined,
    'D13',
  );
  Object.assign(error, {
    message: 'synthetic saved message',
    stack: 'synthetic saved stack',
    cause: new Error('synthetic saved cause'),
    extra: 'synthetic saved property',
    detail: 'D01',
  });
  reportVaultStartupFailure(error);
  const [reported, options] = capture.mock.calls[0];
  expect(reported).not.toBe(error);
  expect(reported).toHaveProperty(
    'message',
    'Vault migration failed: INVALID_LEGACY_INPUT (classify)',
  );
  expect(reported).toHaveProperty('stack', undefined);
  expect(reported).not.toHaveProperty('cause');
  expect(reported).not.toHaveProperty('extra');
  expect(reported).not.toHaveProperty('detail');
  expect(options).toEqual({
    level: 'error',
    tags: {
      vaultCode: 'INVALID_LEGACY_INPUT',
      vaultPhase: 'classify',
      vaultReason: 'SOURCE_INVALID',
      vaultDetail: 'D13',
    },
  });
  expect(vaultDiagnostic(error)).toEqual({
    code: 'INVALID_LEGACY_INPUT',
    phase: 'classify',
    reason: 'SOURCE_INVALID',
    detail: 'D13',
  });
  expect(Object.isFrozen(vaultDiagnostic(error))).toBe(true);
});

it.each([
  'D18',
  'D1',
  'd13',
  ' D13',
  'D13/synthetic',
  13,
  null,
  {toString: () => 'D13'},
])(
  'D16: omits an invalid supplied detail without changing classification: %p',
  detail => {
    const error = vaultError(
      'INVALID_LEGACY_INPUT',
      'classify',
      'SOURCE_INVALID',
      'mmkv',
      detail as any,
    );
    Object.defineProperty(error, 'detail', {
      get: () => {
        throw new Error('public detail must not be read');
      },
    });
    reportVaultStartupFailure(error);
    expect(vaultDiagnostic(error)).toEqual({
      code: 'INVALID_LEGACY_INPUT',
      phase: 'classify',
      reason: 'SOURCE_INVALID',
      source: 'mmkv',
    });
    expect(capture.mock.calls[0][1]).toEqual({
      level: 'error',
      tags: {
        vaultCode: 'INVALID_LEGACY_INPUT',
        vaultPhase: 'classify',
        vaultReason: 'SOURCE_INVALID',
        vaultSource: 'mmkv',
      },
    });
  },
);

it('D16: a public detail cannot add metadata to a classified or unclassified error', () => {
  const classified = Object.assign(
    vaultError('SOURCE_CONFLICT', 'inventory', 'SOURCE_READ'),
    {detail: 'D13'},
  );
  reportVaultStartupFailure(classified);
  expect(capture.mock.calls[0][1]).toEqual({
    level: 'error',
    tags: {
      vaultCode: 'SOURCE_CONFLICT',
      vaultPhase: 'inventory',
      vaultReason: 'SOURCE_READ',
    },
  });
  const raw = Object.assign(new Error('synthetic unclassified error'), {
    detail: 'D13',
  });
  reportVaultStartupFailure(raw);
  expect(capture.mock.calls[1]).toEqual([raw, {level: 'error'}]);
  expect(vaultDiagnostic(raw)).toBeUndefined();
});

it.each([
  'D00',
  'D01',
  'D02',
  'D03',
  'D04',
  'D05',
  'D06',
  'D07',
  'D08',
  'D09',
  'D10',
  'D11',
  'D12',
  'D13',
  'D14',
  'D15',
  'D16',
  'D17',
] as const)('D16: validates the permanent code %s', detail => {
  const error = vaultError(
    'INVALID_LEGACY_INPUT',
    'classify',
    'SOURCE_INVALID',
    undefined,
    detail,
  );
  reportVaultStartupFailure(error);
  expect(vaultDiagnostic(error)?.detail).toBe(detail);
  expect(capture.mock.calls[0][1]).toHaveProperty('tags.vaultDetail', detail);
});
