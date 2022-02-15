import React, {useEffect, useLayoutEffect, useState} from 'react';
import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/core';
import {StackScreenProps} from '@react-navigation/stack';
import Clipboard from '@react-native-community/clipboard';
import {useDispatch} from 'react-redux';
import {ContactSettingsStackParamList} from '../ContactsStack';
import {sleep} from '../../../../utils/helper-methods';
import {
  BaseText,
  TextAlign,
  HeaderTitle,
} from '../../../../components/styled/Text';
import {Hr} from '../../../../components/styled/Containers';
import haptic from '../../../../components/haptic-feedback/haptic';
import {NeutralSlate} from '../../../../styles/colors';
import {deleteContact} from '../../../../store/contact/contact.actions';
import Settings from '../../../../components/settings/Settings';
import ContactOptionsModal, {Option} from '../components/ContactOptions';
import ContactDeleteModal from '../components/ContactDeleteModal';

import ContactIcon from '../components/ContactIcon';
import SendIcon from '../../../../../assets/img/send-icon.svg';
import DeleteIcon from '../../../../../assets/img/delete-icon.svg';

const ContactsDetailsContainer = styled.SafeAreaView`
  flex: 1;
`;

const DetailsScrollContainer = styled.ScrollView`
  padding: 0 15px;
`;

const Details = styled.View`
  margin-top: 20px;
`;

const Detail = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 60px;
`;

const Title = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0;
`;

const DetailInfo = styled(TextAlign)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
`;

const ContactImageHeader = styled.View`
  margin: 10px 0;
  height: 150px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const AddressText = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? NeutralSlate : '#6F7782')};
`;

const AddressContainer = styled.TouchableOpacity`
  max-width: 200px;
`;

const ContactsDetails = ({
  route,
}: StackScreenProps<ContactSettingsStackParamList, 'ContactsDetails'>) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {address, coin, network, name, tag, email} = route.params;

  const [copied, setCopied] = useState(false);
  const [isConfirmModalVisible, setConfirmModalIsVisible] = useState(false);
  const [showContactOptions, setShowContactOptions] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>Contact</HeaderTitle>,
      headerRight: () => (
        <Settings
          onPress={() => {
            setShowContactOptions(true);
          }}
        />
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [copied]);

  const copyToClipboard = () => {
    haptic('impactLight');
    Clipboard.setString(address);
    setCopied(true);
  };

  const deleteContactView = async () => {
    setConfirmModalIsVisible(false);
    await sleep(500);
    dispatch(deleteContact(address, coin, network));
    navigation.goBack();
  };

  const contactOptions: Array<Option> = [
    {
      img: <SendIcon />,
      title: 'Send ' + coin.toUpperCase(),
      onPress: () => null,
    },
    {
      img: <DeleteIcon />,
      title: 'Delete Contact',
      onPress: () => setConfirmModalIsVisible(true),
    },
  ];

  return (
    <ContactsDetailsContainer>
      <DetailsScrollContainer>
        <ContactImageHeader>
          <ContactIcon coin={coin} size={100} name={name} />
        </ContactImageHeader>
        <Details>
          {email ? (
            <>
              <Detail>
                <Title>Email</Title>
                <DetailInfo align="right">{email}</DetailInfo>
              </Detail>
              <Hr />
            </>
          ) : null}
          <Detail>
            <Title>Name</Title>
            <DetailInfo align="right">{name}</DetailInfo>
          </Detail>
          <Hr />
          <Detail>
            <Title>Address</Title>
            <DetailInfo align="right">
              <AddressContainer onPress={copyToClipboard} activeOpacity={0.7}>
                <AddressText numberOfLines={1} ellipsizeMode={'tail'}>
                  {!copied ? address : 'Copied to clipboard!'}
                </AddressText>
              </AddressContainer>
            </DetailInfo>
          </Detail>
          {network ? (
            <>
              <Hr />
              <Detail>
                <Title>Network</Title>
                <DetailInfo align="right">{network}</DetailInfo>
              </Detail>
            </>
          ) : null}
          {coin ? (
            <>
              <Hr />
              <Detail>
                <Title>Coin</Title>
                <DetailInfo align="right">{coin.toUpperCase()}</DetailInfo>
              </Detail>
            </>
          ) : null}
          {tag ? (
            <>
              <Hr />
              <Detail>
                <Title>Tag</Title>
                <DetailInfo align="right">{tag}</DetailInfo>
              </Detail>
            </>
          ) : null}
        </Details>
      </DetailsScrollContainer>
      <ContactOptionsModal
        isVisible={showContactOptions}
        title={'Contact Options'}
        options={contactOptions}
        closeModal={() => setShowContactOptions(false)}
      />
      <ContactDeleteModal
        description={
          'Deleting this contact will remove them from your contacts.'
        }
        onPressOk={deleteContactView}
        isVisible={isConfirmModalVisible}
        onPressCancel={() => setConfirmModalIsVisible(false)}
      />
    </ContactsDetailsContainer>
  );
};

export default ContactsDetails;
