import React, {ReactNode} from 'react';
import {ColorSchemeName, View} from 'react-native';
import Card from '../card/Card';
import Haptic from '../haptic-feedback/haptic';
import styled from 'styled-components/native';
import {Black, LightBlack, NeutralSlate, White} from '../../styles/colors';
import Checkbox from '../checkbox/Checkbox';
import {useSelector} from 'react-redux';
import {RootState} from '../../store';

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

const CardBodyHeader = styled.Text<{appColorScheme: ColorSchemeName}>`
  font-size: 16px;
  line-height: 20px;
  color: ${({appColorScheme}: {appColorScheme: ColorSchemeName}) =>
    appColorScheme === 'light' ? Black : White};
`;

const CardPrice = styled.Text<{appColorScheme: ColorSchemeName}>`
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
  const HeaderComp: React.FC<{headerComp?: ReactNode}> = (
    headerComp?: ReactNode,
  ) => <CardHeader>{headerComp}</CardHeader>;

  const appColorScheme = useSelector(({APP}: RootState) => APP.colorScheme);

  const BodyComp: React.FC<BodyProps> = (bodyComp?: BodyProps) =>
    bodyComp ? (
      <View>
        {bodyComp.header && (
          <CardBodyHeader appColorScheme={appColorScheme}>
            {bodyComp.header}
          </CardBodyHeader>
        )}
        {bodyComp.price && (
          <CardPrice
            numberOfLines={1}
            ellipsizeMode={'tail'}
            appColorScheme={appColorScheme}>
            {bodyComp.price}
          </CardPrice>
        )}
      </View>
    ) : null;

  const FooterComp: React.FC<FooterProps> = (footerComp?: FooterProps) => {
    const _onPress = () => {
      if (footerComp && footerComp.onCTAPress) {
        Haptic('impactLight');
        footerComp.onCTAPress();
      }
    };
    return footerComp ? (
      <FooterAction>
        <Checkbox checked={footer.checked} onPress={_onPress} />
      </FooterAction>
    ) : null;
  };

  const containerProps = {
    width: '165px',
    minHeight: '172px',
    backgroundColor: appColorScheme === 'light' ? NeutralSlate : LightBlack,
  };

  return (
    <Card
      containerProps={containerProps}
      header={HeaderComp(header)}
      body={BodyComp(body)}
      footer={FooterComp(footer)}
    />
  );
};

export default CustomizeHomeCard;
