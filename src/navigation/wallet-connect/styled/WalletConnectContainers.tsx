import {Platform} from 'react-native';
import styled, {css} from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';

export const WalletConnectContainer = styled.SafeAreaView`
  flex: 1;
`;

export const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 16px;
`;

export const ItemContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 71px;
`;

export const ItemTouchableContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 71px;
`;

export const ItemTitleContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  max-width: 250px;
`;

export const ItemTitleTouchableContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  max-width: 50%;
`;

export const ItemNoteContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
`;

export const ItemNoteTouchableContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
`;

export const WalletConnectIconContainer = styled.View`
  margin-right: 5px;
  margin-bottom: ${Platform.OS === 'ios' ? '2px' : 0};
`;

export const IconContainer = styled.View`
  height: auto;
  width: auto;
  border-radius: 9px;
  overflow: hidden;
`;

export const WalletConnectCtaContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding: 0 ${ScreenGutter};
  ${({platform}: {platform: string}) =>
    platform === 'ios' &&
    css`
      margin-bottom: 10px;
    `}
`;

export const NoGutter = styled.View`
  margin: 0 -10px;
  padding-right: 5px;
`;
