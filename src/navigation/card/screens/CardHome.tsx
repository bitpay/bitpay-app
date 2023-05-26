import {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {SafeAreaView} from 'react-native';
import {selectCardGroups} from '../../../store/card/card.selectors';
import {useAppSelector} from '../../../utils/hooks';
import {CardScreens, CardStackParamList} from '../CardStack';
import CardDashboard from '../components/CardDashboard';
import CardIntro from '../components/CardIntro';

export type CardHomeScreenParamList =
  | {
      id: string | undefined | null;
    }
  | undefined;
export type CardHomeScreenProps = StackScreenProps<
  CardStackParamList,
  CardScreens.HOME
>;

const CardHome: React.FC<CardHomeScreenProps> = ({navigation, route}) => {
  const cardGroups = useAppSelector(selectCardGroups);
  const hasCards = cardGroups.length > 0;

  if (hasCards) {
    const id = route.params?.id || cardGroups[0][0].id;

    return (
      <SafeAreaView>
        <CardDashboard id={id} navigation={navigation} route={route} />
      </SafeAreaView>
    );
  }

  return <CardIntro />;
};

export default CardHome;
