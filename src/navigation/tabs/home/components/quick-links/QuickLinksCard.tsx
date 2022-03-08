import React from 'react';
import {Image, ImageSourcePropType, Linking} from 'react-native';
import styled from 'styled-components/native';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../../../components/styled/Containers';
import {BaseText} from '../../../../../components/styled/Text';
import {AppEffects} from '../../../../../store/app';
import {
  Action,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {useAppDispatch} from '../../../../../utils/hooks';

const QUICK_LINK_ICON_HEIGHT = 75;
const QUICK_LINK_ICON_WIDTH = 78;

export interface QuickLink {
  id: string;
  img: ImageSourcePropType;
  title?: string;
  description?: string;
  url?: string;
  openURLInWebView: boolean;
}

interface QuickLinksCardProps {
  quickLink: QuickLink;
}

const QuickLinkCardContainer = styled.TouchableOpacity`
  justify-content: center;
  align-items: flex-start;
  flex-direction: row;
  width: 202px;
  height: 91px;
  border-radius: 12px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  overflow: hidden;
  left: ${ScreenGutter};
`;

const ImgContainer = styled.View`
  padding-left: 3px;
  top: -8px;
  right: -9px;
  width: ${QUICK_LINK_ICON_WIDTH}px;
  height: ${QUICK_LINK_ICON_HEIGHT}px;
`;

const TextContainer = styled.View`
  padding-top: 19px;
  padding-bottom: 19px;
  padding-left: 16px;
  width: 118px;
`;

const TitleText = styled(BaseText)`
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
  line-height: 25px;
  color: ${({theme: {dark}}) => (dark ? White : Action)};
`;
const DescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  line-height: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const QuickLinksCard: React.FC<QuickLinksCardProps> = props => {
  const {quickLink} = props;
  const {img, title, description, url, openURLInWebView} = quickLink;
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
    <QuickLinkCardContainer activeOpacity={ActiveOpacity} onPress={onPress}>
      <TextContainer>
        <TitleText>{title}</TitleText>
        <DescriptionText numberOfLines={2} ellipsizeMode={'tail'}>
          {description}
        </DescriptionText>
      </TextContainer>
      <ImgContainer>
        <Image
          style={{
            height: QUICK_LINK_ICON_HEIGHT,
            width: QUICK_LINK_ICON_WIDTH,
          }}
          height={QUICK_LINK_ICON_HEIGHT}
          width={QUICK_LINK_ICON_WIDTH}
          source={img}
        />
      </ImgContainer>
    </QuickLinkCardContainer>
  );
};
export default QuickLinksCard;
