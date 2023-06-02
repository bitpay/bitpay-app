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

type HomeRowProps = React.PropsWithChildren<{
  title?: string | undefined;
  action?: string | undefined;
  onActionPress?: TouchableWithoutFeedbackProps['onPress'];
  slimHeader?: boolean;
  style?: StyleProp<ViewStyle>;
  slimContainer?: boolean;
  label?: string;
}>;

const HomeRowContainer = styled.View<{slim?: boolean}>`
  margin-bottom: ${({slim}) => (slim ? 32 : 28)}px;
`;

const Header = styled.View<{slim?: boolean}>`
  display: flex;
  flex-direction: row;
  margin: 0 ${ScreenGutter} ${({slim}) => (slim ? 0 : 12)}px 16px;
  justify-content: space-between;
  align-items: center;
`;

const HomeSectionTitleContainer = styled.View`
  width: 80%;
`;

const HeaderLinkContainer = styled.View`
  margin-left: auto;
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
      {title ? (
        <Header slim={slimHeader}>
          <HomeSectionTitleContainer>
            <HomeSectionTitle>{title}</HomeSectionTitle>
          </HomeSectionTitleContainer>
          {action ? (
            <HeaderLinkContainer>
              <TouchableOpacity
                activeOpacity={ActiveOpacity}
                onPress={onActionPress}>
                <HeaderLink>{action}</HeaderLink>
              </TouchableOpacity>
            </HeaderLinkContainer>
          ) : null}
          {label ? (
            <HeaderLabelContainer>
              <HeaderLabel>{label}</HeaderLabel>
            </HeaderLabelContainer>
          ) : null}
        </Header>
      ) : null}
      {children}
    </HomeRowContainer>
  );
};

export default HomeSection;
