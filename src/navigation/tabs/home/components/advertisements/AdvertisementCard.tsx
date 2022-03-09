import React from 'react';
import {Image, ImageSourcePropType, Linking} from 'react-native';
import styled from 'styled-components/native';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {ActiveOpacity} from '../../../../../components/styled/Containers';
import {BaseText} from '../../../../../components/styled/Text';
import {AppEffects} from '../../../../../store/app';
import {
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {useAppDispatch} from '../../../../../utils/hooks';

export interface Advertisement {
  id: string;
  img: ImageSourcePropType;
  title: string;
  description: string;
  url?: string;
  openURLInWebView: boolean;
}

interface AdvertisementCardProps {
  advertisement: Advertisement;
}

const AdvertisementCardContainer = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 12px;
  flex-direction: column;
  justify-content: center;
  min-height: 112px;
  overflow: hidden;
  padding: 20px 100px 20px 20px;
  position: relative;
`;

const AdvertisementCardTitle = styled(BaseText)`
  font-style: normal;
  font-weight: bold;
  font-size: 16px;
  line-height: 23px;
  margin-bottom: 5px;
  color: ${({theme}) => theme.colors.text};
`;

const AdvertisementCardDescription = styled(BaseText)`
  font-size: 14px;
  line-height: 21px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const ADVERTISEMENT_ICON_HEIGHT = 126;
const ADVERTISEMENT_ICON_WIDTH = 96;

const AdvertisementCard: React.FC<AdvertisementCardProps> = props => {
  const {advertisement} = props;
  const {title, description, img, url, openURLInWebView} = advertisement;
  const dispatch = useAppDispatch();

  const onPress = () => {
    if (!url) {
      return;
    }

    haptic('impactLight');

    if (openURLInWebView) {
      dispatch(AppEffects.openUrlWithInAppBrowser(url));
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <AdvertisementCardContainer activeOpacity={ActiveOpacity} onPress={onPress}>
      <AdvertisementCardTitle>{title}</AdvertisementCardTitle>
      <AdvertisementCardDescription>{description}</AdvertisementCardDescription>
      <Image
        source={img}
        style={{
          height: ADVERTISEMENT_ICON_HEIGHT,
          width: ADVERTISEMENT_ICON_WIDTH,
          right: 0,
          position: 'absolute',
        }}
        height={ADVERTISEMENT_ICON_HEIGHT}
        width={ADVERTISEMENT_ICON_WIDTH}
      />
    </AdvertisementCardContainer>
  );
};

export default AdvertisementCard;
