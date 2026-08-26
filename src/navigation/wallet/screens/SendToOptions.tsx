import React, {useCallback, useLayoutEffect, useMemo, useState} from 'react';
import {Keyboard, SafeAreaView, StyleSheet, View} from 'react-native';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {H5, H7, HeaderTitle} from '../../../components/styled/Text';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {WalletGroupParamList} from '../WalletGroup';
import SendToAddress from '../components/SendToAddress';
import SendToContact from '../components/SendToContact';
import {
  Recipient,
  TransactionOptionsContext,
  TxDetailsSendingTo,
  Wallet,
} from '../../../store/wallet/wallet.models';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {ActiveOpacity, Hr} from '../../../components/styled/Containers';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import WalletIcons from '../components/WalletIcons';
import _ from 'lodash';
import AmountModal from '../../../components/amount/AmountModal';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import {formatCurrencyAbbreviation, sleep} from '../../../utils/helper-methods';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {useAppDispatch} from '../../../utils/hooks';
import CustomTabBar from '../../../components/custom-tab-bar/CustomTabBar';
import {useOngoingProcess} from '../../../contexts';

const Tab = createMaterialTopTabNavigator();

export type SendToOptionsParamList = {
  title: string;
  wallet: Wallet;
  context: string;
  sendTo?: {
    name: string | undefined;
    type: string;
    address: string;
    destinationTag: number | undefined;
  };
};

const styles = StyleSheet.create({
  recipientRowContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 55,
  },
  recipientContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  recipientOptionsContainer: {
    justifyContent: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  importContainer: {
    flex: 1,
    marginTop: 10,
  },
});

export const RecipientRowContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.recipientRowContainer, style]} {...rest} />
);

export const RecipientContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.recipientContainer, style]} {...rest} />
);

const RecipientOptionsContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.recipientOptionsContainer, style]} {...rest} />
);

interface RecipientListProps {
  recipient: Recipient;
  wallet: Wallet;
  deleteRecipient: () => void;
  setAmount: () => void;
  context: string;
}

