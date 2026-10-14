import React, {useLayoutEffect, useState} from 'react';
import {HeaderTitle, H5, Paragraph} from '../../../components/styled/Text';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../../../contexts';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Hr, ScreenGutter} from '../../../components/styled/Containers';
import {useTranslation} from 'react-i18next';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import {TouchableOpacity} from '../../../components/base/TouchableOpacity';
import {LightBlack, Slate30} from '../../../styles/colors';
import ErrorIcon from '../../../../assets/img/error.svg';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import Banner from '../../../components/banner/Banner';

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  keyInfoContainer: {
    flex: 1,
  },
  scrollView: {
    marginTop: 20,
    paddingHorizontal: gutter,
  },
  titleInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  keyParagraph: {
    fontSize: 18,
    marginTop: 5,
    marginHorizontal: 0,
    marginBottom: 20,
  },
});

const KeyInfoContainer: React.FC<React.ComponentProps<typeof SafeAreaView>> = ({
  style,
  ...rest
}) => <SafeAreaView style={[styles.keyInfoContainer, style]} {...rest} />;

const ScrollView: React.FC<
  React.ComponentProps<typeof KeyboardAwareScrollView>
> = ({style, ...rest}) => (
  <KeyboardAwareScrollView style={[styles.scrollView, style]} {...rest} />
);

const TitleInfoContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.titleInfoContainer, style]} {...rest} />
);

const Title: React.FC<React.ComponentProps<typeof H5>> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <H5 style={[{color: theme.dark ? Slate30 : LightBlack}, style]} {...rest} />
  );
};

const KeyParagraph: React.FC<React.ComponentProps<typeof Paragraph>> = ({
  style,
  ...rest
}) => <Paragraph style={[styles.keyParagraph, style]} {...rest} />;

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
        <Banner
          height={130}
          type={'error'}
          title={t('Warning')}
          description={t(
            'If your device is hacked or infected with malware, your private keys can be compromised and you may lose your crypto.',
          )}
          icon={ErrorIcon}
          titleFontSize={18}
          descriptionFontSize={16}
        />
      </ScrollView>
    </KeyInfoContainer>
  );
};

export default KeyInformation;
