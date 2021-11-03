import React, {useState} from 'react';
import styled from 'styled-components/native';
import {BaseText, Link, Paragraph} from '../../../components/styled/Text';
import {Linking} from 'react-native';
import haptic from '../../../components/haptic-feedback/haptic';
import Checkbox from '../../../components/checkbox/Checkbox';
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
  margin-right: 20px;
  margin-top: 10px;
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
        <Checkbox
          checked={checked}
          disabled={false}
          onPress={(): void => {
            if (!checked) {
              haptic('impactLight');
              setChecked(true);
              emit(term.id);
            }
          }}
        />
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
