import {NavigationProp, useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import Carousel from 'react-native-reanimated-carousel';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  Column,
  WIDTH,
} from '../../../../components/styled/Containers';
import {Key} from '../../../../store/wallet/wallet.models';
import ConnectCoinbase from './cards/ConnectCoinbase';
import CreateWallet from './cards/CreateWallet';
import WalletCardComponent from './Wallet';
import {BottomNotificationConfig} from '../../../../components/modal/bottom-notification/BottomNotification';
import {
  dismissDecryptPasswordModal,
  showBottomNotificationModal,
  showDecryptPasswordModal,
} from '../../../../store/app/app.actions';
import {
  calculatePercentageDifference,
  checkEncryptedKeysForEddsaMigration,
  getMnemonic,
  sleep,
} from '../../../../utils/helper-methods';
import _ from 'lodash';
import {
  AppDispatch,
  useAppDispatch,
  useAppSelector,
} from '../../../../utils/hooks';
import {
  HomeCarouselConfig,
  HomeCarouselLayoutType,
} from '../../../../store/app/app.models';
import {
  CarouselItemContainer,
  HomeSectionSubtext,
  HomeSectionSubTitle,
  HomeSectionTitle,
  SectionHeaderContainer,
} from './Styled';
import {View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import CustomizeSvg from './CustomizeSvg';
import haptic from '../../../../components/haptic-feedback/haptic';
import {Feather} from '../../../../styles/colors';
import Button from '../../../../components/button/Button';
import CoinbaseBalanceCard from '../../../coinbase/components/CoinbaseBalanceCard';
import {COINBASE_ENV} from '../../../../api/coinbase/coinbase.constants';
import {WrongPasswordError} from '../../../wallet/components/ErrorMessages';
import {useTranslation} from 'react-i18next';
import {t} from 'i18next';
import {Analytics} from '../../../../store/analytics/analytics.effects';
//import {ConnectLedgerNanoXCard} from './cards/ConnectLedgerNanoX';
import {successImport} from '../../../../store/wallet/wallet.actions';
import {checkEncryptPassword} from '../../../../store/wallet/utils/wallet';

const CryptoContainer = styled.View`
  background: ${({theme}) => (theme.dark ? '#111111' : Feather)};
  padding: 10px 0 12px;
`;

const CarouselContainer = styled.View`
  margin-top: 10px;
`;

const Row = styled.View`
  flex-direction: row;
`;

const ListViewContainer = styled.View`
  padding: 20px 0 12px 0;
`;

const ButtonContainer = styled.View`
  padding: 20px 0;
  margin-top: 15px;
`;

const _renderItem = ({item}: {item: {id: string; component: JSX.Element}}) => {
  return <CarouselItemContainer>{item.component}</CarouselItemContainer>;
};

export const keyBackupRequired = (
  key: Key,
  navigation: NavigationProp<any>,
  dispatch: AppDispatch,
  context?: string,
): BottomNotificationConfig => {
  return {
    type: 'error',
    title: t('Key backup required'),
    message: t('To continue you will need to back up your key.'),
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('Back up Key'),
        action: async () => {
          if (key.properties!.mnemonicEncrypted) {
            await sleep(500);
            dispatch(
              showDecryptPasswordModal({
                onSubmitHandler: async (encryptPassword: string) => {
                  try {
                    dispatch(
                      checkEncryptedKeysForEddsaMigration(key, encryptPassword),
                    );
                    const decryptedKey = key.methods!.get(encryptPassword);
                    await dispatch(dismissDecryptPasswordModal());
                    await sleep(300);
                    navigation.navigate('RecoveryPhrase', {
                      keyId: key.id,
                      words: decryptedKey.mnemonic.trim().split(' '),
                      key,
                      context,
                    });
                  } catch (e) {
                    console.log(`Decrypt Error: ${e}`);
                    await dispatch(dismissDecryptPasswordModal());
                    await sleep(1000); // Wait to close Decrypt Password modal
                    dispatch(showBottomNotificationModal(WrongPasswordError()));
                  }
                },
              }),
            );
          } else {
            navigation.navigate('RecoveryPhrase', {
              keyId: key.id,
              words: getMnemonic(key),
              key,
              context,
            });
          }
        },
        primary: true,
      },
      {
        text: t('maybe later'),
        action: () => {},
        primary: false,
      },
    ],
  };
};

