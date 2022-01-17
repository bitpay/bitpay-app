import {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {Switch, Text, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {SUPPORTED_DESIGN_CURRENCIES} from '../../../../constants/config.card';
import {RootState} from '../../../../store';
import {CardActions} from '../../../../store/card';
import {VirtualDesignCurrency} from '../../../../store/card/card.types';
import {CardStackParamList} from '../CardStack';
import {OverviewSlide} from '../components/CardDashboard';

export type CardSettingsParamList = {
  slide: OverviewSlide;
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
      <Text>Settings Placeholder</Text>

      {slide.cards.map(card => (
        <React.Fragment key={card.id}>
          <Text>
            {card.cardType}: {card.id}
          </Text>
        </React.Fragment>
      ))}

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