export const RecipientList: React.FC<RecipientListProps> = ({
  recipient,
  wallet,
  deleteRecipient,
  setAmount,
  context,
}) => {
  let recipientData: TxDetailsSendingTo;

  if (recipient?.type === 'contact') {
    recipientData = {
      recipientName: recipient?.name,
      recipientAddress: recipient?.address,
      img: recipient?.type,
    };
  } else {
    recipientData = {
      recipientName: recipient.name,
      recipientAddress: recipient.address,
      img: wallet?.img || wallet?.currencyAbbreviation,
    };
  }

  return (
    <>
      <RecipientRowContainer>
        <RecipientContainer>
          <CurrencyImage img={recipientData.img} size={20} />
          <H7
            numberOfLines={1}
            ellipsizeMode={'tail'}
            style={{marginLeft: 8, width: '60%'}}>
            {recipientData.recipientName || recipientData.recipientAddress}
          </H7>
        </RecipientContainer>
        <RecipientOptionsContainer>
          {context === 'multisend' ? (
            <TouchableOpacity
              activeOpacity={ActiveOpacity}
              onPress={() => {
                setAmount();
              }}>
              <H5>
                {recipient.amount +
                  ' ' +
                  formatCurrencyAbbreviation(wallet.currencyAbbreviation)}
              </H5>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={{marginLeft: 8}}
            activeOpacity={ActiveOpacity}
            onPress={() => deleteRecipient()}>
            <WalletIcons.Delete />
          </TouchableOpacity>
        </RecipientOptionsContainer>
      </RecipientRowContainer>
      <Hr />
    </>
  );
};

const ImportContainer: React.FC<React.ComponentProps<typeof SafeAreaView>> = ({
  style,
  ...rest
}) => <SafeAreaView style={[styles.importContainer, style]} {...rest} />;

interface SendToOptionsContextProps {
  recipientList: Recipient[];
  setRecipientListContext: (
    recipient: Recipient,
    index?: number,
    removeRecipient?: boolean,
    updateRecipient?: boolean,
    amount?: number,
  ) => void;
  setRecipientAmountContext: (
    recipient: Recipient,
    index?: number,
    updateRecipient?: boolean,
  ) => void;
  goToConfirmView: () => void;
  goToSelectInputsView: (recipient: Recipient) => void;
  sendTo?: {
    name: string | undefined;
    type: string;
    address: string;
    destinationTag: number | undefined;
  };
}

export const SendToOptionsContext =
  React.createContext<SendToOptionsContextProps>(
    {} as SendToOptionsContextProps,
  );

const SendToOptions = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const {params} = useRoute<RouteProp<WalletGroupParamList, 'SendToOptions'>>();
  const {wallet, sendTo} = params;
  const [recipientList, setRecipientList] = useState<Recipient[]>([]);
  const [recipientAmount, setRecipientAmount] = useState<{
    showModal: boolean;
    recipient?: Recipient;
    index?: number;
    updateRecipient?: boolean;
  }>({showModal: false});

  const setRecipientListContext = useCallback(
    (
      recipient: Recipient,
      index?: number,
      removeRecipient?: boolean,
      updateRecipient?: boolean,
    ) => {
      setRecipientList(currentRecipients => {
        const nextRecipients = [...currentRecipients];
        if (removeRecipient) {
          nextRecipients.splice(index!, 1);
        } else if (updateRecipient) {
          nextRecipients[index!] = recipient;
        } else {
          nextRecipients.push(recipient);
        }
        return nextRecipients;
      });
    },
    [],
  );

  const setRecipientAmountContext = useCallback(
    (recipient: Recipient, index?: number, updateRecipient?: boolean) => {
      if (recipient.amount && !updateRecipient) {
        setRecipientListContext(recipient);
      } else {
        Keyboard.dismiss();
        setRecipientAmount({
          showModal: true,
          recipient,
          index,
          updateRecipient,
        });
      }
    },
    [setRecipientListContext],
  );

  const goToConfirmView = useCallback(async () => {
    try {
      showOngoingProcess('LOADING');
      const amount = _.sumBy(recipientList, 'amount');
      const tx = {
        wallet,
        recipient: recipientList[0],
        recipientList,
        amount,
        context: 'multisend' as TransactionOptionsContext,
      };
      const {txDetails, txp} = (await dispatch<any>(
        createProposalAndBuildTxDetails(tx),
      )) as any;
      hideOngoingProcess();
      await sleep(500);
      navigation.navigate('Confirm', {
        wallet,
        recipient: recipientList[0],
        recipientList,
        txp,
        txDetails,
        amount,
      });
    } catch (err: any) {
      const errorMessageConfig = await dispatch(
        handleCreateTxProposalError(err),
      );
      hideOngoingProcess();
      await sleep(500);
      dispatch(
        showBottomNotificationModal({
          ...errorMessageConfig,
          enableBackdropDismiss: true,
        }),
      );
    }
  }, [
    dispatch,
    hideOngoingProcess,
    navigation,
    recipientList,
    showOngoingProcess,
    wallet,
  ]);

  const renderHeaderTitle = useCallback(
    () => <HeaderTitle>{params.title}</HeaderTitle>,
    [params.title],
  );
  const renderTabBar = useCallback(
    (props: React.ComponentProps<typeof CustomTabBar>) => (
      <CustomTabBar {...props} />
    ),
    [],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: renderHeaderTitle,
      headerTitleAlign: 'center',
    });
  }, [navigation, renderHeaderTitle]);

  const goToSelectInputsView = useCallback(
    (recipient: Recipient) => {
      navigation.navigate('SelectInputs', {
        recipient,
        wallet,
      });
    },
    [navigation, wallet],
  );

  const contextValue = useMemo(
    () => ({
      sendTo,
      recipientList,
      setRecipientListContext,
      setRecipientAmountContext,
      goToConfirmView,
      goToSelectInputsView,
    }),
    [
      goToConfirmView,
      goToSelectInputsView,
      recipientList,
      sendTo,
      setRecipientAmountContext,
      setRecipientListContext,
    ],
  );

  return (
    <SendToOptionsContext.Provider value={contextValue}>
      <ImportContainer>
        <Tab.Navigator
          tabBar={renderTabBar}
          screenOptions={{lazy: true, lazyPreloadDistance: 0}}>
          <Tab.Screen
            name={t('Addresses')}
            component={SendToAddress}
            initialParams={params}
          />
          <Tab.Screen
            name={t('Contacts')}
            component={SendToContact}
            initialParams={params}
          />
        </Tab.Navigator>
      </ImportContainer>

      <AmountModal
        isVisible={recipientAmount.showModal}
        cryptoCurrencyAbbreviation={params.wallet.currencyAbbreviation}
        chain={params.wallet.chain}
        onClose={() => {
          setRecipientAmount({showModal: false});
        }}
        onSubmit={amount => {
          setRecipientAmount({showModal: false});
          setRecipientListContext(
            {...recipientAmount.recipient!, amount},
            recipientAmount.index,
            false,
            recipientAmount.updateRecipient,
          );
        }}
      />
    </SendToOptionsContext.Provider>
  );
};

export default SendToOptions;