export const createHomeCardList = ({
  navigation,
  keys,
  dispatch,
  linkedCoinbase,
  homeCarouselConfig,
  homeCarouselLayoutType,
  hideKeyBalance,
  context,
  onPress,
  currency,
}: {
  navigation: NavigationProp<any>;
  keys: Key[];
  dispatch: AppDispatch;
  linkedCoinbase: boolean;
  homeCarouselConfig: HomeCarouselConfig[];
  homeCarouselLayoutType: HomeCarouselLayoutType;
  hideKeyBalance: boolean;
  context?: 'keySelector';
  onPress?: (currency: any, selectedKey: Key) => any;
  currency?: any;
}) => {
  let list: {id: string; component: JSX.Element}[] = [];
  const defaults: {id: string; component: JSX.Element}[] = [];
  const hasKeys = keys.length;
  const hasGiftCards = false;
  const hasCoinbase = linkedCoinbase;

  if (hasKeys) {
    const walletCards = keys.map(key => {
      let {
        wallets,
        totalBalance = 0,
        totalBalanceLastDay = 0,
        backupComplete,
      } = key;

      const percentageDifference = calculatePercentageDifference(
        totalBalance,
        totalBalanceLastDay,
      );

      wallets = wallets.filter(
        wallet => !wallet.hideWallet && !wallet.hideWalletByAccount,
      );

      return {
        id: key.id,
        component: (
          <WalletCardComponent
            layout={homeCarouselLayoutType}
            keyName={key.keyName}
            hideKeyBalance={hideKeyBalance}
            wallets={wallets}
            totalBalance={totalBalance}
            percentageDifference={percentageDifference}
            needsBackup={!backupComplete}
            context={context}
            onPress={
              onPress
                ? () => {
                    haptic('soft');
                    onPress(currency, key);
                  }
                : () => {
                    haptic('soft');
                    if (backupComplete) {
                      navigation.navigate('KeyOverview', {id: key.id});
                    } else {
                      dispatch(
                        showBottomNotificationModal(
                          keyBackupRequired(key, navigation, dispatch),
                        ),
                      );
                    }
                  }
            }
          />
        ),
      };
    });

    list.push(...walletCards);
  }

  defaults.push({id: 'createWallet', component: <CreateWallet />});

  // defaults.push({id: 'connectLedger', component: <ConnectLedgerNanoXCard />});

  if (hasCoinbase) {
    list.push({
      id: 'coinbaseBalanceCard',
      component: <CoinbaseBalanceCard layout={homeCarouselLayoutType} />,
    });
  } else {
    defaults.push({id: 'connectToCoinbase', component: <ConnectCoinbase />});
  }

  if (hasGiftCards) {
    // TODO
  }

  list = list.filter(
    item =>
      homeCarouselConfig.find(configItem => configItem.id === item.id)?.show,
  );

  const order = homeCarouselConfig.map(item => item.id);

  return {
    list: [..._.sortBy(list, item => _.indexOf(order, item.id))],
    defaults,
  };
};

