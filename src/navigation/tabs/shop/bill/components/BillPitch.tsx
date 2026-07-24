import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../../contexts';
import {Trans, useTranslation} from 'react-i18next';
import {BaseText, Paragraph} from '../../../../../components/styled/Text';
import {Slate30, SlateDark} from '../../../../../styles/colors';
import {isNarrowHeight} from '../../../../../components/styled/Containers';
const BillsZeroState = require('../../../../../../assets/img/bills/bills-zero-state.png');

const styles = StyleSheet.create({
  billsValueProp: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billsImage: {
    width: isNarrowHeight ? 211 : 317,
    height: isNarrowHeight ? 161 : 242,
    marginTop: isNarrowHeight ? 13 : 20,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 28,
    textAlign: 'center',
    marginTop: 20,
    width: 341,
  },
  boldTitle: {
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    width: 310,
    marginTop: 10,
    textAlign: 'center',
    marginBottom: 20,
  },
});

const BillsValueProp = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.billsValueProp, style]} {...rest} />
);

const BillsImage = ({style, ...rest}: React.ComponentProps<typeof Image>) => (
  <Image style={[styles.billsImage, style]} {...rest} />
);

const TitleContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.titleContainer, style]} {...rest} />
);

const Title = ({style, ...rest}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.title, style]} {...rest} />
);

const BoldTitle = ({style, ...rest}: React.ComponentProps<typeof Title>) => (
  <Title style={[styles.boldTitle, style]} {...rest} />
);

const Subtitle = ({style, ...rest}: React.ComponentProps<typeof Paragraph>) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[
        styles.subtitle,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

export default () => {
  const {t} = useTranslation();
  return (
    <BillsValueProp>
      <BillsImage source={BillsZeroState} />
      <TitleContainer>
        <Title>
          <Trans
            i18nKey="BillPayPitch"
            values={{wallet: t('BitPay wallet')}}
            components={[<BoldTitle />]}
          />
        </Title>
        <Subtitle>
          {t('Make payments on everything from credit cards to mortgages.')}
        </Subtitle>
      </TitleContainer>
    </BillsValueProp>
  );
};
