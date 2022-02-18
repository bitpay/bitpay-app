import React, {memo} from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../styled/Text';
import DeleteSvg from '../../../assets/img/delete.svg';
import {SlateDark} from '../../styles/colors';

const KeyboardContainer = styled.View`
  margin: 10px 0;
`;

const RowContainer = styled.View`
  flex-direction: row;
`;

const CellContainer = styled.TouchableOpacity`
  width: 33.333333%;
  justify-content: center;
  align-items: center;
  display: flex;
`;

const CellValue = styled(BaseText)`
  font-size: 32.08px;
  font-weight: 500;
  color: ${({theme}) => theme.colors.text};
  line-height: 65px;
  top: 12px;
`;

const CellLetter = styled(BaseText)`
  font-size: 10px;
  letter-spacing: 2px;
  margin-top: 4px;
  height: 22px;
  color: ${SlateDark};
`;

export interface PinPadProps {
  onCellPress: (value: string) => void;
}

export interface PinButton {
  val: string;
  letters: string;
}

const PinPad = ({onCellPress}: PinPadProps) => {
  const Cell = (button: {val: string; letters?: string}) => {
    return (
      <CellContainer onPress={() => onCellPress(button.val)}>
        <CellValue>{button.val}</CellValue>
        <CellLetter>{button.letters}</CellLetter>
      </CellContainer>
    );
  };

  const Row = ({numArray}: {numArray: Array<PinButton>}) => {
    return (
      <RowContainer>
        {numArray
          ? numArray.map(button => (
              <Cell
                val={button.val}
                letters={button.letters}
                key={button.val}
              />
            ))
          : null}
      </RowContainer>
    );
  };

  return (
    <KeyboardContainer>
      <Row
        numArray={[
          {
            val: '1',
            letters: '',
          },
          {
            val: '2',
            letters: 'ABC',
          },
          {
            val: '3',
            letters: 'DEF',
          },
        ]}
      />
      <Row
        numArray={[
          {
            val: '4',
            letters: 'GHI',
          },
          {
            val: '5',
            letters: 'JKL',
          },
          {
            val: '6',
            letters: 'MNO',
          },
        ]}
      />
      <Row
        numArray={[
          {
            val: '7',
            letters: 'PQRS',
          },
          {
            val: '8',
            letters: 'TUV',
          },
          {
            val: '9',
            letters: 'WXYZ',
          },
        ]}
      />

      <RowContainer>
        <CellContainer onPress={() => onCellPress('.')}>
          <Cell val={''} />
        </CellContainer>
        <CellContainer onPress={() => onCellPress('0')}>
          <Cell val={'0'} />
        </CellContainer>
        <CellContainer
          onPress={() => onCellPress('backspace')}
          onLongPress={() => onCellPress('reset')}>
          <DeleteSvg />
        </CellContainer>
      </RowContainer>
    </KeyboardContainer>
  );
};

export default memo(PinPad);
