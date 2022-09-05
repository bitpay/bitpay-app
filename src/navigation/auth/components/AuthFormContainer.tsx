import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText} from '../../../components/styled/Text';
import {Caution} from '../../../styles/colors';

const AuthFormContainer = styled.ScrollView.attrs(() => ({
  keyboardShouldPersistTaps: 'handled',
}))`
  padding: 24px ${ScreenGutter};
`;

export const AuthRowContainer = styled.View`
  margin-bottom: 12px;
`;

export const CheckboxControl = styled.View`
  flex-direction: row;
  align-items: center;
`;

export const CheckboxLabel = styled(BaseText)`
  font-size: 16px;
  margin-left: ${ScreenGutter};
  flex-shrink: 1;
`;

export const CheckboxError = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  margin-top: 6px;
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

export const AuthActionRow = styled.View`
  margin-bottom: 32px;
`;

export const AuthActionText = styled(BaseText)`
  align-self: center;
  color: ${({theme}) => theme.colors.description};
  font-size: 18px;
`;

export default AuthFormContainer;
