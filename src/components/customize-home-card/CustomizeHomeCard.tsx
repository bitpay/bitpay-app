import React, {ReactNode} from 'react';
import {View} from 'react-native';
import Card from '../card/Card';
import Haptic from '../haptic-feedback/haptic';
import styled from 'styled-components/native';
import {Black} from '../../styles/colors';
import Checkbox from '../checkbox/Checkbox';

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

const CardBodyHeader = styled.Text`
  font-size: 16px;
  line-height: 20px;
  color: ${Black};
`;

const CardPrice = styled.Text`
  font-size: 26px;
  line-height: 38px;
  color: ${Black};
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

  const BodyComp: React.FC<BodyProps> = (bodyComp?: BodyProps) =>
    bodyComp ? (
      <View>
        {bodyComp.header && <CardBodyHeader>{bodyComp.header}</CardBodyHeader>}
        {bodyComp.price && (
          <CardPrice numberOfLines={1} ellipsizeMode={'tail'}>
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
  return (
    <Card
      containerProps={{width: '165px', minHeight: '172px'}}
      header={HeaderComp(header)}
      body={BodyComp(body)}
      footer={FooterComp(footer)}
    />
  );
};

export default CustomizeHomeCard;
