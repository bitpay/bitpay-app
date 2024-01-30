import {getCryptoCurrencyById} from '@ledgerhq/cryptoassets';
import {StatusCodes} from '@ledgerhq/errors';
import AppBtc from '@ledgerhq/hw-app-btc';
import AppEth from '@ledgerhq/hw-app-eth';
import Xrp from '@ledgerhq/hw-app-xrp';
import Transport from '@ledgerhq/hw-transport';
import React, {useEffect, useRef, useState} from 'react';
import styled from 'styled-components/native';
import BtcLogoSvg from '../../../../../assets/img/currencies/btc.svg';
import EthLogoSvg from '../../../../../assets/img/currencies/eth.svg';
import XrpLogoSvg from '../../../../../assets/img/currencies/xrp.svg';
import BchLogoSvg from '../../../../../assets/img/currencies/bch.svg';
import LtcLogoSvg from '../../../../../assets/img/currencies/ltc.svg';
import DogeLogoSvg from '../../../../../assets/img/currencies/doge.svg';
import MaticLogoSvg from '../../../../../assets/img/currencies/matic.svg';
import Checkbox from '../../../checkbox/Checkbox';
import {
  AdvancedOptions,
  AdvancedOptionsButton,
  AdvancedOptionsButtonText,
  AdvancedOptionsContainer,
  Column,
} from '../../../styled/Containers';
import {Network} from '../../../../constants';
import ChevronUpSvg from '../../../../../assets/img/chevron-up.svg';
import ChevronDownSvg from '../../../../../assets/img/chevron-down.svg';
import {startImportFromHardwareWallet} from '../../../../store/wallet/effects';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {LinkBlue, SlateDark, Warning25, White} from '../../../../styles/colors';
import {
  getDerivationStrategy,
  getProtocolName,
  sleep,
} from '../../../../utils/helper-methods';
import {useAppDispatch} from '../../../../utils/hooks';
import Button, {ButtonState} from '../../../button/Button';
import {BaseText, H3, H6, Paragraph} from '../../../styled/Text';
import {
  ActionsRow,
  DescriptionRow,
  Header,
  Wrapper,
} from '../import-ledger-wallet.styled';
import {
  SupportedLedgerAppNames,
  getCurrentLedgerAppInfo,
  getLedgerErrorMessage,
} from '../utils';
import haptic from '../../../../components/haptic-feedback/haptic';
import {useTranslation} from 'react-i18next';
import BoxInput from '../../../../components/form/BoxInput';
import {
  IsSegwitCoin,
  IsUtxoCoin,
} from '../../../../store/wallet/utils/currency';

interface Props {
  transport: Transport;

  /**
   * Ask the parent app to quit any running Ledger app and resolve once any reconnects are handled.
   *
   * @param transport
   * @returns
   */
  onRequestQuitApp: (transport: Transport) => Promise<any>;

  /**
   * Ask the parent component to open the specified Ledger app and resolve once any reconnects are handled.
   *
   * @param transport
   * @param name
   * @returns
   */
  onRequestOpenApp: (
    transport: Transport,
    name: SupportedLedgerAppNames,
  ) => Promise<any>;
  onImported: (wallet: Wallet) => void;
  onCurrencySelected?: (args: {
    currency: string;
    network: Network;
    accountIndex: string;
  }) => void;
}

export interface BaseAccountParams {
  appName: SupportedLedgerAppNames;
  network: Network;
  accountIndex: string;
  purpose: string;
  coin: string;
}

export interface UtxoAccountParams extends BaseAccountParams {
  currencyId: string;
  transportCurrency: string;
  currencySymbol: 'btc' | 'bch' | 'ltc' | 'doge';
}

export interface EVMAccountParams extends BaseAccountParams {
  currencySymbol: 'eth' | 'matic';
}

export interface XrpAccountParams extends BaseAccountParams {
  currencySymbol: 'xrp';
}

export type CurrencyConfigFn = (
  network: Network,
  accountIndex: string,
  useNativeSegwit?: boolean,
) => UtxoAccountParams | EVMAccountParams | XrpAccountParams;

