import React, {useLayoutEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {Linking, ScrollView} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTheme} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import styled from 'styled-components/native';
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

const MerchantDetailsContainer = styled.SafeAreaView`
  flex: 1;
`;

const GradientBox = styled(LinearGradient)`
  width: ${WIDTH}px;
  height: 80px;
`;

const ContentContainer = styled(SectionContainer)`
  padding: 0 3px 100px;
`;

const MerchantName = styled(H3)`
  margin-bottom: 15px;
`;

const Divider = styled(SectionDivider)`
  margin: 25px 0;
`;

const SectionHeader = styled(H5)`
  margin-bottom: 15px;
`;

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
