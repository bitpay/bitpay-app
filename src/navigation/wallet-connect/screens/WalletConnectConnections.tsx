import {useNavigation, useTheme} from '@react-navigation/native';
import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import styled from 'styled-components/native';
import {
  BaseText,
  H4,
  H5,
  H6,
  InfoDescription,
  InfoHeader,
  InfoTitle,
  TextAlign,
} from '../../../components/styled/Text';
import {NeutralSlate, SlateDark} from '../../../styles/colors';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import AddConnection from '../../../components/add/Add';
import {HeaderTitle} from '../styled/WalletConnectText';
import {
  IconContainer,
  ItemContainer,
  ItemNoteContainer,
  ItemTitleContainer,
} from '../styled/WalletConnectContainers';
import {ScrollView, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import FastImage from 'react-native-fast-image';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  dismissBottomNotificationModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {sleep} from '../../../utils/helper-methods';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {
  getAddressFrom,
  walletConnectV2OnDeleteSession,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {WCV2SessionType} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';
import {SearchIconContainer} from '../../../components/chain-search/ChainSearch';
import {ignoreGlobalListContextList} from '../../../components/modal/chain-selector/ChainSelector';
import {
  ActionContainer,
  ActiveOpacity,
  Column,
  CtaContainerAbsolute,
  Info,
  InfoImageContainer,
  SearchRoundContainer,
  SearchRoundInput,
  SheetContainer,
} from '../../../components/styled/Containers';
import SearchSvg from '../../../../assets/img/search.svg';
import {buildAccountList} from '../../../store/wallet/utils/wallet';
import {AccountRowProps} from '../../../components/list/AccountListRow';
import {KeyWalletsRowProps} from '../../../components/list/KeyWalletsRow';
import Blockie from '../../../components/blockie/Blockie';
import Settings from '../../../components/settings/Settings';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import Button from '../../../components/button/Button';
import DefaultImage from '../../../../assets/img/wallet-connect/default-icon.svg';
import InfoSvg from '../../../../assets/img/info.svg';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const WalletConnectConnectionsContainer = styled.SafeAreaView`
  flex: 1;
`;
const AddConnectionContainer = styled(TouchableOpacity)``;

const EmptyListContainer = styled.View`
  justify-content: space-between;
  align-items: center;
  margin-top: 50px;
`;

const AccountSettingsContainer = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  display: flex;
  padding: 8px 10px;
  gap: 8px;
  border-radius: 50px;
  background-color: ${({theme}) => (theme.dark ? SlateDark : NeutralSlate)};
`;

const Badge = styled.View`
  position: absolute;
  border-radius: 8px;
  width: 10px;
  height: 10px;
  right: 0px;
  top: 1px;
  background: #ff647c;
`;

const WalletConnectConnections = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const [showSessionOptions, setShowSessionOptions] = useState(false);
  const [imageError, setImageError] = useState({});
  const sessions: WCV2SessionType[] = useAppSelector(
    ({WALLET_CONNECT_V2}) => WALLET_CONNECT_V2.sessions,
  );
  const requests = useAppSelector(
    ({WALLET_CONNECT_V2}) => WALLET_CONNECT_V2.requests,
  );
  const [selectedSession, setSelectedSession] = useState<
    WCV2SessionType | undefined
  >();
  const {rates} = useAppSelector(({RATE}) => RATE);
  const {defaultAltCurrency} = useAppSelector(({APP}) => APP);

  const [searchVal, setSearchVal] = useState('');
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';

  const selectedChainFilterOption = useAppSelector(({APP}) =>
    ignoreGlobalListContextList.includes('walletconnect')
      ? APP.selectedLocalChainFilterOption
      : APP.selectedChainFilterOption,
  );

  const dispatch = useAppDispatch();
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const [allKeys, setAllkeys] = useState<KeyWalletsRowProps[]>();

  const ConnectionItem = ({
    peerName,
    peerIcon,
    peerUrl,
    session,
  }: {
    peerName: string;
    peerIcon: string;
    peerUrl: string;
    session?: WCV2SessionType;
  }) => {
    // @ts-ignore
    const imgError = imageError[peerUrl];
    return (
      <ItemContainer>
        <ItemTitleContainer>
          <IconContainer>
            {peerIcon && !imgError ? (
              <FastImage
                source={{uri: peerIcon}}
                style={{width: 40, height: 40}}
                onError={() => {
                  setImageError({...imageError, [peerUrl]: true});
                }}
              />
            ) : (
              <DefaultImage width={40} height={40} />
            )}
          </IconContainer>
          <Column style={{marginLeft: 16}}>
            <H6>{peerName}</H6>
            <BaseText>{peerUrl}</BaseText>
          </Column>
        </ItemTitleContainer>
        <ItemNoteContainer>
          <Settings
            onPress={() => {
              setShowSessionOptions(true);
              setSelectedSession(session);
            }}
          />
        </ItemNoteContainer>
      </ItemContainer>
    );
  };
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => {
        return (
          <AddConnectionContainer
            touchableLibrary={'react-native-gesture-handler'}
            onPress={() => {
              navigation.navigate('WalletConnectRoot', {});
            }}>
            <AddConnection opacity={1} />
          </AddConnectionContainer>
        );
      },
    });
  }, [navigation]);

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const SessionList = ({sessions}: {sessions: WCV2SessionType[]}) => {
    return (
      <>
        {sessions.map((session, index) => {
          const {peer} = session;
          const sessionsAddresses = session.accounts.map(account => {
            const index = account.indexOf(':', account.indexOf(':') + 1);
            const address = account.substring(index + 1);
            return address;
          });
          return (
            <View style={{marginVertical: 15}} key={index.toString()}>
              <ConnectionItem
                peerIcon={peer.metadata.icons[0]}
                peerName={peer.metadata.name}
                peerUrl={peer.metadata.url}
                session={session}
              />
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  marginLeft: 52,
                }}>
                {allKeys?.map((key: KeyWalletsRowProps) =>
                  key.accounts.map((account: AccountRowProps) => {
                    if (!sessionsAddresses.includes(account.receiveAddress)) {
                      return;
                    }

                    const filteredRequests = requests.filter(request => {
                      const requestAddress =
                        getAddressFrom(request)?.toLowerCase();
                      return (
                        request.topic === session.topic &&
                        requestAddress === account.receiveAddress.toLowerCase()
                      );
                    });
                    return (
                      <AccountSettingsContainer
                        key={account.receiveAddress}
                        activeOpacity={ActiveOpacity}
                        onPress={() => {
                          navigation.navigate('WalletConnectHome', {
                            topic: session?.topic,
                            selectedAccountAddress: account.receiveAddress,
                            keyId: key.key,
                          });
                        }}>
                        <Blockie size={16} seed={account.receiveAddress} />
                        {filteredRequests && filteredRequests.length ? (
                          <Badge />
                        ) : null}
                        <BaseText ellipsizeMode="tail" numberOfLines={1}>
                          {account.accountName}
                        </BaseText>
                      </AccountSettingsContainer>
                    );
                  }),
                )}
              </View>
            </View>
          );
        })}
      </>
    );
  };

  const _setAllKeysAndSelectedWallets = () => {
    const sessionsAddresses = sessions
      .map(session =>
        session.accounts.map(account => {
          const index = account.indexOf(':', account.indexOf(':') + 1);
          const address = account.substring(index + 1);
          return address;
        }),
      )
      .flat();

    const formattedKeys = Object.values(keys)
      .map(key => {
        const accountList = buildAccountList(
          key,
          defaultAltCurrency.isoCode,
          rates,
          dispatch,
          {
            filterByCustomWallets: key.wallets.filter(({receiveAddress}) => {
              return sessionsAddresses.includes(receiveAddress!);
            }),
            skipFiatCalculations: true,
          },
        ) as AccountRowProps[];

        if (accountList.length === 0) {
          return null;
        }
        return {
          key: key.id,
          keyName: key.keyName || 'My Key',
          backupComplete: key.backupComplete,
          accounts: accountList,
        };
      })
      .filter(item => item !== null) as KeyWalletsRowProps[];
    setAllkeys(formattedKeys);
  };

  useEffect(() => {
    _setAllKeysAndSelectedWallets();
  }, []);

  const disconnectAccount = async (session: WCV2SessionType) => {
    haptic('impactLight');
    dispatch(
      showBottomNotificationModal({
        type: 'question',
        title: t('Confirm delete'),
        message: t('Are you sure you want to delete this session?'),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('DELETE'),
            action: async () => {
              dispatch(dismissBottomNotificationModal());
              await sleep(600);
              try {
                await dispatch(
                  walletConnectV2OnDeleteSession(
                    session.topic,
                    session.pairingTopic,
                  ),
                );
              } catch (err) {
                await showErrorMessage(
                  CustomErrorMessage({
                    errMsg: BWCErrorMessage(err),
                    title: t('Uh oh, something went wrong'),
                  }),
                );
              }
            },
            primary: true,
          },
          {
            text: t('GO BACK'),
            action: () => {},
          },
        ],
      }),
    );
  };

  const disconnectAccounts = async () => {
    haptic('impactLight');
    dispatch(
      showBottomNotificationModal({
        type: 'question',
        title: t('Confirm delete'),
        message: t('Are you sure you want to delete all sessions?'),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('DELETE'),
            action: async () => {
              dispatch(dismissBottomNotificationModal());
              await sleep(600);
              try {
                for (const session of sessions) {
                  await dispatch(
                    walletConnectV2OnDeleteSession(
                      session.topic,
                      session.pairingTopic,
                    ),
                  );
                }
              } catch (err) {
                await showErrorMessage(
                  CustomErrorMessage({
                    errMsg: BWCErrorMessage(err),
                    title: t('Uh oh, something went wrong'),
                  }),
                );
              }
            },
            primary: true,
          },
          {
            text: t('GO BACK'),
            action: () => {},
          },
        ],
      }),
    );
  };

  return (
    <WalletConnectConnectionsContainer>
      <ScrollView>
        <View style={{marginTop: 20, padding: 16, marginBottom: 100}}>
          <HeaderTitle>{t('Connections')}</HeaderTitle>
          <SearchRoundContainer>
            <SearchIconContainer>
              <SearchSvg height={16} width={16} />
            </SearchIconContainer>
            <SearchRoundInput
              placeholder={t('Search')}
              placeholderTextColor={placeHolderTextColor}
              onChangeText={(text: string) => {
                setSearchVal(text);
              }}
            />
          </SearchRoundContainer>
          {requests && requests.length > 0 ? (
            <Info style={{marginHorizontal: 10, marginTop: 20}}>
              <InfoHeader>
                <InfoImageContainer infoMargin={'0 8px 0 0'}>
                  <InfoSvg />
                </InfoImageContainer>

                <InfoTitle>{t('Pending request')}</InfoTitle>
              </InfoHeader>
              <InfoDescription>
                {t(
                  'Complete or clear pending requests to allow new ones to come in',
                )}
              </InfoDescription>
            </Info>
          ) : null}
          {sessions.length ? (
            <SessionList
              sessions={
                !searchVal && !selectedChainFilterOption
                  ? sessions
                  : [...sessions].filter(session => {
                      return session.peer.metadata.name
                        .toLowerCase()
                        .includes(searchVal.toLowerCase());
                    })
              }
            />
          ) : null}
          {!sessions.length ? (
            <EmptyListContainer>
              <H5>{t("It's a ghost town in here")}</H5>
              <GhostSvg style={{marginTop: 20}} />
            </EmptyListContainer>
          ) : null}
        </View>
      </ScrollView>
      {sessions.length > 0 ? (
        <CtaContainerAbsolute background={true}>
          <Button
            buttonStyle="danger"
            buttonOutline={true}
            onPress={async () => {
              haptic('impactLight');
              disconnectAccounts();
            }}>
            {t('Disconnect All')}
          </Button>
        </CtaContainerAbsolute>
      ) : null}

      {selectedSession ? (
        <SheetModal
          modalLibrary={'modal'}
          isVisible={showSessionOptions}
          onBackdropPress={() => {
            setShowSessionOptions(false);
          }}
          placement={'bottom'}>
          <SheetContainer placement={'bottom'} paddingHorizontal={200}>
            <TextAlign align={'center'}>
              <H4>{selectedSession.peer.metadata.name}</H4>
            </TextAlign>
            <ActionContainer>
              <Button
                buttonStyle="danger"
                buttonOutline={true}
                touchableLibrary={'react-native'}
                onPress={async () => {
                  haptic('impactLight');
                  setShowSessionOptions(false);
                  await sleep(1000);
                  disconnectAccount(selectedSession);
                }}>
                {t('Disconnect')}
              </Button>
            </ActionContainer>
          </SheetContainer>
        </SheetModal>
      ) : null}
    </WalletConnectConnectionsContainer>
  );
};

export default WalletConnectConnections;
