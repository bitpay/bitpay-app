import {NavigationProp, useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';
import styled from 'styled-components/native';
import {Column} from '../../../../components/styled/Containers';
import {Key} from '../../../../store/wallet/wallet.models';
import CreateWallet from './cards/CreateWallet';
import WalletCardComponent from './Wallet';
import {BottomNotificationConfig} from '../../../../components/modal/bottom-notification/BottomNotification';
import {
  dismissDecryptPasswordModal,
  showBottomNotificationModal,
  showDecryptPasswordModal,
} from '../../../../store/app/app.actions';
import {Dispatch} from 'redux';
import {
  calculatePercentageDifference,
  getMnemonic,
  sleep,
} from '../../../../utils/helper-methods';
import {sortBy, indexOf} from 'lodash';
import {useAppSelector} from '../../../../utils/hooks';
import {
  HomeCarouselConfig,
  HomeCarouselLayoutType,
} from '../../../../store/app/app.models';
import {
  HomeSectionSubtext,
  HomeSectionSubTitle,
  HomeSectionTitle,
  SectionHeaderContainer,
} from './Styled';
import {View} from 'react-native';
import {Feather} from '../../../../styles/colors';
import Button from '../../../../components/button/Button';
import {WrongPasswordError} from '../../../wallet/components/ErrorMessages';
import {useTranslation} from 'react-i18next';
import {t} from 'i18next';

const CryptoContainer = styled.View`
  background: ${({theme}) => (theme.dark ? '#111111' : Feather)};
  padding: 10px 0 12px;
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

export const keyBackupRequired = (
  key: Key,
  navigation: NavigationProp<any>,
  dispatch: Dispatch,
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
                    const decryptedKey = key.methods!.get(encryptPassword);
                    await dispatch(dismissDecryptPasswordModal());
                    await sleep(300);
                    navigation.navigate('Wallet', {
                      screen: 'RecoveryPhrase',
                      params: {
                        keyId: key.id,
                        words: decryptedKey.mnemonic.trim().split(' '),
                        key,
                        context,
                      },
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
            navigation.navigate('Wallet', {
              screen: 'RecoveryPhrase',
              params: {
                keyId: key.id,
                words: getMnemonic(key),
                key,
                context,
              },
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
  homeCarouselConfig,
  homeCarouselLayoutType,
  hideKeyBalance,
  context,
  onPress,
  currency,
}: {
  navigation: NavigationProp<any>;
  keys: Key[];
  dispatch: Dispatch;
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

      wallets = wallets.filter(wallet => !wallet.hideWallet);

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
                    onPress(currency, key);
                  }
                : () => {
                    if (backupComplete) {
                      navigation.navigate('Wallet', {
                        screen: 'KeyOverview',
                        params: {id: key.id},
                      });
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

  list = list.filter(
    item =>
      homeCarouselConfig.find(configItem => configItem.id === item.id)?.show,
  );

  const order = homeCarouselConfig.map(item => item.id);

  return {
    list: [...sortBy(list, item => indexOf(order, item.id))],
    defaults,
  };
};

const Crypto = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const {homeCarouselLayoutType, hideAllBalances} = useAppSelector(
    ({APP}) => APP,
  );
  const hasKeys = Object.values(keys).length;
  const [cardsList, setCardsList] = useState(
    createHomeCardList({
      navigation,
      keys: Object.values(keys),
      dispatch,
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
        homeCarouselConfig: homeCarouselConfig || [],
        homeCarouselLayoutType,
        hideKeyBalance: hideAllBalances,
      }),
    );
  }, [
    navigation,
    keys,
    dispatch,
    homeCarouselConfig,
    homeCarouselLayoutType,
    hideAllBalances,
  ]);

  if (!hasKeys) {
    return (
      <CryptoContainer>
        <SectionHeaderContainer style={{marginBottom: 0}}>
          <Column>
            <HomeSectionTitle>{t('My Crypto')}</HomeSectionTitle>
            <Row style={{justifyContent: 'space-between'}}>
              <HomeSectionSubtext style={{width: '90%'}}>
                {t('You don’t have any crypto. Create or import a wallet.')}
              </HomeSectionSubtext>
            </Row>
            <ButtonContainer>
              <Button
                style={{marginBottom: 15}}
                onPress={() => {
                  navigation.navigate('Wallet', {screen: 'CreationOptions'});
                }}>
                {t('Create, import or join a shared wallet')}
              </Button>
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
            <HomeSectionSubtext style={{width: '75%', marginTop: 10}}>
              {t('View your wallets, card balance and more.')}
            </HomeSectionSubtext>
          </Row>
        </Column>
      </SectionHeaderContainer>
      {/* ////////////////////////////// LISTVIEW */}
      <ListViewContainer>
        {cardsList.list.map(data => {
          return <View key={data.id}>{data.component}</View>;
        })}
      </ListViewContainer>
      {/* ////////////////////////////// CREATE DEFAULTS */}
      <HomeSectionSubTitle style={{paddingLeft: 15}}>
        {t('Expand your Portfolio')}
      </HomeSectionSubTitle>
      <ListViewContainer>
        {cardsList.defaults.map(data => {
          return <View key={data.id}>{data.component}</View>;
        })}
      </ListViewContainer>
    </CryptoContainer>
  );
};

export default Crypto;
