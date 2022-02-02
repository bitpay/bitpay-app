import React, {useLayoutEffect} from 'react';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {ImageSourcePropType} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Feather, LightBlack, SlateDark, White} from '../../../styles/colors';
import {BaseText, H6, HeaderTitle} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';

interface Option {
  id: string;
  title: string;
  description: string;
  cta: () => void;
  img: ImageSourcePropType;
  height: string;
}

const OptionContainer = styled.SafeAreaView`
  flex: 1;
`;

const OptionListContainer = styled.View`
  flex: 1;
  padding: 0 ${ScreenGutter};
  margin-top: 30px;
`;

const OptionList = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Feather)};
  height: 100px;
  border-radius: 12px;
  margin-bottom: ${ScreenGutter};
  flex-direction: row;
  overflow: hidden;
`;

const ImageContainer = styled.View`
  width: 100px;
`;

const Title = styled(H6)`
  margin-bottom: 3px;
  color: ${({theme}) => theme.colors.text};
`;

const InfoContainer = styled.View`
  padding: ${ScreenGutter} ${ScreenGutter} ${ScreenGutter} 0;
  justify-content: center;
  flex: 1;
`;

const Description = styled(BaseText)`
  font-size: 14px;
  line-height: 18px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const Image = styled.Image<{imgHeight: string}>`
  width: 80px;
  height: ${({imgHeight}) => imgHeight};
  position: absolute;
  bottom: 0;
`;

const CreationOptions: React.FC = () => {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>Create</HeaderTitle>,
      headerTitleAlign: 'center',
    });
  }, [navigation]);

  const optionList: Option[] = [
    {
      id: 'basic',
      title: 'New Key',
      description:
        'Add coins like Bitcoin and Dogecoin, and also tokens like USDC and PAX',
      cta: () =>
        navigation.navigate('Wallet', {
          screen: 'CurrencySelection',
          params: {context: 'createNewKey'},
        }),
      img: require('../../../../assets/img/wallet/wallet-type/create-wallet.png'),
      height: '98px',
    },
    {
      id: 'multisig',
      title: 'Multisig Wallet',
      description: 'Requires multiple devices and is the most secure',
      cta: () => {},
      img: require('../../../../assets/img/wallet/wallet-type/multisig.png'),
      height: '80px',
    },
    {
      id: 'recover',
      title: 'Recover Key',
      description: 'Import your wallet using your backup passphrase',
      cta: () =>
        navigation.navigate('Wallet', {
          screen: 'Import',
        }),
      img: require('../../../../assets/img/wallet/wallet-type/recover.png'),
      height: '80px',
    },
  ];
  return (
    <OptionContainer>
      <OptionListContainer>
        {optionList.map(
          ({cta, id, img, height, title, description}: Option) => (
            <OptionList
              activeOpacity={ActiveOpacity}
              onPress={() => {
                haptic('impactLight');
                cta();
              }}
              key={id}>
              <ImageContainer>
                <Image source={img} resizeMode={'contain'} imgHeight={height} />
              </ImageContainer>
              <InfoContainer>
                <Title>{title}</Title>
                <Description>{description}</Description>
              </InfoContainer>
            </OptionList>
          ),
        )}
      </OptionListContainer>
    </OptionContainer>
  );
};

export default CreationOptions;
