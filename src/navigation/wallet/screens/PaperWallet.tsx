import React, {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import Button, {ButtonState} from '../../../components/button/Button';
import {ScreenGutter} from '../../../components/styled/Containers';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import {WalletGroupParamList} from '../WalletGroup';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {
  getBadgeImg,
  getCurrencyAbbreviation,
  sleep,
} from '../../../utils/helper-methods';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {BaseText} from '../../../components/styled/Text';
import {
  Action,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
  Slate,
  Black,
} from '../../../styles/colors';
import {BwcProvider} from '../../../lib/bwc';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {Wallet} from '../../../store/wallet/wallet.models';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {getFeeRatePerKb} from '../../../store/wallet/effects/fee/fee';
import prompt from 'react-native-prompt-android';
import {CustomErrorMessage} from '../components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {findKeyByKeyId} from '../../../store/wallet/utils/wallet';
import SelectorArrowDown from '../../../../assets/img/selector-arrow-down.svg';
import SelectorArrowRight from '../../../../assets/img/selector-arrow-right.svg';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {useTheme} from 'styled-components/native';
import GlobalSelect from './GlobalSelect';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {SatToUnit} from '../../../store/wallet/effects/amount/amount';
import {StackActions} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Platform} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';

const PAPER_WALLET_SUPPORTED_COINS = ['btc', 'bch', 'doge', 'ltc'];

const GlobalSelectContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const PaperWalletItemCard = styled(TouchableOpacity)`
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : '#eaeaea')};
  border-radius: 9px;
  margin: 20px 15px;
  padding: 14px;
`;

const DataText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 18px;
  max-width: 160px;
`;

const CoinIconContainer = styled.View`
  width: 30px;
  height: 25px;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const SelectedOptionCol = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const PaperWalletItemTitle = styled.Text`
  margin: 0 0 18px 0;
  color: ${({theme: {dark}}) => (dark ? White : '#434d5a')};
  line-height: 18px;
`;

const ActionsContainer = styled.View`
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
`;

const SelectedOptionContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  padding: 0px 14px;
  background: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 12px;
`;

const SelectedOptionText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 16px;
  font-weight: 500;
`;

const ArrowContainer = styled.View`
  margin-left: 10px;
`;

const PaperWalletContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const ButtonContainer = styled.View`
  margin-top: 20px;
`;

type PaperWalletProps = NativeStackScreenProps<
  WalletGroupParamList,
  'PaperWallet'
>;
const BWC = BwcProvider.getInstance();

