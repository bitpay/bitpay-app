import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {H5, H7} from '../../../../components/styled/Text';
import {Black, Slate, White} from '../../../../styles/colors';

export const HeaderContainer = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  margin: 10px ${ScreenGutter};
`;

export const HeaderButtonContainer = styled.View`
  margin-left: ${ScreenGutter};
`;

export const HomeContainer = styled.SafeAreaView`
  flex: 1;
`;

export const HomeSectionSubtext = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? Slate : Black)};
`;

export const HomeSectionTitle = styled(H5)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
`;

export const HomeSectionSubTitle = styled(HomeSectionTitle)`
  font-size: 16px;
`;

export const SectionHeaderContainer = styled.View<{justifyContent?: string}>`
  flex-direction: row;
  margin: 20px ${ScreenGutter} 10px;
  justify-content: ${({justifyContent}) => justifyContent || 'flex-start'};
`;

export const CarouselItemContainer = styled.View`
  padding: 20px 0;
`;

export const BoxShadow = {
  shadowColor: '#000',
  shadowOffset: {width: 0, height: 1},
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 5,
};
