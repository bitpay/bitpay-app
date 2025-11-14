import React, {useLayoutEffect, useState} from 'react';
import {
  HeaderTitle,
  H5,
  Paragraph,
  InfoHeader,
  InfoTitle,
  InfoDescription,
} from '../../../components/styled/Text';
import {useNavigation} from '@react-navigation/native';
import styled from 'styled-components/native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {
  Hr,
  Info,
  InfoImageContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {useTranslation} from 'react-i18next';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import {TouchableOpacity} from '../../../components/base/TouchableOpacity';
import {LightBlack, Slate30} from '../../../styles/colors';
import ErrorIcon from '../../../../assets/img/error.svg';
import {View} from 'react-native';

const KeyInfoContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const TitleInfoContainer = styled(TouchableOpacity)`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  margin-top: 10px;
  margin-bottom: 10px;
`;

const Title = styled(H5)`
  color: ${({theme: {dark}}) => (dark ? Slate30 : LightBlack)};
`;

const KeyParagraph = styled(Paragraph)`
  font-size: 18px;
  margin: 5px 0 20px;
`;

const InfoRowContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 0 15px;
`;

const InfoRow = styled.View``;

const KeyInformation = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Key Information')}</HeaderTitle>,
    });
  });

  const items = [
    {
      id: '1',
      title: t('Where are my private keys stored?'),
      content: t('They are encrypted and stored locally on your device.'),
    },
    {
      id: '2',
      title: t('How are my keys stored?'),
      content: t(
        'Your keys are protected by 12-word recovery phrase which unlocks access to your crypto.',
      ),
    },
    {
      id: '3',
      title: t('Where are they backed up?'),
      content: t(
        "BitPay never stores your recovery phrase or private keys. It's your responsibility to back them up. Write your recovery phrase on the printable backup template or export and secure the backup file.",
      ),
    },
  ];

  const [open, setOpen] = useState(items.map(() => true));

  const toggleItem = (index: number) => {
    setOpen(prev => prev.map((v, i) => (i === index ? !v : v)));
  };

  return (
    <KeyInfoContainer>
      <ScrollView>
        {items.map((item, i) => (
          <View key={item.id}>
            <TitleInfoContainer onPress={() => toggleItem(i)}>
              <Title>{item.title}</Title>
              {open[i] ? <ChevronUpSvg /> : <ChevronDownSvg />}
            </TitleInfoContainer>
            {open[i] && <KeyParagraph>{item.content}</KeyParagraph>}
            <Hr />
          </View>
        ))}
        <Info style={{marginTop: 30, borderRadius: 15, paddingRight: 25}}>
          <InfoRowContainer>
            <InfoRow>
              <InfoImageContainer infoMargin={'0 15px 0 0'}>
                <ErrorIcon />
              </InfoImageContainer>
            </InfoRow>
            <InfoRow>
              <InfoHeader>
                <InfoTitle style={{fontSize: 18}}>{t('Warning')}</InfoTitle>
              </InfoHeader>
              <InfoDescription>
                {t(
                  'If your device is hacked or infected with malware, your private keys can be compromised and you may lose your crypto.',
                )}
              </InfoDescription>
            </InfoRow>
          </InfoRowContainer>
        </Info>
      </ScrollView>
    </KeyInfoContainer>
  );
};

export default KeyInformation;
