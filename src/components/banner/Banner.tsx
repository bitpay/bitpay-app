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
} from '../../styles/colors';
import {H7, Link} from '../styled/Text';
import {ActionContainer, ActiveOpacity, Row} from '../styled/Containers';
import {TouchableOpacity} from 'react-native';

const BANNER_HEIGHT = 80;

const BannerContainer = styled.View<{height?: number}>`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 10px;
  margin: 15px 0;
  padding: 10px;
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
}

const getBgColor = (type: string) => {
  switch (type) {
    case 'info':
      return NotificationPrimary;
    case 'warning':
      return Warning;
    case 'error':
      return Caution;
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
}: BannerProps) => {
  const bgColor = getBgColor(type);

  return (
    <BannerContainer height={height}>
      <BannerRow>
        <Info bgColor={bgColor} />

        <Description>
          {title ? <H7 medium={true}>{title}</H7> : null}
          {description ? <H7>{description}</H7> : null}
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
