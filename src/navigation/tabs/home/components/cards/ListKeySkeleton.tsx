import React from 'react';
import styled, {useTheme} from 'styled-components/native';
import {LightBlack, Slate30, White} from '../../../../../styles/colors';
import {ScreenGutter} from '../../../../../components/styled/Containers';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {BoxShadow} from '../Styled';

const ListCard = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-radius: 12px;
  margin: 10px ${ScreenGutter};
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  height: 75px;
`;

const ListKeySkeleton = () => {
  const theme = useTheme();

  return (
    <ListCard style={!theme.dark && BoxShadow}>
      <SkeletonPlaceholder
        backgroundColor={theme.dark ? '#363636' : '#FAFAFB'}
        highlightColor={theme.dark ? '#575757' : Slate30}>
        <SkeletonPlaceholder.Item borderRadius={4} height={15} width={125} />
        <SkeletonPlaceholder.Item
          height={15}
          borderRadius={4}
          marginTop={4}
          width={100}
        />
      </SkeletonPlaceholder>

      <SkeletonPlaceholder
        backgroundColor={theme.dark ? '#363636' : '#FAFAFB'}
        highlightColor={theme.dark ? '#575757' : Slate30}>
        <SkeletonPlaceholder.Item borderRadius={4} height={15} width={50} />
        <SkeletonPlaceholder.Item
          borderRadius={4}
          height={15}
          marginTop={4}
          width={50}
        />
      </SkeletonPlaceholder>
    </ListCard>
  );
};

export default ListKeySkeleton;
