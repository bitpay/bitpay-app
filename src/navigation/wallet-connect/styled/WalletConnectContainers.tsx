import {Platform} from 'react-native';
import styled from 'styled-components/native';

export const WalletConnectContainer = styled.View`
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
