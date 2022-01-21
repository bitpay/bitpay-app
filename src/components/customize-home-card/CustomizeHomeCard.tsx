import React, {ReactNode} from 'react';
import {StyleProp, TextStyle, View} from 'react-native';
import Card from '../card/Card';
import Haptic from '../haptic-feedback/haptic';
import styled from 'styled-components/native';
import {LightBlack, NeutralSlate} from '../../styles/colors';
import Checkbox from '../checkbox/Checkbox';
import {BaseText} from '../styled/Text';
import {useTheme} from '@react-navigation/native';

interface BodyProps {
  title?: string;
  value?: string;
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

const CardBodyHeader = styled(BaseText)`
  font-size: 16px;
  line-height: 20px;
`;

const CardPrice = styled(BaseText)`
  font-size: 26px;
  line-height: 38px;
  font-weight: bold;
`;

const FooterAction = styled.TouchableHighlight`
  width: 30px;
  height: 30px;
  align-self: flex-end;
`;

const CustomizeHomeCard = ({body, footer, header}: CustomizeHomeCardProps) => {
  const HeaderComp = <CardHeader>{header}</CardHeader>;
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};

  const BodyComp = (
    <View>
      {body.title && (
        <CardBodyHeader
          style={textStyle}
          numberOfLines={1}
          ellipsizeMode={'tail'}>
          {body.title}
        </CardBodyHeader>
      )}
      {body.value && (
        <CardPrice style={textStyle} numberOfLines={1} ellipsizeMode={'tail'}>
          {body.value}
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
    backgroundColor: theme.dark ? LightBlack : NeutralSlate,
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
