import {StackScreenProps} from '@react-navigation/stack';
import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ScrollView, TouchableOpacity, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
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
} from '../../../../components/styled/Containers';
import {SUPPORTED_DESIGN_CURRENCIES} from '../../../../constants/config.card';
import {RootState} from '../../../../store';
import {CardActions} from '../../../../store/card';
import {Card} from '../../../../store/card/card.models';
import {VirtualDesignCurrency} from '../../../../store/card/card.types';
import {CardStackParamList} from '../../CardStack';
import CardFront from '../../components/CardFront';
import * as Styled from './CustomizeVirtualCard.styled';

export interface CustomizeVirtualCardParamList {
  card: Card;
}

type IconMap = {
  [k in VirtualDesignCurrency]: JSX.Element;
};

const ICON_SIZE = 30;

const enabledDesignCurrencies = Object.values(SUPPORTED_DESIGN_CURRENCIES)
  .filter(c => c.enabled)
  .map(c => c.currency);

const spacer = <View style={{width: 8}} />

const Icons: IconMap = {
  'bitpay-b': (
    <Styled.IconContainer>
      <BitPayBIcon height={ICON_SIZE} width={ICON_SIZE} />
    </Styled.IconContainer>
  ),
  BTC: (
    <Styled.IconContainer>
      <BtcIcon height={ICON_SIZE} width={ICON_SIZE} />
    </Styled.IconContainer>
  ),
  BCH: (
    <Styled.IconContainer>
      <BchIcon height={ICON_SIZE} width={ICON_SIZE} />
    </Styled.IconContainer>
  ),
  ETH: (
    <Styled.IconContainer>
      <EthIcon height={ICON_SIZE} width={ICON_SIZE} />
    </Styled.IconContainer>
  ),
  DOGE: (
    <Styled.IconContainer>
      <DogeIcon height={ICON_SIZE} width={ICON_SIZE} />
    </Styled.IconContainer>
  ),
  GUSD: (
    <Styled.IconContainer>
      <GusdIcon height={ICON_SIZE} width={ICON_SIZE} />
    </Styled.IconContainer>
  ),
  USDP: (
    <Styled.IconContainer>
      <UsdpIcon height={ICON_SIZE} width={ICON_SIZE} />
    </Styled.IconContainer>
  ),
  BUSD: (
    <Styled.IconContainer>
      <BusdIcon height={ICON_SIZE} width={ICON_SIZE} />
    </Styled.IconContainer>
  ),
  USDC: (
    <Styled.IconContainer>
      <UsdcIcon height={ICON_SIZE} width={ICON_SIZE} />
    </Styled.IconContainer>
  ),
  XRP: (
    <Styled.IconContainer>
      <XrpIcon height={ICON_SIZE} width={ICON_SIZE} />
    </Styled.IconContainer>
  ),
  DAI: (
    <Styled.IconContainer>
      <DaiIcon height={ICON_SIZE} width={ICON_SIZE} />
    </Styled.IconContainer>
  ),
  WBTC: (
    <Styled.IconContainer>
      <WbtcIcon height={ICON_SIZE} width={ICON_SIZE} />
    </Styled.IconContainer>
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
      <Styled.ContentContainer>
        <Styled.CustomizeVirtualCardHeading>
          {t('Customize Virtual Card')}
        </Styled.CustomizeVirtualCardHeading>

        <Styled.CustomizeVirtualCardDescription>
          {t('CustomizeVirtualCardDescription')}
        </Styled.CustomizeVirtualCardDescription>

        <Styled.CustomizeVirtualCardDisclaimer>
          {t('CustomizeVirtualCardDisclaimer')}
        </Styled.CustomizeVirtualCardDisclaimer>

        <Styled.PreviewContainer>
          <CardFront
            brand={card.brand || 'Visa'}
            provider={card.provider}
            fiat={card.currency.code}
            fiatSymbol={card.currency.symbol}
            balance=""
            nickname={card.nickname}
            designCurrency={selectedDesign}
          />
        </Styled.PreviewContainer>

        <Styled.CurrencyListContainer>
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={{width: 300}}>
            {enabledDesignCurrencies.map((currency, idx) => {
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

                  {idx < enabledDesignCurrencies.length ? spacer : null}
                </React.Fragment>
              );
            })}
          </ScrollView>
        </Styled.CurrencyListContainer>

        <Styled.CtaContainer>
          <Button onPress={() => onSavePress()} style={{marginBottom: 24}}>
            {t('Save Customization')}
          </Button>
        </Styled.CtaContainer>

        <Styled.TermsAndConditionsContainer>
          {t('TermsAndConditionsMastercard')}
        </Styled.TermsAndConditionsContainer>

        <Br />

        <Styled.TermsAndConditionsContainer>
          {t('TermsAndConditionsMastercard2')}
        </Styled.TermsAndConditionsContainer>
      </Styled.ContentContainer>
    </ScrollView>
  );
};

export default CustomizeVirtualCard;
