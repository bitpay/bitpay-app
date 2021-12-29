import React, {ReactElement} from 'react';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {StyleProp, TextStyle} from 'react-native';
import {useTheme} from '@react-navigation/native';
import {Feather, LightBlack, SlateDark, White} from '../../../styles/colors';
import CreateWalletSvg from '../../../../assets/img/wallet/create-wallet.svg';
import RecoverySvg from '../../../../assets/img/wallet/recover.svg';
import MultisigSvg from '../../../../assets/img/wallet/multisig.svg';
import {BaseText, H4} from '../../../components/styled/Text';

interface WalletType {
  id: string;
  title: string;
  description: string;
  cta: () => void;
  img: ReactElement;
}

const SelectWalletTypeContainer = styled.SafeAreaView`
  flex: 1;
  margin: ${ScreenGutter};
`;

const SelectWalletTypeListContainer = styled.View<{isDark: boolean}>`
  background-color: ${({isDark}) => (isDark ? LightBlack : Feather)};
  height: 100px;
  border-radius: 12px;
  margin-bottom: ${ScreenGutter};
  flex-direction: row;
  overflow: hidden;
`;

const ImageContainer = styled.View`
  width: 100px;
`;

const Title = styled(H4)`
  font-weight: bold;
  font-size: 16px;
`;

const InfoContainer = styled.View`
  padding: ${ScreenGutter} 0;
  justify-content: center;
  flex: 1;
`;

const Description = styled(BaseText)<{isDark: boolean}>`
  font-size: 14px;
  line-height: 18px;
  color: ${({isDark}) => (isDark ? White : SlateDark)};
`;

const SelectWalletType = () => {
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};

  const walletTypeList: WalletType[] = [
    {
      id: 'basic',
      title: 'Basic Wallet',
      description:
        'Add coins like Bitcoin and Dogecoin, and also tokens like USDC and PAX',
      cta: () => {},
      img: <CreateWalletSvg height={115} />,
    },
    {
      id: 'multisig',
      title: 'Multisig Wallet',
      description: 'Requires multiple devices and is the most secure',
      cta: () => {},
      img: <MultisigSvg height={130} />,
    },
    {
      id: 'recover',
      title: 'Recover Wallet',
      description: 'Import your wallet using your backup passphrase',
      cta: () => {},
      img: <RecoverySvg height={115} />,
    },
  ];
  return (
    <SelectWalletTypeContainer>
      {walletTypeList.map((type: WalletType) => (
        <SelectWalletTypeListContainer isDark={theme.dark} key={type.id}>
          <ImageContainer>{type.img}</ImageContainer>
          <InfoContainer>
            <Title style={textStyle}>{type.title}</Title>
            <Description>{type.description}</Description>
          </InfoContainer>
        </SelectWalletTypeListContainer>
      ))}
    </SelectWalletTypeContainer>
  );
};

export default SelectWalletType;
