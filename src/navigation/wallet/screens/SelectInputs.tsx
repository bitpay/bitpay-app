import React, {useEffect, useLayoutEffect, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import styled from 'styled-components/native';
import {
  Recipient,
  TxDetailsSendingTo,
  Utxo,
  Wallet,
} from '../../../store/wallet/wallet.models';
import {
  BaseText,
  H5,
  H7,
  HeaderTitle,
  Link,
} from '../../../components/styled/Text';
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
import InputSelectionRow, {
  InputSelectionToggleProps,
} from '../../../components/list/InputsRow';
import {GetPrecision} from '../../../store/wallet/utils/currency';
import {useAppDispatch, useLogger} from '../../../utils/hooks';
import Button from '../../../components/button/Button';

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
const SpecifyAmountContainer = styled.TouchableOpacity`
  align-items: flex-end;
`;

const SelectInputsContainer = styled.SafeAreaView`
  flex: 1;
`;

const SelectInputsDetailsContainer = styled.View`
  margin-top: 20px;
  padding: 0 15px;
`;

const ScrollViewContainer = styled.ScrollView`
  padding: 0 15px;
`;

const CtaContainer = styled(_CtaContainer)`
  padding: 10px 0;
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
  const [inputs, setInputs] = useState<Utxo[]>();
  const {wallet, recipient} = route.params;
  const precision = dispatch(GetPrecision(wallet?.credentials.coin));
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
      img: wallet?.img || wallet?.credentials.coin,
    };
  }

  const init = async () => {
    try {
      const utxos = await GetUtxos(wallet);
      setInputs(utxos);
    } catch (err) {
      logger.error(`An error occurred while getting utxos: ${err}`);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Select Inputs')}</HeaderTitle>,
    });
  }, [navigation, t]);

  useEffect(() => {
    init();
  }, []);

  const inputToggled = ({amount, checked}: InputSelectionToggleProps) => {
    setTotalAmount(prevTotalAmountStr => {
      let prevTotalAmount = Number(prevTotalAmountStr);
      if (checked) {
        prevTotalAmount += amount;
      } else {
        prevTotalAmount -= amount;
      }
      return Number(prevTotalAmount).toFixed(precision!.unitDecimals);
    });
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
                style={{marginLeft: 8}}>
                {recipientData.recipientName || recipientData.recipientAddress}
              </H7>
            </RecipientContainer>
            <SpecifyAmountContainer>
              <Link>{t('Specify Amount')}</Link>
            </SpecifyAmountContainer>
          </ItemRowContainer>
          <Hr />
        </SectionContainer>
        <SectionContainer>
          <H5>{t('Total Selected Inputs')}</H5>
          <Hr />
          <ItemRowContainer>
            <BaseText>
              {totalAmount} {precision?.unitCode.toUpperCase()}
            </BaseText>
          </ItemRowContainer>
          <Hr />
        </SectionContainer>
        <H5>{t('Wallet Inputs')}</H5>
        <Hr />
      </SelectInputsDetailsContainer>
      {inputs && inputs.length ? (
        <ScrollViewContainer>
          {inputs.map((input, index) => (
            <>
              <InputSelectionRow
                item={input}
                emit={inputToggled}
                key={index}
                unitCode={precision?.unitCode}
              />
              <Hr />
            </>
          ))}
        </ScrollViewContainer>
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
          onPress={() => {
            haptic('impactLight');
            navigation.navigate('Wallet', {
              screen: 'SelectInputs',
              params: {
                recipient: recipient!,
                wallet,
              },
            });
          }}
          disabled={!recipient}>
          {t('Continue')}
        </Button>
      </CtaContainer>
    </SelectInputsContainer>
  );
};
export default SelectInputs;
