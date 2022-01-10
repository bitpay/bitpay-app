import * as React from 'react';
import {ReactElement, ReactNode} from 'react';
import styled from 'styled-components/native';
import {Midnight, NeutralSlate, SlateDark, White} from '../../styles/colors';
import Arrow from '../../../assets/img/arrow-right.svg';
import Haptic from '../haptic-feedback/haptic';
import {ActiveOpacity, CardGutter, ScreenGutter} from '../styled/Containers';
import Card from '../card/Card';
import {View} from 'react-native';
import {BaseText} from '../styled/Text';
import {useTheme} from '@react-navigation/native';

interface BodyProps {
  title?: string;
  description?: string;
  value?: string;
  pillText?: string;
}

interface HomeCardProps {
  header?: ReactNode;
  body: BodyProps;
  onCTAPress?: () => void;
  backgroundImg?: () => ReactElement;
}

const CardHeader = styled.View`
  min-height: 30px;
`;

const CardBodyHeader = styled(BaseText)`
  font-size: 14px;
  line-height: 21px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-top: ${CardGutter};
`;

const CardBodyDesc = styled(BaseText)`
  font-weight: 500;
  font-size: 18px;
  line-height: 25px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-top: ${CardGutter};
`;

const CardPrice = styled(BaseText)`
  font-size: 31px;
  line-height: 46px;
  font-weight: bold;
  color: ${({theme}) => theme.colors.text};
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

const CardContainer = styled.TouchableOpacity`
  left: ${ScreenGutter};
`;

const HomeCard = ({backgroundImg, body, onCTAPress, header}: HomeCardProps) => {
  const HeaderComp = <CardHeader>{header}</CardHeader>;
  const theme = useTheme();
  const {title, value, pillText, description} = body;

  const BodyComp = (
    <View>
      {title && <CardBodyHeader>{title}</CardBodyHeader>}
      {value && <CardPrice>{value}</CardPrice>}
      {pillText && (
        <CardPill>
          <CardPillText>{pillText}</CardPillText>
        </CardPill>
      )}
      {description && <CardBodyDesc>{description}</CardBodyDesc>}
    </View>
  );

  const _onPress = () => {
    if (onCTAPress) {
      Haptic('impactLight');
      onCTAPress();
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
    <CardContainer activeOpacity={ActiveOpacity} onPress={_onPress}>
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
