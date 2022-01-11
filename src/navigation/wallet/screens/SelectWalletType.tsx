import React, {useEffect} from 'react';
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

interface WalletType {
  id: string;
  title: string;
  description: string;
  cta: () => void;
  img: ImageSourcePropType;
  height: string;
}

const SelectWalletTypeContainer = styled.SafeAreaView`
  flex: 1;
`;

const SelectWalletTypeListContainer = styled.View`
  flex: 1;
  padding: 0 ${ScreenGutter};
  margin-top: 30px;
`;

const SelectWalletTypeList = styled.TouchableOpacity`
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

const SelectWalletType = () => {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>Select Wallet Type</HeaderTitle>,
      headerTitleAlign: 'center',
    });
  }, [navigation]);

  const walletTypeList: WalletType[] = [
    {
      id: 'basic',
      title: 'Basic Wallet',
      description:
        'Add coins like Bitcoin and Dogecoin, and also tokens like USDC and PAX',
      cta: () => navigation.navigate('Wallet', {screen: 'SelectAssets'}),
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
      title: 'Recover Wallet',
      description: 'Import your wallet using your backup passphrase',
      cta: () =>
        navigation.navigate('Wallet', {
          screen: 'ImportWallet',
          params: {isOnboarding: false},
        }),
      img: require('../../../../assets/img/wallet/wallet-type/recover.png'),
      height: '80px',
    },
  ];
  return (
    <SelectWalletTypeContainer>
      <SelectWalletTypeListContainer>
        {walletTypeList.map(
          ({cta, id, img, height, title, description}: WalletType) => (
            <SelectWalletTypeList
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
            </SelectWalletTypeList>
          ),
        )}
      </SelectWalletTypeListContainer>
    </SelectWalletTypeContainer>
  );
};

export default SelectWalletType;
