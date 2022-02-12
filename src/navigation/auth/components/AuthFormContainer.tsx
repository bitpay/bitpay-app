import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';

const AuthFormContainer = styled.SafeAreaView`
  padding: ${ScreenGutter};
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

export default AuthFormContainer;
