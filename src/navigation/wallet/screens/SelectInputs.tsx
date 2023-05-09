import React, {useCallback, useEffect, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import styled from 'styled-components/native';
import {
  Recipient,
  TransactionOptionsContext,
  TxDetailsSendingTo,
  Utxo,
  Wallet,
} from '../../../store/wallet/wallet.models';
import {BaseText, H5, H7, HeaderTitle} from '../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {WalletStackParamList} from '../WalletStack';
import {
  Column,
  CtaContainer as _CtaContainer,
  Hr,
} from '../../../components/styled/Containers';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {GetUtxos} from '../../../store/wallet/effects/transactions/transactions';
import haptic from '../../../components/haptic-feedback/haptic';
import InputSelectionRow from '../../../components/list/InputsRow';
import {GetPrecision} from '../../../store/wallet/utils/currency';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import Button from '../../../components/button/Button';
import {FlatList} from 'react-native';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {SatToUnit} from '../../../store/wallet/effects/amount/amount';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import {sleep} from '../../../utils/helper-methods';
import {GetMinFee} from '../../../store/wallet/effects/fee/fee';
import _ from 'lodash';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';

export const CurrencyColumn = styled(Column)`
  margin-left: 8px;
`;

const SectionContainer = styled.View`
  margin-bottom: 30px;
`;

const ItemRowContainer = styled.View`
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
  height: 55px;
`;

const RecipientContainer = styled.View`
  flex-direction: row;
`;

const SelectInputsContainer = styled.SafeAreaView`
  flex: 1;
`;

const SelectInputsDetailsContainer = styled.View`
  margin-top: 20px;
  padding: 0 15px;
`;

const InputSelectionRowContainer = styled.View`
  padding: 0 15px;
`;

const CtaContainer = styled(_CtaContainer)`
  padding: 10px 16px;
`;

export const InputTouchableContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 71px;
`;

export interface SelectInputsParamList {
  wallet: Wallet;
  recipient: Recipient;
}

const SelectInputs = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {t} = useTranslation();
  const route = useRoute<RouteProp<WalletStackParamList, 'SelectInputs'>>();
  const useUnconfirmedFunds = useAppSelector(
    ({WALLET}) => WALLET.useUnconfirmedFunds,
  );
  const [inputs, setInputs] = useState<Utxo[]>([]);
  const {wallet, recipient} = route.params;
  const {currencyAbbreviation, chain} = wallet;
  const precision = dispatch(GetPrecision(currencyAbbreviation, chain));
  const [totalAmount, setTotalAmount] = useState(
    Number(0).toFixed(precision?.unitDecimals),
  );

  const logger = useLogger();
  let recipientData: TxDetailsSendingTo;

  if (recipient.type === 'contact') {
    recipientData = {
      recipientName: recipient?.name,
      recipientAddress: recipient?.address,
      img: recipient?.type,
    };
  } else {
    recipientData = {
      recipientName: recipient.name,
      recipientAddress: recipient.address,
      img: wallet?.img || currencyAbbreviation,
    };
  }

  const init = async () => {
    try {
      let utxos = await GetUtxos(wallet);
      if (!useUnconfirmedFunds) {
        utxos = utxos.filter(u => u.confirmations !== 0);
      }
      setInputs(_.sortBy(utxos, 'amount'));
    } catch (err) {
      logger.error(`An error occurred while getting utxos: ${err}`);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Select Inputs')}</HeaderTitle>,
    });
  }, [navigation, t]);

  useEffect(() => {
    init();
  }, []);

  const inputToggled = useCallback(
    (item: Utxo, index: number) => {
      setInputs(prevInputs => {
        prevInputs[index] = item;
        return prevInputs;
      });
      setTotalAmount(prevTotalAmountStr => {
        let prevTotalAmount = Number(prevTotalAmountStr);
        if (item.checked) {
          prevTotalAmount += item.amount;
        } else {
          prevTotalAmount -= item.amount;
        }
        return Number(prevTotalAmount).toFixed(precision!.unitDecimals);
      });
    },
    [precision],
  );

  const renderItem = useCallback(
    ({item, index}) => (
      <InputSelectionRowContainer>
        <InputSelectionRow
          item={item}
          emit={inputToggled}
          key={item}
          unitCode={precision?.unitCode}
          index={index}
        />
        <Hr />
      </InputSelectionRowContainer>
    ),
    [inputToggled, precision],
  );

  const goToConfirmView = async () => {
    try {
      haptic('impactLight');
      dispatch(startOnGoingProcessModal('LOADING'));
      const selectedInputs = inputs.filter(input => input.checked);
      logger.debug(
        `Estimating fee for: ${selectedInputs.length} selected inputs`,
      );
      const estimatedFee = await GetMinFee(wallet, 1, selectedInputs.length);
      logger.debug(`Estimated fee: ${estimatedFee}`);
      const formattedestimatedFee = dispatch(
        SatToUnit(estimatedFee, currencyAbbreviation, chain),
      );

      const amount = Number(totalAmount) - formattedestimatedFee!;
      const tx = {
        wallet,
        recipient,
        inputs: inputs.filter(i => i.checked),
        amount,
        fee: estimatedFee,
        context: 'selectInputs' as TransactionOptionsContext,
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
          recipient,
          txp,
          txDetails,
          amount,
          inputs,
          selectInputs: true,
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

  return (
    <SelectInputsContainer>
      <SelectInputsDetailsContainer>
        <SectionContainer>
          <H5>{t('Recipient')}</H5>
          <Hr />
          <ItemRowContainer>
            <RecipientContainer>
              <CurrencyImage img={recipientData.img} size={20} />
              <H7
                numberOfLines={1}
                ellipsizeMode={'tail'}
                style={{marginLeft: 8, width: '60%'}}>
                {recipientData.recipientName || recipientData.recipientAddress}
              </H7>
            </RecipientContainer>
          </ItemRowContainer>
          <Hr />
        </SectionContainer>
        <SectionContainer>
          <H5>{t('Total Selected Inputs')}</H5>
          <Hr />
          <ItemRowContainer
            style={{
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}>
            <BaseText>
              {Number(totalAmount)} {precision?.unitCode.toUpperCase()}
            </BaseText>
          </ItemRowContainer>
          <Hr />
        </SectionContainer>
        <H5>{t('Wallet Inputs')}</H5>
        <Hr />
      </SelectInputsDetailsContainer>
      {inputs && inputs.length ? (
        <FlatList
          contentContainerStyle={{paddingBottom: 20}}
          data={inputs}
          keyExtractor={(_item, index) => index.toString()}
          renderItem={({item, index}: {item: Utxo; index: number}) =>
            renderItem({item, index})
          }
        />
      ) : (
        <>
          <ItemRowContainer style={{paddingHorizontal: 15}}>
            <H7>{t('No available inputs.')}</H7>
          </ItemRowContainer>
          <Hr />
        </>
      )}
      <CtaContainer>
        <Button
          buttonStyle={'primary'}
          onPress={goToConfirmView}
          disabled={!inputs.filter(i => i.checked).length}>
          {t('Continue')}
        </Button>
      </CtaContainer>
    </SelectInputsContainer>
  );
};
export default SelectInputs;
