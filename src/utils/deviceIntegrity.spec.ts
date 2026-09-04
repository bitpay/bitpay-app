// Tests for src/utils/deviceIntegrity.ts (jail-monkey + Sentry mocked).
const mockIsJailBroken = jest.fn();
const mockHookDetected = jest.fn();
const mockCanMockLocation = jest.fn();

jest.mock('jail-monkey', () => ({
  __esModule: true,
  default: {
    isJailBroken: () => mockIsJailBroken(),
    hookDetected: () => mockHookDetected(),
    canMockLocation: () => mockCanMockLocation(),
  },
}));

const mockSetTag = jest.fn();
const mockSetContext = jest.fn();
const mockCaptureMessage = jest.fn();
jest.mock('@sentry/react-native', () => ({
  setTag: (...a: any[]) => mockSetTag(...a),
  setContext: (...a: any[]) => mockSetContext(...a),
  captureMessage: (...a: any[]) => mockCaptureMessage(...a),
}));

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));

jest.mock('../managers/LogManager', () => ({
  logManager: {warn: jest.fn(), error: jest.fn(), info: jest.fn()},
}));

// Helper: fresh module instance with a clean cache.
const loadModule = () => {
  let mod: typeof import('./deviceIntegrity');
  jest.isolateModules(() => {
    mod = require('./deviceIntegrity');
  });
  // @ts-ignore assigned inside isolateModules
  return mod;
};

describe('deviceIntegrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsJailBroken.mockReturnValue(false);
    mockHookDetected.mockReturnValue(false);
    mockCanMockLocation.mockReturnValue(false);
  });

  describe('getDeviceIntegrity', () => {
    it('reports a clean device', () => {
      const {getDeviceIntegrity} = loadModule();
      expect(getDeviceIntegrity()).toEqual({
        isCompromised: false,
        hookDetected: false,
        mockLocationEnabled: false,
        reason: null,
      });
    });

    it('flags a jailbroken/rooted device with reason "jailbroken"', () => {
      mockIsJailBroken.mockReturnValue(true);
      const {getDeviceIntegrity} = loadModule();
      const result = getDeviceIntegrity();
      expect(result.isCompromised).toBe(true);
      expect(result.reason).toBe('jailbroken');
    });

    it('flags a hooked device and prefers "jailbroken" when both are true', () => {
      mockIsJailBroken.mockReturnValue(false);
      mockHookDetected.mockReturnValue(true);
      const {getDeviceIntegrity} = loadModule();
      expect(getDeviceIntegrity().reason).toBe('hook-detected');

      mockIsJailBroken.mockReturnValue(true);
      const {getDeviceIntegrity: fresh} = loadModule();
      expect(fresh().reason).toBe('jailbroken');
    });

    it('does not treat mock-location alone as a compromise', () => {
      mockCanMockLocation.mockReturnValue(true);
      const {getDeviceIntegrity} = loadModule();
      const result = getDeviceIntegrity();
      expect(result.mockLocationEnabled).toBe(true);
      expect(result.isCompromised).toBe(false);
      expect(result.reason).toBeNull();
    });

    it('fails open when the native module throws', () => {
      mockIsJailBroken.mockImplementation(() => {
        throw new Error('native module unavailable');
      });
      const {getDeviceIntegrity} = loadModule();
      expect(getDeviceIntegrity().isCompromised).toBe(false);
    });

    it('caches the result and only hits native once', () => {
      const {getDeviceIntegrity} = loadModule();
      getDeviceIntegrity();
      getDeviceIntegrity();
      expect(mockIsJailBroken).toHaveBeenCalledTimes(1);
    });
  });

  describe('assertDeviceIntegrityForSensitiveAction', () => {
    it('is a no-op on a clean device', () => {
      const {assertDeviceIntegrityForSensitiveAction} = loadModule();
      expect(() =>
        assertDeviceIntegrityForSensitiveAction('crypto-sign'),
      ).not.toThrow();
    });

    it('throws DeviceCompromisedError on a compromised device (release builds)', () => {
      const prevDev = (global as any).__DEV__;
      (global as any).__DEV__ = false;
      mockIsJailBroken.mockReturnValue(true);
      const {
        assertDeviceIntegrityForSensitiveAction,
        isDeviceCompromisedError,
      } = loadModule();
      try {
        assertDeviceIntegrityForSensitiveAction('passkey-register');
        throw new Error('should have thrown');
      } catch (err) {
        expect(isDeviceCompromisedError(err)).toBe(true);
      }
      (global as any).__DEV__ = prevDev;
    });

    it('does not block in development builds but still reports telemetry', () => {
      const prevDev = (global as any).__DEV__;
      (global as any).__DEV__ = true;
      mockIsJailBroken.mockReturnValue(true);
      const {assertDeviceIntegrityForSensitiveAction} = loadModule();
      expect(() =>
        assertDeviceIntegrityForSensitiveAction('crypto-sign'),
      ).not.toThrow();
      expect(mockSetTag).toHaveBeenCalledWith('device.compromised', 'true');
      (global as any).__DEV__ = prevDev;
    });
  });

  describe('reportDeviceIntegrityToSentry', () => {
    it('tags the scope and captures a message once for compromised devices', () => {
      mockIsJailBroken.mockReturnValue(true);
      const {getDeviceIntegrity, reportDeviceIntegrityToSentry} = loadModule();
      const result = getDeviceIntegrity();
      reportDeviceIntegrityToSentry(result);
      reportDeviceIntegrityToSentry(result);
      expect(mockSetTag).toHaveBeenCalledWith('device.compromised', 'true');
      expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
    });

    it('never throws even if Sentry throws', () => {
      mockSetTag.mockImplementation(() => {
        throw new Error('sentry down');
      });
      const {getDeviceIntegrity, reportDeviceIntegrityToSentry} = loadModule();
      expect(() =>
        reportDeviceIntegrityToSentry(getDeviceIntegrity()),
      ).not.toThrow();
    });
  });

  describe('dev override seam', () => {
    it('simulate() forces detection and blocks sensitive actions', () => {
      const {getDeviceIntegrity, assertDeviceIntegrityForSensitiveAction} =
        loadModule();
      (global as any).__deviceIntegrity.simulate('hook-detected');
      expect(getDeviceIntegrity().reason).toBe('hook-detected');
      expect(() =>
        assertDeviceIntegrityForSensitiveAction('crypto-sign'),
      ).toThrow();
    });

    it('clear() restores native detection', () => {
      const {getDeviceIntegrity} = loadModule();
      (global as any).__deviceIntegrity.simulate();
      (global as any).__deviceIntegrity.clear();
      expect(getDeviceIntegrity().isCompromised).toBe(false);
    });
  });
});
