import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {BaseText} from '../../../../components/styled/Text';
import {
  Action,
  LightBlack,
  LinkBlue,
  NeutralSlate,
  Slate,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {useTheme} from '../../../../contexts';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  accountCard: {
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  accountEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  unlinkButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  unlinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  connectButton: {
    backgroundColor: Action,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  connectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: White,
  },
  notConnectedText: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
});

export const Container = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.container, style]} {...rest} />
);

export const AccountCard = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.accountCard,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
};

export const AccountInfo = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.accountInfo, style]} {...rest} />
);

export const AccountName = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.accountName,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

export const AccountEmail = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.accountEmail,
        {color: theme.dark ? Slate : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

export const UnlinkButton = ({
  style,
  ...rest
}: React.ComponentProps<typeof TouchableOpacity>) => (
  <TouchableOpacity style={[styles.unlinkButton, style]} {...rest} />
);

export const UnlinkText = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.unlinkText,
        {color: theme.dark ? LinkBlue : Action},
        style,
      ]}
      {...rest}
    />
  );
};

export const ConnectButton = ({
  style,
  ...rest
}: React.ComponentProps<typeof TouchableOpacity>) => (
  <TouchableOpacity style={[styles.connectButton, style]} {...rest} />
);

export const ConnectButtonText = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.connectButtonText, style]} {...rest} />
);

export const NotConnectedText = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.notConnectedText,
        {color: theme.dark ? Slate : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};
