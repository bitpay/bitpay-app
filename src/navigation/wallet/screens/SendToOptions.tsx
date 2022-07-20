import React, {useLayoutEffect, useState} from 'react';
import styled from 'styled-components/native';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {ScreenOptions} from '../../../styles/tabNavigator';
import {H5, H7, HeaderTitle} from '../../../components/styled/Text';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {WalletStackParamList} from '../WalletStack';
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
import {TouchableOpacity} from 'react-native';
import WalletIcons from '../components/WalletIcons';
import _ from 'lodash';
import AmountModal from '../components/AmountModal';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import {sleep} from '../../../utils/helper-methods';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import {useAppDispatch} from '../../../utils/hooks';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';

export type SendToOptionsParamList = {
  title: string;
  wallet: Wallet;
  context: string;
};

export const RecipientRowContainer = styled.View`
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
  height: 55px;
`;

export const RecipientContainer = styled.View`
  flex-direction: row;
  flex: 1;
`;

const RecipientOptionsContainer = styled.View`
  justify-content: flex-end;
  flex-direction: row;
  align-items: center;
  flex: 1;
`;

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
      img: wallet?.img || wallet?.credentials.coin,
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
                  wallet.currencyAbbreviation.toUpperCase()}
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

const ImportContainer = styled.SafeAreaView`
  flex: 1;
  margin-top: 10px;
`;

interface SendToOptionsContextProps {
  recipientList: Recipient[];
  setRecipientListContext: (
    recipient: Recipient,
    removeRecipient?: boolean,
    updateRecipient?: boolean,
    amount?: number,
  ) => void;
  setRecipientAmountContext: (
    recipient: Recipient,
    updateRecipient?: boolean,
  ) => void;
  goToConfirmView: () => void;
  goToSelectInputsView: (recipient: Recipient) => void;
}

export const SendToOptionsContext =
  React.createContext<SendToOptionsContextProps>(
    {} as SendToOptionsContextProps,
  );

const SendToOptions = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const Tab = createMaterialTopTabNavigator();
  const navigation = useNavigation();
  const {params} = useRoute<RouteProp<WalletStackParamList, 'SendToOptions'>>();
  const {wallet} = params;
  const [recipientList, setRecipientList] = useState<Recipient[]>([]);
  const [recipientAmount, setRecipientAmount] = useState<{
    showModal: boolean;
    recipient?: Recipient;
    updateRecipient?: boolean;
  }>({showModal: false});

  const setRecipientListContext = (
    recipient: Recipient,
    removeRecipient?: boolean,
    updateRecipient?: boolean,
  ) => {
    setRecipientList(prev => {
      let newRecipientList: Recipient[] = [];
      if (removeRecipient) {
        newRecipientList = prev.filter(r => r.address !== recipient.address);
      } else if (updateRecipient) {
        newRecipientList = prev.map(r =>
          r.address === recipient.address ? recipient : r,
        );
      } else if (params?.context === 'selectInputs') {
        newRecipientList = [recipient];
      } else {
        newRecipientList = [...prev, recipient];
      }
      return newRecipientList;
    });
  };

  const setRecipientAmountContext = (
    recipient: Recipient,
    updateRecipient?: boolean,
  ) => {
    setRecipientAmount({showModal: true, recipient, updateRecipient});
  };

  const goToConfirmView = async () => {
    try {
      dispatch(showOnGoingProcessModal(t(OnGoingProcessMessages.LOADING)));
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
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      navigation.navigate('Wallet', {
        screen: 'Confirm',
        params: {
          wallet,
          recipient: recipientList[0],
          recipientList,
          txp,
          txDetails,
          amount,
        },
      });
    } catch (err: any) {
      const errorMessageConfig = (
        await Promise.all([
          dispatch(handleCreateTxProposalError(err)),
          sleep(500),
        ])
      )[0];
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      dispatch(
        showBottomNotificationModal({
          ...errorMessageConfig,
          enableBackdropDismiss: false,
          actions: [
            {
              text: t('OK'),
              action: () => {},
            },
          ],
        }),
      );
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>{params.title}</HeaderTitle>,
      headerTitleAlign: 'center',
    });
  }, [navigation, t, params.title]);

  const goToSelectInputsView = (recipient: Recipient) => {
    navigation.navigate('Wallet', {
      screen: 'SelectInputs',
      params: {
        recipient,
        wallet,
      },
    });
  };

  return (
    <SendToOptionsContext.Provider
      value={{
        recipientList,
        setRecipientListContext,
        setRecipientAmountContext,
        goToConfirmView,
        goToSelectInputsView,
      }}>
      <ImportContainer>
        <Tab.Navigator screenOptions={{...ScreenOptions(150)}}>
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
        opts={{
          hideSendMax: true,
          currencyAbbreviation:
            params.wallet.currencyAbbreviation.toUpperCase(),
        }}
        onDismiss={(amount?: number) => {
          setRecipientAmount({showModal: false});
          if (amount) {
            setRecipientListContext(
              {...recipientAmount.recipient!, amount},
              false,
              recipientAmount.updateRecipient,
            );
          }
        }}
      />
    </SendToOptionsContext.Provider>
  );
};

export default SendToOptions;
