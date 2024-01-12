import React from 'react';
import styled, {useTheme} from 'styled-components/native';
import {BaseText} from '../../../../../components/styled/Text';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../../../components/styled/Containers';
import {LightBlack, White} from '../../../../../styles/colors';
import {BoxShadow} from '../Styled';
import haptic from '../../../../../components/haptic-feedback/haptic';
interface LinkCardProps {
  image?: any;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}

const LinkCardContainer = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-radius: 12px;
  padding: 15px;
  max-width: 215px;
  height: 72px;
  margin-right: 20px;
  position: relative;
  left: ${ScreenGutter};
`;

const LinkCardText = styled(BaseText)`
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  flex-shrink: 1;
`;

const LinkCardImageContainer = styled.View`
  margin-right: 10px;
`;

const LinkCard: React.FC<LinkCardProps> = ({image, description, onPress}) => {
  const theme = useTheme();
  return (
    <LinkCardContainer
      activeOpacity={ActiveOpacity}
      onPress={() => {
        haptic('soft');
        onPress();
      }}
      style={[!theme.dark && BoxShadow]}>
      <LinkCardImageContainer>{image && image(theme)}</LinkCardImageContainer>
      <LinkCardText numberOfLines={2} ellipsizeMode={'tail'}>
        {description}
      </LinkCardText>
    </LinkCardContainer>
  );
};

export default LinkCard;
