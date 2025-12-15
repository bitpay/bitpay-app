import React from 'react';
import styled from 'styled-components/native';
import Info from '../icons/info/Info';
import {
  Caution,
  NotificationPrimary,
  Slate,
  Warning,
  LightBlack,
  NeutralSlate,
  Warning25,
  Caution25,
  Success25,
  Black,
  SlateDark,
  White,
  Slate30,
  LinkBlue,
  Action,
} from '../../styles/colors';
import {BaseText} from '../styled/Text';
import {ActionContainer, ActiveOpacity, Row} from '../styled/Containers';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {SvgProps} from 'react-native-svg';

const BANNER_HEIGHT = 80;

const BannerContainer = styled.View<{
  height?: number;
  containerBgColor?: string;
}>`
  background-color: ${({theme: {dark}, containerBgColor}) =>
    containerBgColor ? containerBgColor : dark ? LightBlack : NeutralSlate};
  border-radius: 10px;
  margin: 10px 0;
  padding: 10px 12px;
  align-items: flex-start;
  justify-content: space-between;
  min-height: ${({height}) => height || BANNER_HEIGHT}px;
`;

const Description = styled.View`
  margin: 0 10px;
  flex: 1;
`;

const BannerRow = styled(Row)`
  align-items: center;
  justify-content: space-between;
`;

const TitleText = styled(BaseText)<{titleFontSize?: number}>`
  font-size: ${({titleFontSize}) => titleFontSize || 16}px;
  font-weight: 500;
  line-height: 24px;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  padding-bottom: 6px;
`;

const DescriptionText = styled(BaseText)<{descriptionFontSize?: number}>`
  font-size: ${({descriptionFontSize}) => descriptionFontSize || 13}px;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const LinkText = styled(BaseText)`
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? LinkBlue : Action)};
`;

interface BannerProps {
  title?: string;
  description?: string;
  type: string;
  link?: {onPress: () => void; text: string};
  transComponent?: JSX.Element;
  height?: number;
  hasBackgroundColor?: boolean;
  icon?: React.FC<SvgProps> | null;
  titleFontSize?: number;
  descriptionFontSize?: number;
}

const getBgColor = (type: string) => {
  switch (type) {
    case 'info':
      return NotificationPrimary;
    case 'warning':
      return Warning;
    case 'error':
      return Caution;
    case 'success':
      return '#0B754A';
    default:
      return Slate;
  }
};

const getContainerBgColor = (type: string) => {
  switch (type) {
    case 'info':
      return NotificationPrimary;
    case 'warning':
      return Warning25;
    case 'error':
      return Caution25;
    case 'success':
      return Success25;
    default:
      return Slate;
  }
};

const Banner = ({
  title,
  description,
  type,
  link,
  transComponent,
  height,
  hasBackgroundColor,
  icon,
  titleFontSize,
  descriptionFontSize,
}: BannerProps) => {
  const bgColor = getBgColor(type);
  const containerBgColor = hasBackgroundColor
    ? getContainerBgColor(type)
    : undefined;

  return (
    <BannerContainer height={height} containerBgColor={containerBgColor}>
      <BannerRow>
        {icon ? React.createElement(icon) : <Info bgColor={bgColor} />}
        <Description>
          {title ? (
            <TitleText
              titleFontSize={titleFontSize}
              style={containerBgColor ? {color: getBgColor(type)} : {}}>
              {title}
            </TitleText>
          ) : null}
          {description ? (
            <DescriptionText
              descriptionFontSize={descriptionFontSize}
              style={containerBgColor ? {color: Black} : {}}>
              {description}
            </DescriptionText>
          ) : null}
          {transComponent ? (
            <DescriptionText descriptionFontSize={descriptionFontSize}>
              {transComponent}
            </DescriptionText>
          ) : null}
          {link ? (
            <ActionContainer>
              <TouchableOpacity
                activeOpacity={ActiveOpacity}
                onPress={link.onPress}>
                <LinkText>{link.text}</LinkText>
              </TouchableOpacity>
            </ActionContainer>
          ) : null}
        </Description>
      </BannerRow>
    </BannerContainer>
  );
};

export default Banner;
