import {Platform} from 'react-native';
import styled from 'styled-components/native';
import {BaseText, H7} from '../../../components/styled/Text';

export const HeaderTitle = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 18px;
  text-transform: uppercase;
  margin-bottom: 12px;
  color: ${props => props.theme.colors.text};
`;

export const IconLabel = styled(H7)`
  padding-right: 12px;
  padding-left: 6px;
  padding-top: ${Platform.OS === 'ios' ? '4px' : 0};
  color: ${props => props.theme.colors.text};
`;
