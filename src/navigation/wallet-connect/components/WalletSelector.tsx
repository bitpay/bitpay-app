import {StackActions, useNavigation} from '@react-navigation/native';
import React, {useCallback, useMemo, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import styled from 'styled-components/native';
import haptic from '../../../components/haptic-feedback/haptic';
import {BaseText, H4, TextAlign} from '../../../components/styled/Text';
import {Wallet} from '../../../store/wallet/wallet.models';
import {
  convertToFiat,
  formatFiatAmount,
  sleep,
} from '../../../utils/helper-methods';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {walletConnectOnSessionRequest} from '../../../store/wallet-connect/wallet-connect.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import {LightBlack, White} from '../../../styles/colors';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {
  BottomNotificationConfig,
  BottomNotificationCta,
  BottomNotificationHr,
} from '../../../components/modal/bottom-notification/BottomNotification';
import {ScreenGutter} from '../../../components/styled/Containers';
import {
  GlobalSelectObj,
  WalletSelectMenuBodyContainer,
} from '../../wallet/screens/GlobalSelect';
import KeyWalletsRow, {
  KeyWallet,
  KeyWalletsRowProps,
} from '../../../components/list/KeyWalletsRow';
import merge from 'lodash.merge';
import cloneDeep from 'lodash.clonedeep';
import _ from 'lodash';
import {isValidWalletConnectUri} from '../../../store/wallet/utils/validations';
import {useTranslation} from 'react-i18next';
import {logSegmentEvent} from '../../../store/app/app.effects';
import {toFiat} from '../../../store/wallet/utils/wallet';
import {Platform} from 'react-native';
import {WalletConnectCtaContainer} from '../styled/WalletConnectContainers';
import {SUPPORTED_EVM_COINS} from '../../../constants/currencies';

export type WalletConnectIntroParamList = {
  uri?: string;
};

const WalletSelectorContainer = styled.View`
  padding: ${ScreenGutter};
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  max-height: 75%;
`;

const DescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: normal;
  font-size: 16px;
  line-height: 24px;
  margin: 22px 0;
