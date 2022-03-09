import {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {SafeAreaView} from 'react-native';
import {selectCardGroups} from '../../../store/card/card.selectors';
import {useAppSelector} from '../../../utils/hooks';
import {CardStackParamList} from '../CardStack';
import CardDashboard from '../components/CardDashboard';
import CardIntro from '../components/CardIntro';

export type CardHomeScreenParamList =
  | {
      id: string | undefined | null;
    }
  | undefined;
type CardHomeScreenProps = StackScreenProps<CardStackParamList, 'Home'>;

const CardHome: React.FC<CardHomeScreenProps> = ({navigation, route}) => {
  const cardGroups = useAppSelector(selectCardGroups);

  if (cardGroups.length) {
    const id = route.params?.id || cardGroups[0][0].id;

    return (
      <SafeAreaView>
        <CardDashboard id={id} navigation={navigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <CardIntro />
    </SafeAreaView>
  );
};

export default CardHome;
