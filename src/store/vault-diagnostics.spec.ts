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
