import React from 'react';
import {View, ViewProps, Text, TextProps, StyleSheet} from 'react-native';
import {useTheme} from '../../../contexts';
import Button from '../../../components/button/Button';
import {Br, HEIGHT} from '../../../components/styled/Containers';
import SuccessSvg from '../../../../assets/img/success.svg';
import {
  BaseText,
  H3,
  Paragraph,
  TextAlign,
} from '../../../components/styled/Text';
import {Action, White} from '../../../styles/colors';
import {useAppSelector} from '../../../utils/hooks';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {BitpayIdGroupParamList, BitpayIdScreens} from '../BitpayIdGroup';
import {useTranslation} from 'react-i18next';

type ReceivingEnabledProps = NativeStackScreenProps<
  BitpayIdGroupParamList,
  BitpayIdScreens.RECEIVING_ENABLED
>;

const styles = StyleSheet.create({
  viewContainer: {
    padding: 16,
    flexDirection: 'column',
    height: HEIGHT - 110,
  },
  viewBody: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 100,
  },
  emailContainer: {
    alignItems: 'center',
    height: 48,
    paddingTop: 0,
    paddingRight: 14,
    paddingBottom: 0,
    paddingLeft: 17,
    borderRadius: 48,
    width: '100%',
    maxWidth: 300,
    marginTop: 32,
    flexDirection: 'row',
  },
  emailText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

const ViewContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.viewContainer, style]} {...rest} />
);

const ViewBody = ({style, ...rest}: ViewProps) => (
  <View style={[styles.viewBody, style]} {...rest} />
);

const EmailContainer = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.emailContainer,
        {
          backgroundColor: `rgba(34, 64, 196, ${theme.dark ? 0.35 : 0.05})`,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const EmailText = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[styles.emailText, {color: theme.dark ? White : Action}, style]}
      {...rest}
    />
  );
});

const ReceivingEnabled = ({navigation}: ReceivingEnabledProps) => {
  const {t} = useTranslation();
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  return (
    <ViewContainer>
      <ViewBody>
        <SuccessSvg height={50} width={50} style={{marginBottom: 24}} />
        <TextAlign align="center">
          <H3>{t('Email payments has been enabled!')}</H3>
        </TextAlign>
        <Br />
        <TextAlign align="center">
          <Paragraph>
            {t(
              'Your friends and family can now send crypto straight to your email address.',
            )}
          </Paragraph>
        </TextAlign>
        <EmailContainer>
          <EmailText style={{flexGrow: 1}}>{user!.email}</EmailText>
          <SuccessSvg height={20} width={20} />
        </EmailContainer>
      </ViewBody>
      <Button buttonStyle={'primary'} onPress={() => navigation.pop(3)}>
        {t('Go back to settings')}
      </Button>
    </ViewContainer>
  );
};

export default ReceivingEnabled;
