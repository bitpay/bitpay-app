import React, {useRef} from 'react';
import Button, {ButtonState} from '../../../button/Button';
import BoxInput from '../../../form/BoxInput';
import {useState} from 'react';
import {H4, Paragraph} from '../../../styled/Text';
import {
  ActionsRow,
  DescriptionRow,
  Header,
  Wrapper,
} from '../import-ledger-wallet.styled';
import {getCryptoCurrencyById} from '@ledgerhq/cryptoassets';
import AppBtc, {AddressFormat} from '@ledgerhq/hw-app-btc';
import AppEth from '@ledgerhq/hw-app-eth';
import Xrp from '@ledgerhq/hw-app-xrp';
import Transport from '@ledgerhq/hw-transport';
import {
  SupportedLedgerAppNames,
  getLedgerErrorMessage,
  prepareLedgerApp,
} from '../utils';
import {Network} from '../../../../constants';
import {
  getAccount,
  getDerivationStrategy,
  sleep,
} from '../../../../utils/helper-methods';
import {
  startGetRates,
  startImportFromHardwareWallet,
} from '../../../../store/wallet/effects';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../utils/hooks';
import styled from 'styled-components/native';
import {
  EVMAccountParams,
  UtxoAccountParams,
  XrpAccountParams,
  currencyConfigs,
} from './SelectLedgerCurrency';
import {IsUtxoChain} from '../../../../store/wallet/utils/currency';
import {
  successCreateKey,
  updatePortfolioBalance,
} from '../../../../store/wallet/wallet.actions';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {DefaultDerivationPath} from '../../../../constants/defaultDerivationPath';
import {startUpdateWalletStatus} from '../../../../store/wallet/effects/status/status';
import {ErrorDescriptionColumn} from '../components/ErrorDescriptionColumn';
import {buildKeyObj} from '../../../../store/wallet/utils/wallet';
import {setHomeCarouselConfig} from '../../../../store/app/app.actions';

interface Props {
  onComplete: () => void;
  onAddByDerivationPathSelected: () => void;
  transport: Transport;
  setHardwareWalletTransport: React.Dispatch<
    React.SetStateAction<Transport | null>
  >;
  onDisconnect: () => Promise<void>;
  selectedChain: string;
  scannedWalletsIds?: string[];
}