const Crypto = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const linkedCoinbase = useAppSelector(
    ({COINBASE}) => !!COINBASE.token[COINBASE_ENV],
  );
  const homeCarouselLayoutType = useAppSelector(
    ({APP}) => APP.homeCarouselLayoutType,
  );
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const hasKeys = Object.values(keys).length;
  const [cardsList, setCardsList] = useState(
    createHomeCardList({
      navigation,
      keys: Object.values(keys),
      dispatch,
      linkedCoinbase: false,
      homeCarouselConfig: homeCarouselConfig || [],
      homeCarouselLayoutType,
      hideKeyBalance: hideAllBalances,
    }),
  );

  useEffect(() => {
    setCardsList(
      createHomeCardList({
        navigation,
        keys: Object.values(keys),
        dispatch,
        linkedCoinbase,
        homeCarouselConfig: homeCarouselConfig || [],
        homeCarouselLayoutType,
        hideKeyBalance: hideAllBalances,
      }),
    );
  }, [
    navigation,
    keys,
    dispatch,
    linkedCoinbase,
    homeCarouselConfig,
    homeCarouselLayoutType,
    hideAllBalances,
  ]);

  if (!hasKeys && !linkedCoinbase) {
    return (
      <CryptoContainer>
        <SectionHeaderContainer style={{marginBottom: 0}}>
          <Column>
            <HomeSectionTitle>{t('My Crypto')}</HomeSectionTitle>
            <Row style={{justifyContent: 'space-between'}}>
              <HomeSectionSubtext style={{width: '90%'}}>
                {t(
                  'You don’t have any crypto. Create a wallet, import a wallet or connect your Coinbase account.',
                )}
              </HomeSectionSubtext>
            </Row>
            <ButtonContainer>
              <Button
                style={{marginBottom: 15}}
                onPress={() => {
                  dispatch(
                    Analytics.track('Clicked create, import or join', {
                      context: 'NoKeysCryptoContainer',
                    }),
                  );
                  navigation.navigate('CreationOptions');
                }}>
                {t('Create, import or join a shared wallet')}
              </Button>
              <Button
                style={{marginBottom: 15}}
                buttonStyle={'secondary'}
                onPress={() => {
                  dispatch(
                    Analytics.track('Clicked Connect Coinbase', {
                      context: 'NoKeysCryptoContainer',
                    }),
                  );
                  navigation.navigate('CoinbaseRoot');
                }}>
                {linkedCoinbase
                  ? 'Coinbase'
                  : t('Connect your Coinbase account')}
              </Button>
              {/*<Button
                buttonStyle={'secondary'}
                onPress={() => {
                  dispatch(AppActions.importLedgerModalToggled(true));
                }}>
                {t('Connect your Ledger Nano X')}
                </Button> */}
            </ButtonContainer>
          </Column>
        </SectionHeaderContainer>
      </CryptoContainer>
    );
  }

  return (
    <CryptoContainer>
      <SectionHeaderContainer style={{marginBottom: 0}}>
        <Column>
          <HomeSectionTitle>{t('My Crypto')}</HomeSectionTitle>
          <Row style={{justifyContent: 'space-between'}}>
            <HomeSectionSubtext style={{width: '75%'}}>
              {t(
                'View your wallets, card balance, connect to Coinbase and more.',
              )}
            </HomeSectionSubtext>
            <TouchableOpacity
              activeOpacity={ActiveOpacity}
              onPress={() => {
                haptic('soft');
                navigation.navigate('CustomizeHomeSettings');
              }}>
              <CustomizeSvg width={37} height={37} />
            </TouchableOpacity>
          </Row>
        </Column>
      </SectionHeaderContainer>
      {/* ////////////////////////////// CAROUSEL/LISTVIEW */}
      {homeCarouselLayoutType === 'carousel' ? (
        <CarouselContainer style={{marginBottom: 22}}>
          <Carousel
            loop={false}
            autoFillData={false}
            vertical={false}
            style={{width: WIDTH}}
            width={190}
            height={230}
            autoPlay={false}
            data={cardsList.list}
            scrollAnimationDuration={0}
            renderItem={_renderItem}
            enabled={true}
          />
        </CarouselContainer>
      ) : (
        <ListViewContainer>
          {cardsList.list.map(data => {
            return <View key={data.id}>{data.component}</View>;
          })}
        </ListViewContainer>
      )}
      {/* ////////////////////////////// CREATE DEFAULTS */}
      <CarouselContainer>
        <SectionHeaderContainer style={{marginTop: 0, position: 'absolute'}}>
          <HomeSectionSubTitle>
            {t('Expand your Portfolio')}
          </HomeSectionSubTitle>
        </SectionHeaderContainer>
        <Carousel
          loop={false}
          vertical={false}
          style={{width: WIDTH, marginTop: 20}}
          width={190}
          height={190 / 2}
          autoPlay={false}
          data={cardsList.defaults}
          enabled={true}
          renderItem={_renderItem}
        />
      </CarouselContainer>
    </CryptoContainer>
  );
};

export default Crypto;
