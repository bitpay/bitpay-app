import React, {useState} from 'react';
import styled from 'styled-components/native';
import {BaseText, Link, Paragraph} from '../../../components/styled/text/Text';
import {RoundedCheckbox} from 'react-native-rounded-checkbox';
import Checkbox from '../../../../assets/img/check.svg';
import {Linking} from 'react-native';
import haptic from '../../../components/haptic-feedback/haptic';

interface Props {
  emit: (id: number) => void;
  term: {
    id: number;
    statement: string;
    acknowledgement?: string | undefined;
    link?: {
      text: string;
      url: string;
    };
  };
}

const TermsBoxContainer = styled.TouchableOpacity`
  padding: 20px;
  flex-direction: row;
  justify-content: flex-start;
  background: #f5f7f8;
  border-radius: 11px;
  margin: 10px 0;
`;

const TermText = styled(BaseText)`
  font-size: 18px;
  font-style: normal;
  font-weight: 500;
  line-height: 25px;
  letter-spacing: 0;
  text-align: left;
  margin: 5px 0;
`;

const CheckBoxContainer = styled.View`
  flex-direction: column;
  margin-right: 15px;
`;

const TermTextContainer = styled.View`
  flex-direction: column;
  flex-shrink: 1;
`;

const TermsBox = ({term, emit}: Props) => {
  const {statement, acknowledgement, link} = term;
  const [checked, setChecked] = useState(false);
  return (
    <TermsBoxContainer activeOpacity={1.0}>
      <CheckBoxContainer>
        <RoundedCheckbox
          onPress={(): void => {
            if (!checked) {
              haptic('impactLight');
              setChecked(true);
              emit(term.id);
            }
          }}
          active={checked}
          uncheckedColor={'white'}
          outerStyle={{
            shadowColor: 'grey',
            shadowOffset: {width: 0, height: 0.25},
            shadowOpacity: 0.3,
          }}>
          <Checkbox />
        </RoundedCheckbox>
      </CheckBoxContainer>
      <TermTextContainer>
        <TermText>{statement}</TermText>
        {acknowledgement && <Paragraph>{acknowledgement}</Paragraph>}
        {link && (
          <Link onPress={() => Linking.openURL(link.url)}>{link.text}</Link>
        )}
      </TermTextContainer>
    </TermsBoxContainer>
  );
};

export default TermsBox;
