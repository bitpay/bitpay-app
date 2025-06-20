import React, {useEffect, useLayoutEffect, useState, ReactElement} from 'react';
import {useAppSelector} from '../../../../utils/hooks';
import styled, {useTheme} from 'styled-components/native';
import {useNavigation} from '@react-navigation/core';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import Clipboard from '@react-native-clipboard/clipboard';
import {useDispatch} from 'react-redux';
import {ContactsScreens, ContactsGroupParamList} from '../ContactsGroup';
import {getCurrencyAbbreviation, sleep} from '../../../../utils/helper-methods';
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
import EditIcon from '../../../../../assets/img/edit-icon.svg';
import EditIconWhite from '../../../../../assets/img/edit-icon-white.svg';
import DeleteIconWhite from '../../../../../assets/img/delete-icon-white.svg';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {ToCashAddress} from '../../../../store/wallet/effects/address/address';
import {useTranslation} from 'react-i18next';
import CopiedSvg from '../../../../../assets/img/copied-success.svg';
import {ContactRowProps} from '../../../../components/list/ContactRow';
import {IsEVMChain, IsSVMChain, IsVMChain} from '../../../../store/wallet/utils/currency';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

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

const Notes = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 20px;
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
  max-width: 75%;
  padding-left: 10px;
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
  max-width: 250px;
`;

const AddressContainer = styled(TouchableOpacity)`
  align-items: center;
  flex-direction: row;
  justify-content: flex-end;
`;

const OptionContainer = styled(TouchableOpacity)`
  flex-direction: row;
  padding: 25px 25px;
  align-items: stretch;
  border-top-color: ${({theme: {dark}}) => (dark ? SlateDark : '#ebecee')};
  border-top-width: 1px;
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
  padding: 70px 0 0 0;
`;

const CopyImgContainer = styled.View`
  justify-content: center;
  margin-right: 5px;
`;

interface ModalOpt {
  img?: ReactElement;
  title: string;
  onPress: () => void;
}

const ContactsDetails = ({
  route,
}: NativeStackScreenProps<ContactsGroupParamList, ContactsScreens.DETAILS>) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {contact: _contact} = route.params;
  const [contact, setContact] = useState(_contact);

  const [copied, setCopied] = useState(false);
  const [copiedContractAddress, setCopiedContractAddress] = useState(false);
  const [showIconOptions, setShowIconOptions] = useState(false);

  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const contactOptions: Array<ModalOpt> = [];
  let availableWallets = Object.values(keys)
    .filter(key => key.backupComplete)
    .flatMap(key => key.wallets);

  availableWallets = availableWallets.filter(
    wallet =>
      !wallet.hideWallet &&
      !wallet.hideWalletByAccount &&
      wallet.network === 'livenet' &&
      wallet.isComplete() &&
      wallet.currencyAbbreviation === contact.coin &&
      wallet.balance.sat > 0,
  );

  if (availableWallets.length) {
    let newAddress = contact.address;
    if (contact.coin === 'bch') {
      // Remove prefix
      newAddress = ToCashAddress(contact.address, false);
    }
    contactOptions.push({
      img: theme.dark ? <SendIconWhite /> : <SendIcon />,
      title: t('Send to this contact'),
      onPress: async () => {
        setShowIconOptions(false);
        await sleep(500);
        navigation.navigate('GlobalSelect', {
          context: 'contact',
          recipient: {
            name: contact.name,
            address: newAddress,
            currency: contact.coin,
            chain: contact.chain,
            network: contact.network,
            destinationTag: contact.tag || contact.destinationTag,
            opts: {
              showEVMWalletsAndTokens: IsEVMChain(contact.chain),
              showSVMWalletsAndTokens: IsSVMChain(contact.chain),
            },
          },
        });
      },
    });
  }

  contactOptions.push({
    img: theme.dark ? <EditIconWhite /> : <EditIcon />,
    title: t('Edit Contact'),
    onPress: async () => {
      setShowIconOptions(false);
      await sleep(500);
      navigation.navigate('ContactsAdd', {
        contact,
        context: 'edit',
        onEditComplete: (c: ContactRowProps) => {
          setContact(c);
        },
      });
    },
  });

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
    Clipboard.setString(contact.address);
    setCopied(true);
  };

  useEffect(() => {
    if (!copiedContractAddress) {
      return;
    }
    const timer = setTimeout(() => {
      setCopiedContractAddress(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [copiedContractAddress]);

  const deleteContactView = async () => {
    await sleep(500);
    dispatch(deleteContact(contact.address));
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
          <ContactIcon
            coin={getCurrencyAbbreviation(contact.coin, contact.chain)}
            size={100}
            name={contact.name}
            chain={contact.chain}
            address={contact.address}
            tokenAddress={contact.tokenAddress}
          />
        </ContactImageHeader>
        <Details>
          {contact.email ? (
            <>
              <Detail>
                <Title>{t('Email')}</Title>
                <DetailInfo align="right">{contact.email}</DetailInfo>
              </Detail>
              <Hr />
            </>
          ) : null}
          <Detail>
            <Title>{t('Name')}</Title>
            <DetailInfo align="right" numberOfLines={2} ellipsizeMode={'tail'}>
              {contact.name}
            </DetailInfo>
          </Detail>
          <Hr />
          <Detail>
            <Title>{t('Address')}</Title>
            <AddressContainer onPress={copyToClipboard} activeOpacity={0.7}>
              <CopyImgContainer>
                {copied ? <CopiedSvg width={17} /> : null}
              </CopyImgContainer>
              <AddressText numberOfLines={1} ellipsizeMode={'tail'}>
                {contact.address}
              </AddressText>
            </AddressContainer>
          </Detail>

          {contact.network !== 'livenet' ? (
            <>
              <Hr />
              <Detail>
                <Title>{t('Network')}</Title>
                <DetailInfo align="right">{contact.network}</DetailInfo>
              </Detail>
            </>
          ) : null}
          {contact.coin && contact.chain && !IsVMChain(contact.chain) ? (
            <>
              <Hr />
              <Detail>
                <Title>{t('Coin')}</Title>
                <DetailInfo align="right">
                  {contact.coin.toUpperCase()}
                </DetailInfo>
              </Detail>
            </>
          ) : null}
          {contact.tag || contact.destinationTag ? (
            <>
              <Hr />
              <Detail>
                <Title>{t('Tag')}</Title>
                <DetailInfo align="right">
                  {contact.tag || contact.destinationTag}
                </DetailInfo>
              </Detail>
            </>
          ) : null}
          {contact.notes && IsVMChain(contact.chain) ? (
            <>
              <Hr />
              <Notes>
                <Title>{t('Notes')}</Title>
                <DetailInfo align="left" style={{marginHorizontal: 20}}>
                  {contact.notes}
                </DetailInfo>
              </Notes>
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
            <OptionContainer key={index} onPress={onPress}>
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
