import React, {memo} from 'react';
import FastImage from 'react-native-fast-image';
import styled, {useTheme} from 'styled-components/native';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import Back from '../../../components/back/Back';
import {H4, H6, Link, TextAlign} from '../../../components/styled/Text';
import {
  UriContainer,
  UriContainerTouchable,
} from '../../../components/modal/wallet-connect/WalletConnectStartModal';
import ExternalLinkSvg from '../../../../assets/img/external-link-small.svg';
import {Caution, NotificationPrimary} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import {useTranslation} from 'react-i18next';
import {
  WalletSelectMenuContainer,
  WalletSelectMenuHeaderContainer,
} from '../../../navigation/wallet/screens/GlobalSelect';
import Banner from '../../banner/Banner';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {useAppDispatch} from '../../../utils/hooks';
import {WCV2SessionType} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';
import {SvgProps} from 'react-native-svg';
import WarningOutlineSvg from '../../../../assets/img/warning-outline.svg';
import TrustedDomainSvg from '../../../../assets/img/trusted-domain.svg';
import InvalidDomainSvg from '../../../../assets/img/invalid-domain.svg';

const CloseModalButton = styled.TouchableOpacity`
  height: 40px;
  width: 40px;
  border-radius: 50px;
  background-color: #9ba3ae33;
  position: absolute;
  top: 10px;
  left: 16px;
  z-index: 1;
`;

const ContentContainer = styled.View`
  padding: 16px 16px;
`;

const RowContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const StyledTouchableOpacity = styled.TouchableOpacity``;

const IconContainer = styled(FastImage)`
  width: 30px;
  height: 30px;
  margin-right: 5px;
`;

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

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={closeModal}>
      <WalletSelectMenuContainer style={{minHeight: 300}}>
        <WalletSelectMenuHeaderContainer>
          <CloseModalButton onPress={() => closeModal()}>
            <Back
              color={theme.dark ? 'white' : 'black'}
              background={'rgba(255, 255, 255, 0.2)'}
              opacity={1}
            />
          </CloseModalButton>
          <TextAlign align={'center'}>
            <H4>{modalTitle}</H4>
          </TextAlign>
        </WalletSelectMenuHeaderContainer>
        <ContentContainer>
          <RowContainer>
            <RowContainer>
              {peerIcon && <IconContainer source={{uri: peerIcon}} />}
              <H4>{peerName}</H4>
            </RowContainer>
            {peerUrl && (
              <UriContainerTouchable
                onPress={() => dispatch(openUrlWithInAppBrowser(peerUrl))}>
                <UriContainer>
                  <Link style={{fontSize: 12}}>{peerUrl}</Link>
                  <ExternalLinkSvg width={12} />
                </UriContainer>
              </UriContainerTouchable>
            )}
          </RowContainer>
          <Banner
            height={100}
            type={type}
            title={title}
            description={text}
            hasBackgroundColor={true}
          />
          <RowContainer style={{paddingTop: 16}}>
            <StyledTouchableOpacity onPress={closeModal}>
              <H6 medium style={{color: NotificationPrimary}}>
                {t('I UNDERSTAND')}
              </H6>
            </StyledTouchableOpacity>
            <StyledTouchableOpacity
              onPress={async () => {
                closeModal();
                await sleep(1000);
                onRemovePress();
              }}>
              <H6 medium style={{color: Caution}}>
                {t('REMOVE')}
              </H6>
            </StyledTouchableOpacity>
          </RowContainer>
        </ContentContainer>
      </WalletSelectMenuContainer>
    </SheetModal>
  );
};

export default memo(VerifyContextModal);