const PaperWallet: React.FC<PaperWalletProps> = ({navigation, route}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const logger = useLogger();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const [buttonState, setButtonState] = useState<ButtonState>();
  const [balances, setBalances] = useState<
    {privateKey: string; coin: string; balance: number; crypto?: number}[]
  >([]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet>();
  const {scannedPrivateKey} = route.params;
  const isPkEncrypted = scannedPrivateKey.substring(0, 2) == '6P';
  const _walletsAvailable = Object.values(keys)
    .filter(key => key.backupComplete)
    .flatMap(key => key.wallets)
    .filter(
      wallet =>
        !wallet.hideWallet &&
        !wallet.hideWalletByAccount &&
        wallet.isComplete(),
    );

  const [walletsAvailable, setWalletsAvailable] = useState<Wallet[]>([]);
  const [walletSelectorVisible, setWalletSelectorVisible] = useState(false);

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
      await sleep(1000);
      navigation.goBack();
    },
    [dispatch],
  );

  const _sweepWallet = async (): Promise<any> => {
    if (!selectedWallet) {
      throw new Error('Select a wallet');
    }

    // Based on the selected wallet, the balance available for sweeping is determined.
    // If the user wishes to sweep funds to a different wallet, they will need to rescan for funds.
    // TODO: Consider whether this rescan requirement is fine or if there's a more user-friendly approach.
    const balanceToSweep = balances.find(
      b => b.coin === selectedWallet.currencyAbbreviation,
    );
    if (!balanceToSweep) {
      throw new Error('Balance not found for the selected wallet');
    }

    const destinationAddress = await dispatch(
      createWalletAddress({wallet: selectedWallet, newAddress: true}),
    );
    logger.debug(`Swiping funds to ${destinationAddress}...`);

    const feeLevel = ['btc', 'eth', 'matic'].includes(selectedWallet.chain)
      ? 'priority'
      : 'normal';

    const feePerKb = await getFeeRatePerKb({
      wallet: selectedWallet,
      feeLevel,
    });
    logger.debug(`Swiping funds with feePerKb: ${feePerKb}...`);

    const DEFAULT_FEE = {
      btc: 10000,
      bch: 10000,
      doge: 10000000,
      ltc: 100000,
    };
    // @ts-ignore
    let opts: {coin: string; fee: number} = {
      coin: balanceToSweep.coin,
      fee: DEFAULT_FEE[balanceToSweep.coin],
    };

    try {
      const testTx: any = await buildTransaction(
        selectedWallet,
        balanceToSweep.privateKey,
        destinationAddress,
        opts,
      );
      let rawTxLength = testTx.serialize().length;
      opts.fee = Math.round((feePerKb * rawTxLength) / 1000);

      const tx = await buildTransaction(
        selectedWallet,
        balanceToSweep.privateKey,
        destinationAddress,
        opts,
      );
      logger.debug(`Swiping funds success creating TX: ${tx}...`);

      const txid = await broadcastTransaction(
        selectedWallet,
        tx,
        balanceToSweep.coin,
      );
      logger.debug(`Swiping funds success broadcasting TX: ${txid}...`);

      return {destinationAddress, txid};
    } catch (err) {
      throw err;
    }
  };

  const buildTransaction = (
    wallet: Wallet,
    privateKey: string,
    destinationAddress: string,
    opts: {coin: string; fee?: number},
  ) => {
    return new Promise((resolve, reject) => {
      wallet.buildTxFromPrivateKey(
        privateKey,
        destinationAddress,
        opts,
        (err: any, tx: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(tx);
          }
        },
      );
    });
  };

  const broadcastTransaction = (wallet: Wallet, tx: any, coin: string) => {
    return new Promise((resolve, reject) => {
      wallet.broadcastRawTx(
        {
          rawTx: tx.serialize(),
          network: wallet.network,
          coin: coin,
        },
        (err: any, txid: string) => {
          if (err) {
            reject(err);
          } else {
            resolve(txid);
          }
        },
      );
    });
  };

  const sweepWallet = async (): Promise<void> => {
    setButtonState('loading');
    try {
      const data = await _sweepWallet();
      setButtonState('success');
      logger.debug(`Sweep paper wallet: SUCCESS. ${JSON.stringify(data)} `);
      const key = await findKeyByKeyId(selectedWallet!.keyId, keys);
      navigation.dispatch(StackActions.popToTop());
      navigation.dispatch(
        StackActions.push('WalletDetails', {
          walletId: selectedWallet!.id,
          key,
        }),
      );
    } catch (err) {
      setButtonState('failed');
      showErrorMessage(
        CustomErrorMessage({
          errMsg: BWCErrorMessage(err),
          title: t('Error sweeping funds'),
        }),
      );
    }
  };

  const getBalance = (
    privateKey: string,
    coin: string,
    wallet: Wallet,
    cb: (err: any, balance: number) => any,
  ): void => {
    wallet.getBalanceFromPrivateKey(privateKey, coin, cb);
  };

  const getPrivateKey = (
    scannedKey: string,
    privateKeyIsEncrypted: boolean,
    passphrase: string,
    cb: (err: any, scannedKey: any) => any,
  ) => {
    if (!privateKeyIsEncrypted) {
      return cb(null, scannedKey);
    }
    BWC.getClient().decryptBIP38PrivateKey(scannedKey, passphrase, null, cb);
  };

  const checkPrivateKeyAndReturnCorrectNetwork = (
    privateKey: string,
  ): string => {
    const networks = ['livenet', 'testnet'];
    const providers = [
      {name: 'Bitcore', getProvider: () => BWC.getBitcore()},
      {name: 'BitcoreCash', getProvider: () => BWC.getBitcoreCash()},
      {name: 'BitcoreLtc', getProvider: () => BWC.getBitcoreLtc()},
      {name: 'BitcoreDoge', getProvider: () => BWC.getBitcoreDoge()},
    ];

    for (const network of networks) {
      for (const provider of providers) {
        try {
          provider.getProvider().PrivateKey(privateKey, network);
          return network;
        } catch (err) {
          // Continue to the next iteration if an error occurs
        }
      }
    }

    return 'invalid';
  };

  const _scanFunds = ({
    coin,
    passphrase,
  }: {
    coin: string;
    passphrase: string;
  }): Promise<{privateKey: string; coin: string; balance: number} | Error> => {
    return new Promise((resolve, reject) => {
      try {
        logger.debug(`getting private key for ${coin}...`);
        getPrivateKey(
          scannedPrivateKey,
          isPkEncrypted,
          passphrase,
          (err, privateKey: string) => {
            if (err) {
              return reject(err);
            }
            const network = checkPrivateKeyAndReturnCorrectNetwork(privateKey);
            if (network === 'invalid') {
              return reject(new Error('Invalid private key'));
            }
            // this is used just for scanning funds
            const wallet = _walletsAvailable.filter(
              w =>
                w.currencyAbbreviation === coin &&
                w.credentials.network === network,
            )[0];
            // const bwcClient = BWC.getClient(); // unfortunately, we need to create a new client for each coin with credentials. Check getBalanceFromPrivateKey implementation in bwc
            logger.debug(`getting balance for ${coin}...`);

            getBalance(privateKey, coin, wallet, (err, balance: number) => {
              if (err) {
                return reject(err);
              }
              return resolve({privateKey, coin, balance});
            });
          },
        );
      } catch (err: any) {
        return reject(err);
      }
    });
  };

  const scanFunds = async ({
    passphrase,
  }: {
    passphrase: string;
  }): Promise<void> => {
    try {
      dispatch(
        startOnGoingProcessModal(
          passphrase === ''
            ? 'SCANNING_FUNDS'
            : 'SCANNING_FUNDS_WITH_PASSPHRASE',
        ),
      );
      await sleep(500);
      const scanResults = await Promise.all(
        PAPER_WALLET_SUPPORTED_COINS.map((coin: string) =>
          _scanFunds({coin, passphrase}).catch(error => error),
        ),
      );

      const data = scanResults.filter(data => !(data instanceof Error)) as {
        privateKey: string;
        coin: string;
        balance: number;
      }[];

      const _balances: {
        privateKey: string;
        coin: string;
        balance: number;
        crypto?: number;
      }[] = data
        .map(d => {
          return {
            ...d,
            crypto: dispatch(SatToUnit(d.balance, d.coin, d.coin, undefined)),
          };
        })
        .filter(d => d.balance > 0);

      if (_balances.length === 0) {
        const supportedCoinsText = PAPER_WALLET_SUPPORTED_COINS.join(', ')
          .toUpperCase()
          .replace(/, ([^,]*)$/, ' and $1');
        throw new Error(
          `No funds detected. Only ${supportedCoinsText} supported. Please ensure that you have a compatible wallet from the same network and currency as the paper wallet you expected to find funds in. Additionally, verify the address on a block explorer to confirm that it contains the expected funds.`,
        );
      }
      // Coin balances can be found for different cryptocurrencies.
      setBalances(_balances);

      const availableCoins = new Set(_balances.map(d => d.coin));
      const walletsAvailable = _walletsAvailable.filter(w =>
        availableCoins.has(w.currencyAbbreviation),
      );

      setWalletsAvailable(walletsAvailable);
      setSelectedWallet(walletsAvailable[0]);
      dispatch(dismissOnGoingProcessModal());
    } catch (error) {
      dispatch(dismissOnGoingProcessModal());
      throw error;
    }
  };

  const askForPassphrase = () => {
    prompt(
      t('Private key encrypted'),
      t('Enter password'),
      [
        {
          text: t('Cancel'),
          onPress: () => {
            navigation.goBack();
          },
          style: 'cancel',
        },
        {
          text: t('OK'),
          onPress: async (value: string) => {
            try {
              await sleep(500);
              await scanFunds({passphrase: value});
              logger.debug('Scan paper wallet with passphrase: SUCCESS.');
            } catch (err) {
              showErrorMessage(
                CustomErrorMessage({
                  errMsg: BWCErrorMessage(err),
                  title: t('Error scanning funds'),
                }),
              );
            }
          },
        },
      ],
      {
        type: 'secure-text',
        cancelable: true,
        defaultValue: '',
        // @ts-ignore
        keyboardType: 'default',
      },
    );
  };

  useEffect(() => {
    const _scan = async () => {
      try {
        if (!isPkEncrypted) {
          await scanFunds({passphrase: ''});
          logger.debug('Scan paper wallet: SUCCESS.');
        } else {
          askForPassphrase();
        }
      } catch (err) {
        showErrorMessage(
          CustomErrorMessage({
            errMsg: BWCErrorMessage(err),
            title: t('Error scanning funds'),
          }),
        );
      }
    };
    _scan();
  }, []);

  const openKeyWalletSelector = () => {
    setWalletSelectorVisible(true);
  };

  const onDismiss = (selectedWallet?: Wallet) => {
    setWalletSelectorVisible(false);
    if (selectedWallet?.currencyAbbreviation) {
      setSelectedWallet(selectedWallet);
    }
  };

  return (
    <PaperWalletContainer>
      <ScrollView>
        {balances.map((b, index) => (
          <PaperWalletItemCard key={index}>
            <PaperWalletItemTitle>{t('Funds found')}</PaperWalletItemTitle>
            <ActionsContainer>
              <SelectedOptionContainer>
                <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
                  {b.coin?.toUpperCase()}
                </SelectedOptionText>
              </SelectedOptionContainer>
              <SelectedOptionCol>
                <DataText>{b.crypto}</DataText>
              </SelectedOptionCol>
            </ActionsContainer>
          </PaperWalletItemCard>
        ))}

        <PaperWalletItemCard
          onPress={() => {
            openKeyWalletSelector();
          }}>
          <PaperWalletItemTitle>
            {t('Funds will be transferred to')}
          </PaperWalletItemTitle>
          {!selectedWallet && (
            <ActionsContainer>
              <SelectedOptionContainer style={{backgroundColor: Action}}>
                <SelectedOptionText
                  style={{color: White}}
                  numberOfLines={1}
                  ellipsizeMode={'tail'}>
                  {t('Select Destination')}
                </SelectedOptionText>
                <ArrowContainer>
                  <SelectorArrowDown
                    {...{width: 13, height: 13, color: White}}
                  />
                </ArrowContainer>
              </SelectedOptionContainer>
            </ActionsContainer>
          )}

          {selectedWallet && (
            <ActionsContainer>
              <SelectedOptionContainer style={{minWidth: 120}}>
                <SelectedOptionCol>
                  <CoinIconContainer>
                    <CurrencyImage
                      img={selectedWallet.img}
                      badgeUri={getBadgeImg(
                        getCurrencyAbbreviation(
                          selectedWallet.currencyAbbreviation,
                          selectedWallet.chain,
                        ),
                        selectedWallet.chain,
                      )}
                      size={20}
                    />
                  </CoinIconContainer>
                  <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
                    {selectedWallet.currencyAbbreviation.toUpperCase()}
                  </SelectedOptionText>
                </SelectedOptionCol>
                <ArrowContainer>
                  <SelectorArrowDown
                    {...{
                      width: 13,
                      height: 13,
                      color: theme.dark ? White : SlateDark,
                    }}
                  />
                </ArrowContainer>
              </SelectedOptionContainer>
              <SelectedOptionCol>
                <DataText numberOfLines={1} ellipsizeMode={'tail'}>
                  {selectedWallet.walletName
                    ? selectedWallet.walletName
                    : selectedWallet.currencyName}
                </DataText>
                <ArrowContainer>
                  <SelectorArrowRight
                    {...{
                      width: 13,
                      height: 13,
                      color: theme.dark ? White : Slate,
                    }}
                  />
                </ArrowContainer>
              </SelectedOptionCol>
            </ActionsContainer>
          )}
        </PaperWalletItemCard>
        <SheetModal
          modalLibrary="bottom-sheet"
          isVisible={walletSelectorVisible}
          onBackdropPress={() => onDismiss(undefined)}
          fullscreen>
          <GlobalSelectContainer>
            <GlobalSelect
              route={route}
              navigation={navigation}
              modalContext={'paperwallet'}
              useAsModal={true}
              modalTitle={t('Select Destination')}
              customSupportedCurrencies={[
                ...new Set(walletsAvailable.map(w => w.currencyAbbreviation)),
              ]}
              globalSelectOnDismiss={onDismiss}
            />
          </GlobalSelectContainer>
        </SheetModal>
        {selectedWallet ? (
          <ButtonContainer>
            <Button onPress={() => sweepWallet()} state={buttonState}>
              {t('Sweep Paper Wallet')}
            </Button>
          </ButtonContainer>
        ) : null}
      </ScrollView>
    </PaperWalletContainer>
  );
};

export default PaperWallet;
