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
import {Link} from '../../../../components/styled/Text';
import {HomeSectionTitle} from './Styled';

interface HomeRowProps {
  title?: string | undefined;
  action?: string | undefined;
  onActionPress?: TouchableWithoutFeedbackProps['onPress'];
  slimHeader?: boolean;
  style?: StyleProp<ViewStyle>;
}

const HomeRowContainer = styled.View`
  margin-bottom: 64px;
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

const HomeSection: React.FC<HomeRowProps> = props => {
  const {title, action, onActionPress, slimHeader, children, style} = props;

  return (
    <HomeRowContainer style={style}>
      <Header slim={slimHeader}>
        <HomeSectionTitle>{title || ''}</HomeSectionTitle>
        <TouchableOpacity activeOpacity={ActiveOpacity} onPress={onActionPress}>
          <HeaderLink>{action || ''}</HeaderLink>
        </TouchableOpacity>
      </Header>
      {children}
    </HomeRowContainer>
  );
};

export default HomeSection;
