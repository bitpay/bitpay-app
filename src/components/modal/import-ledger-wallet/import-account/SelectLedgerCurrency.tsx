import {getCryptoCurrencyById} from '@ledgerhq/cryptoassets';
import AppBtc, {AddressFormat} from '@ledgerhq/hw-app-btc';
import AppEth from '@ledgerhq/hw-app-eth';
import Xrp from '@ledgerhq/hw-app-xrp';
import Transport from '@ledgerhq/hw-transport';
import React, {useRef, useState} from 'react';
import styled from 'styled-components/native';
import {
  CurrencyColumn,
  CurrencyImageContainer,
  Hr,
  Row,
  RowContainerWithoutBorders,
} from '../../../styled/Containers';
import {Network} from '../../../../constants';
import {
  startGetRates,
  startImportFromHardwareWallet,
} from '../../../../store/wallet/effects';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {getDerivationStrategy, sleep} from '../../../../utils/helper-methods';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../utils/hooks';
import Button, {ButtonState} from '../../../button/Button';
import {H4, H5, ListItemSubText, Paragraph} from '../../../styled/Text';
import {
  DescriptionRow,
  Header,
  IconRow,
  Wrapper,
} from '../import-ledger-wallet.styled';
import {
  SupportedLedgerAppNames,
  getLedgerErrorMessage,
  prepareLedgerApp,
} from '../utils';
import {IsUtxoChain} from '../../../../store/wallet/utils/currency';
import axios from 'axios';
import {buildKeyObj} from '../../../../store/wallet/utils/wallet';
import {
  successCreateKey,
  updatePortfolioBalance,
} from '../../../../store/wallet/wallet.actions';
import {setHomeCarouselConfig} from '../../../../store/app/app.actions';
import AngleRightSvg from '../../../../../assets/img/angle-right.svg';
import {Platform} from 'react-native';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {CurrencyListIcons} from '../../../../constants/SupportedCurrencyOptions';
import BitpaySvg from '../../../../../assets/img/wallet/transactions/bitpay.svg';
import {BASE_BITCORE_URL} from '../../../../constants/config';
import {startUpdateAllWalletStatusForKey} from '../../../../store/wallet/effects/status/status';
import RadiatingLineAnimation from './RadiatingLineAnimation';
import {ErrorDescriptionColumn} from '../components/ErrorDescriptionColumn';

interface Props {
  transport: Transport;
  setHardwareWalletTransport: React.Dispatch<
    React.SetStateAction<Transport | null>
  >;
  onDisconnect: () => Promise<void>;
  onScannedCompleted: (
    selectedChain: string,
    scannedWalletsIds?: string[],
  ) => void;
  onAddByDerivationPathSelected: () => void;
}

export interface BaseAccountParams {
  appName: SupportedLedgerAppNames;
  network: Network;
  coin: string;
}

export interface UtxoAccountParams extends BaseAccountParams {
  currencyId: string;
  transportCurrency: string;
  currencySymbol: 'btc' | 'bch' | 'ltc' | 'doge';
  chain: 'btc' | 'bch' | 'ltc' | 'doge';
  derivationInformation: {format: AddressFormat | undefined; purpose: string}[];
}

export interface EVMAccountParams extends BaseAccountParams {
  currencySymbol: 'eth' | 'matic';
  chain: 'eth' | 'matic' | 'base' | 'op' | 'arb';
  purpose: string;
}

export interface XrpAccountParams extends BaseAccountParams {
  currencySymbol: 'xrp';
  chain: 'xrp';
  purpose: string;
}

export type CurrencyConfigFn = (
  network: Network,
) => UtxoAccountParams | EVMAccountParams | XrpAccountParams;

