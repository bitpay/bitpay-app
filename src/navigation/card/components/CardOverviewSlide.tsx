import React from 'react';
import {View} from 'react-native';
import {useSelector} from 'react-redux';
import {CardBrand} from '../../../constants/card';
import {RootState} from '../../../store';
import {Card} from '../../../store/card/card.models';
import {VirtualDesignCurrency} from '../../../store/card/card.types';
import CardFront from './CardFront';
import LockCardOverlay from './LockCardOverlay';

export interface CardOverviewSlideProps {
  card: Card;
  designCurrency: VirtualDesignCurrency;
}

const CardOverviewSlide: React.FC<CardOverviewSlideProps> = ({
  card,
  designCurrency,
}) => {
  const balance = useSelector<RootState, number>(
    ({CARD}) => CARD.balances[card.id],
  );

  return (
    <View style={{position: 'relative'}}>
      <CardFront
        brand={card.brand || CardBrand.Visa}
        provider={card.provider}
        balance={balance}
        nickname={card.nickname}
        fiat={card.currency.code}
        fiatSymbol={card.currency.symbol}
        designCurrency={designCurrency}
      />

      {card.lockedByUser ? (
        <View style={{position: 'absolute'}}>
          <LockCardOverlay />
        </View>
      ) : null}
    </View>
  );
};

export default CardOverviewSlide;
