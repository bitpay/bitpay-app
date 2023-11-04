import React, {ReactElement, memo} from 'react';
import {BaseText, ListItemSubText} from '../styled/Text';
import styled from 'styled-components/native';
import {ScreenGutter} from '../styled/Containers';
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
  margin-right: 8px;
`;

const Description = styled(BaseText)`
  color: ${({theme}) => theme.colors.text};
  overflow: hidden;
  margin-right: 175px;
  font-size: 16px;
`;

const TailContainer = styled.View`
  margin-left: auto;
`;

const Value = styled(BaseText)`
  color: ${({theme}) => theme.colors.text};
  text-align: right;
  font-weight: 700;
  font-size: 16px;
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
      {!!description && (
        <Description
          numberOfLines={details ? 2 : 1}
          ellipsizeMode={'tail'}>
          {description}
          {details && (
            <ListItemSubText>
              {'\n'}
              {details}
            </ListItemSubText>
          )}
        </Description>
      )}
      <TailContainer>
        {value ? <Value>{value}</Value> : null}
        {time ? <ListItemSubText textAlign={'right'}>{time}</ListItemSubText> : null}
      </TailContainer>
    </TransactionContainer>
  );
};

export default memo(TransactionRow);
