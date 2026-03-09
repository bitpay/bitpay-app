import React from 'react';
import {
  StyleProp,
  TouchableWithoutFeedbackProps,
  ViewStyle,
} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../../components/styled/Containers';
import {BaseText, Link} from '../../../../components/styled/Text';
import {HomeSectionTitle} from './Styled';
import {
  Action,
  LightBlue,
  Midnight,
  Slate30,
  SlateDark,
  White,
} from '../../../../styles/colors';
import ChevronRightSvg from './ChevronRightSvg';

interface HomeRowProps {
  title?: string | undefined;
  action?: string | undefined;
  onActionPress?: TouchableWithoutFeedbackProps['onPress'];
  style?: StyleProp<ViewStyle>;
  label?: string;
  children: React.ReactNode;
}

const HomeRowContainer = styled.View`
  margin-bottom: 10px;
`;

const Header = styled.View`
  display: flex;
  flex-direction: row;
  margin: 0 ${ScreenGutter} 0 16px;
  justify-content: space-between;
  align-items: center;
`;

const HeaderLeft = styled.View`
  flex-direction: row;
  align-items: center;
  flex-shrink: 1;
`;

const HomeSectionTitleContainer = styled.View`
  margin-right: 8px;
  flex-shrink: 1;
`;

const HeaderLinkContainer = styled.View`
  margin-left: auto;
  background-color: ${({theme: {dark}}) => (dark ? Midnight : LightBlue)};
  padding: 4px 10px 4px 12px;
  border-radius: 50px;
`;

const HeaderLink = styled(Link)`
  color: ${({theme: {dark}}) => (dark ? White : Action)};
  font-weight: 400;
  font-size: 12px;
  line-height: 16px;
  text-transform: capitalize;
`;

const HeaderLabel = styled(BaseText)`
  font-weight: 400;
  font-size: 12px;
  color: ${({theme}) => (theme.dark ? Slate30 : SlateDark)};
`;

const HeaderLabelContainer = styled.View`
  border: 1px solid ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  padding: 2px 8px;
  border-radius: 50px;
  margin-left: 0px;
`;

const HeaderLinkContent = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 7px;
`;

const HomeSection: React.FC<HomeRowProps> = props => {
  const {title, action, onActionPress, children, style, label} = props;

  return (
    <HomeRowContainer style={style}>
      {title ? (
        <Header>
          <HeaderLeft>
            <HomeSectionTitleContainer>
              <HomeSectionTitle>{title}</HomeSectionTitle>
            </HomeSectionTitleContainer>
            {label ? (
              <HeaderLabelContainer>
                <HeaderLabel>{label}</HeaderLabel>
              </HeaderLabelContainer>
            ) : null}
          </HeaderLeft>
          {action ? (
            <HeaderLinkContainer>
              <TouchableOpacity
                style={{flexDirection: 'row', alignItems: 'center', gap: 7}}
                activeOpacity={ActiveOpacity}
                onPress={onActionPress}>
                <HeaderLinkContent>
                  <HeaderLink>{action}</HeaderLink>
                  <ChevronRightSvg />
                </HeaderLinkContent>
              </TouchableOpacity>
            </HeaderLinkContainer>
          ) : null}
        </Header>
      ) : null}
      {children}
    </HomeRowContainer>
  );
};

export default HomeSection;
