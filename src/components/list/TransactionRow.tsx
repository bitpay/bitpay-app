import React, {ReactElement, memo} from 'react';
import {BaseText} from '../styled/Text';
import styled from 'styled-components/native';
import {ScreenGutter} from '../styled/Containers';
import {LuckySevens, SlateDark, White} from '../../styles/colors';
import RemoteImage from '../../navigation/tabs/shop/components/RemoteImage';
import {TRANSACTION_ICON_SIZE} from '../../constants/TransactionIcons';
export const TRANSACTION_ROW_HEIGHT = 75;

const TransactionContainer = styled.TouchableOpacity`
  flex-direction: row;
  padding: ${ScreenGutter};
  justify-content: center;
  align-items: center;
  height: ${TRANSACTION_ROW_HEIGHT}px;
`;

const IconContainer = styled.View`
  margin-right: 14px;
`;

const Description = styled(BaseText)`
  overflow: hidden;
  margin-right: 175px;
  font-size: 16px;
`;

const Details = styled(BaseText)`
  font-size: 12px;
  font-weight: 300;
  color: ${({theme: {dark}}) => (dark ? LuckySevens : SlateDark)};
`;

const TailContainer = styled.View`
  margin-left: auto;
`;

const Value = styled(BaseText)`
  text-align: right;
  font-weight: 700;
  font-size: 16px;
`;

const Time = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? LuckySevens : SlateDark)};
  text-align: right;
`;

interface Props {
  icon?: ReactElement;
  iconURI?: string;
  description?: string;
  details?: string;
  value?: string;
  time?: string;
  onPressTransaction?: () => void;
}

const TransactionRow = ({
  icon,
  iconURI,
  description,
  details,
  value,
  time,
  onPressTransaction,
}: Props) => {
  return (
    <TransactionContainer onPress={onPressTransaction}>
      {iconURI ? (
        <IconContainer>
          <RemoteImage
            borderRadius={50}
            fallbackComponent={() => icon as JSX.Element}
            height={TRANSACTION_ICON_SIZE}
            uri={iconURI}
          />
        </IconContainer>
      ) : (
        icon && <IconContainer>{icon}</IconContainer>
      )}
      {description && (
        <Description numberOfLines={details ? 2 : 1} ellipsizeMode={'tail'}>
          {description}
          {details && (
            <Details>
              {'\n'}
              {details}
            </Details>
          )}
        </Description>
      )}
      <TailContainer>
        {value && <Value>{value}</Value>}
        {time && <Time>{time}</Time>}
      </TailContainer>
    </TransactionContainer>
  );
};

export default memo(TransactionRow);
