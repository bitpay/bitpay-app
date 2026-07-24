import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import ChainSearch from './ChainSearch';

const mockDispatch = jest.fn();
const mockCloneDeep = jest.fn((value: unknown) => value);
let mockSelectedChainFilterOption: string | undefined;

jest.mock('../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      APP: {
        selectedChainFilterOption: mockSelectedChainFilterOption,
        selectedLocalChainFilterOption: undefined,
      },
    }),
}));

jest.mock('../../contexts', () => ({
  useTheme: () => ({dark: false}),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (value: string) => value,
  }),
}));

jest.mock('lodash.clonedeep', () => (value: unknown) => mockCloneDeep(value));

jest.mock('../styled/Containers', () => {
  const ReactLib = require('react');
  const {TextInput, View} = require('react-native');

  return {
    SearchRoundContainer: ({children}: {children: React.ReactNode}) =>
      ReactLib.createElement(View, null, children),
    SearchRoundInput: (props: Record<string, unknown>) =>
      ReactLib.createElement(TextInput, {
        ...props,
        testID: 'chain-search-input',
      }),
  };
});

jest.mock('../styled/Text', () => {
  const ReactLib = require('react');
  const {Text} = require('react-native');

  return {
    BaseText: ({children, ...props}: {children: React.ReactNode}) =>
      ReactLib.createElement(Text, props, children),
  };
});

jest.mock('../modal/chain-selector/ChainSelector', () => ({
  ignoreGlobalListContextList: [],
}));

jest.mock('../currency-image/CurrencyImage', () => ({
  CurrencyImage: () => null,
}));

jest.mock('../../store/app', () => ({
  AppActions: {
    showChainSelectorModal: jest.fn(),
  },
}));

jest.mock('../../constants/WalletConnectV2', () => ({
  WC_SUPPORTED_CHAINS: {},
}));

jest.mock('../../constants/currencies', () => ({
  BitpaySupportedCoins: {},
  SUPPORTED_VM_TOKENS: [],
}));

jest.mock('@components/base/TouchableOpacity', () => {
  const ReactLib = require('react');
  const {TouchableOpacity} = require('react-native');

  return {
    TouchableOpacity: ({children, ...props}: {children: React.ReactNode}) =>
      ReactLib.createElement(TouchableOpacity, props, children),
  };
});

const searchFullList = [
  {
    chain: 'btc',
    chains: ['btc'],
    currencyAbbreviation: 'BTC',
    currencyName: 'Bitcoin',
    walletName: 'Bitcoin Wallet',
  },
  {
    chain: 'eth',
    chains: ['eth'],
    currencyAbbreviation: 'ETH',
    currencyName: 'Ethereum',
    walletName: 'Ethereum Wallet',
  },
];

const renderSearch = (
  overrides: Partial<React.ComponentProps<typeof ChainSearch>> = {},
) => {
  const props = {
    context: 'accountsettings',
    hideFilter: true,
    searchFullList,
    searchResults: [],
    searchVal: '',
    setSearchResults: jest.fn(),
    setSearchVal: jest.fn(),
    ...overrides,
  };

  return {
    ...render(<ChainSearch {...props} />),
    props,
  };
};

describe('ChainSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockSelectedChainFilterOption = undefined;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('does not clone or publish the full list when search is inactive', () => {
    const {props} = renderSearch();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(props.setSearchVal).toHaveBeenCalledWith('');
    expect(mockCloneDeep).not.toHaveBeenCalled();
    expect(props.setSearchResults).not.toHaveBeenCalled();
  });

  it('preserves filtering behavior when the user searches', () => {
    const {getByTestId, props} = renderSearch();

    act(() => {
      jest.advanceTimersByTime(300);
    });
    jest.clearAllMocks();

    fireEvent.changeText(getByTestId('chain-search-input'), 'btc');
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockCloneDeep).toHaveBeenCalledWith(searchFullList);
    expect(props.setSearchVal).toHaveBeenCalledWith('btc');
    expect(props.setSearchResults).toHaveBeenCalledWith([searchFullList[0]]);
  });

  it('cancels pending searches when its inputs change or it unmounts', () => {
    const setSearchVal = jest.fn();
    const setSearchResults = jest.fn();
    const {getByTestId, rerender, unmount} = renderSearch({
      setSearchResults,
      setSearchVal,
    });

    fireEvent.changeText(getByTestId('chain-search-input'), 'btc');
    rerender(
      <ChainSearch
        context="accountsettings"
        hideFilter
        searchFullList={[...searchFullList]}
        searchResults={[]}
        searchVal=""
        setSearchResults={setSearchResults}
        setSearchVal={setSearchVal}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(setSearchVal).not.toHaveBeenCalledWith('btc');

    fireEvent.changeText(getByTestId('chain-search-input'), 'eth');
    unmount();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(setSearchVal).not.toHaveBeenCalledWith('eth');
    expect(setSearchResults).not.toHaveBeenCalled();
  });
});
