import React from 'react';
import styled from 'styled-components/native';
import {TextInput} from 'react-native';
import SearchSvg from '../../../../../assets/img/search.svg';
import {Slate30, SlateDark, White} from '../../../../styles/colors';

const Container = styled.View<{height?: number}>`
  flex: 1;
  flex-direction: row;
  align-items: center;
  border-radius: 50px;
  padding: 10px 14px;
  ${({height}) => (height ? `height: ${height}px;` : '')}
  border: 1px solid ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  background-color: ${({theme: {dark}}) => (dark ? 'transparent' : White)};
`;

const IconContainer = styled.View`
  margin-right: 10px;
`;

const Input = styled(TextInput)`
  flex: 1;
  font-size: 14px;
  color: ${({theme}) => theme.colors.text};
  padding: 0;
`;

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  height?: number;
}

const AssetsSearchPill: React.FC<Props> = ({
  value,
  onChangeText,
  placeholder = 'Search',
  height,
}) => {
  return (
    <Container height={height}>
      <IconContainer>
        <SearchSvg width={20} height={20} />
      </IconContainer>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={'#6F7782'}
      />
    </Container>
  );
};

export default AssetsSearchPill;
