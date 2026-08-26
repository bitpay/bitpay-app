import {
  RouteProp,
  useNavigation,
  useRoute,
  useTheme,
} from '@react-navigation/native';
import {useTheme as useStyledTheme} from '../../../contexts';
import {
  CurrencyColumn,
  CurrencyImageContainer,
  Row,
  RowContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {
  Link,
  H5,
  HeaderTitle,
  ListItemSubText,
} from '../../../components/styled/Text';
import {
  useAppDispatch,
  useAppSelector,
  useLatestCallback,
} from '../../../utils/hooks';
import {WalletGroupParamList} from '../WalletGroup';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {useLogger} from '../../../utils/hooks/useLogger';
import {
  Key,
  TransactionProposal,
  Wallet,
  TSSSigningStatus,
  TSSSigningProgress,
} from '../../../store/wallet/wallet.models';
import {
  RefreshControl,
  SafeAreaView,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import TransactionProposalRow from '../../../components/list/TransactionProposalRow';
import {Air, LightBlack, SlateDark, White} from '../../../styles/colors';
import {formatCurrencyAbbreviation, sleep} from '../../../utils/helper-methods';
import {findWalletById} from '../../../store/wallet/utils/wallet';
import {useTranslation} from 'react-i18next';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {startGetRates} from '../../../store/wallet/effects';
import {
  startUpdateAllWalletStatusForKeys,
  startUpdateAllWalletStatusForReadOnlyKeys,
} from '../../../store/wallet/effects/status/status';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {
  BalanceUpdateError,
  CustomErrorMessage,
  WrongPasswordError,
} from '../components/ErrorMessages';
import Checkbox from '../../../components/checkbox/Checkbox';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import SwipeButton from '../../../components/swipe-button/SwipeButton';
import {publishAndSignMultipleProposals} from '../../../store/wallet/effects/send/send';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {TransactionIcons} from '../../../constants/TransactionIcons';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import haptic from '../../../components/haptic-feedback/haptic';
import {usePaymentSent} from '../../../contexts';
import {
  isTSSWallet,
  joinTSSSigningSession,
} from '../../../store/wallet/effects/tss-send/tss-send';
import TSSProgressTracker from '../components/TSSProgressTracker';
import {useTSSCallbacks} from '../../../utils/hooks/useTSSCalbacks';
import {
  buildTransactionProposalNotificationSections,
  GroupedTxpsByWallet,
} from './transactionProposalNotificationsModel';

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  notificationsContainer: {
    flex: 1,
  },
  listHeaderPadding: {
    padding: 10,
    marginTop: 10,
  },
  transactionSectionHeaderContainer: {
    padding: gutter,
    height: 55,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  borderBottom: {
    borderBottomWidth: 1,
  },
  proposalsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkBoxContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    paddingRight: 10,
  },
  enabledRow: {
    opacity: 1,
  },
  listFooter: {
    marginBottom: 20,
  },
});

const NotificationsContainer: React.FC<
  React.ComponentProps<typeof SafeAreaView>
> = ({style, ...rest}) => (
  <SafeAreaView style={[styles.notificationsContainer, style]} {...rest} />
);

const ListHeaderPadding: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.listHeaderPadding, style]} {...rest} />;

const TransactionSectionHeaderContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => {
  const theme = useStyledTheme();
  return (
    <View
      style={[
        styles.transactionSectionHeaderContainer,
        {backgroundColor: theme.dark ? LightBlack : '#F5F6F7'},
        style,
      ]}
      {...rest}
    />
  );
};

const BorderBottom: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useStyledTheme();
  return (
    <View
      style={[
        styles.borderBottom,
        {borderBottomColor: theme.dark ? LightBlack : Air},
        style,
      ]}
      {...rest}
    />
  );
};

const ListFooterBorder = () => (
  <View style={styles.listFooter}>
    <BorderBottom />
  </View>
);

const ProposalsContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.proposalsContainer, style]} {...rest} />
);

const CheckBoxContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.checkBoxContainer, style]} {...rest} />;

const NotificationsHeaderTitle = ({children}: {children: string}) => (
  <HeaderTitle>{children}</HeaderTitle>
);

const countSuccessAndFailed = (arrayData: (TransactionProposal | Error)[]) => {
  const count = {success: 0, failed: 0};
  arrayData.forEach((data: TransactionProposal | Error) => {
    if (data instanceof Error) {
      count.failed += 1;
    } else if (data?.id) {
      count.success += 1;
    }
  });
  return count;
};

