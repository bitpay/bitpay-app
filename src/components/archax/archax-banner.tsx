import React, {useMemo} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import {Black} from '../../styles/colors';
import {H7, Link} from '../styled/Text';
import {ActiveOpacity} from '../styled/Containers';
import {TouchableOpacity} from 'react-native';

const ArchaxBanner: React.FC<{removeMarginTop?: boolean}> = ({
  removeMarginTop,
}) => {
  const insets = useSafeAreaInsets();
  const Container = useMemo(
    () => styled.View`
      background-color: #ffedc9;
      padding: 20px;
      margin-top: ${!removeMarginTop ? insets.top : 0}px;
    `,
    [insets.top, removeMarginTop],
  );
  return (
    <Container>
      <H7 style={{color: Black}}>
        Don't invest unless you're prepared to lose all the money you invest.
        This is a high-risk investment and you should not expect to be protected
        if something goes worng.
        <TouchableOpacity activeOpacity={ActiveOpacity} onPress={() => {}}>
          <Link>Take 2 mins to learn more.</Link>
        </TouchableOpacity>
      </H7>
    </Container>
  );
};

export default ArchaxBanner;
