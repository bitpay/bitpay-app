import React, {useCallback, useEffect, useMemo, useState} from 'react';
import styled from 'styled-components/native';
import Button, {ButtonState} from '../../button/Button';
import {H6, H3, BaseText, Paragraph, Link, H7} from '../../styled/Text';
import VerifiedIcon from '../../../../assets/img/wallet-connect/verified-icon.svg';
import WalletIcon from '../../../../assets/img/wallet-connect/wallet-icon.svg';
import {CommonActions, useNavigation, useTheme} from '@react-navigation/native';
import {
  Caution,
  Caution25,
  LightBlack,
  NeutralSlate,
  SlateDark,
  Success25,
  Warning25,
  White,
} from '../../../styles/colors';
import haptic from '../../haptic-feedback/haptic';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {StyleSheet, View} from 'react-native';
import {dismissWalletConnectStartModal} from '../../../store/app/app.actions';
import {BottomNotificationConfig} from '../bottom-notification/BottomNotification';
import {CustomErrorMessage} from '../../../navigation/wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {
  ActionContainer,
  ActiveOpacity,
  CurrencyImageContainer,
  Row,
  SheetContainer,
} from '../../styled/Containers';
import {ProposalTypes, SessionTypes} from '@walletconnect/types';
import {
  walletConnectV2ApproveSessionProposal,
  walletConnectV2RejectSessionProposal,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {buildApprovedNamespaces} from '@walletconnect/utils';
import {
  CHAIN_NAME_MAPPING,
  EIP155_SIGNING_METHODS,
  WALLET_CONNECT_SUPPORTED_CHAINS,
} from '../../../constants/WalletConnectV2';
import {Web3WalletTypes} from '@walletconnect/web3wallet';
import FastImage from 'react-native-fast-image';
import {WalletConnectScreens} from '../../../navigation/wallet-connect/WalletConnectGroup';
import SheetModal from '../base/sheet/SheetModal';
import {KeyWalletsRowProps} from '../../list/KeyWalletsRow';
import {buildAccountList} from '../../../store/wallet/utils/wallet';
import {SUPPORTED_EVM_COINS} from '../../../constants/currencies';
import {AccountRowProps} from '../../list/AccountListRow';
import {WalletRowProps} from '../../list/WalletRow';
import {CurrencyImage} from '../../currency-image/CurrencyImage';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import SelectorArrowRight from '../../../../assets/img/selector-arrow-right.svg';
import Blockie from '../../blockie/Blockie';
import {IsERCToken} from '../../../store/wallet/utils/currency';
import {TouchableOpacity} from 'react-native';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import ExternalLinkSvg from '../../../../assets/img/external-link-small.svg';
import TrustedDomainSvg from '../../../../assets/img/trusted-domain.svg';
import WarningOutlineSvg from '../../../../assets/img/warning-outline.svg';
import InvalidDomainSvg from '../../../../assets/img/invalid-domain.svg';
import DefaultImage from '../../../../assets/img/wallet-connect/default-icon.svg';
import Banner from '../../banner/Banner';
import AccountWCV2RowModal from './AccountWCV2RowModal';
import WCErrorBottomNotification from './WCErrorBottomNotification';
import WarningBrownSvg from '../../../../assets/img/warning-brown.svg';
import {getNavigationTabName, RootStacks} from '../../../Root';
import {SettingsScreens} from '../../../navigation/tabs/settings/SettingsGroup';
import {SvgProps} from 'react-native-svg';

export type WalletConnectStartParamList = {
  // version 2
  proposal: Web3WalletTypes.EventArguments['session_proposal'];
  selectedWallets?: {
    chain: string;
    address: string;
    network: string;
    supportedChain: string;
  }[];
};

const ScrollView = styled.ScrollView``;

export const UriContainerTouchable = styled(TouchableOpacity)`
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const UriContainer = styled.View`
  background-color: ${({theme}) => (theme.dark ? 'transparent' : '#E9ECF9')};
  border-radius: 50px;
  padding: 8px 13px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  margin-right: 6px;
`;

const ValidationContainer = styled.View<{bgColor: string}>`
  background-color: ${({bgColor}) => bgColor};
  padding: 8px 13px;
  border-radius: 50px;
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

const ValidationText = styled(BaseText)<{textColor: string}>`
  color: ${({textColor}) => textColor};
  font-size: 12px;
`;
const TitleContainer = styled.View``;

const DescriptionContainer = styled.View`
  margin-bottom: 16px;
  background-color: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  padding: 16px;
  border-radius: 12px;
  gap: 10px;
`;

const DescriptionItemContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

const DescriptionItem = styled(Paragraph)`
  padding-left: 9px;
  padding-top: 2px;
  color: ${props => props.theme.colors.text};
`;

const IconContainer = styled.View`
  width: 100%;
  justify-content: center;
  align-items: center;
`;

const AccountSettingsContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  display: flex;
  padding: 0px;
  gap: 8px;
`;

const styles = StyleSheet.create({
  icon: {
    height: 80,
    width: 80,
    borderRadius: 10,
  },
});

export const WalletConnectStartModal = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const showWalletConnectStartModal = useAppSelector(
    ({APP}) => APP.showWalletConnectStartModal,
  );
  const [buttonState, setButtonState] = useState<ButtonState>();
  const {proposal} = useAppSelector(({WALLET_CONNECT_V2}) => WALLET_CONNECT_V2);
  const {defaultAltCurrency} = useAppSelector(({APP}) => APP);
  const {rates} = useAppSelector(({RATE}) => RATE);
  const [
    showAccountWCV2SelectionBottomModal,
    setShowAccountWCV2SelectionBottomModal,
  ] = useState<boolean>(false);
  const [selectedWallets, setSelectedWallets] = useState<
    {
      chain: string;
      address: string;
      network: string;
      supportedChain: string;
    }[]
  >([]);
  const [chainsSelected, setChainsSelected] =
    useState<{chain: string; network: string}[]>();
  const [chainNames, setChainNames] = useState<string[]>([]);
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const [allKeys, setAllkeys] = useState<KeyWalletsRowProps[]>();
  const [imageError, setImageError] = useState(false);
  const [checkedAccount, setCheckedAccount] = useState<
    AccountRowProps & {checked?: boolean}
  >();
  const [customErrorMessageData, setCustomErrorMessageData] = useState<
    BottomNotificationConfig | undefined
  >();
  // version 2
  const {id, params, verifyContext} = proposal || {};
  const {
    proposer,
    relays,
    pairingTopic,
    requiredNamespaces,
    optionalNamespaces,
  } = params || {};
  const {metadata} = proposer || {};

  const peerName = metadata?.name;
  const peerUrl = metadata?.url;
  const peerImg = metadata?.icons?.[0];

  const transformErrorMessage = (error: string) => {
    const NETWORK_ERROR_PREFIX =
      "Non conforming namespaces. approve() namespaces chains don't satisfy required namespaces.";

    if (error.includes(NETWORK_ERROR_PREFIX)) {
      // Replace chain codes with corresponding chain names
      error = error.replace(/eip155:\d+/g, match => {
        const chainCode = match.split(':')[1];
        return CHAIN_NAME_MAPPING[chainCode] || match;
      });
      let parts = error.split('Required: ')[1].split('Approved: ');
      let requiredPart = parts[0].replace(/,/g, ', ');
      let approvedPart = parts[1].replace(/,/g, ', ');
      const transformedMessage = `Network compatibility issue. The supported networks do not meet the requirements.\n\nRequired Networks:\n${requiredPart}\n\nSupported Networks:\n${approvedPart}`;
      return transformedMessage;
    } else {
      return error;
    }
  };

  const approveSessionProposal = async () => {
    try {
      setButtonState('loading');
      if (selectedWallets && proposal) {
        const accounts: string[] = [];
        const chains: string[] = [];
        selectedWallets.forEach(selectedWallet => {
          accounts.push(
            `${selectedWallet.supportedChain}:${selectedWallet.address}`,
          );
          chains.push(selectedWallet.supportedChain);
        });
        // Remove duplicate values from chains array
        const uniqueChains = [...new Set(chains)];
        const namespaces: SessionTypes.Namespaces = buildApprovedNamespaces({
          proposal: proposal.params,
          supportedNamespaces: {
            eip155: {
              chains: uniqueChains,
              methods: Object.values(EIP155_SIGNING_METHODS),
              events: ['chainChanged', 'accountsChanged'],
              accounts,
            },
          },
        });
        if (id && relays) {
          await dispatch(
            walletConnectV2ApproveSessionProposal(
              id,
              relays[0].protocol,
              namespaces,
              pairingTopic!,
              proposal.params,
              accounts,
              uniqueChains,
              verifyContext,
            ),
          );
        }
      }
      dispatch(dismissWalletConnectStartModal());
      dispatch(Analytics.track('WalletConnect Session Request Approved', {}));
      navigation.dispatch(
        CommonActions.reset({
          index: 2,
          routes: [
            {
              name: RootStacks.TABS,
              params: {screen: getNavigationTabName()},
            },
            {
              name: SettingsScreens.SETTINGS_HOME,
            },
            {
              name: WalletConnectScreens.WC_CONNECTIONS,
            },
          ],
        }),
      );
    } catch (e) {
      setButtonState('failed');
      const transformedMessage = transformErrorMessage(BWCErrorMessage(e));
      setCustomErrorMessageData(
        CustomErrorMessage({
          errMsg: transformedMessage,
          title: t('Uh oh, something went wrong'),
          action: () => {
            setCustomErrorMessageData(undefined);
            setButtonState(undefined);
          },
        }),
      );
    }
  };

  const _setSelectedWallets = (_allKeys: KeyWalletsRowProps[]) => {
    const selectedWallets: {
      chain: string;
      address: string;
      network: string;
      supportedChain: string;
    }[] = [];
    _allKeys &&
      _allKeys.forEach((key: KeyWalletsRowProps) => {
        key.accounts.forEach(
          (account: AccountRowProps & {checked?: boolean}) => {
            account.wallets.forEach((wallet: WalletRowProps) => {
              const {checked} = account;
              const {receiveAddress, chain, network} = wallet;
              let _supportedChain: [string, {chain: string; network: string}];
              if (checked && receiveAddress) {
                _supportedChain = Object.entries(
                  WALLET_CONNECT_SUPPORTED_CHAINS,
                ).find(
                  ([_, {chain: c, network: n}]) => c === chain && n === network,
                )! as [string, {chain: string; network: string}];
                selectedWallets.push({
                  address: receiveAddress,
                  chain,
                  network,
                  supportedChain: _supportedChain[0],
                });
              }
            });
          },
        );
      });
    setSelectedWallets(selectedWallets);
    setButtonState(undefined);
  };

  const _setAllKeysAndSelectedWallets = () => {
    const formattedKeys = Object.values(keys)
      .map((key, keyIndex) => {
        const accountList = buildAccountList(
          key,
          defaultAltCurrency.isoCode,
          rates,
          dispatch,
          {
            filterByCustomWallets: key.wallets.filter(
              ({chain, currencyAbbreviation}) =>
                SUPPORTED_EVM_COINS.includes(chain) &&
                !IsERCToken(currencyAbbreviation, chain),
            ),
            skipFiatCalculations: true,
          },
        ) as AccountRowProps[];

        const accounts = accountList.map((account, accountListIndex) => ({
          ...account,
          checked: accountListIndex === 0 && keyIndex === 0,
        })) as (AccountRowProps & {checked?: boolean})[];

        if (accounts.length === 0) {
          return null;
        }
        return {
          key: key.id,
          keyName: key.keyName || 'My Key',
          backupComplete: key.backupComplete,
          accounts,
        };
      })
      .filter(item => item !== null) as KeyWalletsRowProps[];
    setAllkeys(formattedKeys);
    setCheckedAccount(formattedKeys[0]?.accounts[0]);
    _setSelectedWallets(formattedKeys);
  };

  useEffect(() => {
    if (showWalletConnectStartModal) {
      _setAllKeysAndSelectedWallets();
    }
  }, [chainsSelected, showWalletConnectStartModal]);

  const _setChainsSelected = (
    requiredNamespaces: ProposalTypes.RequiredNamespaces | undefined,
    optionalNamespaces: ProposalTypes.OptionalNamespaces | undefined,
  ) => {
    Object.keys(requiredNamespaces || {})
      .concat(Object.keys(optionalNamespaces || {}))
      .forEach(key => {
        const chains: {chain: string; network: string}[] = [];
        [
          ...new Set([
            //@ts-ignore
            ...(requiredNamespaces[key]?.chains || []),
            //@ts-ignore
            ...(optionalNamespaces[key]?.chains || []),
          ]),
        ].map((chain: string) => {
          if (WALLET_CONNECT_SUPPORTED_CHAINS[chain]) {
            chains.push(WALLET_CONNECT_SUPPORTED_CHAINS[chain]);
          }
        });
        const chainNames = [...new Set(chains.map(({chain}) => chain))];
        setChainsSelected(chains);
        setChainNames(chainNames);
      });
  };

  useEffect(() => {
    if (showWalletConnectStartModal) {
      _setChainsSelected(requiredNamespaces, optionalNamespaces);
    }
  }, [requiredNamespaces, optionalNamespaces, showWalletConnectStartModal]);

  const onBackdropPress = () => {
    dispatch(dismissWalletConnectStartModal());
  };

  const getFlatAllKeysAccounts = useMemo(() => {
    return allKeys?.map(key => key.accounts).flat() as (AccountRowProps & {
      checked: boolean;
    })[];
  }, [allKeys]);

  return (
    <SheetModal
      isVisible={showWalletConnectStartModal}
      onBackdropPress={onBackdropPress}>
      <SheetContainer
        paddingHorizontal={0}
        style={{paddingLeft: 16, paddingRight: 16}}>
        <ScrollView>
          <IconContainer style={{marginTop: 36}}>
            {peerImg && !imageError ? (
              <FastImage
                style={styles.icon}
                source={{
                  uri: peerImg,
                  priority: FastImage.priority.normal,
                }}
                resizeMode={FastImage.resizeMode.cover}
                onError={() => setImageError(true)}
              />
            ) : (
              <DefaultImage width={80} height={80} />
            )}
          </IconContainer>
          <View
            style={{
              marginTop: 16,
            }}>
            {peerName && peerUrl && (
              <View>
                <View style={{marginTop: 10, marginBottom: 10}}>
                  <TitleContainer>
                    <H3 style={{textAlign: 'center', fontWeight: '400'}}>
                      {peerName + t(' wants to connect to your wallet')}
                    </H3>
                  </TitleContainer>
                  <Row
                    style={{
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}>
                    <UriContainerTouchable
                      onPress={() => {
                        haptic('impactLight');
                        dispatch(openUrlWithInAppBrowser(peerUrl));
                      }}>
                      <UriContainer>
                        <Link style={{fontSize: 12}}>{peerUrl}</Link>
                        <ExternalLinkSvg width={12} />
                      </UriContainer>
                    </UriContainerTouchable>
                    {verifyContext &&
                      (() => {
                        let bgColor = '';
                        let textColor = '';
                        let text = '';
                        let Icon = null;
                        switch (verifyContext.verified.validation) {
                          case 'UNKNOWN':
                            bgColor = Warning25;
                            textColor = '#AC6304';
                            text = t('Cannot Verify');
                            Icon = WarningOutlineSvg;
                            break;
                          case 'INVALID':
                            bgColor = Caution25;
                            textColor = Caution;
                            text = t('Security Risk');
                            Icon = InvalidDomainSvg;
                            break;
                          case 'VALID':
                            bgColor = Success25;
                            textColor = '#0B754A';
                            text = t('Trusted Domain');
                            Icon = TrustedDomainSvg;
                            break;

                          default:
                            return null;
                        }

                        return (
                          <ValidationContainer bgColor={bgColor}>
                            <ValidationText textColor={textColor}>
                              {text}
                            </ValidationText>
                            <Icon />
                          </ValidationContainer>
                        );
                      })()}
                  </Row>
                  {verifyContext &&
                    (() => {
                      let text = '';
                      let type = '';
                      let title = '';
                      let VerifyIcon: React.FC<SvgProps> | null = null;
                      switch (verifyContext.verified.validation) {
                        case 'UNKNOWN':
                          VerifyIcon = WarningOutlineSvg;
                          text = t(
                            'The domain sending the request cannot be verified.',
                          );
                          type = 'warning';
                          title = t('Unknown Domain');
                          break;
                        // case 'VALID':
                        //   text = t("The domain linked to this request has been verified as this application's domain.");
                        //   type = 'success';
                        //   title = t('Trusted Domain');
                        //   break;
                        case 'INVALID':
                          VerifyIcon = InvalidDomainSvg;
                          text = t(
                            "The application's domain doesn't match the sender of this request.",
                          );
                          type = 'error';
                          title = t('Security Risk');
                          break;
                        default:
                          return null;
                      }

                      return (
                        <Banner
                          height={100}
                          type={type}
                          title={title}
                          description={text}
                          hasBackgroundColor={true}
                          icon={VerifyIcon}
                        />
                      );
                    })()}
                </View>
                <DescriptionContainer>
                  <H7
                    medium={true}
                    style={{color: theme.dark ? White : SlateDark}}>
                    {t('App Permissions')}
                  </H7>
                  <DescriptionItemContainer>
                    <WalletIcon color={'red'} />
                    <DescriptionItem>
                      {t('View your wallet balance and activity.')}
                    </DescriptionItem>
                  </DescriptionItemContainer>
                  <DescriptionItemContainer>
                    <VerifiedIcon />
                    <DescriptionItem>
                      {t('Request approval for transactions.')}
                    </DescriptionItem>
                  </DescriptionItemContainer>
                  <H7
                    medium={true}
                    style={{color: theme.dark ? White : SlateDark}}>
                    {t('Networks')}
                  </H7>
                  <DescriptionItemContainer>
                    {chainNames?.map((chain, index) => (
                      <View key={index.toString()} style={{marginRight: -5}}>
                        <CurrencyImage
                          img={CurrencyListIcons[chain]}
                          size={30}
                        />
                      </View>
                    ))}
                  </DescriptionItemContainer>
                  <H7
                    medium={true}
                    style={{color: theme.dark ? White : SlateDark}}>
                    {t('Accounts')}
                  </H7>
                  <DescriptionItemContainer>
                    {allKeys && allKeys[0]?.accounts[0] && checkedAccount ? (
                      <>
                        <AccountSettingsContainer
                          activeOpacity={ActiveOpacity}
                          onPress={() => {
                            setShowAccountWCV2SelectionBottomModal(true);
                          }}>
                          <CurrencyImageContainer
                            style={{height: 30, width: 30}}>
                            <Blockie
                              size={30}
                              seed={checkedAccount.receiveAddress}
                            />
                          </CurrencyImageContainer>
                          <Row>
                            <H6
                              medium={true}
                              ellipsizeMode="tail"
                              numberOfLines={1}>
                              {checkedAccount.accountName}
                              {allKeys[0]?.accounts.length > 1 ? (
                                <BaseText
                                  style={{
                                    color: theme.dark ? White : SlateDark,
                                  }}>
                                  {' '}
                                  (+{allKeys[0]?.accounts.length - 1})
                                </BaseText>
                              ) : (
                                ''
                              )}
                            </H6>
                          </Row>
                        </AccountSettingsContainer>
                        {allKeys[0]?.accounts.length > 0 ? (
                          <SelectorArrowRight />
                        ) : null}
                      </>
                    ) : (
                      <DescriptionItemContainer>
                        <WarningBrownSvg />
                        <DescriptionItem>
                          {t('No accounts found')}
                        </DescriptionItem>
                      </DescriptionItemContainer>
                    )}
                  </DescriptionItemContainer>
                </DescriptionContainer>
              </View>
            )}
            <View>
              <ActionContainer>
                <Button
                  state={buttonState}
                  disabled={!(allKeys && allKeys[0]?.accounts[0])}
                  onPress={() => {
                    haptic('impactLight');
                    approveSessionProposal();
                  }}>
                  {t('Connect')}
                </Button>
              </ActionContainer>
              <ActionContainer>
                <Button
                  buttonStyle="secondary"
                  onPress={() => {
                    haptic('impactLight');
                    if (proposal) {
                      dispatch(dismissWalletConnectStartModal());
                      dispatch(
                        walletConnectV2RejectSessionProposal(proposal.id),
                      );
                    }
                  }}>
                  {t('Cancel')}
                </Button>
              </ActionContainer>
            </View>
          </View>
          {allKeys &&
          allKeys[0]?.accounts?.length > 0 &&
          showWalletConnectStartModal ? (
            <AccountWCV2RowModal
              isVisible={showAccountWCV2SelectionBottomModal}
              closeModal={() => setShowAccountWCV2SelectionBottomModal(false)}
              accounts={getFlatAllKeysAccounts}
              onPress={account => {
                const _allKeys = allKeys.map(key => ({
                  ...key,
                  accounts: key.accounts.map(accountItem => {
                    const isChecked =
                      accountItem.receiveAddress === account.receiveAddress
                        ? !account.checked
                        : false;

                    return {
                      ...accountItem,
                      checked: isChecked,
                    };
                  }),
                }));
                setCheckedAccount(account);
                setAllkeys(_allKeys);
                _setSelectedWallets(_allKeys);
              }}
            />
          ) : null}

          {customErrorMessageData ? (
            <WCErrorBottomNotification
              {...customErrorMessageData}
              isVisible={!!customErrorMessageData}
            />
          ) : null}
        </ScrollView>
      </SheetContainer>
    </SheetModal>
  );
};