export const currencyConfigs: {[key: string]: CurrencyConfigFn} = {
  btc: network => {
    const isMainnet = network === Network.mainnet;
    return {
      currencyId: isMainnet ? 'bitcoin' : 'bitcoin_testnet',
      transportCurrency: isMainnet ? 'bitcoin' : 'bitcoin_testnet',
      appName: isMainnet ? 'Bitcoin' : 'Bitcoin Test',
      network,
      derivationInformation: [
        {
          format: 'legacy',
          purpose: "44'",
        },
        {
          format: 'p2sh',
          purpose: "49'",
        },
        {
          format: 'bech32',
          purpose: "84'",
        },
        // {
        //   format: 'bech32m',
        //   purpose: "86'",
        // },
      ],
      coin: network === Network.mainnet ? "0'" : "1'",
      currencySymbol: 'btc',
      chain: 'btc',
    };
  },
  bch: network => {
    return {
      currencyId: 'bitcoin_cash',
      transportCurrency: 'bitcoin_cash',
      appName: 'Bitcoin Cash',
      network,
      derivationInformation: [
        {
          format: 'cashaddr',
          purpose: "44'",
        },
      ],
      coin: "145'",
      currencySymbol: 'bch',
      chain: 'bch',
    };
  },
  ltc: network => {
    return {
      currencyId: 'litecoin',
      transportCurrency: 'litecoin',
      appName: 'Litecoin',
      network,
      derivationInformation: [
        {
          format: 'legacy',
          purpose: "44'",
        },
        {
          format: 'p2sh',
          purpose: "49'",
        },
        {
          format: 'bech32',
          purpose: "84'",
        },
        // {
        //   format: 'bech32m',
        //   purpose: "86'",
        // },
      ],
      coin: "2'",
      currencySymbol: 'ltc',
      chain: 'ltc',
    };
  },
  doge: network => {
    return {
      currencyId: 'dogecoin',
      transportCurrency: 'dogecoin',
      appName: 'Dogecoin',
      network,
      derivationInformation: [
        {
          format: 'legacy',
          purpose: "44'",
        },
      ],
      coin: "3'",
      currencySymbol: 'doge',
      chain: 'doge',
    };
  },
  eth: network => {
    const isMainnet = network === Network.mainnet;
    return {
      appName: isMainnet ? 'Ethereum' : 'Ethereum Sepolia',
      network,
      purpose: "44'",
      coin: isMainnet ? "60'" : "1'",
      currencySymbol: 'eth',
      chain: 'eth',
    };
  },
  matic: network => {
    const isMainnet = network === Network.mainnet;
    return {
      appName: isMainnet ? 'Polygon' : 'Polygon Amoy',
      network,
      purpose: "44'",
      coin: "60'",
      currencySymbol: 'matic',
      chain: 'matic',
    };
  },
  base: network => {
    return {
      appName: 'Ethereum',
      network,
      purpose: "44'",
      coin: "60'",
      currencySymbol: 'eth',
      chain: 'base',
    };
  },
  arb: network => {
    return {
      appName: 'Ethereum',
      network,
      purpose: "44'",
      coin: "60'",
      currencySymbol: 'eth',
      chain: 'arb',
    };
  },
  op: network => {
    return {
      appName: 'Ethereum',
      network,
      purpose: "44'",
      coin: "60'",
      currencySymbol: 'eth',
      chain: 'op',
    };
  },
  xrp: network => {
    return {
      appName: 'XRP',
      network,
      purpose: "44'",
      coin: "144'",
      currencySymbol: 'xrp',
      chain: 'xrp',
    };
  },
};

const CurrencyListContainer = styled.View`
  flex-direction: column;
  align-items: center;
  margin-top: 24px;
  margin-bottom: 24px;
`;

const ScrollView = styled.ScrollView``;

const CHAINS = [
  {
    chain: 'btc',
    label: 'Bitcoin',
    img: CurrencyListIcons.btc,
    isTestnetSupported: true,
  },
  {
    chain: 'eth',
    label: 'Ethereum',
    img: CurrencyListIcons.eth,
    isTestnetSupported: false,
  },
  {
    chain: 'matic',
    label: 'Polygon',
    img: CurrencyListIcons.matic,
    isTestnetSupported: false,
  },
  {
    chain: 'arb',
    label: 'Arbitrum',
    img: CurrencyListIcons.arb,
    isTestnetSupported: false,
  },
  {
    chain: 'base',
    label: 'Base',
    img: CurrencyListIcons.base,
    isTestnetSupported: false,
  },
  {
    chain: 'op',
    label: 'Optimism',
    img: CurrencyListIcons.op,
    isTestnetSupported: false,
  },
  {
    chain: 'xrp',
    label: 'XRP',
    img: CurrencyListIcons.xrp,
    isTestnetSupported: false,
  },
  {
    chain: 'bch',
    label: 'Bitcoin Cash',
    img: CurrencyListIcons.bch,
    isTestnetSupported: false,
  },
  {
    chain: 'ltc',
    label: 'Litecoin',
    img: CurrencyListIcons.ltc,
    isTestnetSupported: false,
  },
  {
    chain: 'doge',
    label: 'Dogecoin',
    img: CurrencyListIcons.doge,
    isTestnetSupported: false,
  },
];

