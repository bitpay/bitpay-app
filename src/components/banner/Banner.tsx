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
  Success,
  Warning25,
  Caution25,
  Success25,
  Black,
} from '../../styles/colors';
import {H7, Link} from '../styled/Text';
import {ActionContainer, ActiveOpacity, Row} from '../styled/Containers';
import {TouchableOpacity} from 'react-native-gesture-handler';
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
`;

const BannerRow = styled(Row)`
  align-items: center;
  justify-content: space-between;
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
            <H7
              style={containerBgColor ? {color: getBgColor(type)} : {}}
              medium={true}>
              {title}
            </H7>
          ) : null}
          {description ? (
            <H7 style={containerBgColor ? {color: Black} : {}}>
              {description}
            </H7>
          ) : null}
          {transComponent ? <H7>{transComponent}</H7> : null}
          {link ? (
            <ActionContainer>
              <TouchableOpacity
                activeOpacity={ActiveOpacity}
                onPress={link?.onPress}>
                <Link>{link?.text}</Link>
              </TouchableOpacity>
            </ActionContainer>
          ) : null}
        </Description>
      </BannerRow>
    </BannerContainer>
  );
};

export default Banner;
