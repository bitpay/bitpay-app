import React, {useState} from 'react';
import styled from 'styled-components/native';
import {Slate, SlateDark, White} from '../../../styles/colors';
import ScanSvg from '../../../../assets/img/onboarding/scan.svg';
import {CtaContainer} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';

const Gutter = '10px';
export const ImportWalletContainer = styled.View`
  padding: ${Gutter} 0;
`;

const ImportWalletParagraph = styled.Text`
  font-size: 16px;
  line-height: 25px;
  padding: ${Gutter};
  color: ${SlateDark};
`;

const HeaderContainer = styled.View`
  padding: ${Gutter};
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
`;

export const ImportWalletTitle = styled.Text`
  font-weight: 500;
  font-size: 13px;
  line-height: 18px;
  color: ${SlateDark};
  opacity: 0.75;
  text-transform: uppercase;
`;

const ImgContainer = styled.View`
  height: 25px;
  width: 25px;
  align-items: center;
  justify-content: center;
`;

export const ImportWalletTextInput = styled.TextInput`
  height: 100px;
  margin: 0 ${Gutter};
  padding: ${Gutter};
  background: ${White};
  border: 0.75px solid ${Slate};
  border-top-right-radius: 4px;
  border-top-left-radius: 4px;
`;

const RecoveryPhrase = () => {
  const [inputValue, onChangeText] = useState();

  const importWallet = () => {
    //  TODO: Import wallet
  };

  return (
    <ImportWalletContainer>
      <ImportWalletParagraph>
        Enter your recovery phrase (usually 12-words) in the correct order.
        Separate each word with a single space only (no commas or any other
        punctuation). For backup phrases in non-English languages: Some words
        may include special symbols, so be sure to spell all the words
        correctly.
      </ImportWalletParagraph>

      <HeaderContainer>
        <ImportWalletTitle>Recovery phrase</ImportWalletTitle>

        <ImgContainer>
          <ScanSvg />
        </ImgContainer>
      </HeaderContainer>

      <ImportWalletTextInput
        multiline
        numberOfLines={5}
        onChangeText={(text: string) => onChangeText(text)}
      />

      <CtaContainer>
        <Button
          buttonStyle={'primary'}
          onPress={importWallet}
          disabled={!inputValue}>
          Import Wallet
        </Button>
      </CtaContainer>
    </ImportWalletContainer>
  );
};

export default RecoveryPhrase;
