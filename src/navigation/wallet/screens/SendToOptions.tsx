import React, {useEffect, useState} from 'react';
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
import AmountModal from '../../../components/amount/AmountModal';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import {sleep} from '../../../utils/helper-methods';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {useAppDispatch} from '../../../utils/hooks';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';

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
    index?: number;
    updateRecipient?: boolean;
  }>({showModal: false});

  const setRecipientListContext = (
    recipient: Recipient,
    index?: number,
    removeRecipient?: boolean,
    updateRecipient?: boolean,
  ) => {
    let newRecipientList: Recipient[] = _.cloneDeep(recipientList);
    if (removeRecipient) {
      newRecipientList.splice(index!, 1);
    } else if (updateRecipient) {
      newRecipientList[index!] = recipient;
    } else {
      newRecipientList = [...newRecipientList, recipient];
    }

    setRecipientList(newRecipientList);
  };

  const setRecipientAmountContext = (
    recipient: Recipient,
    index?: number,
    updateRecipient?: boolean,
  ) => {
    if (recipient.amount && !updateRecipient) {
      setRecipientListContext(recipient);
    } else {
      setRecipientAmount({showModal: true, recipient, index, updateRecipient});
    }
  };

  const goToConfirmView = async () => {
    try {
      dispatch(startOnGoingProcessModal('LOADING'));
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

  useEffect(() => {
    navigation.setOptions({
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
        <Tab.Navigator screenOptions={{...ScreenOptions()}}>
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
        cryptoCurrencyAbbreviation={params.wallet.currencyAbbreviation.toUpperCase()}
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