const TESTNET_SUPPORT_MAP = CHAINS.reduce<Record<string, boolean>>((acc, c) => {
  acc[c.chain] = c.isTestnetSupported;
  return acc;
}, {});

export const SelectLedgerCurrency: React.FC<Props> = props => {
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const [useTestnet, setUseTestnet] = useState(false);
  const [continueButtonState, setContinueButtonState] =
    useState<ButtonState>(null);
  const [error, setError] = useState('');
  const [isPromptOpenApp, setPromptOpenApp] = useState(false);

  const isLoading = continueButtonState === 'loading';

  // use the ref when doing any work that could cause disconnects and cause a new transport to be passed in mid-function
  const transportRef = useRef(props.transport);
  transportRef.current = props.transport;

  const setPromptOpenAppState = (state: boolean) => setPromptOpenApp(state);

  const _fetchTxMainnetCache: Record<string, boolean> = {};
  const _fetchTxTestnetCache: Record<string, boolean> = {};
  const _fetchTxCache = {
    [Network.mainnet]: _fetchTxMainnetCache,
    [Network.testnet]: _fetchTxTestnetCache,
  };

  /**
   * Fetch raw data for a COIN transaction by ID.
   *
   * @param address
   * @param chain The cryptocurrency symbol (e.g., btc, ltc, doge).
   * @param network
   * @returns transaction data as a hex string
   */
  const fetchAddressActivity = async (
    address: string,
    chain: string,
    network: Network,
  ): Promise<boolean> => {
    // @ts-ignore
    if (_fetchTxCache[network][address]) {
      // @ts-ignore
      return _fetchTxCache[network][address];
    }
    const url = `${
      // @ts-ignore
      BASE_BITCORE_URL[chain.toLowerCase()]
    }/${chain.toUpperCase()}/mainnet/address/${address}${
      chain.toLowerCase() === 'xrp' ? '' : '/txs'
    }`;
    const apiResponse = await axios.get<any>(url);
    const finalTxCount = apiResponse?.data?.length;

    if (!finalTxCount) {
      throw new Error(`No activity found for address: ${address}`);
    }
    const hasActivity = finalTxCount > 0;
    // @ts-ignore
    _fetchTxCache[network][address] = hasActivity;
    return hasActivity;
  };

  const importXrpAccount = async ({
    appName,
    network,
    purpose,
    coin,
    chain,
    currencySymbol,
  }: {
    appName: SupportedLedgerAppNames;
    network: Network;
    purpose: string;
    coin: string;
    chain: 'xrp';
    currencySymbol: 'xrp';
  }) => {
    try {
      logger.debug('Preparing app... approve should be requested soon');

      await prepareLedgerApp(
        appName,
        transportRef,
        props.setHardwareWalletTransport,
        props.onDisconnect,
        setPromptOpenAppState,
      );
      const xrp = new Xrp(transportRef.current);

      const importInformation = [] as {
        publicKey: string;
        path: string;
        derivationStrategy: string;
        accountIndex: number;
      }[];
      logger.debug('Prepare accepted... starting to scan addresses');

      const checkPromises: Promise<boolean | void>[] = [];
      for (let i = 0; i <= 5; i++) {
        // only check the first 5 accounts
        const account = `${i}'`;
        const path = `m/${purpose}/${coin}/${account}`;
        const derivationStrategy = getDerivationStrategy(path);
        logger.debug(
          `Get wallet public key with path: ${purpose}/${coin}/${account}/0/0`,
        );
        const {publicKey, address} = await xrp.getAddress(
          `${purpose}/${coin}/${account}/0/0`,
        ); // we only check if the first address has activity
        logger.debug(`publicKey: ${publicKey} - address: ${address}`);
        logger.debug(
          `Fetching address activity for: ${address} - ${currencySymbol} - ${chain} - ${network} - ${derivationStrategy}`,
        );
        checkPromises.push(
          fetchAddressActivity(address, chain, network)
            .then((hasAddressActivity: boolean) => {
              if (hasAddressActivity) {
                logger.debug(`${address}: has address activity`);
                importInformation.push({
                  publicKey,
                  path,
                  derivationStrategy,
                  accountIndex: i,
                });
              }
              return hasAddressActivity;
            })
            .catch((err: any) => {
              logger.debug(
                `Catching fetchAddressActivity error: ${err?.message}`,
              );
            }),
        );
      }

      const results = await Promise.all(checkPromises);
      if (results.every(result => !result)) {
        logger.debug('No active addresses found.');
        props.onScannedCompleted(chain);
        return;
      }

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
      const newWalletsWithUndefined = await Promise.all(
        importInformation.map(
          async ({publicKey, path, derivationStrategy, accountIndex}) => {
            try {
              // distinguishing hardware keys by setting id = `readonly/${hardwareSource}`
              const newWallet = await dispatch(
                startImportFromHardwareWallet({
                  key: key!,
                  hardwareSource: 'ledger',
                  publicKey,
                  accountPath: path,
                  coin: currencySymbol,
                  chain,
                  derivationStrategy,
                  accountNumber: Number(accountIndex),
                  network,
                }),
              );
              return newWallet;
            } catch (err: any) {
              logger.debug(
                `Catching startImportFromHardwareWallet error: ${err?.message}`,
              );
            }
          },
        ),
      );

      const newWallets = newWalletsWithUndefined.filter(
        wallet => !!wallet,
      ) as Wallet[];
      logger.debug(`Imported ${newWallets.length} wallets`);

      key.wallets = [...key.wallets, ...newWallets];

      await dispatch(
        successCreateKey({
          key,
        }),
      );

      // wait for scanning to finish to perform this action
      if (!newWallets[0]?.isScanning) {
        try {
          await dispatch(startGetRates({force: true}));
          await dispatch(startUpdateAllWalletStatusForKey({key, force: true}));
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

      props.onScannedCompleted(
        chain,
        newWallets.map(wallet => wallet.id),
      );
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
      const c = getCryptoCurrencyById(currencyId);
      if (c.bitcoinLikeInfo?.XPUBVersion) {
        await prepareLedgerApp(
          appName,
          transportRef,
          props.setHardwareWalletTransport,
          props.onDisconnect,
          setPromptOpenAppState,
        );
        const app = new AppBtc({
          transport: transportRef.current,
          currency: transportCurrency,
        });

        const importInformation = [] as {
          xPubKey: string;
          path: string;
          derivationStrategy: string;
          accountIndex: number;
        }[];
        logger.debug('Prepare accepted... starting to scan addresses');

        const checkPromises: Promise<boolean | void>[] = [];
        for (let d = 0; d < derivationInformation.length; d++) {
          const {purpose, format} = derivationInformation[d];
          for (let i = 0; i <= 5; i++) {
            // only check the first 5 accounts
            const account = `${i}'`;
            const path = `m/${purpose}/${coin}/${account}`;
            const derivationStrategy = getDerivationStrategy(path);
            const xpubVersion =
              currencySymbol.includes('doge') || currencySymbol.includes('ltc')
                ? 0x0488b21e // doge and ltc uses the same xpub version as btc
                : c.bitcoinLikeInfo!.XPUBVersion!;

            logger.debug(
              `Get wallet public key with path: ${purpose}/${coin}/${account}/0/0`,
            );

            const {bitcoinAddress: address} = await app.getWalletPublicKey(
              `${purpose}/${coin}/${account}/0/0`,
              {format},
            ); // we only check if the first address has activity
            const xPubKey = await app.getWalletXpub({
              path,
              xpubVersion,
            });
            logger.debug(`publicKey: ${xPubKey} - address: ${address}`);
            logger.debug(
              `Fetching address activity for: ${address} - ${currencySymbol} - ${chain} - ${network} - ${derivationStrategy}`,
            );

            checkPromises.push(
              fetchAddressActivity(address, chain, network)
                .then(hasAddressActivity => {
                  if (hasAddressActivity) {
                    logger.debug(`${address}: has address activity`);

                    importInformation.push({
                      xPubKey,
                      path,
                      derivationStrategy,
                      accountIndex: i,
                    });
                  }
                  return hasAddressActivity;
                })
                .catch((err: any) => {
                  logger.debug(
                    `Catching fetchAddressActivity error: ${err?.message}`,
                  );
                }),
            );
          }
        }

        const results = await Promise.all(checkPromises);
        if (results.every(result => !result)) {
          logger.debug('No active addresses found');
          props.onScannedCompleted(chain);
          return;
        }

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
        const newWalletsWithUndefined = await Promise.all(
          importInformation.map(
            async ({xPubKey, path, derivationStrategy, accountIndex}) => {
              try {
                const newWallet = await dispatch(
                  startImportFromHardwareWallet({
                    key: key!,
                    hardwareSource: 'ledger',
                    xPubKey,
                    accountPath: path,
                    coin: currencySymbol,
                    chain,
                    derivationStrategy,
                    accountNumber: Number(accountIndex),
                    network,
                  }),
                );
                return newWallet;
              } catch (err: any) {
                logger.debug(
                  `Catching startImportFromHardwareWallet error: ${err?.message}`,
                );
              }
            },
          ),
        );

        const newWallets = newWalletsWithUndefined.filter(
          wallet => !!wallet,
        ) as Wallet[];

        logger.debug(`Imported ${newWallets.length} wallets`);

        key.wallets = [...key.wallets, ...newWallets];
        await dispatch(
          successCreateKey({
            key,
          }),
        );
        // wait for scanning to finish to perform this action
        if (!newWallets[0]?.isScanning) {
          try {
            await dispatch(startGetRates({force: true}));
            await dispatch(
              startUpdateAllWalletStatusForKey({key, force: true}),
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

        props.onScannedCompleted(
          chain,
          newWallets.map(wallet => wallet.id),
        );
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
    chain,
    currencySymbol,
  }: {
    appName: SupportedLedgerAppNames;
    network: Network;
    purpose: string;
    coin: string;
    currencySymbol: 'eth' | 'matic';
    chain: 'eth' | 'matic' | 'op' | 'base' | 'arb';
  }) => {
    try {
      logger.debug('Preparing app... approve should be requested soon');
      await prepareLedgerApp(
        appName,
        transportRef,
        props.setHardwareWalletTransport,
        props.onDisconnect,
        setPromptOpenAppState,
      );
      const eth = new AppEth(transportRef.current);

      const importInformation = [] as {
        publicKey: string;
        path: string;
        derivationStrategy: string;
        accountIndex: number;
      }[];
      logger.debug('Prepare accepted... starting to scan addresses');

      const checkPromises: Promise<boolean | void>[] = [];
      for (let i = 0; i <= 5; i++) {
        // only check the first 5 accounts
        const account = `${i}'`;
        const path = `m/${purpose}/${coin}/${account}`;
        const derivationStrategy = getDerivationStrategy(path);
        logger.debug(
          `Get wallet public key with path: ${purpose}/${coin}/${account}/0/0`,
        );
        const {publicKey, address} = await eth.getAddress(
          `${purpose}/${coin}/${account}/0/0`,
        ); // we only check if the first address has activity
        logger.debug(`publicKey: ${publicKey} - address: ${address}`);
        logger.debug(
          `Fetching address activity for: ${address} - ${currencySymbol} - ${chain} - ${network} - ${derivationStrategy}`,
        );

        checkPromises.push(
          fetchAddressActivity(address, chain, network)
            .then(hasAddressActivity => {
              if (hasAddressActivity) {
                logger.debug(`${address}: has address activity`);

                importInformation.push({
                  publicKey,
                  path,
                  derivationStrategy,
                  accountIndex: i,
                });
              }
              return hasAddressActivity;
            })
            .catch((err: any) => {
              logger.debug(
                `Catching fetchAddressActivity error: ${err?.message}`,
              );
            }),
        );
      }

      const results = await Promise.all(checkPromises);
      if (results.every(result => !result)) {
        logger.debug('No active addresses found');
        props.onScannedCompleted(chain);
        return;
      }

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
      const newWalletsWithUndefined = await Promise.all(
        importInformation.map(
          async ({publicKey, path, derivationStrategy, accountIndex}) => {
            try {
              const newWallet = await dispatch(
                startImportFromHardwareWallet({
                  key: key!,
                  hardwareSource: 'ledger',
                  publicKey,
                  accountPath: path,
                  coin: currencySymbol,
                  chain,
                  derivationStrategy,
                  accountNumber: Number(accountIndex),
                  network,
                }),
              );
              return newWallet;
            } catch (err: any) {
              logger.debug(
                `Catching startImportFromHardwareWallet error: ${err?.message}`,
              );
            }
          },
        ),
      );

      const newWallets = newWalletsWithUndefined.filter(
        wallet => !!wallet,
      ) as Wallet[];

      logger.debug(`Imported ${newWallets.length} wallets`);

      key.wallets = [...key.wallets, ...newWallets];

      await dispatch(
        successCreateKey({
          key,
        }),
      );
      // wait for scanning to finish to perform this action
      if (!newWallets[0]?.isScanning) {
        try {
          await dispatch(startGetRates({force: true}));
          await dispatch(startUpdateAllWalletStatusForKey({key, force: true}));
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

      props.onScannedCompleted(
        chain,
        newWallets.map(wallet => wallet.id),
      );
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
    if (['eth', 'matic', 'op', 'arb', 'base'].includes(chain)) {
      return importEVMAccount(params as EVMAccountParams);
    }
    if (chain === 'xrp') {
      return importXrpAccount(params as XrpAccountParams);
    }
  };

  const onContinue = async (selectedChain: string) => {
    setError('');
    setContinueButtonState('loading');
    const network = useTestnet ? Network.testnet : Network.mainnet;
    await importLedgerAccount(selectedChain, network);
    setContinueButtonState(null);
  };

  return (
    <ScrollView>
      <Wrapper>
        <Header>
          {isLoading ? (
            <>
              {isPromptOpenApp ? (
                <H4>Approve BitPay</H4>
              ) : (
                <H4>Scanning addresses</H4>
              )}
            </>
          ) : (
            <H4>Choose Crypto to Import</H4>
          )}
        </Header>

        {error && error !== 'user denied transaction' && !isLoading ? (
          <ErrorDescriptionColumn error={error} />
        ) : null}

        {isLoading ? (
          <>
            <DescriptionRow>
              {isPromptOpenApp ? (
                <Paragraph style={{textAlign: 'center'}}>
                  Approve the app BitPay so wallets can be added to your device.
                </Paragraph>
              ) : (
                <Paragraph style={{textAlign: 'center'}}>
                  Please wait...
                </Paragraph>
              )}
            </DescriptionRow>
            {isPromptOpenApp ? (
              <IconRow>
                <BitpaySvg width={60} height={60} />
              </IconRow>
            ) : (
              <RadiatingLineAnimation icon={BitpaySvg} height={60} width={60} />
            )}
          </>
        ) : (
          <>
            <CurrencyListContainer>
              {CHAINS.map((c, index) => (
                <RowContainerWithoutBorders
                  onPress={() => onContinue(c.chain)}
                  key={index}>
                  <CurrencyImageContainer>
                    <CurrencyImage img={c.img} />
                  </CurrencyImageContainer>

                  <CurrencyColumn>
                    <Row>
                      <H5 ellipsizeMode="tail" numberOfLines={1}>
                        {c.label}
                      </H5>
                    </Row>
                    <Row style={{alignItems: 'center'}}>
                      <ListItemSubText
                        ellipsizeMode="tail"
                        numberOfLines={1}
                        style={{marginTop: Platform.OS === 'ios' ? 2 : 0}}>
                        {c.chain.toUpperCase()}
                      </ListItemSubText>
                    </Row>
                  </CurrencyColumn>
                  <AngleRightSvg />
                  <Hr />
                </RowContainerWithoutBorders>
              ))}
            </CurrencyListContainer>
            <Button
              buttonType={'link'}
              onPress={props.onAddByDerivationPathSelected}>
              Add by Derivation Path
            </Button>
          </>
        )}
      </Wrapper>
    </ScrollView>
  );
};
