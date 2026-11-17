import type {TransferIO} from './vault-transfer';

const mockRead = jest.fn();
const mockContains = jest.fn();
const mockStorage = {getString: mockRead, contains: mockContains};
let mockInspect: (io: TransferIO) => Promise<void>;
jest.mock('./vault-transfer', () => ({
  transferVault: async (io: TransferIO) => {
    await mockInspect(io);
    return 'synthetic key';
  },
}));
jest.mock('./vault-storage', () => ({
  modernStorage: mockStorage,
  activateVaultStorage: jest.fn(),
}));
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(({id}) => ({
    ...mockStorage,
    getAllKeys: () => (id === 'mmkv.default' ? ['persist:logs'] : ['transfer']),
  })),
}));
jest.mock('react-native', () => ({
  Platform: {OS: 'android'},
  TurboModuleRegistry: {
    getEnforcing: () => ({getBaseDirectory: () => '/synthetic'}),
  },
}));
jest.mock('./log/initLogs', () => ({add: jest.fn()}));
jest.mock('./log', () => ({LogActions: {}}));
jest.mock('react-native-keychain', () => ({}));

beforeEach(() => {
  jest.resetModules();
  mockRead.mockReset();
  mockContains.mockReset().mockReturnValue(false);
  require('react-native-fs').exists.mockResolvedValue(true);
});

const readers = {
  control: (io: TransferIO) => Promise.resolve().then(io.readControl),
  modern: (io: TransferIO) => io.readDestination('root'),
  legacy: async (io: TransferIO) => (await io.inventory()).sources.mmkv,
};

describe.each(Object.entries(readers))(
  '%s strict string read',
  (name, read) => {
    it.each(['', 'synthetic string', undefined])(
      'reads %p once and checks presence only for undefined',
      async value => {
        mockRead.mockReturnValue(value);
        mockInspect = async io => {
          expect(await read(io)).toBe(value ?? null);
        };
        await require('./vault-runtime').prepareModernVault();
        expect(mockRead).toHaveBeenCalledTimes(1);
        expect(mockContains).toHaveBeenCalledTimes(value === undefined ? 1 : 0);
      },
    );

    it('rejects a present key that cannot be read as a string', async () => {
      mockRead.mockReturnValue(undefined);
      mockContains.mockReturnValue(true);
      mockInspect = async io => {
        if (name === 'legacy') {
          // The inventory caller retains its one retry and unsuccessful-read result.
          expect(await read(io)).toBeUndefined();
        } else {
          await expect(read(io)).rejects.toThrow();
        }
      };
      await require('./vault-runtime').prepareModernVault();
      expect(mockRead).toHaveBeenCalledTimes(name === 'legacy' ? 2 : 1);
      expect(mockContains).toHaveBeenCalledTimes(name === 'legacy' ? 2 : 1);
    });
  },
);
