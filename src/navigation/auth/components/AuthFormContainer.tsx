import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../components/styled/Text';

interface LoginContainerProps {
  header?: string;
}

const LoginContainer = styled.SafeAreaView`
  justify-content: center;
  align-items: center;
`;

const HeaderContainer = styled.View`
  width: 100%;
  padding: 0 20px;
  margin: 25px 0;
`;

const HeaderText = styled(BaseText)`
  font-size: 25px;
  font-weight: 700;
  line-height: 34px;
`;

const FormContainer = styled.View`
  width: 100%;
  padding: 0 20px;
`;

export const AuthRowContainer = styled.View`
  margin-bottom: 15px;
`;

export const AuthFormParagraph = styled.Text`
  color: ${({theme}) => theme.colors.description};
  font-size: 16px;
  font-weight: 400;
  line-height: 25px;
  margin-bottom: 15px;
`;

export const AuthActionsContainer = styled.View`
  margin-top: 20px;
`;

const AuthContainer: React.FC<LoginContainerProps> = props => {
  const {children, header} = props;
  return (
    <LoginContainer>
      <HeaderContainer>
        <HeaderText>{header}</HeaderText>
      </HeaderContainer>
      <FormContainer>{children}</FormContainer>
    </LoginContainer>
  );
};

export default AuthContainer;
