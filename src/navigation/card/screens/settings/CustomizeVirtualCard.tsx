import {StackScreenProps} from '@react-navigation/stack';
import React, {useState} from 'react';
import {ScrollView, TouchableOpacity, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import BitPayBIcon from '../../../../../assets/img/logos/bitpay-b-blue.svg';
import BtcIcon from '../../../../../assets/img/currencies/btc.svg';
import BchIcon from '../../../../../assets/img/currencies/bch.svg';
import EthIcon from '../../../../../assets/img/currencies/eth.svg';
import DogeIcon from '../../../../../assets/img/currencies/doge.svg';
import XrpIcon from '../../../../../assets/img/currencies/xrp.svg';
import UsdcIcon from '../../../../../assets/img/currencies/usdc.svg';
import GusdIcon from '../../../../../assets/img/currencies/gusd.svg';
import BusdIcon from '../../../../../assets/img/currencies/busd.svg';
import DaiIcon from '../../../../../assets/img/currencies/dai.svg';
import UsdpIcon from '../../../../../assets/img/currencies/usdp.svg';
import WbtcIcon from '../../../../../assets/img/currencies/wbtc.svg';
import Button from '../../../../components/button/Button';
import {
  ActiveOpacity,
  Br,
  ScreenGutter,
} from '../../../../components/styled/Containers';
import {SUPPORTED_DESIGN_CURRENCIES} from '../../../../constants/config.card';
import {RootState} from '../../../../store';
import {CardActions} from '../../../../store/card';
import {Card} from '../../../../store/card/card.models';
import {VirtualDesignCurrency} from '../../../../store/card/card.types';
import {CardStackParamList} from '../../CardStack';
import CardFront from '../../components/CardFront';
import {Disclaimer, H3, Paragraph} from '../../../../components/styled/Text';
import {useTranslation} from 'react-i18next';

export interface CustomizeVirtualCardParamList {
  card: Card;
}

const ContentContainer = styled.View`
  padding: ${ScreenGutter};
`;

const CustomizeVirtualCardHeading = styled(H3)`
  margin-bottom: 24px;
`;

const CustomizeVirtualCardDescription = styled(Paragraph)`
  margin-bottom: 24px;
`;

const CustomizeVirtualCardDisclaimer = styled(Disclaimer)`
  margin-bottom: 24px;
`;

const PreviewContainer = styled.View`
  align-items: center;
`;

const CtaContainer = styled.View`
  margin-bottom: 64px;
`;

const TermsAndConditionsContainer = styled.Text`
  color: ${({theme}) => theme.colors.text};
  font-size: 12px;
  font-weight: 400;
  line-height: 15px;
`;

const ICON_SIZE = 30;
const IconContainer = styled.View`
  align-items: center;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 25px;
  display: flex;
  height: 50px;
  justify-content: center;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.1;
  shadow-radius: 20px;
  width: 50px;
`;

const supportedDesignCurrencies = Object.values(SUPPORTED_DESIGN_CURRENCIES)
  .filter(c => c.enabled)
  .map(c => c.currency);

type IconMap = {
  [k in VirtualDesignCurrency]: JSX.Element;
};

const Icons: IconMap = {
  'bitpay-b': (
    <IconContainer>
      <BitPayBIcon height={ICON_SIZE} width={ICON_SIZE} />
    </IconContainer>
  ),
  BTC: (
    <IconContainer>
      <BtcIcon height={ICON_SIZE} width={ICON_SIZE} />
    </IconContainer>
  ),
  BCH: (
    <IconContainer>
      <BchIcon height={ICON_SIZE} width={ICON_SIZE} />
    </IconContainer>
  ),
  ETH: (
    <IconContainer>
      <EthIcon height={ICON_SIZE} width={ICON_SIZE} />
    </IconContainer>
  ),
  DOGE: (
    <IconContainer>
      <DogeIcon height={ICON_SIZE} width={ICON_SIZE} />
    </IconContainer>
  ),
  GUSD: (
    <IconContainer>
      <GusdIcon height={ICON_SIZE} width={ICON_SIZE} />
    </IconContainer>
  ),
  USDP: (
    <IconContainer>
      <UsdpIcon height={ICON_SIZE} width={ICON_SIZE} />
    </IconContainer>
  ),
  BUSD: (
    <IconContainer>
      <BusdIcon height={ICON_SIZE} width={ICON_SIZE} />
    </IconContainer>
  ),
  USDC: (
    <IconContainer>
      <UsdcIcon height={ICON_SIZE} width={ICON_SIZE} />
    </IconContainer>
  ),
  XRP: (
    <IconContainer>
      <XrpIcon height={ICON_SIZE} width={ICON_SIZE} />
    </IconContainer>
  ),
  DAI: (
    <IconContainer>
      <DaiIcon height={ICON_SIZE} width={ICON_SIZE} />
    </IconContainer>
  ),
  WBTC: (
    <IconContainer>
      <WbtcIcon height={ICON_SIZE} width={ICON_SIZE} />
    </IconContainer>
  ),
};

const CustomizeVirtualCard: React.FC<
  StackScreenProps<CardStackParamList, 'CustomizeVirtualCard'>
> = ({navigation, route}) => {
  const {card} = route.params;
  const dispatch = useDispatch();
  const {t} = useTranslation();
  const designCurrency = useSelector<RootState, VirtualDesignCurrency>(
    ({CARD}) => CARD.virtualDesignCurrency,
  );
  const [selectedDesign, setSelectedDesign] = useState(designCurrency);

  const onSavePress = () => {
    dispatch(CardActions.virtualDesignCurrencyUpdated(selectedDesign));

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  return (
    <ScrollView>
      <ContentContainer>
        <CustomizeVirtualCardHeading>
          {t('Customize Virtual Card')}
        </CustomizeVirtualCardHeading>

        <CustomizeVirtualCardDescription>
          {t('CustomizeVirtualCardDescription')}
        </CustomizeVirtualCardDescription>

        <CustomizeVirtualCardDisclaimer>
          {t('CustomizeVirtualCardDisclaimer')}
        </CustomizeVirtualCardDisclaimer>

        <PreviewContainer>
          <CardFront
            brand={card.brand || 'Visa'}
            provider={card.provider}
            fiat={card.currency.code}
            fiatSymbol={card.currency.symbol}
            balance=""
            nickname={card.nickname}
            designCurrency={selectedDesign}
          />
        </PreviewContainer>

        <View
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 24,
            marginBottom: 24,
          }}>
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={{width: 300}}>
            {supportedDesignCurrencies.map((currency, idx) => {
              return (
                <React.Fragment key={currency}>
                  <TouchableOpacity
                    key={currency}
                    activeOpacity={ActiveOpacity}
                    onPress={() => {
                      setSelectedDesign(currency);
                    }}>
                    {Icons[currency]}
                  </TouchableOpacity>
                  {idx >= supportedDesignCurrencies.length ? null : (
                    <View style={{width: 8}} />
                  )}
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>

        <CtaContainer>
          <Button onPress={() => onSavePress()} style={{marginBottom: 24}}>
            {t('Save Customization')}
          </Button>
        </CtaContainer>

        <TermsAndConditionsContainer>
          {t('TermsAndConditionsMastercard')}
        </TermsAndConditionsContainer>

        <Br />

        <TermsAndConditionsContainer>
          {t('TermsAndConditionsMastercard2')}
        </TermsAndConditionsContainer>
      </ContentContainer>
    </ScrollView>
  );
};

export default CustomizeVirtualCard;
