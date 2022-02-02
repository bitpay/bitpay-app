import React, {useLayoutEffect} from 'react';
import {Platform, ScrollView} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import Markdown from 'react-native-markdown-display';
import {GiftCardStackParamList} from '../GiftCardStack';
import RemoteImage from '../../components/RemoteImage';
import {BaseText, fontFamily} from '../../../../../components/styled/Text';
import styled from 'styled-components/native';
import {
  CtaContainerAbsolute,
  HEIGHT,
  WIDTH,
} from '../../../../../components/styled/Containers';
import {horizontalPadding} from '../../components/styled/ShopTabComponents';
import {SlateDark} from '../../../../../styles/colors';
import Button from '../../../../../components/button/Button';
import GiftCardDenomSelector from '../../components/GiftCardDenomSelector';
import GiftCardDenoms, {
  GiftCardDenomText,
} from '../../components/GiftCardDenoms';
import {formatAmount} from '../../../../../lib/gift-cards/gift-card';

const GradientBox = styled(LinearGradient)`
  width: ${WIDTH}px;
  align-items: center;
  padding-top: 40px;
  flex-grow: 1;
  justify-content: center;
`;

const AmountContainer = styled.View`
  flex-grow: 1;
  display: flex;
  justify-content: center;
`;

const Amount = styled(BaseText)`
  margin: 25px 0 32px;
  margin-bottom: ${Platform.OS === 'android' ? 30 : 25}px;
  font-size: 38px;
  font-weight: 500;
`;

const DescriptionBox = styled.View`
  width: ${WIDTH}px;
  background-color: transparent;
  padding: 20px ${horizontalPadding}px 110px;
`;

const FooterButton = styled(CtaContainerAbsolute)`
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
`;

const DenomSelectionContainer = styled.View`
  margin-bottom: 40px;
  margin-top: 26px;
`;

const SupportedAmounts = styled.View`
  margin-top: 10px;
  align-items: center;
`;

const SupportedAmountsLabel = styled(GiftCardDenomText)`
  margin-bottom: 2px;
`;

const getHeaderTitle = (displayName: string) => {
  const fullTitle = `Buy ${displayName} Gift Card`;
  const maxTitleLength = 25;
  return fullTitle.length > maxTitleLength
    ? fullTitle.replace('Gift Card', '')
    : fullTitle;
};

const BuyGiftCard = ({
  route,
  navigation,
}: StackScreenProps<GiftCardStackParamList, 'BuyGiftCard'>) => {
  const {cardConfig} = route.params;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: getHeaderTitle(cardConfig.displayName),
    });
  });
  return (
    <>
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          minHeight: HEIGHT - (Platform.OS === 'android' ? 80 : 110),
        }}>
        <GradientBox colors={['rgba(245, 247, 248, 0)', '#F5F7F8']}>
          <RemoteImage
            uri={cardConfig.cardImage}
            height={169}
            width={270}
            borderRadius={10}
          />
          <AmountContainer>
            {cardConfig.supportedAmounts ? (
              <DenomSelectionContainer>
                <GiftCardDenomSelector cardConfig={cardConfig} />
                <SupportedAmounts>
                  <SupportedAmountsLabel>
                    Purchase Amounts:
                  </SupportedAmountsLabel>
                  <GiftCardDenoms cardConfig={cardConfig} />
                </SupportedAmounts>
              </DenomSelectionContainer>
            ) : (
              <Amount>{formatAmount(0, cardConfig.currency)}</Amount>
            )}
          </AmountContainer>
        </GradientBox>
        <DescriptionBox>
          <Markdown
            style={{
              body: {color: SlateDark, fontFamily, fontSize: 16},
            }}>
            {cardConfig.description}
          </Markdown>
        </DescriptionBox>
      </ScrollView>
      <FooterButton
        background={true}
        style={{
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }}>
        <Button
          onPress={() => {
            console.log('enter amount');
          }}
          buttonStyle={'primary'}>
          {cardConfig.supportedAmounts ? 'Continue' : 'Enter Amount'}
        </Button>
      </FooterButton>
    </>
  );
};

export default BuyGiftCard;
