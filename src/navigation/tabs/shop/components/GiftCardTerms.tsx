import {WIDTH} from '../../../../components/styled/Containers';
import React, {useMemo} from 'react';
import RenderHTML, {MixedStyleDeclaration} from 'react-native-render-html';
import {horizontalPadding} from './styled/ShopTabComponents';
import {useTheme} from '../../../../contexts';

const termsStyle: MixedStyleDeclaration = {
  fontSize: 12,
  fontWeight: '300',
  padding: 10,
  paddingBottom: 50,
  paddingTop: 20,
  textAlign: 'justify',
};

export default ({terms}: {terms: string}) => {
  const theme = useTheme();
  const baseStyle = useMemo(
    () => ({...termsStyle, color: theme.colors.description}),
    [theme.colors.description],
  );
  return (
    <RenderHTML
      baseStyle={baseStyle}
      contentWidth={WIDTH - 2 * horizontalPadding}
      source={{
        html: terms || '',
      }}
    />
  );
};
