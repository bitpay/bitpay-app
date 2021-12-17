import {useNavigation} from '@react-navigation/core';
import React, {ReactElement} from 'react';
import styled from 'styled-components/native';
import haptic from '../haptic-feedback/haptic';
import {NeutralSlate, SlateDark} from '../../styles/colors';
import {BaseText} from '../styled/Text';

// Images
import AdvSwapImg from '../../../assets/img/advertisement/adv-swap.svg';
import AdvBuyImg from '../../../assets/img/advertisement/adv-buy.svg';

interface Props {
  id: string;
}

interface AdvertisementObjProps {
  title: string;
  text: string;
  img: ReactElement;
  navigate: keyof ReactNavigation.RootParamList;
}

type AdvertisementObj<T> = {[key in string]: T};

const AdvertisementObj: AdvertisementObj<AdvertisementObjProps> = {
  buyCrypto: {
    title: 'Buy Crypto',
    text: 'Exchange ERC-20 Tokens or cross chain assets',
    img: <AdvBuyImg />,
    navigate: 'BuyCrypto',
  },
  swapCrypto: {
    title: 'Swap Crypto',
    text: 'Buy direct using your debit or credit card',
    img: <AdvSwapImg />,
    navigate: 'SwapCrypto',
  },
};

const AdvertisementCardContainer = styled.TouchableOpacity`
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: ${NeutralSlate};
  border-radius: 12px;
  padding: 20px 100px 20px 20px;
  position: relative;
  min-height: 112px;
  margin: 10px 16px 10px 16px;
`;

const AdvertisementCardTitle = styled(BaseText)`
  font-style: normal;
  font-weight: bold;
  font-size: 16px;
  line-height: 23px;
  margin-bottom: 5px;
`;

const AdvertisementCardText = styled(BaseText)`
  font-size: 14px;
  line-height: 21px;
  color: ${SlateDark};
`;

const AdvertisementCardImg = styled.View`
  position: absolute;
  bottom: 0;
  right: 0;
`;

const AdvertisementCard: React.FC<Props> = ({id}) => {
  const navigation = useNavigation();
  return (
    <AdvertisementCardContainer
      onPress={() => {
        console.log(`Service option clicked: ${id}`);
        haptic('impactLight');
        navigation.navigate(AdvertisementObj[id].navigate, {screen: 'Root'});
      }}>
      <AdvertisementCardTitle>
        {AdvertisementObj[id].title}
      </AdvertisementCardTitle>
      <AdvertisementCardText>{AdvertisementObj[id].text}</AdvertisementCardText>
      <AdvertisementCardImg>{AdvertisementObj[id].img}</AdvertisementCardImg>
    </AdvertisementCardContainer>
  );
};

export default AdvertisementCard;
