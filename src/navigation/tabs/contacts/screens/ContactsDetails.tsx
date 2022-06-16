import React, {useEffect, useLayoutEffect, useState, ReactElement} from 'react';
import {useAppSelector} from '../../../../utils/hooks';
import styled, {useTheme} from 'styled-components/native';
import {useNavigation} from '@react-navigation/core';
import {StackScreenProps} from '@react-navigation/stack';
import Clipboard from '@react-native-community/clipboard';
import {useDispatch} from 'react-redux';
import {ContactsStackParamList} from '../ContactsStack';
import {sleep} from '../../../../utils/helper-methods';
import {BaseText, TextAlign} from '../../../../components/styled/Text';
import {Hr} from '../../../../components/styled/Containers';
import haptic from '../../../../components/haptic-feedback/haptic';
import {
  NeutralSlate,
  SlateDark,
  LightBlack,
  White,
} from '../../../../styles/colors';
import {deleteContact} from '../../../../store/contact/contact.actions';
import Settings from '../../../../components/settings/Settings';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';

import ContactIcon from '../components/ContactIcon';
import SendIcon from '../../../../../assets/img/send-icon.svg';
import SendIconWhite from '../../../../../assets/img/send-icon-white.svg';
import DeleteIcon from '../../../../../assets/img/delete-icon.svg';
import DeleteIconWhite from '../../../../../assets/img/delete-icon-white.svg';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {ToCashAddress} from '../../../../store/wallet/effects/address/address';
import {useTranslation} from 'react-i18next';

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
  align-items: flex-end;
  max-width: 250px;
`;

const OptionContainer = styled.TouchableOpacity<{lastElement?: string}>`
  flex-direction: row;
  padding: 30px 25px;
  align-items: stretch;
  border-bottom-color: ${({theme: {dark}}) => (dark ? SlateDark : '#ebecee')};
  border-bottom-width: ${({lastElement}) => lastElement || '1px'};
`;

const OptionIconContainer = styled.View`
  justify-content: center;
`;

const OptionTextContainer = styled.View`
  align-items: flex-start;
  justify-content: space-around;
  flex-direction: column;
  padding-left: 19px;
`;

const OptionTitleText = styled(BaseText)`
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
  line-height: 19px;
`;

const ModalContainer = styled.View`
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  padding: 30px 0 0 0;
`;

interface ModalOpt {
  img?: ReactElement;
  title: string;
  onPress: () => void;
}

const ContactsDetails = ({
  route,
}: StackScreenProps<ContactsStackParamList, 'ContactsDetails'>) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {address, coin, network, name, tag, email} = route.params;

  const [copied, setCopied] = useState(false);
  const [showIconOptions, setShowIconOptions] = useState(false);

  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const contactOptions: Array<ModalOpt> = [];
  let availableWallets = Object.values(keys)
    .filter(key => key.backupComplete)
    .flatMap(key => key.wallets);

  availableWallets = availableWallets.filter(
    wallet =>
      !wallet.hideWallet &&
      wallet.network === 'livenet' &&
      wallet.isComplete() &&
      wallet.currencyAbbreviation === coin &&
      wallet.balance.sat > 0,
  );

  if (availableWallets.length) {
    let newAddress = address;
    if (coin === 'bch') {
      // Remove prefix
      newAddress = ToCashAddress(address, false);
    }
    contactOptions.push({
      img: theme.dark ? <SendIconWhite /> : <SendIcon />,
      title: t('Send ') + coin.toUpperCase(),
      onPress: () => {
        setShowIconOptions(false);
        navigation.navigate('Wallet', {
          screen: 'GlobalSelect',
          params: {
            context: 'contact',
            recipient: {
              name,
              address: newAddress,
              currency: coin,
              network,
            },
          },
        });
      },
    });
  }

  contactOptions.push({
    img: theme.dark ? <DeleteIconWhite /> : <DeleteIcon />,
    title: t('Delete Contact'),
    onPress: async () => {
      setShowIconOptions(false);
      await sleep(500);
      deleteModal();
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Settings
          onPress={() => {
            setShowIconOptions(true);
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
    await sleep(500);
    dispatch(deleteContact(address, coin, network));
    navigation.goBack();
  };

  const deleteModal = () => {
    dispatch(
      showBottomNotificationModal({
        type: 'question',
        title: t('Are you sure?'),
        message: t(
          'Deleting this contact will remove them from your contacts.',
        ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('Delete Contact'),
            action: () => {
              deleteContactView();
            },
            primary: true,
          },
          {
            text: t('Nevermind'),
            action: () => {},
            primary: false,
          },
        ],
      }),
    );
  };

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
                <Title>{t('Email')}</Title>
                <DetailInfo align="right">{email}</DetailInfo>
              </Detail>
              <Hr />
            </>
          ) : null}
          <Detail>
            <Title>{t('Name')}</Title>
            <DetailInfo align="right">{name}</DetailInfo>
          </Detail>
          <Hr />
          <Detail>
            <Title>{t('Address')}</Title>
            <DetailInfo align="right">
              <AddressContainer onPress={copyToClipboard} activeOpacity={0.7}>
                <AddressText numberOfLines={1} ellipsizeMode={'tail'}>
                  {!copied ? address : t('Copied to clipboard!')}
                </AddressText>
              </AddressContainer>
            </DetailInfo>
          </Detail>
          {network !== 'livenet' ? (
            <>
              <Hr />
              <Detail>
                <Title>{t('Network')}</Title>
                <DetailInfo align="right">{network}</DetailInfo>
              </Detail>
            </>
          ) : null}
          {coin ? (
            <>
              <Hr />
              <Detail>
                <Title>{t('Coin')}</Title>
                <DetailInfo align="right">{coin.toUpperCase()}</DetailInfo>
              </Detail>
            </>
          ) : null}
          {tag ? (
            <>
              <Hr />
              <Detail>
                <Title>{t('Tag')}</Title>
                <DetailInfo align="right">{tag}</DetailInfo>
              </Detail>
            </>
          ) : null}
        </Details>
      </DetailsScrollContainer>

      <SheetModal
        placement={'top'}
        isVisible={showIconOptions}
        onBackdropPress={() => setShowIconOptions(false)}>
        <ModalContainer>
          {contactOptions.map(({img, title: optionTitle, onPress}, index) => (
            <OptionContainer
              key={index}
              onPress={onPress}
              lastElement={contactOptions.length - 1 === index ? '0' : '1px'}>
              <OptionIconContainer>{img}</OptionIconContainer>
              <OptionTextContainer>
                <OptionTitleText>{optionTitle}</OptionTitleText>
              </OptionTextContainer>
            </OptionContainer>
          ))}
        </ModalContainer>
      </SheetModal>
    </ContactsDetailsContainer>
  );
};

export default ContactsDetails;
