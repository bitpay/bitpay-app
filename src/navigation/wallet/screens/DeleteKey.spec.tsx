import React from 'react';
import {act, render} from '@test/render';
import DeleteKey from './DeleteKey';

const mockDispatch = jest.fn();
const mockOnDeleteConfirmed = jest.fn();
const mockNavigation = {
  dispatch: jest.fn(),
  setOptions: jest.fn(),
};
const mockRoute: {params: Record<string, unknown>} = {params: {}};
const mockTranslate = (key: string) => key;
const mockOngoingProcess = {
  showOngoingProcess: jest.fn(),
  hideOngoingProcess: jest.fn(),
};
const mockResultView = jest.fn((_props: {message: string}) => null);
const mockState = {
  APP: {homeCarouselConfig: [{id: 'key-1', show: true}]},
  WALLET: {
    keys: {
      'key-1': {
        id: 'key-1',
        keyName: 'My Key',
        wallets: [],
        cloudBackupTimestamp: undefined as number | undefined,
      },
    },
  },
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockTranslate}),
}));

jest.mock('react-navigation-backhandler', () => ({
  useAndroidBackHandler: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useMount: jest.requireActual('../../../utils/hooks/useMount').useMount,
}));

jest.mock('../../../utils/hooks/useAppSelector', () => ({
  __esModule: true,
  default: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));

jest.mock('../../../utils/helper-methods', () => ({
  sleep: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../contexts', () => ({
  ...jest.requireActual('../../../contexts'),
  useOngoingProcess: () => mockOngoingProcess,
}));

jest.mock('../../../Root', () => ({RootStacks: {TABS: 'Tabs'}}));

jest.mock('../../../navigation/tabs/TabsStack', () => ({
  TabsScreens: {HOME: 'Home'},
}));

jest.mock(
  '../components/DeleteConfirmationModal',
  () =>
    ({onPressOk}: {onPressOk: () => Promise<void>}) => {
      mockOnDeleteConfirmed(onPressOk);
      return null;
    },
);

jest.mock('../../../components/backup/ResultView', () => ({
  ResultView: (props: {message: string}) => mockResultView(props),
}));

jest.mock(
  '../../../store/wallet/effects/create-multisig/create-multisig',
  () => ({
    cancelTSSCeremony: jest.fn(() => ({type: 'TEST/CANCEL_TSS_CEREMONY'})),
  }),
);

jest.mock('../../../store/app/keyNotifications.effects', () => ({
  unsubscribeKeyNotifications: jest.fn((keyId: string) => ({
    type: 'TEST/UNSUBSCRIBE_KEY_NOTIFICATIONS',
    payload: keyId,
  })),
}));

const deleteKeyCalls = () =>
  mockDispatch.mock.calls.filter(
    ([action]) => action?.type === 'WALLET/DELETE_KEY',
  );

describe('DeleteKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.WALLET.keys['key-1'].cloudBackupTimestamp = undefined;
  });

  it('deletes the key once when it opens already confirmed', async () => {
    mockRoute.params = {keyId: 'key-1', confirmed: true};

    const {rerender} = render(<DeleteKey />);
    await act(() => Promise.resolve());
    rerender(<DeleteKey />);
    await act(() => Promise.resolve());

    expect(deleteKeyCalls()).toEqual([
      [{type: 'WALLET/DELETE_KEY', payload: {keyId: 'key-1'}}],
    ]);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'TEST/UNSUBSCRIBE_KEY_NOTIFICATIONS',
      payload: 'key-1',
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'APP/SET_HOME_CAROUSEL_CONFIG',
      payload: [],
    });
  });

  it.each([
    [
      1,
      '{{keyName}} was removed from this phone. Your {{cloudName}} backup is still there if you need it.',
    ],
    [undefined, '{{keyName}} has been removed from this phone.'],
  ])(
    'mentions the cloud backup only when the key has one (cloudBackupTimestamp %s)',
    async (cloudBackupTimestamp, message) => {
      mockState.WALLET.keys['key-1'].cloudBackupTimestamp =
        cloudBackupTimestamp;
      mockRoute.params = {keyId: 'key-1', confirmed: true};

      render(<DeleteKey />);
      await act(() => Promise.resolve());

      expect(mockResultView).toHaveBeenLastCalledWith(
        expect.objectContaining({message}),
      );
    },
  );

  it('does not delete the key when it opens without confirmation', async () => {
    mockRoute.params = {keyId: 'key-1'};

    render(<DeleteKey />);
    await act(() => Promise.resolve());

    expect(deleteKeyCalls()).toEqual([]);
  });

  it('cancels a TSS ceremony immediately when confirming legacy deletion', async () => {
    mockRoute.params = {keyId: 'key-1'};
    render(<DeleteKey />);

    await act(async () => {
      const deletion = mockOnDeleteConfirmed.mock.calls[0][0]();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'TEST/CANCEL_TSS_CEREMONY',
      });
      expect(deleteKeyCalls()).toEqual([]);
      await deletion;
    });

    expect(deleteKeyCalls()).toHaveLength(1);
  });
});
