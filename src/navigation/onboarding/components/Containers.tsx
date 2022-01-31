import styled from 'styled-components/native';
import {HEIGHT} from '../../../components/styled/Containers';
import FastImage from 'react-native-fast-image';

export const OnboardingImage = styled(FastImage)`
  height: ${HEIGHT * 0.3}px;
  width: ${HEIGHT * 0.3}px;
`;
