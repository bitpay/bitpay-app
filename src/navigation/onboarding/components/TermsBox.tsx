import React, {useState} from 'react';
import styled from 'styled-components/native';
import haptic from '../../../components/haptic-feedback/haptic';
import Checkbox from '../../../components/checkbox/Checkbox';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import {TermsOfUseModel} from '../screens/TermsOfUse';

interface Props {
  emit: (id: number) => void;
  term: TermsOfUseModel;
}

const TermsBoxContainer = styled.TouchableOpacity`
  padding: 20px;
  flex-direction: row;
  justify-content: flex-start;
  background: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 11px;
  margin: 10px 0;
`;

const CheckBoxContainer = styled.View`
  flex-direction: column;
  margin: 10px 20px 0 0;
`;

const TermTextContainer = styled.View`
  flex-direction: column;
  flex-shrink: 1;
`;

const TermsBox = ({term, emit}: Props) => {
  const {statement} = term;
  const [checked, setChecked] = useState(false);

  const toggleCheck = (): void => {
    haptic('impactLight');
    const newChecked = !checked;
    setChecked(newChecked);
    if (newChecked) {
      emit(term.id);
    } else {
      emit(-term.id);
    }
  };

  return (
    <TermsBoxContainer activeOpacity={1.0} onPressIn={toggleCheck}>
      <CheckBoxContainer>
        <Checkbox checked={checked} onPress={toggleCheck} />
      </CheckBoxContainer>
      <TermTextContainer>{statement}</TermTextContainer>
    </TermsBoxContainer>
  );
};

export default TermsBox;
