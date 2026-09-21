import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../../contexts';
import {LightBlack, Slate30, White} from '../../../../../styles/colors';
import {ScreenGutter} from '../../../../../components/styled/Containers';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {BoxShadow} from '../Styled';

const styles = StyleSheet.create({
  listCard: {
    borderRadius: 12,
    marginVertical: 10,
    marginHorizontal: parseInt(ScreenGutter, 10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    height: 75,
  },
});

const ListCard: React.FC<{style?: any; children?: React.ReactNode}> = ({
  style,
  children,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.listCard,
        {backgroundColor: theme.dark ? LightBlack : White},
        style,
      ]}>
      {children}
    </View>
  );
};

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
