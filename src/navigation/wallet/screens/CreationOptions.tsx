import React, {useLayoutEffect} from 'react';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {useNavigation} from '@react-navigation/native';
import {Feather, LightBlack, SlateDark, White} from '../../../styles/colors';
import {BaseText, H6, HeaderTitle} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';

interface Option {
  id: string;
  title: string;
  description: string;
  cta: () => void;
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

const Title = styled(H6)`
  font-weight: 700;
  margin-bottom: 5px;
  color: ${({theme}) => theme.colors.text};
`;

const InfoContainer = styled.View`
  padding: 20px;
  justify-content: center;
  flex: 1;
`;

const Description = styled(BaseText)`
  font-size: 14px;
  line-height: 18px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;
const CreationOptions: React.FC = () => {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>Select an option</HeaderTitle>,
      headerTitleAlign: 'center',
    });
  }, [navigation]);

  const optionList: Option[] = [
    {
      id: 'basic',
      title: 'New Key',
      description:
        'Add coins like Bitcoin and Dogecoin and also tokens like USDC and PAX',
      cta: () =>
        navigation.navigate('Wallet', {
          screen: 'CurrencySelection',
          params: {context: 'createNewKey'},
        }),
      height: '98px',
    },
    {
      id: 'import',
      title: 'Import Key',
      description:
        'Use an existing recovery phrase to import an existing wallet',
      cta: () =>
        navigation.navigate('Wallet', {
          screen: 'Import',
        }),
      height: '80px',
    },
    {
      id: 'multisig',
      title: 'Multisig Wallet',
      description: 'Requires multiple people or devices and is the most secure',
      cta: () => {},
      height: '80px',
    },
  ];
  return (
    <OptionContainer>
      <OptionListContainer>
        {optionList.map(({cta, id, title, description}: Option) => (
          <OptionList
            activeOpacity={ActiveOpacity}
            onPress={() => {
              haptic('impactLight');
              cta();
            }}
            key={id}>
            <InfoContainer>
              <Title>{title}</Title>
              <Description>{description}</Description>
            </InfoContainer>
          </OptionList>
        ))}
      </OptionListContainer>
    </OptionContainer>
  );
};

export default CreationOptions;