export const currencyConfigs: {[key: string]: CurrencyConfigFn} = {
  btc: (network, account, useNativeSegwit) => {
    const isMainnet = network === Network.mainnet;
    return {
      currencyId: isMainnet ? 'bitcoin' : 'bitcoin_testnet',
      transportCurrency: isMainnet ? 'bitcoin' : 'bitcoin_testnet',
      appName: isMainnet ? 'Bitcoin' : 'Bitcoin Test',
      network,
      accountIndex: account,
      purpose: useNativeSegwit ? "84'" : "44'",
      coin: network === Network.mainnet ? "0'" : "1'",
      currencySymbol: 'btc',
    };
  },
  bch: (network, account) => {
    return {
      currencyId: 'bitcoin_cash',
      transportCurrency: 'bitcoin_cash',
      appName: 'Bitcoin Cash',
      network,
      accountIndex: account,
      purpose: "44'",
      coin: "145'",
      currencySymbol: 'bch',
    };
  },
  ltc: (network, account) => {
    return {
      currencyId: 'litecoin',
      transportCurrency: 'litecoin',
      appName: 'Litecoin',
      network,
      accountIndex: account,
      purpose: "84'",
      coin: "2'",
      currencySymbol: 'ltc',
    };
  },
  doge: (network, account) => {
    return {
      currencyId: 'dogecoin',
      transportCurrency: 'dogecoin',
      appName: 'Dogecoin',
      network,
      accountIndex: account,
      purpose: "44'",
      coin: "3'",
      currencySymbol: 'doge',
    };
  },
  eth: (network, account) => {
    const isMainnet = network === Network.mainnet;
    return {
      appName: isMainnet ? 'Ethereum' : 'Ethereum Goerli',
      network,
      accountIndex: account,
      purpose: "44'",
      coin: isMainnet ? "60'" : "1'",
      currencySymbol: 'eth',
    };
  },
  matic: (network, account) => {
    return {
      appName: 'Polygon',
      network,
      accountIndex: account,
      purpose: "44'",
      coin: "60'",
      currencySymbol: 'matic',
    };
  },
  xrp: (network, account) => {
    return {
      appName: 'XRP',
      network,
      accountIndex: account,
      purpose: "44'",
      coin: '144',
      currencySymbol: 'xrp',
    };
  },
};

const List = styled.View``;

const ScrollView = styled.ScrollView``;

const WalletAdvancedOptionsContainer = styled(AdvancedOptionsContainer)`
  margin-top: 20px;
`;

const CurrencyRow = styled.View<{selected?: boolean; first?: boolean}>`
  display: flex;
  flex-direction: row;
  align-items: center;
  border: 2px solid ${({selected}) => (selected ? LinkBlue : SlateDark)};
  border-radius: 12px;
  padding: 24px;
  margin-top: ${({first}) => (first ? 0 : 16)}px;
`;

const ShrinkColumn = styled.View`
  flex-grow: 0;
  flex-shrink: 1;
`;

const StretchColumn = styled.View`
  flex: 1 1 100%;
`;

const OptionRow = styled.View<{first?: boolean}>`
  align-items: center;
  display: flex;
  flex-direction: row;
  margin-top: ${({first}) => (first ? 0 : 12)}px;
  padding: 12px 24px;
`;

const OptionTitle = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const RowContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 18px;
`;

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
`;

const InputContainer = styled.View`
  padding: 18px;
`;

const ErrParagraph = styled(Paragraph)`
  background-color: ${Warning25};
  border-radius: 12px;
  padding: 20px;
`;

const CURRENCIES = [
  {
    coin: 'btc',
    label: 'Bitcoin',
    icon: <BtcLogoSvg height={35} width={35} />,
    isTestnetSupported: true,
  },
  {
    coin: 'eth',
    label: 'Ethereum',
    icon: <EthLogoSvg height={35} width={35} />,
    isTestnetSupported: true,
  },
  {
    coin: 'matic',
    label: 'Polygon',
    icon: <MaticLogoSvg height={35} width={35} />,
    isTestnetSupported: false,
  },
  {
    coin: 'xrp',
    label: 'XRP',
    icon: <XrpLogoSvg height={35} width={35} />,
    isTestnetSupported: false,
  },
  {
    coin: 'bch',
    label: 'BCH',
    icon: <BchLogoSvg height={35} width={35} />,
    isTestnetSupported: false,
  },
  {
    coin: 'ltc',
    label: 'LTC',
    icon: <LtcLogoSvg height={35} width={35} />,
    isTestnetSupported: false,
  },
  {
    coin: 'doge',
    label: 'DOGE',
    icon: <DogeLogoSvg height={35} width={35} />,
    isTestnetSupported: false,
  },
];

