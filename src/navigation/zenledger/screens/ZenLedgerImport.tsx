import React, {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import styled from 'styled-components/native';
import KeyIcon from '../../../../assets/img/key-icon.svg';
import {H4} from '../../../components/styled/Text';
import {
  CtaContainerAbsolute,
  ScreenGutter,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  convertToFiat,
  formatFiatAmount,
  sleep,
} from '../../../utils/helper-methods';
import {toFiat} from '../../../store/wallet/utils/wallet';
import {getZenLedgerUrl} from '../../../store/zenledger/zenledger.effects';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  openUrlWithInAppBrowser,
  startOnGoingProcessModal,
} from '../../../store/app/app.effects';
import {
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {useNavigation} from '@react-navigation/native';
import {Network} from '../../../constants';
import ZenLedgerWalletSelector from '../components/ZenLedgerWalletSelector';
import {
  ZenLedgerRequestWalletsType,
  ZenLedgerWalletObj,
} from '../../../store/zenledger/zenledger.models';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {SUPPORTED_UTXO_COINS} from '../../../constants/currencies';
import {Analytics} from '../../../store/analytics/analytics.effects';

const ZenLedgerImportContainer = styled.View`
  flex: 1;
  margin-bottom: ${ScreenGutter};
`;

const ZenLedgerTitleContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 8px;
`;

const ZenLedgerImport: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const {rates} = useAppSelector(({RATE}) => RATE);

  const _allKeys = Object.values(keys).filter(key => key.backupComplete);

  const setFormattedKeys = () => {
    return _allKeys.map((key, index) => {
      const formattedWallet: ZenLedgerWalletObj[] = key.wallets
        .filter(
          ({network, credentials}) =>
            network === Network.mainnet && credentials.isComplete(),
        )
        .map(wallet => {
          const {
            currencyAbbreviation,
            chain,
            network,
            balance,
            hideWallet,
            tokenAddress,
          } = wallet;

          const fiatBalance = formatFiatAmount(
            convertToFiat(
              dispatch(
                toFiat(
                  balance.sat,
                  defaultAltCurrency.isoCode,
                  currencyAbbreviation,
                  chain,
                  rates,
                  tokenAddress,
                ),
              ),
              hideWallet,
              network,
            ),
            defaultAltCurrency.isoCode,
          );
          return {
            wallet,
            checked: false,
            fiatBalance,
          };
        });

      return {
        keyName: key.keyName,
        keyId: key.id,
        checked: false,
        showWallets: index === 0,
        wallets: formattedWallet,
      };
    });
  };
  const [allKeys, setAllkeys] = useState(setFormattedKeys());

  const getRequestWallets = async () => {
    let requestWallets: ZenLedgerRequestWalletsType[] = [];
    const selectedWallets = Object.values(allKeys)
      .flatMap(key => key.wallets)
      .filter(wallet => wallet.checked);

    for await (const selectedWallet of selectedWallets) {
      let {checked, wallet} = selectedWallet;
      let {receiveAddress, walletName = '', chain} = wallet;

      if (checked && !receiveAddress) {
        receiveAddress = await dispatch(
          createWalletAddress({wallet, newAddress: false}),
        );
      }

      if (checked && receiveAddress) {
        requestWallets.push({
          address: receiveAddress,
          blockchain: chain,
          display_name: walletName,
        });
      }
    }
    return requestWallets;
  };

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const goToZenLedger = async (
    requestWallets: ZenLedgerRequestWalletsType[],
  ) => {
    try {
      dispatch(startOnGoingProcessModal('REDIRECTING'));
      const {url} = (await dispatch<any>(
        getZenLedgerUrl(requestWallets),
      )) as any;
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      dispatch(openUrlWithInAppBrowser(url));
      await sleep(500);
      navigation.goBack();
    } catch (e) {
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      await showErrorMessage(
        CustomErrorMessage({
          errMsg: BWCErrorMessage(e),
          title: t('Uh oh, something went wrong'),
        }),
      );
    }
  };

  return (
    <ZenLedgerImportContainer>
      <View style={{marginLeft: 20, marginTop: 32}}>
        <ZenLedgerTitleContainer>
          <View style={{marginRight: 8}}>
            <KeyIcon />
          </View>
          <H4>{t('Select a Key or Wallet')}</H4>
        </ZenLedgerTitleContainer>
      </View>
      <ZenLedgerWalletSelector
        keys={allKeys}
        onPress={(keyId: string, walletObj?: ZenLedgerWalletObj) => {
          haptic('impactLight');
          if (!walletObj) {
            setAllkeys(prev => {
              prev &&
                prev.forEach(k => {
                  if (k && k.keyId === keyId) {
                    k.checked = !k.checked;
                    k.wallets?.forEach((w: ZenLedgerWalletObj) => {
                      w.checked = k.checked;
                      return w;
                    });
                  }
                });
              return [...prev];
            });
          } else {
            setAllkeys(prev => {
              prev &&
                prev.forEach(k => {
                  if (k && k.keyId === keyId) {
                    const {wallets} = k;
                    wallets.forEach((w: ZenLedgerWalletObj) => {
                      if (w.wallet.id === walletObj.wallet.id) {
                        w.checked = !w.checked;
                      }
                      return w;
                    });
                    k.checked = Object.values(wallets).every(w => w.checked);
                  }
                });
              return [...prev];
            });
          }
        }}
        onDropdownPress={keyId => {
          haptic('impactLight');
          setAllkeys(prev => {
            prev &&
              prev.forEach(k => {
                if (k && k.keyId === keyId) {
                  k.showWallets = !k.showWallets;
                }
              });
            return [...prev];
          });
        }}
      />
      <CtaContainerAbsolute>
        <Button
          onPress={async () => {
            try {
              haptic('impactLight');
              dispatch(startOnGoingProcessModal('LOADING'));
              const requestWallets = await getRequestWallets();
              dispatch(dismissOnGoingProcessModal());
              await sleep(500);
              if (
                requestWallets.some(wallet =>
                  SUPPORTED_UTXO_COINS.includes(wallet.blockchain),
                )
              ) {
                dispatch(
                  showBottomNotificationModal({
                    type: 'warning',
                    title: t('Attention'),
                    message: t(
                      'For BTC, LTC, DOGE, BCH, ZenLedger import is limited and may require you to manually upload additional addresses in their dashboard.',
                    ),
                    enableBackdropDismiss: true,
                    actions: [
                      {
                        text: t('GOT IT'),
                        action: async () => {
                          const coins = requestWallets
                            .map(item => {
                              return item.blockchain;
                            })
                            .toString();
                          Analytics.track(
                            'BitPay App - ZenLedger Imported Wallet Address',
                            {
                              cryptoType: coins,
                            },
                          );
                          dispatch(dismissBottomNotificationModal());
                          await sleep(500);
                          goToZenLedger(requestWallets);
                        },
                        primary: true,
                      },
                      {
                        text: t('Cancel'),
                        action: async () => {
                          dispatch(dismissBottomNotificationModal());
                          await sleep(500);
                        },
                      },
                    ],
                  }),
                );
              } else {
                goToZenLedger(requestWallets);
              }
            } catch (e) {
              dispatch(dismissOnGoingProcessModal());
              await sleep(500);
              await showErrorMessage(
                CustomErrorMessage({
                  errMsg: BWCErrorMessage(e),
                  title: t('Uh oh, something went wrong'),
                }),
              );
            }
          }}
          buttonStyle={'primary'}
          disabled={
            !Object.values(allKeys)
              .flatMap(key => key.wallets)
              .some(w => w.checked)
          }>
          {t('Continue')}
        </Button>
      </CtaContainerAbsolute>
    </ZenLedgerImportContainer>
  );
};

export default ZenLedgerImport;
