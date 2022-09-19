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

const BannerContainer = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 10px;
  margin: 15px 0;
  padding: 10px;
`;

const Description = styled.View`
  margin-left: 10px;
`;

const BannerRow = styled(Row)`
  align-items: center;
  justify-content: space-between;
`;

const BannerDescription = styled(H7)`
  margin-right: 20px;
`;

interface BannerProps {
  title?: string;
  description?: string;
  type: string;
  link?: {onPress: () => void; text: string};
  transComponent: JSX.Element;
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
}: BannerProps) => {
  const bgColor = getBgColor(type);

  return (
    <BannerContainer>
      <BannerRow>
        <Info bgColor={bgColor} />

        <Description>
          {title ? <H7 medium={true}>{title}</H7> : null}
          {description ? (
            <BannerDescription>{description}</BannerDescription>
          ) : null}
          {transComponent ? (
            <BannerDescription>{transComponent}</BannerDescription>
          ) : null}
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