const TransactionProposalNotifications = () => {
  const {
    params: {walletId, keyId},
  } =
    useRoute<
      RouteProp<WalletGroupParamList, 'TransactionProposalNotifications'>
    >();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const logger = useLogger();
  const keys = useAppSelector(({WALLET}) => WALLET.keys) as Record<string, Key>;
  const contactList = useAppSelector(({CONTACT}) => CONTACT.list);
  const wallets = useMemo<Wallet[]>(
    () =>
      keyId
        ? keys[keyId]?.wallets || []
        : Object.values(keys).flatMap(key => key.wallets),
    [keyId, keys],
  );
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectingProposalsWalletId, setSelectingProposalsWalletId] =
    useState('');
  const [txpsToSign, setTxpsToSign] = useState([] as TransactionProposal[]);
  const {showPaymentSent, hidePaymentSent} = usePaymentSent();

  const [showTSSProgressModal, setShowTSSProgressModal] = useState(false);
  const [tssStatus, setTssStatus] = useState<TSSSigningStatus>(
    'waiting_for_cosigners',
  );
  const [tssProgress, setTssProgress] = useState<TSSSigningProgress>({
    currentRound: 0,
    totalRounds: 4,
    status: 'pending',
  });
  const [tssCopayers, setTssCopayers] = useState<
    Array<{id: string; name: string; signed: boolean}>
  >([]);

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const currentWallet = useMemo(() => {
    if (selectingProposalsWalletId) {
      return findWalletById(wallets, selectingProposalsWalletId) as Wallet;
    }
    return null;
  }, [selectingProposalsWalletId, wallets]);

  const tssCallbacks = useTSSCallbacks({
    setTssStatus,
    setTssProgress,
    setTssCopayers,
    tssCopayers,
    setShowTSSProgressModal,
    setResetSwipeButton,
  });

  const pendingTxps = useMemo(
    () =>
      wallets
        .filter(
          wallet =>
            !walletId ||
            wallet.id === walletId ||
            wallet.credentials?.walletId === walletId,
        )
        .flatMap(wallet => wallet.pendingTxps || []),
    [walletId, wallets],
  );
  const allTxps = useMemo(
    () =>
      buildTransactionProposalNotificationSections({
        keys,
        wallets,
        walletId,
        translate: t,
      }),
    [keys, t, walletId, wallets],
  );
  const txpChecked = useMemo(
    () =>
      txpsToSign.reduce<Record<string, boolean>>((checkedById, proposal) => {
        checkedById[proposal.id] = true;
        return checkedById;
      }, {}),
    [txpsToSign],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('Notifications'),
      headerTitle: NotificationsHeaderTitle,
    });
  }, [navigation, t]);

  useEffect(() => {
    if (!allTxps.length && navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [allTxps.length, navigation]);

  const onPressTxp = useLatestCallback(
    (transaction: TransactionProposal, fullWalletObj: Wallet) => {
      const key = keys[fullWalletObj.keyId];
      navigation.navigate('TransactionProposalDetails', {
        walletId: fullWalletObj.id,
        transactionId: transaction.id,
        keyId: key.id,
      });
    },
  );

  const txpSelectAll = useCallback(
    (txps: TransactionProposal[], selectedWalletId: string) => {
      const allAreSelected =
        selectingProposalsWalletId === selectedWalletId &&
        txps.length > 0 &&
        txps.every(txp => txpChecked[txp.id]);

      if (allAreSelected) {
        setSelectingProposalsWalletId('');
        setTxpsToSign([]);
      } else {
        setSelectingProposalsWalletId(selectedWalletId);
        setTxpsToSign(txps);
      }
    },
    [selectingProposalsWalletId, txpChecked],
  );

  const txpSelectionChange = useCallback(
    (txp: TransactionProposal, selectedWalletId: string) => {
      const wallet = findWalletById(wallets, selectedWalletId) as Wallet;
      if (!wallet) {
        return;
      }

      const isSelected =
        selectingProposalsWalletId === selectedWalletId &&
        txpsToSign.some(txpToSign => txpToSign.id === txp.id);

      let nextSelection: TransactionProposal[];
      if (isSelected) {
        nextSelection = txpsToSign.filter(txpToSign => txpToSign.id !== txp.id);
      } else if (
        selectingProposalsWalletId !== selectedWalletId ||
        isTSSWallet(wallet)
      ) {
        nextSelection = [txp];
      } else {
        nextSelection = [...txpsToSign, txp];
      }

      setSelectingProposalsWalletId(
        nextSelection.length ? selectedWalletId : '',
      );
      setTxpsToSign(nextSelection);
    },
    [selectingProposalsWalletId, txpsToSign, wallets],
  );

  const renderTxpByWallet = useCallback(
    ({item}: {item: GroupedTxpsByWallet}) => {
      const fullWalletObj = findWalletById(wallets, item.walletId) as Wallet;
      if (!fullWalletObj) {
        return null;
      }

      const {
        img,
        badgeImg,
        currencyAbbreviation,
        currencyName,
        keyId: walletKeyId,
        credentials: {walletName, m, n},
        tssMetadata,
      } = fullWalletObj;

      const isTSS = isTSSWallet(fullWalletObj);

      return (
        <>
          <RowContainer disabled={true} style={styles.enabledRow}>
            <CurrencyImageContainer>
              <CurrencyImage img={img} size={45} badgeUri={badgeImg} />
            </CurrencyImageContainer>
            <CurrencyColumn>
              <Row>
                <H5 ellipsizeMode="tail" numberOfLines={1}>
                  {walletName || currencyName}
                </H5>
              </Row>
              <ListItemSubText>
                {formatCurrencyAbbreviation(currencyAbbreviation)}{' '}
                {isTSS && tssMetadata
                  ? `- Threshold ${tssMetadata.m}/${tssMetadata.n}`
                  : n > 1
                  ? `- Multisig ${m}/${n}`
                  : null}
                {walletKeyId.includes('readonly') ? '- Read Only' : null}
              </ListItemSubText>
            </CurrencyColumn>
            {item.needSign && item.txps.length > 1 && !isTSS ? (
              <TouchableOpacity
                onPress={() => {
                  haptic('impactLight');
                  txpSelectAll(item.txps, fullWalletObj.id);
                }}>
                <Link>{t('Select All')}</Link>
              </TouchableOpacity>
            ) : null}
          </RowContainer>
          {item?.txps[0]
            ? item.txps.map((txp: any) => (
                <ProposalsContainer key={txp.id}>
                  <TransactionProposalRow
                    icon={TransactionIcons[txp.uiIcon]}
                    creator={txp.uiCreator}
                    time={txp.uiTime}
                    value={txp.uiValue || txp.feeStr}
                    message={txp.message}
                    onPressTransaction={() => onPressTxp(txp, fullWalletObj)}
                    hideIcon={true}
                    recipientCount={txp.recipientCount}
                    toAddress={txp.toAddress}
                    tokenAddress={txp.tokenAddress}
                    chain={txp.chain}
                    contactList={contactList}
                    withCheckBox={item.needSign}
                  />
                  {item.needSign ? (
                    <CheckBoxContainer>
                      <TouchableOpacity
                        touchableLibrary={'react-native-gesture-handler'}
                        onPress={() => {
                          txpSelectionChange(txp, fullWalletObj.id);
                        }}>
                        <Checkbox
                          checked={!!txpChecked[txp.id]}
                          onPress={() => {
                            logger.debug(
                              'Tx Proposal Notifications: checkbox clicked',
                            );
                          }}
                        />
                      </TouchableOpacity>
                    </CheckBoxContainer>
                  ) : null}
                </ProposalsContainer>
              ))
            : null}
        </>
      );
    },
    [
      contactList,
      logger,
      onPressTxp,
      t,
      txpChecked,
      txpSelectAll,
      txpSelectionChange,
      wallets,
    ],
  );

  const keyExtractor = useCallback((item: GroupedTxpsByWallet) => item.id, []);
  const renderSectionHeader = useCallback(
    ({section: {title}}: {section: {title: string}}) => (
      <TransactionSectionHeaderContainer>
        <H5>{title}</H5>
      </TransactionSectionHeaderContainer>
    ),
    [],
  );
  const renderItemSeparator = useCallback(() => <BorderBottom />, []);

  const updateWalletsWithProposals = useLatestCallback(async () => {
    const walletIdsWithProposals = new Set(
      pendingTxps.map(txp => txp.walletId),
    );
    const keyIdsWithProposals = new Set(
      wallets
        .filter(
          wallet =>
            walletIdsWithProposals.has(wallet.id) ||
            walletIdsWithProposals.has(wallet.credentials?.walletId),
        )
        .map(wallet => wallet.keyId),
    );
    const keysWithProposals = Array.from(keyIdsWithProposals)
      .map(proposalKeyId => keys[proposalKeyId])
      .filter((key): key is Key => !!key);
    const readOnlyKeys = keysWithProposals.filter(key => key.isReadOnly);
    const writableKeys = keysWithProposals.filter(key => !key.isReadOnly);

    await Promise.all([
      writableKeys.length
        ? dispatch(
            startUpdateAllWalletStatusForKeys({
              keys: writableKeys,
              force: true,
            }),
          )
        : Promise.resolve(),
      readOnlyKeys.length
        ? dispatch(
            startUpdateAllWalletStatusForReadOnlyKeys({
              readOnlyKeys,
              force: true,
            }),
          )
        : Promise.resolve(),
    ]);
  });

  const onRefresh = useLatestCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(startGetRates({})),
        updateWalletsWithProposals(),
      ]);
    } catch {
      dispatch(showBottomNotificationModal(BalanceUpdateError()));
    } finally {
      setRefreshing(false);
    }
  });

  const onCloseModal = useLatestCallback(() => {
    hidePaymentSent();
  });

  useEffect(() => {
    if (!resetSwipeButton) {
      return;
    }
    const timer = setTimeout(() => {
      setResetSwipeButton(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [resetSwipeButton]);

  return (
    <NotificationsContainer>
      {currentWallet && isTSSWallet(currentWallet) ? (
        <TSSProgressTracker
          status={tssStatus}
          progress={tssProgress}
          createdBy={currentWallet.walletName || 'You'}
          date={
            new Date(
              (txpsToSign[0]?.createdOn ??
                txpsToSign[0]?.time ??
                Date.now() / 1000) * 1000,
            )
          }
          wallet={currentWallet}
          copayers={tssCopayers}
          onCopayersInitialized={setTssCopayers}
          isModalVisible={showTSSProgressModal}
          onModalVisibilityChange={setShowTSSProgressModal}
          hideTracker={true}
          txpCreatorId={txpsToSign[0]?.creatorId}
        />
      ) : null}
      <SectionList
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={ListHeaderPadding}
        sections={allTxps}
        stickySectionHeadersEnabled={true}
        keyExtractor={keyExtractor}
        renderItem={renderTxpByWallet}
        renderSectionHeader={renderSectionHeader}
        ItemSeparatorComponent={renderItemSeparator}
        ListFooterComponent={allTxps.length ? ListFooterBorder : null}
        maxToRenderPerBatch={15}
      />

      {txpsToSign.length ? (
        <SwipeButton
          title={t('Sign selected')}
          forceReset={resetSwipeButton}
          onSwipeComplete={async () => {
            try {
              const wallet = findWalletById(
                wallets,
                selectingProposalsWalletId,
              ) as Wallet;
              const key = keys[wallet.keyId];

              if (isTSSWallet(wallet)) {
                const txp = txpsToSign[0];
                await dispatch(
                  joinTSSSigningSession({
                    key,
                    wallet,
                    txp,
                    callbacks: tssCallbacks,
                    setShowTSSProgressModal,
                  }),
                );

                dispatch(
                  Analytics.track('Sent Crypto', {
                    context: 'Transaction Proposal Notifications',
                    coin: wallet.currencyAbbreviation || '',
                  }),
                );

                showPaymentSent({
                  onCloseModal,
                  title: t('Proposal signed'),
                });
              } else {
                const data = (await dispatch<any>(
                  publishAndSignMultipleProposals({
                    txps: txpsToSign,
                    key,
                    wallet,
                  }),
                )) as (TransactionProposal | Error)[];
                const count = countSuccessAndFailed(data);
                if (count.failed > 0) {
                  const errMsgs = [
                    `There was problem while trying to sign ${count.failed} of your transactions proposals. Please, try again`,
                  ];
                  data.forEach((element, index) => {
                    if (element instanceof Error) {
                      errMsgs.push(
                        `[ERROR ${index + 1}] ${BWCErrorMessage(element)}`,
                      );
                    }
                  });
                  await showErrorMessage(
                    CustomErrorMessage({
                      errMsg: errMsgs.join('\n\n'),
                      title: t('Uh oh, something went wrong'),
                    }),
                  );
                }

                if (count.success > 0) {
                  dispatch(
                    Analytics.track('Sent Crypto', {
                      context: 'Transaction Proposal Notifications',
                      coin: wallet.currencyAbbreviation || '',
                    }),
                  );
                  const title =
                    count.success > 1
                      ? t('proposals signed', {sucess: count.success})
                      : t('Proposal signed');
                  showPaymentSent({
                    onCloseModal,
                    title,
                  });
                }
              }
              setSelectingProposalsWalletId('');
              setTxpsToSign([]);
              setResetSwipeButton(true);
            } catch (err) {
              await sleep(500);
              setResetSwipeButton(true);
              switch (err) {
                case 'invalid password':
                  dispatch(showBottomNotificationModal(WrongPasswordError()));
                  break;
                case 'password canceled':
                  break;
                case 'biometric check failed':
                  break;
                case 'user denied transaction':
                  break;
                default:
                  await showErrorMessage(
                    CustomErrorMessage({
                      errMsg: BWCErrorMessage(err),
                      title: t('Uh oh, something went wrong'),
                    }),
                  );
              }
            }
          }}
        />
      ) : null}
    </NotificationsContainer>
  );
};

export default TransactionProposalNotifications;
