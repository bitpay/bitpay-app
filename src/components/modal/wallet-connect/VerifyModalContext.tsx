import React, {memo, useState} from 'react';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../contexts';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import Back from '../../../components/back/Back';
import {H4, Link} from '../../../components/styled/Text';
import {
  UriContainer,
  UriContainerTouchable,
} from '../../../components/modal/wallet-connect/WalletConnectStartModal';
import ExternalLinkSvg from '../../../../assets/img/external-link-small.svg';
import {sleep} from '../../../utils/helper-methods';
import {useTranslation} from 'react-i18next';
import {
  WalletSelectMenuContainer,
  WalletSelectMenuHeaderContainer as _WalletSelectMenuHeaderContainer,
} from '../../../navigation/wallet/screens/GlobalSelect';
import Banner from '../../banner/Banner';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {useAppDispatch} from '../../../utils/hooks';
import {WCV2SessionType} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';
import {SvgProps} from 'react-native-svg';
import WarningOutlineSvg from '../../../../assets/img/warning-outline.svg';
import TrustedDomainSvg from '../../../../assets/img/trusted-domain.svg';
import InvalidDomainSvg from '../../../../assets/img/invalid-domain.svg';
import DefaultImage from '../../../../assets/img/wallet-connect/default-icon.svg';
import {StyleSheet, View} from 'react-native';
import {BottomNotificationCta} from '../bottom-notification/BottomNotification';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const styles = StyleSheet.create({
  closeModalButton: {
    height: 40,
    width: 40,
    borderRadius: 50,
    backgroundColor: '#9ba3ae33',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  contentContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 30,
    height: 30,
    marginRight: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletSelectMenuHeaderContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  centeredTitleContainer: {
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 20,
  },
  invisiblePlaceholder: {
    width: 41,
  },
});

interface VerifyContextModalProps {
  isVisible: boolean;
  closeModal: () => void;
  sessionV2: WCV2SessionType | undefined;
  onRemovePress: () => void;
}

const VerifyContextModal = ({
  isVisible,
  closeModal,
  sessionV2,
  onRemovePress,
}: VerifyContextModalProps) => {
  const theme = useTheme();
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const [imageError, setImageError] = useState(false);

  const {peer} = sessionV2 || {};
  const {name: peerName, icons, url: peerUrl} = peer?.metadata || {};
  const peerIcon = icons && icons[0];

  let VerifyIcon: React.FC<SvgProps> | null = null;
  let modalTitle = '';
  let type = '';
  let title = '';
  let text = '';
  switch (sessionV2?.verifyContext?.verified?.validation) {
    case 'UNKNOWN':
      VerifyIcon = WarningOutlineSvg;
      modalTitle = t('Unknown Domain');
      type = 'warning';
      title = t('Cannot verify Domain');
      text = t('The domain sending the request cannot be verified.');
      break;
    case 'VALID':
      VerifyIcon = TrustedDomainSvg;
      modalTitle = t('Trusted Domain');
      type = 'success';
      title = t('Trusted Domain');
      text = t(
        "The domain linked to this request has been verified as this application's domain.",
      );
      break;
    case 'INVALID':
      VerifyIcon = InvalidDomainSvg;
      modalTitle = t('Invalid Domain');
      type = 'error';
      title = t('Security Risk');
      text = t(
        "The application's domain doesn't match the sender of this request.",
      );
      break;
  }
  // if scam ignore validation
  if (sessionV2?.verifyContext?.verified?.isScam) {
    VerifyIcon = InvalidDomainSvg;
    modalTitle = t('Scam Domain');
    type = 'error';
    title = t('Security Risk');
    text = t("The application's domain has been flagged as a scam.");
  }

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={closeModal}>
      <WalletSelectMenuContainer style={{minHeight: 300}}>
        <_WalletSelectMenuHeaderContainer
          style={styles.walletSelectMenuHeaderContainer}>
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={closeModal}>
            <Back
              color={theme.dark ? 'white' : 'black'}
              background={'rgba(255, 255, 255, 0.2)'}
              opacity={1}
            />
          </TouchableOpacity>
          <View style={styles.centeredTitleContainer}>
            <H4>{modalTitle}</H4>
          </View>
          <View style={[styles.invisiblePlaceholder, {width: 41}]} />
        </_WalletSelectMenuHeaderContainer>
        <View style={styles.contentContainer}>
          <View style={styles.rowContainer}>
            <View style={styles.rowContainer}>
              {peerIcon && !imageError ? (
                <View style={styles.iconContainer}>
                  <FastImage
                    source={{uri: peerIcon}}
                    style={{width: 18, height: 18}}
                    onError={() => setImageError(true)}
                  />
                </View>
              ) : (
                <DefaultImage width={30} height={30} style={{marginRight: 5}} />
              )}
              <View style={{width: 150}}>
                <H4 ellipsizeMode="tail" numberOfLines={1}>
                  {peerName}
                </H4>
              </View>
            </View>
            {peerUrl && (
              <UriContainerTouchable
                onPress={() => dispatch(openUrlWithInAppBrowser(peerUrl))}>
                <UriContainer>
                  <Link style={{fontSize: 12}}>{peerUrl}</Link>
                  <ExternalLinkSvg width={12} />
                </UriContainer>
              </UriContainerTouchable>
            )}
          </View>
          <Banner
            height={100}
            type={type}
            title={title}
            description={text}
            hasBackgroundColor={true}
            icon={VerifyIcon}
          />
          <View style={[styles.rowContainer, {paddingTop: 16}]}>
            <BottomNotificationCta
              onPress={closeModal}
              suppressHighlighting={true}
              primary={true}>
              {t('I UNDERSTAND')}
            </BottomNotificationCta>
            <BottomNotificationCta
              suppressHighlighting={true}
              onPress={async () => {
                closeModal();
                await sleep(1000);
                onRemovePress();
              }}>
              {t('REMOVE')}
            </BottomNotificationCta>
          </View>
        </View>
      </WalletSelectMenuContainer>
    </SheetModal>
  );
};

export default memo(VerifyContextModal);
