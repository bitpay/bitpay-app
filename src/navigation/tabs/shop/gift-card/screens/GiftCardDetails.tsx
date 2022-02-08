import React, {useLayoutEffect, useState} from 'react';
import {ScrollView, Linking, Share} from 'react-native';
import TimeAgo from 'react-native-timeago';
import {StackScreenProps} from '@react-navigation/stack';
import styled, {useTheme} from 'styled-components/native';
import Button from '../../../../../components/button/Button';
import {
  CtaContainer,
  HeaderRightContainer,
} from '../../../../../components/styled/Containers';
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
  NavIconButtonContainer,
  SectionSpacer,
} from '../../components/styled/ShopTabComponents';
import {
  ArchiveSvg,
  CogSvg,
  ExternalLinkSvg,
  InvoiceSvg,
} from '../../components/svg/ShopTabSvgs';
import {formatAmount} from '../../../../../lib/gift-cards/gift-card';
import OptionsSheet, {Option} from '../../../../wallet/components/OptionsSheet';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {APP_NETWORK, BASE_BITPAY_URLS} from '../../../../../constants/config';
import {sleep} from '../../../../../utils/helper-methods';
import {AppActions} from '../../../../../store/app';
import {useDispatch} from 'react-redux';
import Clipboard from '@react-native-community/clipboard';
import {CardConfig} from '../../../../../store/shop/shop.models';

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

const showCopiedNotification = (copiedValue: string, cardConfig: CardConfig) =>
  AppActions.showBottomNotificationModal({
    type: 'success',
    title: `Copied: ${copiedValue}`,
    message:
      cardConfig.redeemInstructions ||
      `Paste this code on ${cardConfig.website}. This gift card cannot be recovered if your claim code is lost.`,
    enableBackdropDismiss: true,
    actions: [
      {
        text: 'GOT IT',
        action: () => null,
        primary: true,
      },
    ],
  });

const GiftCardDetails = ({
  route,
  navigation,
}: StackScreenProps<GiftCardStackParamList, 'GiftCardDetails'>) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const [isOptionsSheetVisible, setIsOptionsSheetVisible] = useState(false);
  const {cardConfig, giftCard} = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: cardConfig.displayName,
      headerRight: () => (
        <HeaderRightContainer>
          <TouchableWithoutFeedback
            onPress={() => setIsOptionsSheetVisible(true)}>
            <NavIconButtonContainer>
              <CogSvg theme={theme} />
            </NavIconButtonContainer>
          </TouchableWithoutFeedback>
        </HeaderRightContainer>
      ),
    });
  });

  const assetOptions: Array<Option> = [
    {
      img: <ArchiveSvg theme={theme} />,
      description: 'Archive Card',
      onPress: () => null,
    },
    {
      img: <InvoiceSvg theme={theme} />,
      description: 'View Invoice',
      onPress: () =>
        Linking.openURL(
          `${BASE_BITPAY_URLS[APP_NETWORK]}/invoice?id=${giftCard.invoiceId}`,
        ),
    },
    {
      img: <ExternalLinkSvg theme={theme} />,
      description: 'Share Claim Code',
      onPress: async () => {
        await sleep(500);
        Share.share(
          giftCard.claimLink
            ? {url: giftCard.claimLink}
            : {message: giftCard.claimCode},
        );
      },
    },
  ];

  const copyToClipboard = (value: string) => {
    Clipboard.setString(value);
    dispatch(showCopiedNotification(value, cardConfig));
  };

  return (
    <>
      <OptionsSheet
        isVisible={isOptionsSheetVisible}
        closeModal={() => setIsOptionsSheetVisible(false)}
        options={assetOptions}
        placement={'top'}
      />
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
            <TouchableWithoutFeedback
              onPress={() => copyToClipboard(giftCard.claimCode)}>
              <ClaimCode>{giftCard.claimCode}</ClaimCode>
            </TouchableWithoutFeedback>
            {giftCard.pin ? (
              <>
                <Divider />
                <Paragraph>Pin</Paragraph>
                <TouchableWithoutFeedback
                  onPress={() => copyToClipboard(giftCard.pin as string)}>
                  <ClaimCode>{giftCard.pin}</ClaimCode>
                </TouchableWithoutFeedback>
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
                onPress={() => copyToClipboard(giftCard.claimCode)}
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
    </>
  );
};

export default GiftCardDetails;
