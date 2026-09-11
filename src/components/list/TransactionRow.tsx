import React, {ReactElement, memo} from 'react';
import {BaseText, ListItemSubText} from '../styled/Text';
import styled from 'styled-components/native';
import {ScreenGutter} from '../styled/Containers';
import RemoteImage from '../../navigation/tabs/shop/components/RemoteImage';
import {TRANSACTION_ICON_SIZE} from '../../constants/TransactionIcons';
import {CurrencyListIcons} from '../../constants/SupportedCurrencyOptions';
import {CurrencyImage} from '../currency-image/CurrencyImage';
export const TRANSACTION_ROW_HEIGHT = 75;
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useIsLargeFont} from '../../utils/hooks';

const TransactionContainer = styled(TouchableOpacity)<{stacked?: boolean}>`
  flex-direction: ${({stacked}) => (stacked ? 'column' : 'row')};
  padding: ${ScreenGutter};
  align-items: ${({stacked}) => (stacked ? 'flex-start' : 'center')};
  min-height: ${TRANSACTION_ROW_HEIGHT}px;
`;

const IconContainer = styled.View`
  margin-right: 8px;
  height: 50px;
  width: 50px;
  display: flex;
  justify-content: center;
`;

const DescriptionContainer = styled.View`
  flex-grow: 1;
  flex-shrink: 1;
  margin-right: 10px;
`;

const Description = styled(BaseText)`
  color: ${({theme}) => theme.colors.text};
  overflow: hidden;
  font-size: 16px;
`;

const TailContainer = styled.View<{stacked?: boolean}>`
  flex-shrink: 0;
  ${({stacked}) => (stacked ? 'align-self: stretch; margin-top: 6px;' : '')}
`;

const Value = styled(BaseText)<{stacked?: boolean}>`
  color: ${({theme}) => theme.colors.text};
  text-align: ${({stacked}) => (stacked ? 'left' : 'right')};
  font-weight: 700;
  font-size: 16px;
`;

const BadgeContainer = styled.View<{size?: number}>`
  height: ${({size = 54}) => size}%;
  width: ${({size = 54}) => size}%;
  position: absolute;
  right: -2px;
  bottom: 0;
`;

const IconSubContainer = styled.View`
  position: relative;
`;

interface Props {
  icon?: ReactElement;
  iconURI?: string;
  description?: string;
  details?: string;
  value?: string;
  time?: string;
  chain?: string;
  onPressTransaction?: () => void;
}

const TransactionRow = ({
  icon,
  iconURI,
  description,
  details,
  value,
  time,
  chain,
  onPressTransaction,
}: Props) => {
  const stacked = useIsLargeFont();
  return (
    <TransactionContainer onPress={onPressTransaction} stacked={stacked}>
      {iconURI ? (
        <IconContainer>
          <RemoteImage
            borderRadius={50}
            fallbackComponent={() => icon as React.JSX.Element}
            height={TRANSACTION_ICON_SIZE}
            uri={iconURI}
          />
        </IconContainer>
      ) : icon && chain ? (
        <IconContainer>
          <IconSubContainer>
            {icon}
            <BadgeContainer>
              <CurrencyImage img={CurrencyListIcons[chain]} size={20} />
            </BadgeContainer>
          </IconSubContainer>
        </IconContainer>
      ) : (
        icon && <IconContainer>{icon}</IconContainer>
      )}
      {!!description && (
        <DescriptionContainer>
          <Description
            numberOfLines={stacked ? undefined : details ? 2 : 1}
            ellipsizeMode={'tail'}>
            {description}
            {details && (
              <ListItemSubText>
                {'\n'}
                {details}
              </ListItemSubText>
            )}
          </Description>
        </DescriptionContainer>
      )}
      <TailContainer stacked={stacked}>
        {value ? <Value stacked={stacked}>{value}</Value> : null}
        {time ? (
          <ListItemSubText textAlign={stacked ? 'left' : 'right'}>
            {time}
          </ListItemSubText>
        ) : null}
      </TailContainer>
    </TransactionContainer>
  );
};

export default memo(TransactionRow);
