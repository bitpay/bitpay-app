import React, {useEffect, useMemo, useState, useCallback, memo} from 'react';
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
  Slate,
  SlateDark,
  Success25,
  Warning25,
  White,
} from '../../../styles/colors';
import haptic from '../../haptic-feedback/haptic';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import {ScrollView as RNScrollView, StyleSheet, View} from 'react-native';
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
import {
  AuthTypes,
  CoreTypes,
  ProposalTypes,
  RelayerTypes,
  SessionTypes,
  SignClientTypes,
} from '@walletconnect/types';
import {
  formatAuthMessage,
  getPrivKey,
  walletConnectV2approveSessionAuthenticateProposal,
  walletConnectV2ApproveSessionProposal,
  walletConnectV2RejectSessionProposal,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {buildApprovedNamespaces, buildAuthObject} from '@walletconnect/utils';
import {
  CHAIN_NAME_MAPPING,
  EIP155_SIGNING_METHODS,
  SOLANA_SIGNING_METHODS,
  WALLET_CONNECT_SUPPORTED_CHAINS,
  WC_EVENTS,
  WC_SUPPORTED_CHAINS,
} from '../../../constants/WalletConnectV2';
import {WalletKitTypes} from '@reown/walletkit';
import FastImage from 'react-native-fast-image';
import {WalletConnectScreens} from '../../../navigation/wallet-connect/WalletConnectGroup';
import SheetModal from '../base/sheet/SheetModal';
import {KeyWalletsRowProps} from '../../list/KeyWalletsRow';
import {
  buildAccountList,
  findWalletByAddress,
} from '../../../store/wallet/utils/wallet';
import {AccountRowProps} from '../../list/AccountListRow';
import {WalletRowProps} from '../../list/WalletRow';
import {CurrencyImage} from '../../currency-image/CurrencyImage';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import SelectorArrowRight from '../../../../assets/img/selector-arrow-right.svg';
import Blockie from '../../blockie/Blockie';
import {IsERCToken} from '../../../store/wallet/utils/currency';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import ExternalLinkSvg from '../../../../assets/img/external-link-small.svg';
import TrustedDomainSvg from '../../../../assets/img/trusted-domain.svg';
import WarningOutlineSvg from '../../../../assets/img/warning-outline.svg';
import InvalidDomainSvg from '../../../../assets/img/invalid-domain.svg';
import DefaultImage from '../../../../assets/img/wallet-connect/default-icon.svg';
import Banner from '../../banner/Banner';
import AccountWCV2RowModal, {
  KeyWalletsRowWithChecked,
} from './AccountWCV2RowModal';
import WCErrorBottomNotification from './WCErrorBottomNotification';
import WarningBrownSvg from '../../../../assets/img/warning-brown.svg';
import {getNavigationTabName, RootStacks} from '../../../Root';
import {SvgProps} from 'react-native-svg';
import {ethers} from 'ethers';

type AuthEvt = WalletKitTypes.EventArguments['session_authenticate'];
type ProposalEvt = WalletKitTypes.EventArguments['session_proposal'];
type AuthOrProp = AuthEvt | ProposalEvt;

export type WalletConnectStartParamList = {
  // version 2
  proposal:
    | WalletKitTypes.EventArguments['session_proposal']
    | WalletKitTypes.EventArguments['session_authenticate'];
  selectedWallets?: {
    chain: string;
    address: string;
    network: string;
    supportedChain: string;
  }[];
};

const styles = StyleSheet.create({
  icon: {
    height: 80,
    width: 80,
    borderRadius: 10,
  },
  uriContainerTouchable: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uriContainer: {
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 13,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 6,
  },
  validationContainer: {
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  validationText: {
    fontSize: 12,
  },
  titleContainer: {
    paddingBottom: 20,
  },
  descriptionContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  descriptionItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  descriptionItem: {
    paddingLeft: 9,
    paddingRight: 9,
    paddingTop: 2,
  },
  iconContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountSettingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    display: 'flex',
    padding: 0,
    gap: 8,
    width: '100%',
  },
  accountSettingsArrowContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});

export const UriContainerTouchable: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.uriContainerTouchable, style]} {...rest} />
);

export const UriContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.uriContainer,
        {backgroundColor: theme.dark ? 'transparent' : '#E9ECF9'},
        style,
      ]}
      {...rest}
    />
  );
};

const ValidationContainer: React.FC<
  {bgColor: string} & React.ComponentProps<typeof View>
