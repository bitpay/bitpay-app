import React from 'react';
import {
  CardContainer,
  CardGutter,
  ScreenGutter,
} from '../../../../../components/styled/Containers';
import styled, {useTheme} from 'styled-components/native';
import {LightBlack, Slate30, White} from '../../../../../styles/colors';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {BoxShadow} from '../Styled';

const Container = styled(CardContainer)`
  height: 200px;
  width: 170px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  left: ${ScreenGutter};
  padding: ${CardGutter};
`;
const CarouselKeySkeleton = () => {
  const theme = useTheme();

  return (
    <Container style={!theme.dark && BoxShadow}>
      <SkeletonPlaceholder
        backgroundColor={theme.dark ? '#363636' : '#FAFAFB'}
        highlightColor={theme.dark ? '#575757' : Slate30}>
        <SkeletonPlaceholder.Item borderRadius={4} height={25} width={100} />
        <SkeletonPlaceholder.Item
          height={15}
          borderRadius={4}
          marginTop={30}
          width={100}
        />
        <SkeletonPlaceholder.Item
          height={25}
          borderRadius={4}
          marginTop={5}
          width={100}
        />

        <SkeletonPlaceholder.Item
          height={35}
          borderRadius={50}
          marginTop={40}
          alignSelf={'flex-end'}
          width={35}
        />
      </SkeletonPlaceholder>
    </Container>
  );
};

export default CarouselKeySkeleton;
