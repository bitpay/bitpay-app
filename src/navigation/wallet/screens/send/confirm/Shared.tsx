import {
  TxDetailsAmount,
  TxDetailsFee,
  TxDetailsSendingFrom,
  TxDetailsSendingTo,
} from '../../../../../store/wallet/wallet.models';
import {H4, H5, H6, H7} from '../../../../../components/styled/Text';
import SendToPill from '../../../components/SendToPill';
import {
  Column,
  Hr,
  Row,
  ScreenGutter,
} from '../../../../../components/styled/Containers';
import React, {ReactChild} from 'react';
import styled from 'styled-components/native';
import {ScrollView} from 'react-native';
import {CurrencyImage} from '../../../../../components/currency-image/CurrencyImage';

// Styled
export const ConfirmContainer = styled.SafeAreaView`
  flex: 1;
`;

export const HeaderTitle = styled(H6)`
  margin-top: 20px;
  margin-bottom: 15px;
  justify-content: center;
  text-transform: uppercase;
`;

export interface DetailContainerParams {
  height?: number;
}

export const DetailContainer = styled.View<DetailContainerParams>`
  min-height: 53px;
  padding: 20px 0;
  justify-content: center;
  ${({height}) => (height ? `height: ${height}px;` : '')}
`;

export const DetailRow = styled(Row)`
  align-items: center;
  justify-content: space-between;
`;

export const DetailColumn = styled(Column)`
  align-items: flex-end;
`;

export const DetailsList = styled(ScrollView)`
  padding: 0 ${ScreenGutter};
`;

// Row UI
export const Header = ({
  children,
  hr,
}: {
  children: ReactChild;
  hr?: boolean;
}): JSX.Element | null => {
  if (children) {
    return (
      <>
        <HeaderTitle>{children}</HeaderTitle>
        {hr && <Hr />}
      </>
    );
  } else {
    return null;
  }
};

export const SendingTo = ({
  recipient,
  hr,
}: {
  recipient: TxDetailsSendingTo | undefined;
  hr?: boolean;
}): JSX.Element | null => {
  if (recipient) {
    const {recipientName, recipientAddress, img} = recipient;
    return (
      <>
        <DetailContainer>
          <DetailRow>
            <H7>Sending to</H7>
            <SendToPill
              icon={<CurrencyImage img={img} size={18} />}
              description={recipientName || recipientAddress || ''}
            />
          </DetailRow>
        </DetailContainer>
        {hr && <Hr />}
      </>
    );
  } else {
    return null;
  }
};

export const Fee = ({
  fee,
  hr,
}: {
  fee: TxDetailsFee | undefined;
  hr?: boolean;
}): JSX.Element | null => {
  if (fee) {
    const {feeLevel, cryptoAmount, fiatAmount, percentageOfTotalAmount} = fee;
    return (
      <>
        <DetailContainer>
          <DetailRow>
            <H7>Miner fee</H7>
            <DetailColumn>
              <H5>{feeLevel.toUpperCase()}</H5>
              <H6>{cryptoAmount}</H6>
              <H7>
                {fiatAmount} ({percentageOfTotalAmount} of total amount)
              </H7>
            </DetailColumn>
          </DetailRow>
        </DetailContainer>
        {hr && <Hr />}
      </>
    );
  } else {
    return null;
  }
};

export const SendingFrom = ({
  sender,
  onPress,
  hr,
}: {
  sender: TxDetailsSendingFrom | undefined;
  onPress?: () => void;
  hr?: boolean;
}): JSX.Element | null => {
  if (sender) {
    const {walletName, img} = sender;
    return (
      <>
        <DetailContainer height={83}>
          <DetailRow>
            <H7>Sending from</H7>
            <SendToPill
              onPress={onPress}
              icon={CurrencyImage({img, size: 18})}
              description={walletName}
            />
          </DetailRow>
        </DetailContainer>
        {hr && <Hr />}
      </>
    );
  } else {
    return null;
  }
};

export const Amount = ({
  description,
  amount,
  fiatOnly,
  hr,
}: {
  description: string | undefined;
  amount: TxDetailsAmount | undefined;
  fiatOnly?: boolean;
  hr?: boolean;
}): JSX.Element | null => {
  if (amount && description) {
    const {cryptoAmount, fiatAmount} = amount;
    return (
      <>
        <DetailContainer>
          <DetailRow>
            <H6>{description}</H6>
            <DetailColumn>
              {fiatOnly ? (
                <H7>{fiatAmount}</H7>
              ) : (
                <>
                  <H4>{cryptoAmount}</H4>
                  <H7>{fiatAmount}</H7>
                </>
              )}
            </DetailColumn>
          </DetailRow>
        </DetailContainer>
        {hr && <Hr />}
      </>
    );
  } else {
    return null;
  }
};
