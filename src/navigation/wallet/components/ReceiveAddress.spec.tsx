import React from 'react';
import {Provider} from 'react-redux';
import {act, cleanup, fireEvent, render} from '@test/render';
import configureTestStore from '@test/store';
import ReceiveAddress from './ReceiveAddress';

const CASH_ADDRESS = 'bitcoincash:qpr7smnv4xdg7ej70lylsk0p3hrfut5v5c5qpucl45';
const LEGACY_ADDRESS = '17ZDREWiRYj1BC6iFKM7eBpE33sv34772c';

jest.mock('../../../components/modal/base/sheet/SheetModal', () => ({
  __esModule: true,
  default: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('react-native-qrcode-svg', () => () => null);

jest.mock('@components/base/TouchableOpacity', () => ({
  ...jest.requireActual('@components/base/TouchableOpacity'),
  TouchableOpacity: jest.requireActual('react-native').Pressable,
}));

jest.mock('../../../store/wallet/effects/address/address', () => ({
  ...jest.requireActual('../../../store/wallet/effects/address/address'),
  createWalletAddress: () => async () =>
    'qpr7smnv4xdg7ej70lylsk0p3hrfut5v5c5qpucl45',
}));

const wallet: any = {
  id: 'wallet-id',
  currencyAbbreviation: 'bch',
  chain: 'bch',
  network: 'livenet',
  credentials: {},
  isComplete: () => true,
  getStatus: (_opts: unknown, cb: Function) =>
    cb(null, {wallet: {singleAddress: false}}),
};

describe('ReceiveAddress BCH address type', () => {
  afterEach(cleanup);

  it('keeps the legacy address when Legacy is pressed again', async () => {
    const {getByText} = render(
      <Provider store={configureTestStore({})}>
        <ReceiveAddress
          isVisible={true}
          closeModal={jest.fn()}
          wallet={wallet}
        />
      </Provider>,
    );

    await act(async () => {});
    expect(getByText(CASH_ADDRESS.replace('bitcoincash:', ''))).toBeTruthy();

    await act(async () => fireEvent.press(getByText('Legacy')));
    expect(getByText(LEGACY_ADDRESS)).toBeTruthy();

    await act(async () => fireEvent.press(getByText('Legacy')));
    expect(getByText(LEGACY_ADDRESS)).toBeTruthy();

    await act(async () => fireEvent.press(getByText('Cash Address')));
    expect(getByText(CASH_ADDRESS.replace('bitcoincash:', ''))).toBeTruthy();
  });
});
