import React, {ReactElement, memo} from 'react';
import {BaseText, ListItemSubText} from '../styled/Text';
import styled from 'styled-components/native';
import {ScreenGutter} from '../styled/Containers';
import {useTranslation} from 'react-i18next';
export const TRANSACTION_PROPOSAL_ROW_HEIGHT = 75;

const TransactionContainer = styled.TouchableOpacity`
  flex-direction: row;
  padding: ${ScreenGutter};
  justify-content: center;
  align-items: center;
  height: ${TRANSACTION_PROPOSAL_ROW_HEIGHT}px;
`;

const IconContainer = styled.View`
  margin-right: 8px;
`;

const Description = styled(BaseText)`
  overflow: hidden;
  margin-right: 175px;
  font-size: 16px;
`;

const Creator = styled(ListItemSubText)`
  overflow: hidden;
  margin-right: 175px;
`;

const TailContainer = styled.View`
  margin-left: auto;
`;

const HeadContainer = styled.View``;

const Value = styled(BaseText)`
  text-align: right;
  font-weight: 700;
  font-size: 16px;
`;

interface Props {
  icon?: ReactElement;
  creator?: string;
  value?: string;
  time?: string;
  onPressTransaction?: () => void;
}

const TransactionProposalRow = ({
  icon,
  creator,
  value,
  time,
  onPressTransaction,
}: Props) => {
  const {t} = useTranslation();
  return (
    <TransactionContainer onPress={onPressTransaction}>
      {icon && <IconContainer>{icon}</IconContainer>}

      <HeadContainer>
        <Description numberOfLines={1} ellipsizeMode={'tail'}>
          {t('Sending')}
        </Description>
        {creator && <Creator>{t('Created by ', {creator})}</Creator>}
      </HeadContainer>

      <TailContainer>
        {value && <Value>{value}</Value>}
        {time && <ListItemSubText textAlign={'right'}>{time}</ListItemSubText>}
      </TailContainer>
    </TransactionContainer>
  );
};

export default memo(TransactionProposalRow);