> = ({bgColor, style, ...rest}) => (
  <View
    style={[styles.validationContainer, {backgroundColor: bgColor}, style]}
    {...rest}
  />
);

const ValidationText: React.FC<
  {textColor: string} & React.ComponentProps<typeof BaseText>
> = ({textColor, style, ...rest}) => (
  <BaseText
    style={[styles.validationText, {color: textColor}, style]}
    {...rest}
  />
);

const TitleContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.titleContainer, style]} {...rest} />;

const DescriptionContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.descriptionContainer,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
};

const DescriptionItemContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.descriptionItemContainer, style]} {...rest} />;

const DescriptionItem: React.FC<React.ComponentProps<typeof Paragraph>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[styles.descriptionItem, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

const IconContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.iconContainer, style]} {...rest} />;

const AccountSettingsContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity
    style={[styles.accountSettingsContainer, style]}
    {...rest}
  />
);

const AccountSettingsArrowContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.accountSettingsArrowContainer, style]} {...rest} />
);

const staticStyles = {
  iconContainer: {marginTop: 36},
  view: {marginTop: 16},
  innerView: {marginTop: 10, marginBottom: 10},
  row: {justifyContent: 'center' as const, flexWrap: 'wrap' as const, gap: 10},
  sheetContainer: {paddingLeft: 16, paddingRight: 16},
  title: {textAlign: 'center' as const, fontWeight: '400' as const},
  link: {fontSize: 12},
  accountRow: {alignItems: 'center' as const, gap: 8, display: 'flex' as const},
  currencyImageContainer: {height: 30, width: 30},
  chainImage: {marginRight: -5},
};

const transformErrorMessage = (error: string) => {
  const NETWORK_ERROR_PREFIX =
    "Non conforming namespaces. approve() namespaces chains don't satisfy required namespaces.";

  const EVENTS_ERROR_PREFIX =
    "Non conforming namespaces. approve() namespaces events don't satisfy namespace events for eip155:1";

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
  }
  if (error.includes(EVENTS_ERROR_PREFIX)) {
    const transformedMessage =
      'Events compatibility issue. The current supported events are insufficient to fulfill the requirements of the DApp.';
    return transformedMessage;
  } else {
    return error;
  }
};

