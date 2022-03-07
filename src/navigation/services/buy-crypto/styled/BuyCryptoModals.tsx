import styled from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import {Black, White} from '../../../../styles/colors';

export const ModalContainer = styled.View`
  padding: 20px;
  height: 100%;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
  border-top-left-radius: 17px;
  border-top-right-radius: 17px;
`;

export const ModalHeader = styled.View`
  margin: 10px 0;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  position: relative;
`;

export const ModalHeaderText = styled(BaseText)`
  font-size: 18px;
  font-weight: bold;
`;

export const ModalHeaderRight = styled(BaseText)`
  position: absolute;
  right: 0;
`;
