import {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {Switch, Text, View} from 'react-native';
import Carousel from 'react-native-snap-carousel';
import {useDispatch, useSelector} from 'react-redux';
import {WIDTH} from '../../../components/styled/Containers';
import {SUPPORTED_DESIGN_CURRENCIES} from '../../../constants/config.card';
import {RootState} from '../../../store';
import {CardActions} from '../../../store/card';
import {Card} from '../../../store/card/card.models';
import {VirtualDesignCurrency} from '../../../store/card/card.types';
import {CardStackParamList} from '../CardStack';
import {OverviewSlide} from '../components/CardDashboard';
import CardSettingsSlide from '../components/CardSettingsSlide';

export type CardSettingsParamList = {
  slide: OverviewSlide;
  id?: string;
};
type CardSettingsProps = StackScreenProps<CardStackParamList, 'Settings'>;

const Br = () => <Text />;

const CardSettings: React.FC<CardSettingsProps> = ({route}) => {
  const dispatch = useDispatch();
  const {slide} = route.params;
  const designCurrency = useSelector<RootState, VirtualDesignCurrency>(
    ({CARD}) => CARD.virtualDesignCurrency,
  );

  const onDesignToggle = (c: VirtualDesignCurrency, enabled: boolean) => {
    dispatch(
      CardActions.virtualDesignCurrencyUpdated(enabled ? c : 'bitpay-b'),
    );
  };

  return (
    <View>
      <Carousel<Card>
        data={slide.cards}
        vertical={false}
        firstItem={0}
        itemWidth={300 + 20}
        sliderWidth={WIDTH}
        renderItem={({item}) => {
          return <CardSettingsSlide parent={slide.primaryCard} card={item} />;
        }}
        layout="default"
      />

      <Br />
      <Text>Virtual Card Design Placeholder</Text>

      {Object.values(SUPPORTED_DESIGN_CURRENCIES).map(c => {
        return (
          <View
            style={{flexDirection: 'row', justifyContent: 'space-between'}}
            key={c.currency}>
            <Text>{c.currency}</Text>
            <Switch
              onValueChange={enabled => onDesignToggle(c.currency, enabled)}
              value={c.currency === designCurrency}
            />
          </View>
        );
      })}
    </View>
  );
};

export default CardSettings;