const WalletConnectStartModalContent = memo(() => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const navigation = useNavigation();
  const theme = useTheme();
  const showWalletConnectStartModal = useAppSelector(
    ({APP}) => APP.showWalletConnectStartModal,
  );
  const [buttonState, setButtonState] = useState<ButtonState>();
  const pendingProposal = useAppSelector(
    ({WALLET_CONNECT_V2}) => WALLET_CONNECT_V2.proposal,
  );
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const [
    showAccountWCV2SelectionBottomModal,
    setShowAccountWCV2SelectionBottomModal,
  ] = useState<boolean>(false);
  const [selectedWallets, setSelectedWallets] = useState<
    {
      chain: string;
      address: string;
      network: string;
      supportedChain: string[];
    }[]
  >([]);
  const [chainsSelected, setChainsSelected] =
    useState<{chain: string; network: string}[]>();
  const [chainNames, setChainNames] = useState<string[]>([]);
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const [allKeys, setAllkeys] = useState<KeyWalletsRowProps[]>();
  const [imageError, setImageError] = useState(false);
  const [checkedAccount, setCheckedAccount] = useState<
    AccountRowProps & {checked?: boolean}
  >();
  const [availableAccountLength, setAvailableAccountsLength] =
    useState<number>(0);
  const [customErrorMessageData, setCustomErrorMessageData] = useState<
    BottomNotificationConfig | undefined
  >();

  const proposalData = useMemo(() => {
    const p = pendingProposal as AuthOrProp | undefined;
    if (!p) return {};

    let id: number;
    let params: AuthTypes.AuthRequestEventArgs | ProposalTypes.Struct;
    let proposal: AuthEvt | ProposalEvt;
    let verifyContext: any;
    let pairingTopic: string;
    let authPayload: AuthTypes.PayloadParams | undefined;
    let proposer:
      | {
          publicKey: string;
          metadata: SignClientTypes.Metadata;
        }
      | undefined;
    let relays: RelayerTypes.ProtocolOptions[] | undefined;
    let requiredNamespaces: ProposalTypes.RequiredNamespaces | undefined;
    let optionalNamespaces: ProposalTypes.OptionalNamespaces | undefined;
    let metadata: CoreTypes.Metadata | AuthTypes.Metadata | undefined;

    if (p && 'authPayload' in p.params) {
      proposal = p as AuthEvt;
      params = proposal.params as AuthTypes.AuthRequestEventArgs;
      ({id, verifyContext} = p);
      pairingTopic = proposal.topic;
      authPayload = proposal.params.authPayload;
      metadata = proposal.params.requester?.metadata;
    } else {
      proposal = p as ProposalEvt;
      params = proposal.params as ProposalTypes.Struct;
      ({id, verifyContext} = proposal);
      pairingTopic = proposal.params.pairingTopic;
      proposer = proposal.params.proposer;
      relays = proposal.params.relays;
      requiredNamespaces = proposal.params.requiredNamespaces;
      optionalNamespaces = proposal.params.optionalNamespaces;
      metadata = proposer?.metadata;
    }

    const peerName = metadata?.name;
    const peerUrl = metadata?.url;
    const peerImg = metadata?.icons?.[0];

    return {
      id,
      params,
      proposal,
      verifyContext,
      pairingTopic,
      authPayload,
      proposer,
      relays,
      requiredNamespaces,
      optionalNamespaces,
      metadata,
      peerName,
      peerUrl,
      peerImg,
    };
  }, [pendingProposal]);

  const approveSessionProposal = useCallback(async () => {
    try {
      setButtonState('loading');
      const {
        params,
        authPayload,
        id,
        pairingTopic,
        proposal,
        relays,
        verifyContext,
      } = proposalData;

      if (!params) return;

      if ('authPayload' in params) {
        const authPromises: Promise<AuthTypes.Cacao | null>[] = [];
        const accounts: string[] = [];
        const chains: string[] = [];

        for (const selectedWallet of selectedWallets) {
          for (const chain of selectedWallet.supportedChain) {
            const iss = `${chain}:${selectedWallet.address}`;
            accounts.push(iss);
            chains.push(chain);
            authPromises.push(
              (async () => {
                try {
                  const wallet = findWalletByAddress(
                    selectedWallet.address,
                    selectedWallet.chain,
                    selectedWallet.network,
                    keys,
                  );
                  if (!wallet) {
                    throw new Error(
                      `Wallet not found for address ${selectedWallet.address} on chain ${chain} and network ${selectedWallet.network}`,
                    );
                  }

                  const message = formatAuthMessage({
                    authPayload: authPayload!,
                    iss,
                  });
                  const privKey = (await dispatch<any>(
                    getPrivKey(wallet),
                  )) as string;
                  const signer = new ethers.Wallet(Buffer.from(privKey, 'hex'));
                  const eth_signedMessage = await signer.signMessage(message);

                  return buildAuthObject(
                    authPayload!,
                    {t: 'eip191', s: eth_signedMessage},
                    iss,
                  );
                } catch (err) {
                  const errMsg =
                    err instanceof Error ? err.message : JSON.stringify(err);
                  logger.error(
                    'Error during authentication approval: ' + errMsg,
                  );
                  return null;
                }
              })(),
            );
          }
        }

        const auths = (await Promise.all(authPromises)).filter(
          (a): a is AuthTypes.Cacao => a !== null,
        );
        const uniqueChains = [...new Set(chains)];
        dispatch(
          walletConnectV2approveSessionAuthenticateProposal(
            id,
            pairingTopic,
            params,
            auths,
            accounts,
            uniqueChains,
            verifyContext,
          ),
        );
      } else if (selectedWallets && proposal) {
        const accounts: string[] = [];
        const chains: string[] = [];
        selectedWallets.forEach(selectedWallet => {
          selectedWallet.supportedChain.forEach(chain => {
            accounts.push(`${chain}:${selectedWallet.address}`);
            chains.push(chain);
          });
        });
        // Remove duplicate values from chains array
        const uniqueChains = [...new Set(chains)];
        const namespaces: SessionTypes.Namespaces = buildApprovedNamespaces({
          proposal: params,
          supportedNamespaces: {
            ...(uniqueChains.some(chain => chain.startsWith('eip155')) && {
              eip155: {
                chains: uniqueChains,
                methods: Object.values(EIP155_SIGNING_METHODS),
                events: WC_EVENTS,
                accounts,
              },
            }),
            ...(uniqueChains.some(chain => chain.startsWith('solana')) && {
              solana: {
                chains: uniqueChains,
                methods: Object.values(SOLANA_SIGNING_METHODS),
                events: WC_EVENTS,
                accounts,
              },
            }),
          },
        });
        if (id && relays) {
          await dispatch(
            walletConnectV2ApproveSessionProposal(
              id,
              relays[0].protocol,
              namespaces,
              pairingTopic!,
              params,
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
          index: 1,
          routes: [
            {
              name: RootStacks.TABS,
              params: {screen: getNavigationTabName()},
            },
            {
              name: WalletConnectScreens.WC_CONNECTIONS,
              params: {showSuccessPopup: true},
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
  }, [proposalData, selectedWallets, dispatch, navigation, t, keys]);

  const _setSelectedWallets = useCallback((_allKeys: KeyWalletsRowProps[]) => {
    const selectedWallets: {
      chain: string;
      address: string;
      network: string;
      supportedChain: string[];
    }[] = [];
    _allKeys &&
      _allKeys.forEach((key: KeyWalletsRowProps) => {
        key.accounts.forEach(
          (account: AccountRowProps & {checked?: boolean}) => {
            account.wallets.forEach((wallet: WalletRowProps) => {
              const {checked} = account;
              const {receiveAddress, chain, network} = wallet;
              if (checked && receiveAddress) {
                const _supportedChains: string[] = Object.entries(
                  WALLET_CONNECT_SUPPORTED_CHAINS,
                )
                  .filter(
                    ([, value]) =>
                      value.chain === chain && value.network === network,
                  )
                  .map(([key]) => key);
                if (_supportedChains.length > 0) {
                  selectedWallets.push({
                    address: receiveAddress,
                    chain,
                    network,
                    supportedChain: _supportedChains,
                  });
                }
              }
            });
          },
        );
      });
    setSelectedWallets(selectedWallets);
    setButtonState(undefined);
  }, []);

  const _setAllKeysAndSelectedWallets = useCallback(
    (
      chainsSelected?: {chain: string; network: string}[],
      authPayload?: {chains: string[]},
    ) => {
      let accountChecked = false;
      const formattedKeys = Object.values(keys)
        .map(key => {
          const filteredWallets = key.wallets.filter(
            ({chain, currencyAbbreviation, network}) => {
              if (chainsSelected) {
                return chainsSelected.some(
                  selected =>
                    chain === selected.chain &&
                    network === selected.network &&
                    !IsERCToken(currencyAbbreviation, chain),
                );
              }
              if (authPayload) {
                return authPayload.chains.some(
                  selected =>
                    chain === WC_SUPPORTED_CHAINS[selected]?.chainName &&
                    network === WC_SUPPORTED_CHAINS[selected]?.network &&
                    !IsERCToken(currencyAbbreviation, chain),
                );
              }
              return true;
            },
          );
          const accountList = buildAccountList(
            key,
            defaultAltCurrency.isoCode,
            {},
            dispatch,
            {
              filterByCustomWallets: filteredWallets,
              skipFiatCalculations: true,
            },
          ) as AccountRowProps[];
          const accounts = accountList.map((account, accountListIndex) => ({
            ...account,
            checked: accountListIndex === 0 && !accountChecked,
          })) as (AccountRowProps & {checked?: boolean})[];

          if (accounts.length === 0) {
            return null;
          }
          accountChecked = true;
          return {
            key: key.id,
            keyName: key.keyName || 'My Key',
            backupComplete: key.backupComplete,
            accounts,
          };
        })
        .filter(item => item !== null) as KeyWalletsRowProps[];
      setAllkeys(formattedKeys);
      const availableAccountsLength = formattedKeys.reduce(
        (total, key) => total + key?.accounts?.length || 0,
        0,
      );
      setAvailableAccountsLength(availableAccountsLength);
      setCheckedAccount(formattedKeys[0]?.accounts[0]);
      _setSelectedWallets(formattedKeys);
    },
    [keys, defaultAltCurrency.isoCode, dispatch, _setSelectedWallets],
  );

  useEffect(() => {
    if (showWalletConnectStartModal) {
      _setAllKeysAndSelectedWallets(chainsSelected, proposalData.authPayload);
    }
  }, [
    chainsSelected,
    showWalletConnectStartModal,
    proposalData.authPayload,
    _setAllKeysAndSelectedWallets,
  ]);

  const _setChainsSelected = useCallback(
    (
      requiredNamespaces: ProposalTypes.RequiredNamespaces | undefined,
      optionalNamespaces: ProposalTypes.OptionalNamespaces | undefined,
    ) => {
      const chains: {chain: string; network: string}[] = [];
      const allNamespaces = {
        ...(requiredNamespaces || {}),
        ...(optionalNamespaces || {}),
      };
      Object.keys(allNamespaces).forEach(key => {
        const requiredChains = requiredNamespaces?.[key]?.chains || [];
        const optionalChains = optionalNamespaces?.[key]?.chains || [];
        const combinedChains = [
          ...new Set([...requiredChains, ...optionalChains]),
        ];
        combinedChains.map(chainId => {
          const chainInfo = WALLET_CONNECT_SUPPORTED_CHAINS[chainId];
          if (chainInfo) {
            chains.push(chainInfo);
          }
        });
      });
      const seen = new Set<string>();
      const uniqueChains = chains.filter(({chain, network}) => {
        const key = `${chain}-${network}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
      const chainNames = [...new Set(uniqueChains.map(({chain}) => chain))];
      setChainsSelected(uniqueChains);
      setChainNames(chainNames);
    },
    [],
  );

  useEffect(() => {
    if (showWalletConnectStartModal) {
      _setChainsSelected(
        proposalData.requiredNamespaces,
        proposalData.optionalNamespaces,
      );
    }
  }, [
    proposalData.requiredNamespaces,
    proposalData.optionalNamespaces,
    showWalletConnectStartModal,
    _setChainsSelected,
  ]);

  const onBackdropPress = useCallback(() => {
    dispatch(dismissWalletConnectStartModal());
    if (proposalData.proposal) {
      dispatch(walletConnectV2RejectSessionProposal(proposalData.proposal.id));
    }
  }, [dispatch, proposalData.proposal]);

  const handleOpenUrl = useCallback(() => {
    haptic('impactLight');
    dispatch(openUrlWithInAppBrowser(proposalData.peerUrl));
  }, [dispatch, proposalData.peerUrl]);

  const handleShowAccountSelection = useCallback(() => {
    setShowAccountWCV2SelectionBottomModal(true);
  }, []);

  const handleCancel = useCallback(() => {
    haptic('impactLight');
    if (proposalData.proposal) {
      dispatch(dismissWalletConnectStartModal());
      dispatch(walletConnectV2RejectSessionProposal(proposalData.proposal.id));
    }
  }, [dispatch, proposalData.proposal]);

  const handleApprove = useCallback(() => {
    haptic('impactLight');
    approveSessionProposal();
  }, [approveSessionProposal]);

  const handleAccountPress = useCallback(
    (account: AccountRowProps & {checked?: boolean}) => {
      const _allKeys = allKeys?.map(key => ({
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
      _setSelectedWallets(_allKeys || []);
    },
    [allKeys, _setSelectedWallets],
  );

  const validationInfo = useMemo(() => {
    if (!proposalData.verifyContext) return null;

    let bgColor = '';
    let textColor = '';
    let text = '';
    let Icon = null;

    if (proposalData.verifyContext?.verified?.isScam) {
      bgColor = Caution25;
      textColor = Caution;
      text = t('Scam Domain');
      Icon = InvalidDomainSvg;
    } else {
      switch (proposalData.verifyContext.verified.validation) {
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
    }

    return {bgColor, textColor, text, Icon};
  }, [proposalData.verifyContext, t]);

  const bannerInfo = useMemo(() => {
    if (!proposalData.verifyContext) return null;

    let text = '';
    let type = '';
    let title = '';
    let VerifyIcon: React.FC<SvgProps> | null = null;

    if (proposalData.verifyContext?.verified?.isScam) {
      VerifyIcon = InvalidDomainSvg;
      text = t("The application's domain has been flagged as a scam.");
      type = 'error';
      title = t('Security Risk');
    } else {
      switch (proposalData.verifyContext.verified.validation) {
        case 'UNKNOWN':
          VerifyIcon = WarningOutlineSvg;
          text = t('The domain sending the request cannot be verified.');
          type = 'warning';
          title = t('Unknown Domain');
          break;
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
    }

    return {text, type, title, VerifyIcon};
  }, [proposalData.verifyContext, t]);

  return (
    <SheetModal
      isVisible={showWalletConnectStartModal}
      onBackdropPress={onBackdropPress}>
      <SheetContainer paddingHorizontal={0} style={staticStyles.sheetContainer}>
        <RNScrollView>
          <IconContainer style={staticStyles.iconContainer}>
            {proposalData.peerImg && !imageError ? (
              <FastImage
                style={styles.icon}
                source={{
                  uri: proposalData.peerImg,
                  priority: FastImage.priority.normal,
                }}
                resizeMode={FastImage.resizeMode.cover}
                onError={() => setImageError(true)}
              />
            ) : (
              <DefaultImage width={80} height={80} />
            )}
          </IconContainer>
          <View style={staticStyles.view}>
            {proposalData.peerName && proposalData.peerUrl && (
              <View>
                <View style={staticStyles.innerView}>
                  <TitleContainer>
                    <H3 style={staticStyles.title}>
                      {proposalData.peerName +
                        t(' wants to connect to your wallet')}
                    </H3>
                  </TitleContainer>
                  <Row style={staticStyles.row}>
                    <UriContainerTouchable onPress={handleOpenUrl}>
                      <UriContainer>
                        <Link style={staticStyles.link}>
                          {proposalData.peerUrl}
                        </Link>
                        <ExternalLinkSvg width={12} />
                      </UriContainer>
                    </UriContainerTouchable>
                    {validationInfo && (
                      <ValidationContainer bgColor={validationInfo.bgColor}>
                        <ValidationText textColor={validationInfo.textColor}>
                          {validationInfo.text}
                        </ValidationText>
                        <validationInfo.Icon />
                      </ValidationContainer>
                    )}
                  </Row>
                  {bannerInfo && (
                    <Banner
                      height={100}
                      type={bannerInfo.type}
                      title={bannerInfo.title}
                      description={bannerInfo.text}
                      hasBackgroundColor={true}
                      icon={bannerInfo.VerifyIcon}
                    />
                  )}
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
                      <View
                        key={index.toString()}
                        style={staticStyles.chainImage}>
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
                    {t('Account')}
                  </H7>
                  <DescriptionItemContainer>
                    {allKeys && allKeys[0]?.accounts[0] && checkedAccount ? (
                      <AccountSettingsContainer
                        activeOpacity={ActiveOpacity}
                        onPress={handleShowAccountSelection}>
                        <Row style={staticStyles.accountRow}>
                          <CurrencyImageContainer
                            style={staticStyles.currencyImageContainer}>
                            <Blockie
                              size={30}
                              seed={checkedAccount.receiveAddress}
                            />
                          </CurrencyImageContainer>
                          <H6
                            medium={true}
                            ellipsizeMode="tail"
                            numberOfLines={1}>
                            {checkedAccount.accountName}
                          </H6>
                        </Row>
                        {availableAccountLength > 1 ? (
                          <AccountSettingsArrowContainer>
                            <BaseText
                              style={{
                                fontSize: 16,
                                color: theme.dark ? White : SlateDark,
                              }}>
                              (+{availableAccountLength - 1})
                            </BaseText>
                            <SelectorArrowRight
                              {...{
                                width: 13,
                                height: 13,
                                color: theme.dark ? White : Slate,
                              }}
                            />
                          </AccountSettingsArrowContainer>
                        ) : (
                          <View>
                            <SelectorArrowRight
                              {...{
                                width: 13,
                                height: 13,
                                color: theme.dark ? White : Slate,
                              }}
                            />
                          </View>
                        )}
                      </AccountSettingsContainer>
                    ) : (
                      <DescriptionItemContainer>
                        <WarningBrownSvg />
                        <DescriptionItem>
                          {t(
                            "No compatible accounts found for the DApp's supported networks",
                          )}
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
                  touchableLibrary={'react-native'}
                  onPress={handleApprove}>
                  {t('Connect')}
                </Button>
              </ActionContainer>
              <ActionContainer>
                <Button
                  buttonStyle="secondary"
                  touchableLibrary={'react-native'}
                  onPress={handleCancel}>
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
              allKeys={allKeys as KeyWalletsRowWithChecked[]}
              onPress={handleAccountPress}
            />
          ) : null}

          {customErrorMessageData ? (
            <WCErrorBottomNotification
              {...customErrorMessageData}
              isVisible={!!customErrorMessageData}
            />
          ) : null}
        </RNScrollView>
      </SheetContainer>
    </SheetModal>
  );
});

export const WalletConnectStartModal = memo(() => {
  const isVisible = useAppSelector(({APP}) => APP.showWalletConnectStartModal);

  return isVisible ? <WalletConnectStartModalContent /> : null;
});
