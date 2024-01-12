import {WIDTH} from '../../../../components/styled/Containers';
import React from 'react';
import RenderHTML from 'react-native-render-html';
import {horizontalPadding} from './styled/ShopTabComponents';
import {SlateDark} from '../../../../styles/colors';

const termsStyle = {
  color: SlateDark,
  fontSize: 12,
  fontWeight: '300',
  padding: 10,
  paddingBottom: 50,
  paddingTop: 20,
  textAlign: 'justify',
};

export default ({terms}: {terms: string}) => {
  return (
    <RenderHTML
      baseStyle={termsStyle}
      contentWidth={WIDTH - 2 * horizontalPadding}
      source={{
        html: terms || '',
      }}
    />
  );
};
