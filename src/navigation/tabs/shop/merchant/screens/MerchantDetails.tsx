import React, {useLayoutEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {Linking, ScrollView, SafeAreaView, StyleSheet} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTheme} from '../../../../../contexts';
import LinearGradient from 'react-native-linear-gradient';
import {MerchantGroupParamList} from '../MerchantGroup';
import RemoteImage from '../../components/RemoteImage';
import FooterButtonContainer from '../../../../../components/footer/FooterButtonContainer';
import {WIDTH} from '../../../../../components/styled/Containers';
import Button from '../../../../../components/button/Button';
import {
  getMastheadGradient,
  SectionContainer,
  SectionDivider,
  SectionSpacer,
} from '../../components/styled/ShopTabComponents';
import {
  H3,
  H5,
  HeaderTitle,
  Paragraph,
} from '../../../../../components/styled/Text';
import HeaderBackButton from '../../../../../components/back/HeaderBackButton';

const styles = StyleSheet.create({
  merchantDetailsContainer: {
    flex: 1,
  },
  gradientBox: {
    width: WIDTH,
    height: 80,
  },
  contentContainer: {
    paddingTop: 0,
    paddingHorizontal: 3,
    paddingBottom: 100,
  },
  merchantName: {
    marginBottom: 15,
  },
  divider: {
    marginVertical: 25,
  },
  sectionHeader: {
    marginBottom: 15,
  },
});

const MerchantDetailsContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView style={[styles.merchantDetailsContainer, style]} {...rest} />
);

const GradientBox = ({
  style,
  ...rest
}: React.ComponentProps<typeof LinearGradient>) => (
  <LinearGradient style={[styles.gradientBox, style]} {...rest} />
);

const ContentContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SectionContainer>) => (
  <SectionContainer style={[styles.contentContainer, style]} {...rest} />
);

const MerchantName = ({style, ...rest}: React.ComponentProps<typeof H3>) => (
  <H3 style={[styles.merchantName, style]} {...rest} />
);

const Divider = ({
  style,
  ...rest
}: React.ComponentProps<typeof SectionDivider>) => (
  <SectionDivider style={[styles.divider, style]} {...rest} />
);

const SectionHeader = ({style, ...rest}: React.ComponentProps<typeof H5>) => (
  <H5 style={[styles.sectionHeader, style]} {...rest} />
);

const MerchantDetails = ({
  route,
  navigation,
}: NativeStackScreenProps<MerchantGroupParamList, 'MerchantDetails'>) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const {directIntegration} = route.params;
  const iconHeight = 70;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <HeaderBackButton />,
      headerTitle: () => (
        <HeaderTitle>{directIntegration.displayName}</HeaderTitle>
      ),
    });
  });
  return (
    <MerchantDetailsContainer>
      <ScrollView>
        <GradientBox colors={getMastheadGradient(theme)} />
        <SectionContainer style={{marginTop: -iconHeight / 2}}>
          <RemoteImage
            uri={directIntegration.icon}
            height={iconHeight}
            width={iconHeight}
            borderRadius={50}
          />
          <SectionSpacer />
          <ContentContainer>
            <MerchantName>{directIntegration.displayName}</MerchantName>
            <Paragraph>{directIntegration.caption}</Paragraph>
            <Divider />
            <SectionHeader>{t('Payment Instructions')}</SectionHeader>
            <Paragraph>{directIntegration.instructions}</Paragraph>
          </ContentContainer>
        </SectionContainer>
      </ScrollView>
      <FooterButtonContainer>
        <Button
          onPress={() => Linking.openURL(directIntegration.link)}
          buttonStyle={'primary'}>
          {t('Go to') + ' ' + directIntegration.displayName}
        </Button>
      </FooterButtonContainer>
    </MerchantDetailsContainer>
  );
};

export default MerchantDetails;
