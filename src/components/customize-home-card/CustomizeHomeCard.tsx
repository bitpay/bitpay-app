import React, {ReactNode} from 'react';
import {ColorSchemeName, View} from 'react-native';
import Card from '../card/Card';
import Haptic from '../haptic-feedback/haptic';
import styled from 'styled-components/native';
import {Black, LightBlack, NeutralSlate, White} from '../../styles/colors';
import Checkbox from '../checkbox/Checkbox';
import {useSelector} from 'react-redux';
import {RootState} from '../../store';
import {BaseText} from '../styled/Text';

interface BodyProps {
  header?: string;
  price?: string;
}

interface FooterProps {
  checked: boolean;
  onCTAPress?: () => void;
}

interface CustomizeHomeCardProps {
  header?: ReactNode;
  body: BodyProps;
  footer: FooterProps;
}

const CardHeader = styled.View`
  min-height: 20px;
`;

const CardBodyHeader = styled(BaseText)<{appColorScheme: ColorSchemeName}>`
  font-size: 16px;
  line-height: 20px;
  color: ${({appColorScheme}: {appColorScheme: ColorSchemeName}) =>
    appColorScheme === 'light' ? Black : White};
`;

const CardPrice = styled(BaseText)<{appColorScheme: ColorSchemeName}>`
  font-size: 26px;
  line-height: 38px;
  color: ${({appColorScheme}: {appColorScheme: ColorSchemeName}) =>
    appColorScheme === 'light' ? Black : White};
  font-weight: bold;
`;

const FooterAction = styled.TouchableHighlight`
  width: 30px;
  height: 30px;
  align-self: flex-end;
`;

const CustomizeHomeCard = ({body, footer, header}: CustomizeHomeCardProps) => {
  const HeaderComp = <CardHeader>{header}</CardHeader>;

  const appColorScheme = useSelector(({APP}: RootState) => APP.colorScheme);

  const BodyComp = (
    <View>
      {body.header && (
        <CardBodyHeader
          appColorScheme={appColorScheme}
          numberOfLines={1}
          ellipsizeMode={'tail'}>
          {body.header}
        </CardBodyHeader>
      )}
      {body.price && (
        <CardPrice
          numberOfLines={1}
          ellipsizeMode={'tail'}
          appColorScheme={appColorScheme}>
          {body.price}
        </CardPrice>
      )}
    </View>
  );

  const _onPress = () => {
    if (footer && footer.onCTAPress) {
      Haptic('impactLight');
      footer.onCTAPress();
    }
  };

  const FooterComp = (
    <FooterAction>
      <Checkbox checked={footer.checked} onPress={_onPress} />
    </FooterAction>
  );

  const containerProps = {
    width: '165px',
    minHeight: '172px',
    backgroundColor: appColorScheme === 'light' ? NeutralSlate : LightBlack,
  };

  return (
    <Card
      containerProps={containerProps}
      header={HeaderComp}
      body={BodyComp}
      footer={FooterComp}
    />
  );
};

export default CustomizeHomeCard;
