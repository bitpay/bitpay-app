import React, {ReactElement, memo} from 'react';
import {BaseText, ListItemSubText} from '../styled/Text';
import styled from 'styled-components/native';
import {ScreenGutter} from '../styled/Containers';
import {useTranslation} from 'react-i18next';
import {GetContactName} from '../../store/wallet/effects/transactions/transactions';
import {ContactRowProps} from './ContactRow';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {Dimensions} from 'react-native';
import {useIsLargeFont} from '../../utils/hooks';

const {width} = Dimensions.get('window');

const TransactionContainer = styled(TouchableOpacity)<{
  withCheckBox?: boolean;
  stacked?: boolean;
}>`
  flex-direction: ${({stacked}) => (stacked ? 'column' : 'row')};
  padding: 10px ${ScreenGutter};
  justify-content: space-between;
  width: ${width - 50}px;
  width: ${({withCheckBox}) => (withCheckBox ? `${width - 80}px` : '100%')};
`;

const IconContainer = styled.View`
  margin-right: 8px;
`;

const Description = styled(BaseText)<{stacked?: boolean}>`
  overflow: hidden;
  font-size: 16px;
  max-width: ${({stacked}) => (stacked ? '100%' : '150px')};
`;

const Creator = styled(ListItemSubText)<{stacked?: boolean}>`
  overflow: hidden;
  max-width: ${({stacked}) => (stacked ? '100%' : '150px')};
`;

const TailContainer = styled.View<{stacked?: boolean}>`
  ${({stacked}) =>
    stacked ? 'align-self: stretch; margin-top: 6px;' : 'margin-left: auto;'}
  display: flex;
  justify-content: center;
`;

const HeadContainer = styled.View``;

const Value = styled(BaseText)<{stacked?: boolean}>`
  text-align: ${({stacked}) => (stacked ? 'left' : 'right')};
  font-weight: 700;
  font-size: 16px;
`;

interface Props {
  icon?: ReactElement;
  creator?: string;
  value?: string;
  time?: string;
  message?: string;
  onPressTransaction?: () => void;
  hideIcon?: boolean;
  recipientCount?: number;
  toAddress?: string;
  tokenAddress?: string;
  contactList?: ContactRowProps[];
  chain?: string;
  withCheckBox?: boolean;
}

const TransactionProposalRow = ({
  icon,
  creator,
  value,
  time,
  message,
  onPressTransaction,
  hideIcon,
  recipientCount,
  toAddress,
  tokenAddress,
  contactList,
  chain,
  withCheckBox,
}: Props) => {
  const {t} = useTranslation();
  let label: string = t('Sending');
  let labelLines: number = 1;

  if (recipientCount && recipientCount > 1) {
    label = t('Sending to multiple recipients (recipientCount)', {
      recipientCount,
    });
    labelLines = 2;
  } else if (toAddress && chain && contactList) {
    const contactName = GetContactName(toAddress, tokenAddress, contactList);
    if (contactName) {
      label = t('Sending to contactName', {contactName});
      labelLines = 2;
    }
  }

  const stacked = useIsLargeFont();
  return (
    <TransactionContainer
      withCheckBox={withCheckBox}
      stacked={stacked}
      onPress={onPressTransaction}>
      {icon && !hideIcon && <IconContainer>{icon}</IconContainer>}

      <HeadContainer>
        <Description
          stacked={stacked}
          numberOfLines={stacked ? undefined : message ? 2 : labelLines}
          ellipsizeMode={'tail'}>
          {message ? message : label}
        </Description>
        {creator && (
          <Creator
            stacked={stacked}
            numberOfLines={stacked ? 2 : 1}
            ellipsizeMode={'tail'}>
            {t('Created by ', {creator})}
          </Creator>
        )}
      </HeadContainer>

      <TailContainer stacked={stacked}>
        {value && <Value stacked={stacked}>{value}</Value>}
        {time && (
          <ListItemSubText textAlign={stacked ? 'left' : 'right'}>
            {time}
          </ListItemSubText>
        )}
      </TailContainer>
    </TransactionContainer>
  );
};

export default memo(TransactionProposalRow);
