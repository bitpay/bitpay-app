import React, {useLayoutEffect, useState} from 'react';
import {HeaderTitle, H5, Paragraph} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import styled from 'styled-components/native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {ScreenGutter} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import {useDispatch} from 'react-redux';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {WalletActions} from '../../../store/wallet';
import {AppActions} from '../../../store/app';

const DeleteKeyContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const Title = styled(H5)`
  color: #ce334b;
`;

const DeleteKeyParagraph = styled(Paragraph)`
  margin: 15px 0 20px;
`;

const DeleteKey = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const {
    params: {keyId},
  } = useRoute<RouteProp<WalletStackParamList, 'DeleteKey'>>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>Delete Key</HeaderTitle>,
    });
  });

  const [isVisible, setIsVisible] = useState(false);

  const startDeleteKey = () => {
    setIsVisible(false);
    setTimeout(() => {
      dispatch(startOnGoingProcessModal(OnGoingProcessMessages.DELETING_KEY));
      dispatch(WalletActions.deleteKey({keyId}));
      dispatch(AppActions.dismissOnGoingProcessModal());

      navigation.navigate('Tabs', {screen: 'Home'});
    }, 500);
  };

  return (
    <DeleteKeyContainer>
      <ScrollView>
        <Title>Warning!</Title>
        <DeleteKeyParagraph>
          Permanently deletes all wallets using this key. {'\n'}
          THIS ACTION CANNOT BE REVERSED.
        </DeleteKeyParagraph>

        <Button onPress={() => setIsVisible(true)}>Delete</Button>
      </ScrollView>

      <DeleteConfirmationModal
        description={
          'Are you sure you want to delete all wallets using this key?'
        }
        onPressOk={startDeleteKey}
        isVisible={isVisible}
        onPressCancel={() => setIsVisible(false)}
      />
    </DeleteKeyContainer>
  );
};

export default DeleteKey;
