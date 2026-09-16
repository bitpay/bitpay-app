import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import {BaseText} from '../../../../components/styled/Text';
import {Black, White} from '../../../../styles/colors';

const styles = StyleSheet.create({
  modalContainer: {
    padding: 20,
    height: '100%',
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
  },
  modalHeader: {
    marginVertical: 10,
    marginHorizontal: 0,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalHeaderRight: {
    position: 'absolute',
    right: 0,
  },
});

export const ModalContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.modalContainer,
        {backgroundColor: theme.dark ? Black : White},
        style,
      ]}
      {...rest}
    />
  );
});
ModalContainer.displayName = 'ModalContainer';

export const ModalHeader = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.modalHeader, style]} {...rest} />
));
ModalHeader.displayName = 'ModalHeader';

export const ModalHeaderText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.modalHeaderText, style]} {...rest} />
));
ModalHeaderText.displayName = 'ModalHeaderText';

export const ModalHeaderRight = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.modalHeaderRight, style]} {...rest} />
));
ModalHeaderRight.displayName = 'ModalHeaderRight';
