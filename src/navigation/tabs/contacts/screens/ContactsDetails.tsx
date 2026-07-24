import React, {useEffect, useLayoutEffect, useState, ReactElement} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {useAppSelector} from '../../../../utils/hooks';
import {useTheme} from '../../../../contexts';
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
import {
  IsEVMChain,
  IsSVMChain,
  IsVMChain,
} from '../../../../store/wallet/utils/currency';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const styles = StyleSheet.create({
  contactsDetailsContainer: {
    flex: 1,
  },
  detailsScrollContainer: {
    paddingHorizontal: 15,
  },
  details: {
    marginTop: 20,
  },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
  },
  notes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 20,
  },
  title: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
    letterSpacing: 0,
  },
  detailInfo: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
    maxWidth: '75%',
    paddingLeft: 10,
  },
  contactImageHeader: {
    marginVertical: 10,
    height: 150,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 16,
    maxWidth: 250,
  },
  addressContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  optionContainer: {
    flexDirection: 'row',
    paddingVertical: 25,
    paddingHorizontal: 25,
    alignItems: 'stretch',
    borderTopWidth: 1,
  },
  optionIconContainer: {
    justifyContent: 'center',
  },
  optionTextContainer: {
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    flexDirection: 'column',
    paddingLeft: 19,
  },
  optionTitleText: {
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 19,
  },
  modalContainer: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingTop: 70,
  },
  copyImgContainer: {
    justifyContent: 'center',
    marginRight: 5,
  },
});

const Title: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <BaseText style={styles.title}>{children}</BaseText>
);

const DetailInfo: React.FC<React.ComponentProps<typeof TextAlign>> = ({
  style,
  ...rest
}) => <TextAlign style={[styles.detailInfo, style]} {...rest} />;

const AddressText: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.addressText,
        {color: theme.dark ? NeutralSlate : '#6F7782'},
        style,
      ]}
      {...rest}
    />
  );
};

const AddressContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.addressContainer, style]} {...rest} />
);

const OptionContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.optionContainer,
        {borderTopColor: theme.dark ? SlateDark : '#ebecee'},
        style,
      ]}
      {...rest}
    />
  );
};

const OptionTitleText: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <BaseText style={styles.optionTitleText}>{children}</BaseText>;

const ModalContainer: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.modalContainer,
        {backgroundColor: theme.dark ? LightBlack : White},
      ]}>
      {children}
    </View>
  );
};

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
      !wallet.pendingTssSession &&
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
    <SafeAreaView style={styles.contactsDetailsContainer}>
      <ScrollView style={styles.detailsScrollContainer}>
        <View style={styles.contactImageHeader}>
          <ContactIcon
            coin={getCurrencyAbbreviation(contact.coin, contact.chain)}
            size={100}
            name={contact.name}
            chain={contact.chain}
            address={contact.address}
            tokenAddress={contact.tokenAddress}
          />
        </View>
        <View style={styles.details}>
          {contact.email ? (
            <>
              <View style={styles.detail}>
                <Title>{t('Email')}</Title>
                <DetailInfo align="right">{contact.email}</DetailInfo>
              </View>
              <Hr />
            </>
          ) : null}
          <View style={styles.detail}>
            <Title>{t('Name')}</Title>
            <DetailInfo align="right" numberOfLines={2} ellipsizeMode={'tail'}>
              {contact.name}
            </DetailInfo>
          </View>
          <Hr />
          <View style={styles.detail}>
            <Title>{t('Address')}</Title>
            <AddressContainer
              onPress={copyToClipboard}
              activeOpacity={0.7}
              testID="contacts-details-copy-address-button"
              accessibilityLabel="Copy address">
              <View style={styles.copyImgContainer}>
                {copied ? <CopiedSvg width={17} /> : null}
              </View>
              <AddressText numberOfLines={1} ellipsizeMode={'tail'}>
                {contact.address}
              </AddressText>
            </AddressContainer>
          </View>

          {contact.network !== 'livenet' ? (
            <>
              <Hr />
              <View style={styles.detail}>
                <Title>{t('Network')}</Title>
                <DetailInfo align="right">{contact.network}</DetailInfo>
              </View>
            </>
          ) : null}
          {contact.coin && contact.chain && !IsVMChain(contact.chain) ? (
            <>
              <Hr />
              <View style={styles.detail}>
                <Title>{t('Coin')}</Title>
                <DetailInfo align="right">
                  {contact.coin.toUpperCase()}
                </DetailInfo>
              </View>
            </>
          ) : null}
          {contact.tag || contact.destinationTag ? (
            <>
              <Hr />
              <View style={styles.detail}>
                <Title>{t('Tag')}</Title>
                <DetailInfo align="right">
                  {contact.tag || contact.destinationTag}
                </DetailInfo>
              </View>
            </>
          ) : null}
          {contact.notes && IsVMChain(contact.chain) ? (
            <>
              <Hr />
              <View style={styles.notes}>
                <Title>{t('Notes')}</Title>
                <DetailInfo align="left" style={{marginHorizontal: 20}}>
                  {contact.notes}
                </DetailInfo>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <SheetModal
        placement={'top'}
        isVisible={showIconOptions}
        onBackdropPress={() => setShowIconOptions(false)}>
        <ModalContainer>
          {contactOptions.map(({img, title: optionTitle, onPress}, index) => (
            <OptionContainer
              key={index}
              testID={`contacts-details-option-${optionTitle
                .toLowerCase()
                .replace(/\s+/g, '-')}-button`}
              accessibilityLabel={optionTitle}
              onPress={onPress}>
              <View style={styles.optionIconContainer}>{img}</View>
              <View style={styles.optionTextContainer}>
                <OptionTitleText>{optionTitle}</OptionTitleText>
              </View>
            </OptionContainer>
          ))}
        </ModalContainer>
      </SheetModal>
    </SafeAreaView>
  );
};

export default ContactsDetails;