export const AddByDerivationPath: React.FC<Props> = props => {
  const defaultCoin =
    props.selectedChain === 'btc'
      ? `defaultLedger${props.selectedChain.toUpperCase()}`
      : `default${props.selectedChain.toUpperCase()}`;
  const [derivationPath, setDerivationPath] = useState<string>(
    (DefaultDerivationPath as Record<string, any>)[defaultCoin],
  );
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const [error, setError] = useState('');
  const [continueButtonState, setContinueButtonState] =
    useState<ButtonState>(null);
  const isLoading = continueButtonState === 'loading';
  const [isPromptOpenApp, setPromptOpenApp] = useState(false);
  const keys = useAppSelector(({WALLET}) => WALLET.keys);

  // use the ref when doing any work that could cause disconnects and cause a new transport to be passed in mid-function
  const transportRef = useRef(props.transport);
  transportRef.current = props.transport;

  const setPromptOpenAppState = (state: boolean) => setPromptOpenApp(state);

  const importUtxoAccount = async ({
    currencyId,
    transportCurrency,
    appName,
    network,
    derivationInformation,
    coin,
    chain,
    currencySymbol,
  }: {
    currencyId: string;
    transportCurrency: string;
    appName: SupportedLedgerAppNames;
    network: Network;
    derivationInformation: {
      format: AddressFormat | undefined;
      purpose: string;
    }[];
    coin: string;
    chain: 'btc' | 'bch' | 'ltc' | 'doge';
    currencySymbol: 'btc' | 'bch' | 'ltc' | 'doge';
  }) => {
    try {
      logger.debug('Preparing app... approve should be requested soon');
      const hardwareSource = 'ledger';
      let key = Object.values(keys).find(
        k => k.id === `readonly/${hardwareSource}`,
      );
      if (!key) {
        key = buildKeyObj({
          key: undefined,
          wallets: [],
          hardwareSource,
          backupComplete: true,
        });
      }
      const c = getCryptoCurrencyById(currencyId);
      if (c.bitcoinLikeInfo?.XPUBVersion) {
        await prepareLedgerApp(
          appName,
          transportRef,
          props.setHardwareWalletTransport,
          props.onDisconnect,
          setPromptOpenAppState,
        );
        logger.debug('Prepare accepted... starting import');

        const app = new AppBtc({
          transport: transportRef.current,
          currency: transportCurrency,
        });
        const derivationStrategy = getDerivationStrategy(derivationPath);
        const xpubVersion =
          currencySymbol.includes('doge') || currencySymbol.includes('ltc')
            ? 0x0488b21e // doge and ltc uses the same xpub version as btc
            : c.bitcoinLikeInfo.XPUBVersion;
        logger.debug(`Get wallet public key with path: ${derivationPath}`);
        const xPubKey = await app.getWalletXpub({
          path: derivationPath,
          xpubVersion,
        });
        const newWallet = await dispatch(
          startImportFromHardwareWallet({
            key,
            hardwareSource: 'ledger',
            xPubKey,
            accountPath: derivationPath,
            coin: currencySymbol,
            chain,
            derivationStrategy,
            accountNumber: Number(getAccount(derivationPath)),
            network,
          }),
        );
        const walletsToRemove = props?.scannedWalletsIds;
        const walletsToPersist = key.wallets.filter(
          (wallet: Wallet) => !walletsToRemove?.includes(wallet?.id),
        );
        key.wallets = [...walletsToPersist, newWallet];
        await dispatch(
          successCreateKey({
            key,
          }),
        );
        // wait for scanning to finish to perform this action
        if (!newWallet.isScanning) {
          try {
            await dispatch(startGetRates({force: true}));
            await dispatch(
              startUpdateWalletStatus({key, wallet: newWallet, force: true}),
            );
            await sleep(1000);
            await dispatch(updatePortfolioBalance());
          } catch (error) {
            // ignore error
          }
        }
        dispatch(
          setHomeCarouselConfig({
            id: key.id,
            show: true,
          }),
        );
        logger.debug('Success adding wallet');

        props.onComplete();
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
    purpose,
    coin,
    currencySymbol,
    chain,
  }: {
    appName: SupportedLedgerAppNames;
    network: Network;
    purpose: string;
    coin: string;
    currencySymbol: 'eth' | 'matic';
    chain: 'eth' | 'matic' | 'arb' | 'op' | 'base';
  }) => {
    try {
      logger.debug('Preparing app... approve should be requested soon');
      const hardwareSource = 'ledger';
      let key = Object.values(keys).find(
        k => k.id === `readonly/${hardwareSource}`,
      );
      if (!key) {
        key = buildKeyObj({
          key: undefined,
          wallets: [],
          hardwareSource,
          backupComplete: true,
        });
      }
      await prepareLedgerApp(
        appName,
        transportRef,
        props.setHardwareWalletTransport,
        props.onDisconnect,
        setPromptOpenAppState,
      );
      logger.debug('Prepare accepted... starting import');
      const eth = new AppEth(transportRef.current);
      const derivationStrategy = getDerivationStrategy(derivationPath);
      logger.debug(`Get wallet public key with path: ${derivationPath}`);
      const {publicKey} = await eth.getAddress(`${derivationPath}/0/0`);
      const newWallet = await dispatch(
        startImportFromHardwareWallet({
          key,
          hardwareSource: 'ledger',
          publicKey,
          accountPath: derivationPath,
          coin: currencySymbol,
          chain,
          derivationStrategy,
          accountNumber: Number(getAccount(derivationPath)),
          network,
        }),
      );
      const walletsToRemove = props?.scannedWalletsIds;
      const walletsToPersist = key.wallets.filter(
        (wallet: Wallet) => !walletsToRemove?.includes(wallet?.id),
      );
      key.wallets = [...walletsToPersist, newWallet];

      await dispatch(
        successCreateKey({
          key,
        }),
      );
      // wait for scanning to finish to perform this action
      if (!newWallet.isScanning) {
        try {
          await dispatch(startGetRates({force: true}));
          await dispatch(
            startUpdateWalletStatus({key, wallet: newWallet, force: true}),
          );
          await sleep(1000);
          await dispatch(updatePortfolioBalance());
        } catch (error) {
          // ignore error
        }
      }
      dispatch(
        setHomeCarouselConfig({
          id: key.id,
          show: true,
        }),
      );
      logger.debug('Success adding wallet');
      props.onComplete();
    } catch (err) {
      const errMsg = getLedgerErrorMessage(err);

      setError(errMsg);
    } finally {
      await sleep(1000);
    }
  };

  const importXrpAccount = async ({
    appName,
    network,
    purpose,
    coin,
    currencySymbol,
    chain,
  }: {
    appName: SupportedLedgerAppNames;
    network: Network;
    purpose: string;
    coin: string;
    currencySymbol: 'xrp';
    chain: 'xrp';
  }) => {
    try {
      logger.debug('Preparing app... approve should be requested soon');
      const hardwareSource = 'ledger';
      let key = Object.values(keys).find(
        k => k.id === `readonly/${hardwareSource}`,
      );
      if (!key) {
        key = buildKeyObj({
          key: undefined,
          wallets: [],
          hardwareSource,
          backupComplete: true,
        });
      }
      await prepareLedgerApp(
        appName,
        transportRef,
        props.setHardwareWalletTransport,
        props.onDisconnect,
        setPromptOpenAppState,
      );
      logger.debug('Prepare accepted... starting import');
      const xrp = new Xrp(transportRef.current);
      const derivationStrategy = getDerivationStrategy(derivationPath);
      logger.debug(`Get wallet public key with path: ${derivationPath}`);
      const {publicKey} = await xrp.getAddress(`${derivationPath}/0/0`);
      const newWallet = await dispatch(
        startImportFromHardwareWallet({
          key,
          hardwareSource: 'ledger',
          publicKey,
          accountPath: derivationPath,
          coin: currencySymbol,
          chain,
          derivationStrategy,
          accountNumber: Number(getAccount(derivationPath)),
          network,
        }),
      );
      const walletsToRemove = props?.scannedWalletsIds;
      const walletsToPersist = key.wallets.filter(
        (wallet: Wallet) => !walletsToRemove?.includes(wallet?.id),
      );
      key.wallets = [...walletsToPersist, newWallet];
      await dispatch(
        successCreateKey({
          key,
        }),
      );
      // wait for scanning to finish to perform this action
      if (!newWallet.isScanning) {
        try {
          await dispatch(startGetRates({force: true}));
          await dispatch(
            startUpdateWalletStatus({key, wallet: newWallet, force: true}),
          );
          await sleep(1000);
          await dispatch(updatePortfolioBalance());
        } catch (error) {
          // ignore error
        }
      }
      dispatch(
        setHomeCarouselConfig({
          id: key.id,
          show: true,
        }),
      );
      logger.debug('Success adding wallet');
      props.onComplete();
    } catch (err) {
      const errMsg = getLedgerErrorMessage(err);

      setError(errMsg);
    } finally {
      await sleep(1000);
    }
  };

  const importLedgerAccount = async (chain: string, network: Network) => {
    const configFn = currencyConfigs[chain];
    if (!configFn) {
      setError(`Unsupported chain: ${chain.toUpperCase()}`);
      return;
    }
    const params = configFn(network);
    if (IsUtxoChain(chain)) {
      return importUtxoAccount(params as UtxoAccountParams);
    }
    if (['eth', 'matic', 'arb', 'op', 'base'].includes(chain)) {
      return importEVMAccount(params as EVMAccountParams);
    }
    if (chain === 'xrp') {
      return importXrpAccount(params as XrpAccountParams);
    }
  };

  const onContinue = async () => {
    setError('');
    setContinueButtonState('loading');
    const network = Network.mainnet;
    await importLedgerAccount(props.selectedChain, network);
    setContinueButtonState(null);
  };

  return (
    <Wrapper>
      <Header>
        {isPromptOpenApp ? (
          <H4>Approve BitPay</H4>
        ) : (
          <H4>Add By Derivation Path</H4>
        )}
      </Header>

      {error && error !== 'user denied transaction' && !isLoading ? (
        <ErrorDescriptionColumn error={error} />
      ) : null}

      <DescriptionRow style={{marginTop: 12}}>
        {isPromptOpenApp ? (
          <Paragraph style={{textAlign: 'center'}}>
            Approve the app BitPay so wallets can be added to your device.
          </Paragraph>
        ) : (
          <Paragraph style={{textAlign: 'center'}}>
            Verify the derivation path of the wallet you are attempting to
            import within your Ledger Live App.
          </Paragraph>
        )}
      </DescriptionRow>

      <DescriptionRow>
        <BoxInput
          accessibilityLabel="derivation-path-box-input"
          label={undefined}
          onChangeText={setDerivationPath}
          defaultValue={derivationPath}
        />
      </DescriptionRow>

      <ActionsRow>
        <Button state={continueButtonState} onPress={onContinue}>
          Continue
        </Button>
      </ActionsRow>
      <ActionsRow>
        <Button
          buttonType={'link'}
          onPress={props.onAddByDerivationPathSelected}>
          Go Back
        </Button>
      </ActionsRow>
    </Wrapper>
  );
};
