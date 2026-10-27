import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import {selectCardGroups} from '../../../store/card/card.selectors';
import {useAppSelector} from '../../../utils/hooks';
import {CardScreens, CardStackParamList} from '../CardStack';
import CardDashboard from '../components/CardDashboard';
import CardIntro from '../components/CardIntro';
import {withErrorFallback} from '../../../navigation/tabs/TabScreenErrorFallback';

export type CardHomeScreenParamList =
  | {
      id: string | undefined | null;
    }
  | undefined;
export type CardHomeScreenProps = NativeStackScreenProps<
  CardStackParamList,
  CardScreens.HOME
>;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const CardHome: React.FC<CardHomeScreenProps> = ({navigation, route}) => {
  const cardGroups = useAppSelector(selectCardGroups);
  const hasCards = cardGroups?.length > 0;

  if (hasCards) {
    const id = route.params?.id || cardGroups[0][0].id;

    return (
      <SafeAreaView style={styles.container}>
        <CardDashboard id={id} navigation={navigation} route={route} />
      </SafeAreaView>
    );
  }

  return <CardIntro />;
};

export default withErrorFallback(CardHome);
