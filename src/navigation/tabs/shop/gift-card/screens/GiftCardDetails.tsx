import React, {useLayoutEffect} from 'react';
import {ScrollView, Linking} from 'react-native';
import TimeAgo from 'react-native-timeago';
import {StackScreenProps} from '@react-navigation/stack';
import styled from 'styled-components/native';
import Button from '../../../../../components/button/Button';
import {CtaContainer} from '../../../../../components/styled/Containers';
import {BaseText, Paragraph} from '../../../../../components/styled/Text';
import {
  Grey,
  LightBlack,
  NeutralSlate,
  SlateDark,
} from '../../../../../styles/colors';
import RemoteImage from '../../components/RemoteImage';
import {GiftCardStackParamList} from '../GiftCardStack';
import {
  horizontalPadding,
  SectionSpacer,
} from '../../components/styled/ShopTabComponents';
import {formatAmount} from '../../../../../lib/gift-cards/gift-card';

const maxWidth = 320;

const Amount = styled(BaseText)`
  font-size: 38px;
  font-weight: 500;
  margin: 40px 0 20px;
`;

const ClaimCodeBox = styled.View`
  background-color: ${({theme}) => (theme.dark ? '#121212' : NeutralSlate)};
  border: 1px solid #e1e4e7;
  ${({theme}) => (theme.dark ? 'border: none;' : '')}
  border-radius: 12px;
  margin-top: -80px;
  padding-top: 110px;
  z-index: -1;
  align-items: center;
  width: 100%;
  max-width: ${maxWidth}px;
`;

const ClaimCode = styled(BaseText)`
  font-size: 18px;
  font-weight: 700;
  margin: 18px 0;
`;

const ActionContainer = styled(CtaContainer)`
  align-self: center;
  margin: 15px -${horizontalPadding}px 0;
  max-width: ${maxWidth}px;
  padding-left: 0;
  padding-right: 0;
  width: 100%;
`;

const Terms = styled(BaseText)`
  color: ${SlateDark};
  font-size: 12px;
  line-height: 15px;
  padding: 20px 10px 50px;
  text-align: center;
  max-width: ${maxWidth}px;
`;

const Divider = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : Grey)};
  height: 1px;
  width: 80%;
  margin-bottom: 20px;
`;

const barcodeHeight = 70;
const barcodeWidth = maxWidth * 0.8;
const Barcode = styled.Image`
  height: ${barcodeHeight}px;
  width: ${barcodeWidth}px;
  margin: 10px 0 -10px;
`;

const ArchiveButtonContainer = styled.View`
  margin-top: 15px;
`;

const GiftCardDetails = ({
  route,
  navigation,
}: StackScreenProps<GiftCardStackParamList, 'GiftCardDetails'>) => {
  const {cardConfig, giftCard} = route.params;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: cardConfig.displayName,
    });
  });

  return (
    <ScrollView
      contentContainerStyle={{
        alignItems: 'center',
        paddingHorizontal: horizontalPadding,
      }}>
      <Amount>{formatAmount(giftCard.amount, giftCard.currency)}</Amount>
      <RemoteImage
        uri={cardConfig.cardImage}
        height={169}
        width={270}
        borderRadius={10}
      />
      {cardConfig.defaultClaimCodeType !== 'link' ? (
        <ClaimCodeBox>
          <Paragraph>Claim Code</Paragraph>
          {giftCard.barcodeImage &&
          cardConfig.defaultClaimCodeType === 'barcode' ? (
            <Barcode
              height={barcodeHeight}
              width={barcodeWidth}
              source={{uri: giftCard.barcodeImage}}
              resizeMode="contain"
            />
          ) : null}
          <ClaimCode>{giftCard.claimCode}</ClaimCode>
          {giftCard.pin ? (
            <>
              <Divider />
              <Paragraph>Pin</Paragraph>
              <ClaimCode>{giftCard.pin}</ClaimCode>
            </>
          ) : (
            <Paragraph style={{marginBottom: 30}}>
              Created <TimeAgo time={parseInt(giftCard.date, 10)} />
            </Paragraph>
          )}
        </ClaimCodeBox>
      ) : null}
      {giftCard.pin || cardConfig.defaultClaimCodeType === 'link' ? (
        <Paragraph style={{marginTop: 15}}>
          Created <TimeAgo time={parseInt(giftCard.date, 10)} />
        </Paragraph>
      ) : null}
      {!giftCard.archived || cardConfig.defaultClaimCodeType === 'link' ? (
        <ActionContainer>
          {cardConfig.redeemUrl ? (
            <Button
              onPress={() => {
                console.log('redeem now');
                Linking.openURL(
                  `${cardConfig.redeemUrl as string}${giftCard.claimCode}}`,
                );
              }}
              buttonStyle={'primary'}>
              Redeem Now
            </Button>
          ) : cardConfig.defaultClaimCodeType === 'link' ? (
            <Button
              onPress={() => {
                console.log('view redemption code');
                Linking.openURL(giftCard.claimLink as string);
              }}
              buttonStyle={'primary'}>
              {cardConfig.redeemButtonText || 'View Redemption Code'}
            </Button>
          ) : (
            <Button
              onPress={() => {
                console.log('copy code');
              }}
              buttonStyle={'primary'}>
              Copy Code
            </Button>
          )}
          {!giftCard.archived ? (
            <ArchiveButtonContainer>
              <Button
                onPress={() => {
                  console.log('archive');
                }}
                buttonStyle={'secondary'}>
                I've used this card
              </Button>
            </ArchiveButtonContainer>
          ) : null}
        </ActionContainer>
      ) : (
        <SectionSpacer />
      )}
      <Terms>{cardConfig.terms}</Terms>
    </ScrollView>
  );
};

export default GiftCardDetails;
