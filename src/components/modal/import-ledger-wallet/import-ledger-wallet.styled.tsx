import React from 'react';
import {StyleSheet, View} from 'react-native';

const styles = StyleSheet.create({
  wrapper: {minHeight: 405},
  header: {display: 'flex', alignItems: 'center', paddingTop: 24},
  descriptionRow: {alignItems: 'center', flexGrow: 1, paddingTop: 12},
  actionsRow: {marginTop: 24},
  iconRow: {display: 'flex', alignItems: 'center', flexGrow: 1},
});

const makeContainer = (style: object) =>
  React.forwardRef<View, React.ComponentProps<typeof View>>(
    ({style: incomingStyle, ...rest}, ref) => (
      <View ref={ref} style={[style, incomingStyle]} {...rest} />
    ),
  );

export const Wrapper = makeContainer(styles.wrapper);
export const Header = makeContainer(styles.header);
export const DescriptionRow = makeContainer(styles.descriptionRow);
export const ActionsRow = makeContainer(styles.actionsRow);
export const IconRow = makeContainer(styles.iconRow);
