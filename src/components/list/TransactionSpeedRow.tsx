import {ActiveOpacity, Hr, Row, ScreenGutter} from '../styled/Containers';
import styled from 'styled-components/native';
import React from 'react';
import {H6} from '../styled/Text';
import Checkbox from '../checkbox/Checkbox';
import {DetailsList} from '../../navigation/wallet/screens/send/confirm/Shared';
import {Fee} from '../../store/wallet/effects/fee/fee';

export const SpeedOptionRow = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  min-height: 53px;
  padding: 20px 0;
  justify-content: center;
`;

const Text = styled(H6)`
  margin-right: 10px;
`;

interface UiFee extends Fee {
  avgConfirmationTime: string;
  feePerSatByte: string;
  uiLevel: string;
  uiFeePerSatByte: string;
}

interface Props {
  fee: UiFee;
  onPress: (fee: Fee) => void;
  selectedSpeed: string;
  isFirst: boolean;
}

const TransactionSpeedRow = ({fee, onPress, selectedSpeed, isFirst}: Props) => {
  const {uiLevel, avgConfirmationTime, uiFeePerSatByte, level} = fee;
  return (
    <DetailsList>
      {isFirst && <Hr />}
      <SpeedOptionRow
        activeOpacity={ActiveOpacity}
        onPress={() => onPress(fee)}>
        <Row>
          <Text>{uiLevel}</Text>
          <H6 medium={true}>{uiFeePerSatByte}</H6>
        </Row>
        <Row style={{justifyContent: 'flex-end', alignItems: 'center'}}>
          <Text medium={true}>{avgConfirmationTime}</Text>
          <Checkbox
            radio={true}
            onPress={() => onPress(fee)}
            checked={selectedSpeed === level}
          />
        </Row>
      </SpeedOptionRow>
      <Hr />
    </DetailsList>
  );
};

export default TransactionSpeedRow;
