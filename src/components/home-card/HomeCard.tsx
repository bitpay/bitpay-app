import * as React from 'react';
import {ReactElement, ReactNode} from 'react';
import styled from 'styled-components/native';
import {Black, SlateDark, White} from '../../styles/colors';
import Arrow from '../../../assets/img/forward-arrow.svg';
import Haptic from '../haptic-feedback/haptic';
import {CardGutter} from '../styled/Containers';
import Card from '../card/Card';
import {View} from 'react-native';

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

const CardBodyHeader = styled.Text`
  font-size: 14px;
  line-height: 21px;
  color: ${SlateDark};
  margin-top: ${CardGutter};
`;

const CardBodyDesc = styled.Text`
  font-weight: 500;
  font-size: 18px;
  line-height: 25px;
  color: ${SlateDark};
  margin-top: ${CardGutter};
`;

const CardPrice = styled.Text`
  font-size: 31px;
  line-height: 46px;
  color: ${Black};
  font-weight: bold;
`;

const CardPill = styled.View`
  background-color: #cbf3e8;
  align-self: flex-start;
  border-radius: 7px;
  padding: 4px 8px;
`;

const CardPillText = styled.Text`
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

const HomeCard = ({backgroundImg, body, footer, header}: HomeCardProps) => {
  const HeaderComp: React.FC<{headerComp?: ReactNode}> = (
    headerComp?: ReactNode,
  ) => <CardHeader>{headerComp}</CardHeader>;

  const BodyComp: React.FC<BodyProps> = (bodyComp?: BodyProps) =>
    bodyComp ? (
      <View>
        {bodyComp.header && <CardBodyHeader>{bodyComp.header}</CardBodyHeader>}
        {bodyComp.price && <CardPrice>{bodyComp.price}</CardPrice>}
        {bodyComp.pillText && (
          <CardPill>
            <CardPillText>{bodyComp.pillText}</CardPillText>
          </CardPill>
        )}
        {bodyComp.description && (
          <CardBodyDesc>{bodyComp.description}</CardBodyDesc>
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
      <FooterArrow onPress={_onPress} underlayColor="white">
        <Arrow />
      </FooterArrow>
    ) : null;
  };
  return (
    <Card
      backgroundImg={backgroundImg}
      header={HeaderComp(header)}
      body={BodyComp(body)}
      footer={FooterComp(footer)}
    />
  );
};

export default HomeCard;
