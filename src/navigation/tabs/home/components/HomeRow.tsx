import React from 'react';
import {TouchableOpacity, TouchableWithoutFeedbackProps} from 'react-native';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../../components/styled/Containers';
import {BaseText, Link} from '../../../../components/styled/Text';
import {SlateDark, White} from '../../../../styles/colors';

interface HomeRowProps {
  title?: string | undefined;
  action?: string | undefined;
  onActionPress?: TouchableWithoutFeedbackProps['onPress'];
  slimHeader?: boolean;
}

const HomeRowContainer = styled.View`
  margin-bottom: 28px;
`;

const Header = styled.View<{slim?: boolean}>`
  flex-direction: row;
  margin: 0 ${ScreenGutter} ${({slim}) => (slim ? 0 : 12)}px;
  justify-content: space-between;
`;

const Title = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const HeaderLink = styled(Link)`
  font-weight: 500;
  font-size: 14px;
`;

const HomeRow: React.FC<HomeRowProps> = props => {
  const {title, action, onActionPress, slimHeader, children} = props;

  return (
    <HomeRowContainer>
      {title || action ? (
        <Header slim={slimHeader}>
          <Title>{title || ''}</Title>

          <TouchableOpacity
            activeOpacity={ActiveOpacity}
            onPress={onActionPress}>
            <HeaderLink>{action || ''}</HeaderLink>
          </TouchableOpacity>
        </Header>
      ) : null}
      {children}
    </HomeRowContainer>
  );
};

export default HomeRow;