`;

export default ({
  isVisible,
  dappUri,
  onBackdropPress,
}: {
  isVisible: boolean;
  dappUri: string;
  onBackdropPress: () => void;
}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [uri, setUri] = useState(dappUri);
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const {rates} = useAppSelector(({RATE}) => RATE);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);

  let allWallets = Object.values(keys)
    .filter(key => key.backupComplete)
    .flatMap(key => key.wallets);

  const buildList = (category: string[], wallets: Wallet[]) => {
    const coins: GlobalSelectObj[] = [];
    category.forEach(coin => {
      const availableWallets = wallets.filter(
        wallet => wallet.currencyAbbreviation === coin && !wallet.hideWallet,
      );
      if (availableWallets.length) {
        const {currencyName, img} = availableWallets[0];
        coins.push({
          id: Math.random().toString(),
          currencyName,
          img,
          total: availableWallets.length,
          availableWalletsByKey: _.groupBy(
            availableWallets,
            wallet => wallet.keyId,
          ),
        });
      }
    });
    return coins;
  };

  const supportedCoins = useMemo(
    () => buildList(SUPPORTED_EVM_COINS, allWallets),
    [allWallets],
  );

  let keyWallets: KeyWalletsRowProps<KeyWallet>[] = [];

  supportedCoins.forEach(supportedCoin => {
    const keyWallet = Object.keys(supportedCoin.availableWalletsByKey).map(
      keyId => {
        const key = keys[keyId];
        return {
          key: Math.random().toString(),
          keyName: key.keyName || 'My Key',
          wallets: supportedCoin.availableWalletsByKey[keyId].map(wallet => {
            const {
              balance,
              hideWallet,
              currencyAbbreviation,
              network,
              chain,
              credentials: {walletName: fallbackName},
              walletName,
            } = wallet;
            return merge(cloneDeep(wallet), {
              cryptoBalance: balance.crypto,
              fiatBalance: formatFiatAmount(
                convertToFiat(
                  dispatch(
                    toFiat(
                      balance.sat,
                      defaultAltCurrency.isoCode,
                      currencyAbbreviation,
                      chain,
                      rates,
                    ),
                  ),
                  hideWallet,
                  network,
                ),
                defaultAltCurrency.isoCode,
              ),
              currencyAbbreviation: currencyAbbreviation.toUpperCase(),
              network,
              walletName: walletName || fallbackName,
            });
          }),
        };
      },
    );
    keyWallets = [...keyWallets, ...keyWallet];
  });

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const goToStartView = useCallback(
    async (wallet: Wallet, wcUri: string) => {
      try {
        dispatch(
          showOnGoingProcessModal(
            // t('Loading')
            t(OnGoingProcessMessages.LOADING),
          ),
        );
        const peer = (await dispatch<any>(
          walletConnectOnSessionRequest(wcUri),
        )) as any;
        dispatch(dismissOnGoingProcessModal());
        await sleep(500);
        navigation.navigate('WalletConnect', {
          screen: 'WalletConnectStart',
          params: {
            keyId: wallet.keyId,
            walletId: wallet.id,
            peer,
          },
        });
      } catch (e) {
        dispatch(dismissOnGoingProcessModal());
        await sleep(500);
        setUri('');
        await showErrorMessage(
          CustomErrorMessage({
            errMsg: BWCErrorMessage(e),
            title: t('Uh oh, something went wrong'),
          }),
        );
      }
    },
    [dispatch, navigation, showErrorMessage, t],
  );

  const goToScanView = useCallback(
    (wallet: Wallet) => {
      dispatch(
        logSegmentEvent('track', 'Open Scanner', {
          context: 'WalletSelector',
        }),
      );
      navigation.navigate('Scan', {
        screen: 'Root',
        params: {
          onScanComplete: async data => {
            if (isValidWalletConnectUri(data)) {
              goToStartView(wallet, data);
            }
          },
        },
      });
    },
    [goToStartView, navigation],
  );

  const onWalletSelect = async (wallet: Wallet) => {
    haptic('impactLight');
    onBackdropPress();
    await sleep(500);
    uri ? goToStartView(wallet, uri) : goToScanView(wallet);
  };

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onBackdropPress}>
      <WalletSelectorContainer>
        {keyWallets.length ? (
          <>
            <TextAlign align={'center'}>
              <H4>{t('Select a Wallet')}</H4>
            </TextAlign>

            <DescriptionText>
              {t('Which wallet would you like to use for WalletConnect?')}
            </DescriptionText>

            <WalletSelectMenuBodyContainer>
              <KeyWalletsRow
                keyWallets={keyWallets!}
                onPress={onWalletSelect}
              />
            </WalletSelectMenuBodyContainer>
          </>
        ) : (
          <>
            <TextAlign align={'center'}>
              <H4>{t('No compatible wallets')}</H4>
            </TextAlign>

            <DescriptionText>
              {t(
                "You currently don't have any wallets capable of sending this payment. Would you like to import one?",
              )}
            </DescriptionText>

            <BottomNotificationHr />
            <WalletConnectCtaContainer platform={Platform.OS}>
              <BottomNotificationCta
                suppressHighlighting={true}
                primary={true}
                onPress={async () => {
                  haptic('impactLight');
                  onBackdropPress();
                  await sleep(0);
                  navigation.dispatch(
                    StackActions.replace('Wallet', {
                      screen: 'CreationOptions',
                    }),
                  );
                }}>
                {t('IMPORT WALLET')}
              </BottomNotificationCta>

              <BottomNotificationCta
                suppressHighlighting={true}
                primary={false}
                onPress={async () => {
                  haptic('impactLight');
                  onBackdropPress();
                  await sleep(0);
                  navigation.goBack();
                }}>
                {t('MAYBE LATER')}
              </BottomNotificationCta>
            </WalletConnectCtaContainer>
          </>
        )}
      </WalletSelectorContainer>
    </SheetModal>
  );
};
