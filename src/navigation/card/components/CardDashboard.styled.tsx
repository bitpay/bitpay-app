import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, H5} from '../../../components/styled/Text';
import {
  Air,
  LightBlack,
  NeutralSlate,
  Slate,
  SlateDark,
} from '../../../styles/colors';
import {TouchableOpacity} from 'react-native-gesture-handler';

export const TransactionListHeader = styled.View`
background-color: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
flex-direction: row;
min-height: 50px;
align-items: center;
padding: ${ScreenGutter}
border-bottom-width: 1px;
border-color: ${({theme}) => (theme.dark ? LightBlack : Air)};
`;

export const TransactionListHeaderTitle = styled(H5)`
  flex: 1;
`;

export const TransactionListHeaderIcon = styled(TouchableOpacity)`
  flex-grow: 0;
  margin-left: ${ScreenGutter};
`;

export const TransactionListFooter = styled.View`
  margin-top: 44px;
  padding: ${ScreenGutter};
`;

export const EmptyListContainer = styled.View`
  align-items: center;
  padding: ${ScreenGutter};
  margin: 28px ${ScreenGutter} 108px;
`;

export const EmptyGhostContainer = styled.View`
  margin-bottom: 32px;
`;

export const EmptyListDescription = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? Slate : SlateDark)};
  font-size: 16px;
  line-height: 25px;
  text-align: center;
`;
