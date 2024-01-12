import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ScrollView, TouchableOpacity, View} from 'react-native';
import {Color, SvgProps} from 'react-native-svg';
import {useDispatch, useSelector} from 'react-redux';
import BitPayBIcon from '../../../../../assets/img/logos/bitpay-b-blue.svg';
import BchIcon from '../../../../../assets/img/currencies/bch.svg';
import BtcIcon from '../../../../../assets/img/currencies/btc.svg';
import BusdIcon from '../../../../../assets/img/currencies/busd.svg';
import DaiIcon from '../../../../../assets/img/currencies/dai.svg';
import DogeIcon from '../../../../../assets/img/currencies/doge.svg';
import EthIcon from '../../../../../assets/img/currencies/eth.svg';
import GusdIcon from '../../../../../assets/img/currencies/gusd.svg';
import UsdcIcon from '../../../../../assets/img/currencies/usdc.svg';
import UsdpIcon from '../../../../../assets/img/currencies/usdp.svg';
import WbtcIcon from '../../../../../assets/img/currencies/wbtc.svg';
import XrpIcon from '../../../../../assets/img/currencies/xrp.svg';
import Button from '../../../../components/button/Button';
import {ActiveOpacity, Br} from '../../../../components/styled/Containers';
import {Smallest} from '../../../../components/styled/Text';
import {SUPPORTED_DESIGN_CURRENCIES} from '../../../../constants/config.card';
import {RootState} from '../../../../store';
import {CardActions} from '../../../../store/card';
import {Card} from '../../../../store/card/card.models';
import {VirtualDesignCurrency} from '../../../../store/card/card.types';
import {getCardCurrencyColorPalette} from '../../../../utils/card';
import {CardScreens, CardStackParamList} from '../../CardStack';
import CardFront from '../../components/CardFront';
import CheckIcon from './CheckIcon';
import * as Styled from './CustomizeVirtualCard.styled';
import {CardBrand} from '../../../../constants/card';
import {Analytics} from '../../../../store/analytics/analytics.effects';

export interface CustomizeVirtualCardParamList {
  card: Card;
}

type IconMap = {
  [k in VirtualDesignCurrency]: {
    selected: JSX.Element;
    unselected: JSX.Element;
  };
};

const ICON_SIZE = 30;

const enabledDesignCurrencies = Object.values(SUPPORTED_DESIGN_CURRENCIES)
  .filter(c => c.enabled)
  .map(c => c.currency);

const spacer = <View style={{width: 8}} />;

const buildIconContainer = (Icon: React.FC<SvgProps>) => {
  return (
    <Styled.IconContainer>
      <Icon height={ICON_SIZE} width={ICON_SIZE} />
    </Styled.IconContainer>
  );
};

const buildCheckIconContainer = (color: Color) => {
  return (
    <Styled.IconContainer>
      <CheckIcon color={color} />
    </Styled.IconContainer>
  );
};

const Icons: IconMap = {
  'bitpay-b': {
    unselected: buildIconContainer(BitPayBIcon),
    selected: buildCheckIconContainer(
      getCardCurrencyColorPalette('bitpay-b').stopColor1,
    ),
  },
  BTC: {
    unselected: buildIconContainer(BtcIcon),
    selected: buildCheckIconContainer(
      getCardCurrencyColorPalette('BTC').stopColor1,
    ),
  },
  BCH: {
    unselected: buildIconContainer(BchIcon),
    selected: buildCheckIconContainer(
      getCardCurrencyColorPalette('BCH').stopColor1,
    ),
  },
  ETH: {
    unselected: buildIconContainer(EthIcon),
    selected: buildCheckIconContainer(
      getCardCurrencyColorPalette('ETH').stopColor1,
    ),
  },
  DOGE: {
    unselected: buildIconContainer(DogeIcon),
    selected: buildCheckIconContainer(
      getCardCurrencyColorPalette('DOGE').stopColor1,
    ),
  },
  GUSD: {
    unselected: buildIconContainer(GusdIcon),
    selected: buildCheckIconContainer(
      getCardCurrencyColorPalette('GUSD').stopColor1,
    ),
  },
  USDP: {
    unselected: buildIconContainer(UsdpIcon),
    selected: buildCheckIconContainer(
      getCardCurrencyColorPalette('USDP').stopColor1,
    ),
  },
  BUSD: {
    unselected: buildIconContainer(BusdIcon),
    selected: buildCheckIconContainer(
      getCardCurrencyColorPalette('BUSD').stopColor1,
    ),
  },
  USDC: {
    unselected: buildIconContainer(UsdcIcon),
    selected: buildCheckIconContainer(
      getCardCurrencyColorPalette('USDC').stopColor1,
    ),
  },
  XRP: {
    unselected: buildIconContainer(XrpIcon),
    selected: buildCheckIconContainer(
      getCardCurrencyColorPalette('XRP').stopColor1,
    ),
  },
  DAI: {
    unselected: buildIconContainer(DaiIcon),
    selected: buildCheckIconContainer(
      getCardCurrencyColorPalette('DAI').stopColor1,
    ),
  },
  WBTC: {
    unselected: buildIconContainer(WbtcIcon),
    selected: buildCheckIconContainer(
      getCardCurrencyColorPalette('WBTC').stopColor1,
    ),
  },
};

const CustomizeVirtualCard: React.FC<
  NativeStackScreenProps<CardStackParamList, 'CustomizeVirtualCard'>
> = ({navigation, route}) => {
  const {card} = route.params;
  const dispatch = useDispatch();
  const {t} = useTranslation();
  const designCurrency = useSelector<RootState, VirtualDesignCurrency>(
    ({CARD}) => CARD.virtualDesignCurrency,
  );
  const [selectedDesign, setSelectedDesign] = useState(designCurrency);

  const balance = useSelector<RootState, number>(
    ({CARD}) => CARD.balances[card.id],
  );

  const onSavePress = () => {
    dispatch(CardActions.virtualDesignCurrencyUpdated(selectedDesign));

    dispatch(
      Analytics.track('Save Virtual Card selected design', {
        selectedDesign: selectedDesign || '',
      }),
    );

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(CardScreens.HOME);
    }
  };

  return (
    <ScrollView>
      <Styled.ContentContainer>
        <Styled.CustomizeVirtualCardDescription>
          {t('CustomizeVirtualCardDescription')}
        </Styled.CustomizeVirtualCardDescription>

        <Styled.CustomizeVirtualCardDisclaimer>
          {t('CustomizeVirtualCardDisclaimer')}
        </Styled.CustomizeVirtualCardDisclaimer>

        <Styled.PreviewContainer>
          <CardFront
            brand={card.brand || CardBrand.Visa}
            provider={card.provider}
            fiat={card.currency.code}
            fiatSymbol={card.currency.symbol}
            balance={balance}
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
                    {selectedDesign === currency
                      ? Icons[currency].selected
                      : Icons[currency].unselected}
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

        <Smallest>{t('TermsAndConditionsMastercard')}</Smallest>

        <Br />

        <Smallest>{t('TermsAndConditionsMastercard2')}</Smallest>
      </Styled.ContentContainer>
    </ScrollView>
  );
};

export default CustomizeVirtualCard;
