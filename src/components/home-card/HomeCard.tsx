import * as React from 'react';
import {ReactElement, ReactNode} from 'react';
import styled from 'styled-components/native';
import {Midnight, NeutralSlate, SlateDark, White} from '../../styles/colors';
import Arrow from '../../../assets/img/arrow-right.svg';
import Haptic from '../haptic-feedback/haptic';
import {CardGutter, ScreenGutter} from '../styled/Containers';
import Card from '../card/Card';
import {StyleProp, TextStyle, View} from 'react-native';
import {BaseText} from '../styled/Text';
import {useTheme} from '@react-navigation/native';

interface BodyProps {
  header?: string;
  description?: string;
  price?: string;
  pillText?: string;
}

interface FooterProps {
  onCTAPress?: () => void;
}

interface HomeCardProps {
  header?: ReactNode;
  body: BodyProps;
  footer: FooterProps;
  backgroundImg?: () => ReactElement;
}

const CardHeader = styled.View`
  min-height: 30px;
`;

const CardBodyHeader = styled(BaseText)<{isDarkMode: boolean}>`
  font-size: 14px;
  line-height: 21px;
  color: ${({isDarkMode}) => (isDarkMode ? White : SlateDark)};
  margin-top: ${CardGutter};
`;

const CardBodyDesc = styled(BaseText)<{isDarkMode: boolean}>`
  font-weight: 500;
  font-size: 18px;
  line-height: 25px;
  color: ${({isDarkMode}) => (isDarkMode ? White : SlateDark)};
  margin-top: ${CardGutter};
`;

const CardPrice = styled(BaseText)`
  font-size: 31px;
  line-height: 46px;
  font-weight: bold;
`;

const CardPill = styled.View`
  background-color: #cbf3e8;
  align-self: flex-start;
  border-radius: 7px;
  padding: 4px 8px;
`;

const CardPillText = styled(BaseText)`
  font-weight: 500;
  font-size: 14px;
  line-height: 19px;
  color: ${SlateDark};
`;

const FooterArrow = styled.TouchableHighlight`
  width: 30px;
  height: 30px;
  align-self: flex-end;
  border-radius: 50px;
  background-color: ${White};
  align-items: center;
  justify-content: center;
`;

const CardContainer = styled.View`
  left: ${ScreenGutter};
`;

const HomeCard = ({backgroundImg, body, footer, header}: HomeCardProps) => {
  const HeaderComp = <CardHeader>{header}</CardHeader>;
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  const BodyComp = (
    <View>
      {body.header && (
        <CardBodyHeader isDarkMode={theme.dark}>{body.header}</CardBodyHeader>
      )}
      {body.price && <CardPrice style={textStyle}>{body.price}</CardPrice>}
      {body.pillText && (
        <CardPill>
          <CardPillText>{body.pillText}</CardPillText>
        </CardPill>
      )}
      {body.description && (
        <CardBodyDesc isDarkMode={theme.dark}>{body.description}</CardBodyDesc>
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
    <FooterArrow onPress={_onPress} underlayColor="white">
      <Arrow />
    </FooterArrow>
  );

  const containerProps = {
    backgroundColor: theme.dark ? Midnight : NeutralSlate,
  };

  return (
    <CardContainer>
      <Card
        backgroundImg={backgroundImg}
        header={HeaderComp}
        body={BodyComp}
        footer={FooterComp}
        containerProps={containerProps}
      />
    </CardContainer>
  );
};

export default HomeCard;
