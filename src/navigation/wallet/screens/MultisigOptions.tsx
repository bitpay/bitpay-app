import React, {useEffect} from 'react';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {ImageSourcePropType} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Feather, LightBlack, SlateDark, White} from '../../../styles/colors';
import {BaseText, H6, HeaderTitle} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import {WalletStackParamList} from '../WalletStack';
import {Key} from '../../../store/wallet/wallet.models';
import {RouteProp} from '@react-navigation/core';

export type MultisigOptionsParamList = {
  key?: Key;
};

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
  align-items: center;
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
`;

const MultisigOptions = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'AddingOptions'>>();
  const {key} = route.params || {};

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>Multisig</HeaderTitle>,
      headerTitleAlign: 'center',
    });
  }, [navigation]);

  const optionList: Option[] = [
    {
      id: 'basic',
      title: 'Create a Shared Wallet',
      description: 'Use more than one device to create a multisig wallet',
      cta: () =>
        navigation.navigate('Wallet', {
          screen: 'CurrencySelection',
          params: {context: 'addWalletMultisig', key},
        }),
      img: require('../../../../assets/img/wallet/wallet-type/add-multisig.png'),
      height: '14px',
    },
    {
      id: 'multisig',
      title: 'Join a Shared Wallet',
      description:
        "Joining another user's multisig wallet requires an invitation to join",
      cta: () =>
        navigation.navigate('Wallet', {
          screen: 'JoinMultisig',
          params: {key},
        }),
      img: require('../../../../assets/img/wallet/wallet-type/add-join.png'),
      height: '17px',
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

export default MultisigOptions;
