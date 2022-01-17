import React, {useState} from 'react';
import {ImportContainer, ImportTextInput, ImportTitle} from './RecoveryPhrase';
import {
  CtaContainer,
  HeaderTitleContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import styled from 'styled-components/native';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import Haptic from '../../../components/haptic-feedback/haptic';
import {
  AdvancedOptionsContainer,
  AdvancedOptionsButton,
  AdvancedOptionsButtonText,
  AdvancedOptions,
} from '../../../components/styled/Containers';

const InputContainer = styled.View`
  margin-top: -10px;
`;

const FileOrText = () => {
  const [inputValue, setInputValue] = useState<string>();
  const [password, setPassword] = useState<string>();
  const [options, setOptions] = useState('https://bws.bitpay.com/bws/api');
  const [showOptions, setShowOptions] = useState(false);

  const importWallet = () => {
    //  TODO: Import wallet
  };

  const _onPressShowOptions = () => {
    Haptic('impactLight');
    setShowOptions(!showOptions);
  };

  return (
    <ImportContainer>
      <HeaderTitleContainer>
        <ImportTitle>Backup plain text code</ImportTitle>
      </HeaderTitleContainer>
      <ImportTextInput
        multiline
        numberOfLines={5}
        onChangeText={(text: string) => setInputValue(text)}
      />

      <HeaderTitleContainer>
        <ImportTitle>Password</ImportTitle>
        <InputContainer>
          <BoxInput
            placeholder={'strongPassword123'}
            type={'password'}
            onChangeText={(text: string) => setPassword(text)}
            value={password}
          />
        </InputContainer>
      </HeaderTitleContainer>

      <CtaContainer>
        {__DEV__ && (
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
                  onChangeText={(text: string) => setOptions(text)}
                  value={options}
                />
              </AdvancedOptions>
            )}
          </AdvancedOptionsContainer>
        )}

        <Button
          buttonStyle={'primary'}
          onPress={importWallet}
          disabled={!inputValue || !password}>
          Import Wallet
        </Button>
      </CtaContainer>
    </ImportContainer>
  );
};

export default FileOrText;
