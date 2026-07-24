import React from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../../contexts';
import {Link, Paragraph} from '../../../../../components/styled/Text';
import {
  LightBlack,
  NeutralSlate,
  Slate30,
  SlateDark,
} from '../../../../../styles/colors';
import ClockSvg from '../../../../../../assets/img/bills/clock.svg';
import InfoSvg from '../../../home/components/InfoSvg';

const styles = StyleSheet.create({
  alertContainer: {
    flexDirection: 'row',
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 17,
    paddingLeft: 14,
    borderRadius: 8,
  },
  alertBody: {
    marginLeft: 14,
  },
  alertText: {
    fontSize: 14,
    paddingRight: 25,
    lineHeight: 19,
  },
  alertLink: {
    fontSize: 14,
    lineHeight: 19,
  },
  alertHeader: {
    fontWeight: '500',
    marginBottom: 3,
  },
  iconContainer: {
    alignSelf: 'center',
  },
});

const AlertContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.alertContainer,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
};

const AlertBody = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.alertBody, style]} {...rest} />
);

const AlertText = ({
  style,
  ...rest
}: React.ComponentProps<typeof Paragraph>) => (
  <Paragraph style={[styles.alertText, style]} {...rest} />
);

const AlertLink = ({style, ...rest}: React.ComponentProps<typeof Link>) => (
  <Link style={[styles.alertLink, style]} {...rest} />
);

const AlertHeader = ({
  style,
  ...rest
}: React.ComponentProps<typeof Paragraph>) => (
  <Paragraph style={[styles.alertHeader, style]} {...rest} />
);

const IconContainer = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.iconContainer, style]} {...rest} />
);

export default ({
  variant = 'noLateFees',
}: {
  variant?: 'noLateFees' | 'servicePaused';
}) => {
  const theme = useTheme();
  return (
    <AlertContainer>
      {variant === 'servicePaused' ? (
        <IconContainer>
          <InfoSvg
            width={22}
            height={22}
            color={theme.dark ? Slate30 : SlateDark}
          />
        </IconContainer>
      ) : (
        <ClockSvg style={{marginTop: 5}} />
      )}
      <AlertBody>
        {variant === 'servicePaused' ? (
          <>
            <AlertText>
              Bill Pay service has been temporarily paused. At this time, we are
              unable to provide a confirmed timeline for when the Bill Pay
              service will resume.
              <AlertLink
                onPress={() =>
                  Linking.openURL(
                    'https://support.bitpay.com/hc/en-us/articles/41956465346061-Pausing-Bill-Pay-Services-on-2025-12-26',
                  )
                }>
                {' Learn more'}
              </AlertLink>
            </AlertText>
          </>
        ) : (
          <>
            <AlertHeader>No late fees</AlertHeader>
            <AlertText style={{marginBottom: 4}}>
              Your bank will give you credit for making this payment within one
              business day, but it may take 3-7 business days for it to show up
              on your bank statement.
            </AlertText>
          </>
        )}
      </AlertBody>
    </AlertContainer>
  );
};
