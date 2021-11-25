import React, {useState} from 'react';
import {
  ImportWalletContainer,
  ImportWalletTextInput,
  ImportWalletTitle,
} from './RecoveryPhrase';
import {
  CtaContainer,
  HeaderTitleContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import styled from 'styled-components/native';
import {Action, Feather} from '../../../styles/colors';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import Haptic from '../../../components/haptic-feedback/haptic';

const InputContainer = styled.View`
  margin-top: -10px;
`;

const AdvancedOptionsButton = styled.TouchableOpacity`
  height: 60px;
  background-color: ${Feather};
  padding: 18px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  border-radius: 6px;
`;

const AdvancedOptionsButtonText = styled.Text`
  font-size: 16px;
  line-height: 25px;
  color: ${Action};
`;

const AdvancedOptionsContainer = styled.View`
  background-color: ${Feather};
  border-radius: 6px;
  margin-bottom: 20px;
`;

const AdvancedOptions = styled.View`
  border-style: solid;
  border-top-width: 1px;
  border-top-color: #e1e4e7;
  padding: 18px;
`;

const FileOrText = () => {
  const [inputValue, onChangeText] = useState();
  const [password, onChangePassword] = useState();
  const [options, onChangeOptions] = useState('https://bws.bitpay.com/bws/api');
  const [showOptions, setShowOptions] = useState(false);

  const importWallet = () => {
    //  TODO: Import wallet
  };

  const _onPressShowOptions = () => {
    Haptic('impactLight');
    setShowOptions(!showOptions);
  };

  return (
    <ImportWalletContainer>
      <HeaderTitleContainer>
        <ImportWalletTitle>Backup plain text code</ImportWalletTitle>
      </HeaderTitleContainer>
      <ImportWalletTextInput
        multiline
        numberOfLines={5}
        onChangeText={(text: string) => onChangeText(text)}
      />

      <HeaderTitleContainer>
        <ImportWalletTitle>Password</ImportWalletTitle>
        <InputContainer>
          <BoxInput
            placeholder={'strongPassword123'}
            type={'password'}
            onChangeText={(text: string) => onChangePassword(text)}
            value={password}
          />
        </InputContainer>
      </HeaderTitleContainer>

      <CtaContainer>
        <AdvancedOptionsContainer>
          <AdvancedOptionsButton onPress={_onPressShowOptions}>
            {showOptions ? (
              <>
                <AdvancedOptionsButtonText>
                  Hide Advanced Options
                </AdvancedOptionsButtonText>
                <ChevronUpSvg />
              </>
            ) : (
              <>
                <AdvancedOptionsButtonText>
                  Show Advanced Options
                </AdvancedOptionsButtonText>
                <ChevronDownSvg />
              </>
            )}
          </AdvancedOptionsButton>

          {showOptions && (
            <AdvancedOptions>
              <BoxInput
                label={'WALLET SERVICE URL'}
                onChangeText={(text: string) => onChangeOptions(text)}
                value={options}
              />
            </AdvancedOptions>
          )}
        </AdvancedOptionsContainer>
        <Button
          buttonStyle={'primary'}
          onPress={importWallet}
          disabled={!inputValue || !password}>
          Import Wallet
        </Button>
      </CtaContainer>
    </ImportWalletContainer>
  );
};

export default FileOrText;
