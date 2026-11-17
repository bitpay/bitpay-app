import React from 'react';
import {fireEvent, render} from '@test/render';
import CreateMultisig from './CreateMultisig';

const mockDispatch = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
};
const mockState = {APP: {}, WALLET: {}};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, number>) =>
      key.replace(/{{(\w+)}}/g, (_match, name) => String(values?.[name] ?? '')),
  }),
}));

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));

jest.mock('../../../dkls/DklsWorker', () => ({
  requestDklsWorkerMount: jest.fn(),
}));

const screen = () => (
  <CreateMultisig
    navigation={mockNavigation as any}
    route={
      {
        key: 'CreateMultisig',
        name: 'CreateMultisig',
        params: {context: 'addTSSWalletMultisig', currency: 'btc'},
      } as any
    }
  />
);

describe('CreateMultisig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the TSS signing summary and backup warning with the signing rules', () => {
    const {getByTestId, getByText} = render(screen());

    expect(getByText('Any 2 of 3 can approve')).toBeTruthy();
    expect(
      getByText(
        'If 2 co-signers lose access, funds can’t be moved. BitPay can’t recover them.',
      ),
    ).toBeTruthy();

    fireEvent.press(getByTestId('total-copayers-add-button'));

    expect(getByText('Any 2 of 4 can approve')).toBeTruthy();
    expect(
      getByText(
        'If 3 co-signers lose access, funds can’t be moved. BitPay can’t recover them.',
      ),
    ).toBeTruthy();

    fireEvent.press(getByTestId('required-signatures-add-button'));

    expect(getByText('Any 3 of 4 can approve')).toBeTruthy();
    expect(
      getByText(
        'If 2 co-signers lose access, funds can’t be moved. BitPay can’t recover them.',
      ),
    ).toBeTruthy();
  });

  it('lowers the required signatures when the total co-signers drop below them', () => {
    const {getByTestId, getByText} = render(screen());

    fireEvent.press(getByTestId('required-signatures-add-button'));

    expect(getByText('Any 3 of 3 can approve')).toBeTruthy();

    fireEvent.press(getByTestId('total-copayers-remove-button'));

    expect(getByText('Any 2 of 2 can approve')).toBeTruthy();
  });
});
