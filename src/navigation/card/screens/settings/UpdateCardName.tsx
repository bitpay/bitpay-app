import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Keyboard} from 'react-native';
import styled from 'styled-components/native';
import Button, {ButtonState} from '../../../../components/button/Button';
import BoxInput from '../../../../components/form/BoxInput';
import {BottomNotificationConfig} from '../../../../components/modal/bottom-notification/BottomNotification';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {AppActions} from '../../../../store/app';
import {CardActions, CardEffects} from '../../../../store/card';
import {Card} from '../../../../store/card/card.models';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {CardScreens, CardStackParamList} from '../../CardStack';

export interface UpdateCardNameScreenParamList {
  card: Card;
}

const ContentContainer = styled.ScrollView`
  padding: ${ScreenGutter};
`;

const FormContainer = styled.View`
  margin-bottom: 24px;
`;

const createErrorConfig = (
  message: string,
  action: () => any,
): BottomNotificationConfig => ({
  type: 'error',
  title: 'Something went wrong',
  message,
  enableBackdropDismiss: true,
  actions: [
    {
      text: 'OK',
      action,
      primary: true,
    },
  ],
});

const UpdateCardNameScreen: React.VFC<
  NativeStackScreenProps<CardStackParamList, CardScreens.UPDATE_CARD_NAME>
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
    Keyboard.dismiss();

    setButtonState('loading');

    dispatch(CardEffects.START_UPDATE_CARD_NAME(card.id, newName));
  };

  useEffect(() => {
    if (updateNameStatus === 'success') {
      setButtonState('success');
      dispatch(CardActions.updateUpdateCardNameStatus(card.id, null));
      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Settings', {id: card.id});
        }
        setButtonState(undefined);
      }, 1500);
    } else if (updateNameStatus === 'failed') {
      setButtonState('failed');
      dispatch(CardActions.updateUpdateCardNameStatus(card.id, null));

      const notificationConfig = createErrorConfig(
        t('Failed to update card name. Please try again later.'),
        () => setButtonState(undefined),
      );
      dispatch(AppActions.showBottomNotificationModal(notificationConfig));
    }
  }, [updateNameStatus, card.id, dispatch, navigation, t]);

  return (
    <ContentContainer keyboardShouldPersistTaps={'handled'}>
      <FormContainer>
        <BoxInput
          label={t('Card Name')}
          value={newName}
          onChangeText={(text: string) => setNewName(text)}
        />
      </FormContainer>

      <Button state={buttonState} onPress={() => onUpdatePress()}>
        {t('Update')}
      </Button>
    </ContentContainer>
  );
};

export default UpdateCardNameScreen;
