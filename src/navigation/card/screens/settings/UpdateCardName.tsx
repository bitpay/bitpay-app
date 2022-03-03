import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ScrollView} from 'react-native';
import styled from 'styled-components/native';
import Button, {ButtonState} from '../../../../components/button/Button';
import BoxInput from '../../../../components/form/BoxInput';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {CardActions, CardEffects} from '../../../../store/card';
import {Card} from '../../../../store/card/card.models';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {CardStackParamList} from '../../CardStack';

export interface UpdateCardNameScreenParamList {
  card: Card;
}

const ContentContainer = styled.View`
  padding: ${ScreenGutter};
`;

const FormContainer = styled.View`
  margin-bottom: 24px;
`;

const UpdateCardNameScreen: React.FC<
  StackScreenProps<CardStackParamList, 'UpdateCardName'>
> = ({navigation, route}) => {
  const {card} = route.params;
  const dispatch = useAppDispatch();
  const updateNameStatus = useAppSelector(
    ({CARD}) => CARD.updateCardNameStatus[card.id],
  );
  const {t} = useTranslation();
  const [newName, setNewName] = useState(card.nickname);
  const [buttonState, setButtonState] = useState<ButtonState>();

  const onUpdatePress = () => {
    setButtonState('loading');

    dispatch(CardEffects.START_UPDATE_CARD_NAME(card.id, newName));
  };

  useEffect(() => {
    if (updateNameStatus === 'success') {
      setButtonState('success');
      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          // TODO: go to settings, need to refactor settings params to take an id, then compute card group
        }
        dispatch(CardActions.updateUpdateCardNameStatus(card.id, null));
        setButtonState(undefined);
      }, 1500);
    } else if (updateNameStatus === 'failed') {
      // TODO: display error
      setButtonState('failed');
      setTimeout(() => setButtonState(undefined), 1500);
    }
  }, [updateNameStatus, card.id, dispatch, navigation]);

  return (
    <ScrollView>
      <ContentContainer>
        <FormContainer>
          <BoxInput
            label="Card Name"
            value={newName}
            onChangeText={(text: string) => setNewName(text)}
          />
        </FormContainer>

        <Button state={buttonState} onPress={() => onUpdatePress()}>
          {t('Update')}
        </Button>
      </ContentContainer>
    </ScrollView>
  );
};

export default UpdateCardNameScreen;