const TESTNET_SUPPORT_MAP = CURRENCIES.reduce<Record<string, boolean>>(
  (acc, c) => {
    acc[c.coin] = c.isTestnetSupported;
    return acc;
  },
  {},
);

export const SelectLedgerCurrency: React.FC<Props> = props => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const [selectedCurrency, setSelectedCurrency] = useState('btc');
  const [useTestnet, setUseTestnet] = useState(false);
  const [accountIndex, setAccountIndex] = useState('0');
  const [showOptions, setShowOptions] = useState(false);
  const [continueButtonState, setContinueButtonState] =
    useState<ButtonState>(null);
  const [error, setError] = useState('');
  const [isPromptOpenApp, setPromptOpenApp] = useState(false);

  const nativeSegwitCurrency = IsSegwitCoin(selectedCurrency);
  const [useNativeSegwit, setUseNativeSegwit] = useState(nativeSegwitCurrency);

  const isLoading = continueButtonState === 'loading';
  const isTestnetEnabled = TESTNET_SUPPORT_MAP[selectedCurrency] || false;

  // use the ref when doing any work that could cause disconnects and cause a new transport to be passed in mid-function
  const transportRef = useRef(props.transport);
  transportRef.current = props.transport;

  /**
   * Closes the current Ledger app and prompts the user to open the correct app
   * if needed.
   *
   * Closing and opening apps causes disconnects, so if the requested app is
   * not open there may be some wait time involved while trying to reconnect.
   *
   * @param appName
   */
  const prepareLedgerApp = async (appName: SupportedLedgerAppNames) => {
    const info = await getCurrentLedgerAppInfo(transportRef.current);
    const anAppIsOpen = info.name !== 'BOLOS'; // BOLOS is the Ledger OS
    const isCorrectAppOpen = info.name === appName;

    // either another app is open or no apps are open
    if (!isCorrectAppOpen) {
      // different app must be running, close it
      if (anAppIsOpen) {
        await props.onRequestQuitApp(transportRef.current);
      }

      // prompt the user to open the corresponding app on the Ledger
      try {
        // display a prompt on the Ledger to open the correct app
        setPromptOpenApp(true);
        const openAppResult = await props.onRequestOpenApp(
          transportRef.current,
          appName,
        );
        const statusCode = openAppResult.readUInt16BE(openAppResult.length - 2);

        if (statusCode === StatusCodes.OK) {
          // app opened successfully!
        } else if (statusCode === 0x6807) {
          throw new Error(
            `The ${appName} app is required on your Ledger to continue`,
          );
        } else {
          throw new Error(
            `An unknown status code was returned: 0x${statusCode.toString(16)}`,
          );
        }
      } catch (err) {
        // Something went wrong, did the user reject?
        throw err;
      } finally {
        setPromptOpenApp(false);
      }
    } else {
      // correct app is installed and open on the device
    }
  };

  const importXrpAccount = async ({
    appName,
    network,
    accountIndex = '0',
    purpose,
    coin,
    currencySymbol,
  }: {
    appName: SupportedLedgerAppNames;
    network: Network;
    accountIndex: string;
    purpose: string;
    coin: string;
    currencySymbol: 'xrp';
  }) => {
    try {
      await prepareLedgerApp(appName);
      const xrp = new Xrp(transportRef.current);
      const account = `${accountIndex}'`;
      const path = `m/${purpose}/${coin}/${account}/0/0`;
      const derivationStrategy = getDerivationStrategy(path);
      const {publicKey} = await xrp.getAddress(path);
      const newWallet = await dispatch(
        startImportFromHardwareWallet({
          hardwareSource: 'ledger',
          publicKey,
          accountPath: path,
          coin: currencySymbol,
          derivationStrategy,
          useNativeSegwit: false,
          accountNumber: Number(accountIndex),
          network,
        }),
      );
      props.onImported(newWallet);
    } catch (err) {
      const errMsg = getLedgerErrorMessage(err);

      setError(errMsg);
    } finally {
      await sleep(1000);
    }
  };

  const importUtxoAccount = async ({
    currencyId,
    transportCurrency,
    appName,
    network,
    accountIndex = '0',
    purpose,
    coin,
    currencySymbol,
  }: {
    currencyId: string;
    transportCurrency: string;
    appName: SupportedLedgerAppNames;
    network: Network;
    accountIndex: string;
    purpose: string;
    coin: string;
    currencySymbol: 'btc' | 'bch' | 'ltc' | 'doge';
  }) => {
    try {
      const c = getCryptoCurrencyById(currencyId);
      if (c.bitcoinLikeInfo?.XPUBVersion) {
        await prepareLedgerApp(appName);
        const app = new AppBtc({
          transport: transportRef.current,
          currency: transportCurrency,
        });

        const account = `${accountIndex}'`;
        const path = `m/${purpose}/${coin}/${account}`;
        const derivationStrategy = getDerivationStrategy(path);
        const xpubVersion =
          currencySymbol.includes('doge') || currencySymbol.includes('ltc')
            ? 0x0488b21e // doge and ltc uses the same xpub version as btc
            : c.bitcoinLikeInfo.XPUBVersion;

        const xPubKey = await app.getWalletXpub({
          path,
          xpubVersion,
        });

        const newWallet = await dispatch(
          startImportFromHardwareWallet({
            hardwareSource: 'ledger',
            xPubKey,
            accountPath: path,
            coin: currencySymbol,
            useNativeSegwit,
            derivationStrategy,
            accountNumber: Number(accountIndex),
            network,
          }),
        );

        props.onImported(newWallet);
      }
    } catch (err) {
      const errMsg = getLedgerErrorMessage(err);

      setError(errMsg);
    } finally {
      await sleep(1000);
    }
  };

  const importEVMAccount = async ({
    appName,
    network,
    accountIndex = '0',
    purpose,
    coin,
    currencySymbol,
  }: {
    appName: SupportedLedgerAppNames;
    network: Network;
    accountIndex: string;
    purpose: string;
    coin: string;
    currencySymbol: 'eth' | 'matic';
  }) => {
    try {
      await prepareLedgerApp(appName);
      const eth = new AppEth(transportRef.current);
      const account = `${accountIndex}'`;
      const path = `m/${purpose}/${coin}/${account}/0/0`;
      const derivationStrategy = getDerivationStrategy(path);
      const {publicKey} = await eth.getAddress(path);
      const newWallet = await dispatch(
        startImportFromHardwareWallet({
          hardwareSource: 'ledger',
          publicKey,
          accountPath: path,
          coin: currencySymbol,
          derivationStrategy,
          useNativeSegwit: false,
          accountNumber: Number(accountIndex),
          network,
        }),
      );

      props.onImported(newWallet);
    } catch (err) {
      const errMsg = getLedgerErrorMessage(err);

      setError(errMsg);
    } finally {
      await sleep(1000);
    }
  };

  const importLedgerAccount = async (
    currency: string,
    network: Network,
    account: string,
  ) => {
    const configFn = currencyConfigs[currency];
    if (!configFn) {
      setError(`Unsupported currency: ${currency.toUpperCase()}`);
      return;
    }
    const params = configFn(network, account, useNativeSegwit);
    if (IsUtxoCoin(currency)) {
      return importUtxoAccount(params as UtxoAccountParams);
    }
    if (['eth', 'matic'].includes(currency)) {
      return importEVMAccount(params as EVMAccountParams);
    }
    if (currency === 'xrp') {
      return importXrpAccount(params as XrpAccountParams);
    }
  };

  const onContinue = async () => {
    setError('');
    setContinueButtonState('loading');

    let validAccountIndex = false;

    try {
      Number.parseInt(accountIndex);
      validAccountIndex = true;
    } catch (err) {
      validAccountIndex = false;
    }

    if (validAccountIndex) {
      const network = useTestnet ? Network.testnet : Network.mainnet;

      await importLedgerAccount(selectedCurrency, network, accountIndex);
    } else {
      setError('Invalid account value');
    }

    setContinueButtonState(null);
  };

  useEffect(() => {
    if (!isTestnetEnabled) {
      setUseTestnet(false);
    }
  }, [isTestnetEnabled]);

  return (
    <ScrollView>
      <Wrapper>
        <Header>
          <H3>Choose Currency to Import</H3>
        </Header>

        {error && !isLoading ? (
          <DescriptionRow>
            <ErrParagraph>{error}</ErrParagraph>
          </DescriptionRow>
        ) : null}

        {isLoading ? (
          <DescriptionRow>
            {isPromptOpenApp ? (
              <Paragraph>Approve the app on your Ledger</Paragraph>
            ) : (
              <Paragraph>Waiting for Ledger...</Paragraph>
            )}
          </DescriptionRow>
        ) : (
          <>
            <List>
              {CURRENCIES.map(c => (
                <CurrencyRow key={c.coin}>
                  <ShrinkColumn>{c.icon}</ShrinkColumn>
                  <StretchColumn
                    style={{
                      marginLeft: 16,
                    }}>
                    <H6>{c.label}</H6>
                  </StretchColumn>
                  <ShrinkColumn>
                    <Checkbox
                      disabled={isLoading}
                      radio={true}
                      onPress={() => setSelectedCurrency(c.coin)}
                      checked={selectedCurrency === c.coin}
                    />
                  </ShrinkColumn>
                </CurrencyRow>
              ))}
            </List>

            <WalletAdvancedOptionsContainer>
              <AdvancedOptionsButton
                onPress={() => {
                  haptic('impactLight');
                  setShowOptions(!showOptions);
                }}>
                {showOptions ? (
                  <>
                    <AdvancedOptionsButtonText>
                      {t('Hide Advanced Options')}
                    </AdvancedOptionsButtonText>
                    <ChevronUpSvg />
                  </>
                ) : (
                  <>
                    <AdvancedOptionsButtonText>
                      {t('Show Advanced Options')}
                    </AdvancedOptionsButtonText>
                    <ChevronDownSvg />
                  </>
                )}
              </AdvancedOptionsButton>

              {showOptions && (
                <AdvancedOptions>
                  <InputContainer>
                    <BoxInput
                      accessibilityLabel="account-box-input"
                      label={'Account'}
                      onChangeText={(text: string) => {
                        setAccountIndex(text);
                      }}
                      value={accountIndex}
                    />
                  </InputContainer>
                </AdvancedOptions>
              )}

              {showOptions && nativeSegwitCurrency && (
                <AdvancedOptions>
                  <RowContainer
                    onPress={() => {
                      setUseNativeSegwit(!useNativeSegwit);
                    }}>
                    <Column>
                      <OptionTitle>Segwit</OptionTitle>
                    </Column>
                    <CheckBoxContainer>
                      <Checkbox
                        checked={useNativeSegwit}
                        onPress={() => {
                          setUseNativeSegwit(!useNativeSegwit);
                        }}
                      />
                    </CheckBoxContainer>
                  </RowContainer>
                </AdvancedOptions>
              )}

              {showOptions && isTestnetEnabled && (
                <AdvancedOptions>
                  <RowContainer activeOpacity={1}>
                    <Column>
                      <OptionTitle>
                        {getProtocolName(selectedCurrency || '', 'testnet')}
                      </OptionTitle>
                    </Column>
                    <CheckBoxContainer>
                      <Checkbox
                        disabled={isLoading || !isTestnetEnabled}
                        checked={useTestnet}
                        onPress={() => {
                          setUseTestnet(x => !x);
                        }}
                      />
                    </CheckBoxContainer>
                  </RowContainer>
                </AdvancedOptions>
              )}
            </WalletAdvancedOptionsContainer>
          </>
        )}
        <ActionsRow>
          <Button state={continueButtonState} onPress={onContinue}>
            Continue
          </Button>
        </ActionsRow>
      </Wrapper>
    </ScrollView>
  );
};
