import styled from 'styled-components/native';
import FastImage from 'react-native-fast-image';
import {BaseText} from '../../../../../components/styled/Text';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

export const RowDataContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

export const CryptoAmountContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

export const CryptoTitle = styled(BaseText)`
  color: #667;
`;

export const CryptoContainer = styled.View`
  display: flex;
  flex-direction: row;
`;

export const CryptoAmount = styled(BaseText)`
  font-size: 35px;
`;

export const CryptoUnit = styled(BaseText)`
  font-size: 15px;
  padding-top: 7px;
  padding-left: 5px;
`;

export const IconContainer = styled(FastImage)`
  height: 40px;
  width: 40px;
`;

export const RowLabel = styled(BaseText)`
  font-size: 14px;
`;

export const RowData = styled(BaseText)`
  font-size: 16px;
  color: #9b9bab;
`;

export const LabelTip = styled.View<{type?: string}>`
  background-color: ${({type, theme: {dark}}) => {
    switch (type) {
      case 'warn':
        return dark ? 'rgba(56, 56, 56, 0.8)' : '#fff7f2';
      case 'info':
        return dark ? 'rgba(56, 56, 56, 0.8)' : '#eff1f8';
    }
  }};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

export const LabelTipText = styled(BaseText)`
  color: ${({theme: {dark}}) =>
    dark ? 'rgba(255, 255, 255, 0.6)' : '#4a4a4a'};
`;

export const ColumnDataContainer = styled.View`
  margin-top: 20px;
`;

export const ColumnData = styled(BaseText)`
  font-size: 16px;
  color: #9b9bab;
  padding-top: 10px;
`;

export const CopyImgContainerRight = styled.View`
  margin-left: 5px;
  padding-top: 8px;
`;

export const CopiedContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

export const RemoveCta = styled(TouchableOpacity)`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  height: 60px;
  margin-top: 30px;
`;

export const ExternalServiceContainer = styled.View`
  padding: 0 15px;
`;
