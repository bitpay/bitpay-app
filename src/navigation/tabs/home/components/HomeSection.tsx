import React from 'react';
import {
  StyleProp,
  TouchableOpacity,
  TouchableWithoutFeedbackProps,
  ViewStyle,
} from 'react-native';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../../components/styled/Containers';
import {BaseText, Link} from '../../../../components/styled/Text';
import {HomeSectionTitle} from './Styled';
import {LightBlack, LuckySevens, SlateDark} from '../../../../styles/colors';

interface HomeRowProps {
  title?: string | undefined;
  action?: string | undefined;
  onActionPress?: TouchableWithoutFeedbackProps['onPress'];
  slimHeader?: boolean;
  style?: StyleProp<ViewStyle>;
  slimContainer?: boolean;
  label?: string;
}

const HomeRowContainer = styled.View<{slim?: boolean}>`
  margin-bottom: ${({slim}) => (slim ? 32 : 28)}px;
`;

const Header = styled.View<{slim?: boolean}>`
  flex-direction: row;
  margin: 0 ${ScreenGutter} ${({slim}) => (slim ? 0 : 12)}px 16px;
  justify-content: space-between;
  align-items: center;
  position: absolute;
  left: 0;
  right: 0;
`;

const HeaderLink = styled(Link)`
  font-weight: 500;
  font-size: 14px;
`;

const HeaderLabel = styled(BaseText)`
  font-weight: 500;
  font-size: 14px;
  color: ${({theme}) => (theme.dark ? LuckySevens : SlateDark)};
`;

const HeaderLabelContainer = styled.View`
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : '#E1E4E7')};
  padding: 0 8px;
  border-radius: 50px;
`;

const HomeSection: React.FC<HomeRowProps> = props => {
  const {
    title,
    action,
    onActionPress,
    slimHeader,
    children,
    style,
    slimContainer,
    label,
  } = props;

  return (
    <HomeRowContainer style={style} slim={slimContainer}>
      <Header slim={slimHeader}>
        <HomeSectionTitle>{title || ''}</HomeSectionTitle>
        <TouchableOpacity activeOpacity={ActiveOpacity} onPress={onActionPress}>
          <HeaderLink>{action || ''}</HeaderLink>
        </TouchableOpacity>
        {label ? (
          <HeaderLabelContainer>
            <HeaderLabel>{label}</HeaderLabel>
          </HeaderLabelContainer>
        ) : null}
      </Header>
      {children}
    </HomeRowContainer>
  );
};

export default HomeSection;
