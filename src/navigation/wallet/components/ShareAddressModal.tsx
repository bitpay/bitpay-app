import React, {useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../components/styled/Text';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {SheetContainer} from '../../../components/styled/Containers';
import {Black, White, SlateDark} from '../../../styles/colors';
import {ScrollView, SafeAreaView, Share} from 'react-native';
import {useTranslation} from 'react-i18next';
import ENSDomainIcon from '../../../components/avatar/ENSDomainIcon';
import CopyToClipboardIcon from '../../../components/icons/copy-to-clipboard/CopyToClipboardIcon';
import {Wallet} from '../../../store/wallet/wallet.models';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {DomainProps} from '../../../components/list/ContactRow';
import UnstoppableDomainIcon from '../../../components/avatar/UnstoppableDomainIcon';
import BitpaySvg from '../../../../assets/img/wallet/transactions/bitpay.svg';
import haptic from '../../../components/haptic-feedback/haptic';
import Clipboard from '@react-native-community/clipboard';
import CopiedSvg from '../../../../assets/img/copied-success.svg';

const ShareAddressContainer = styled(SheetContainer)`
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const ModalHeader = styled.View`
  margin: 10px 0 20px 0;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  position: relative;
`;

const ModalHeaderText = styled(BaseText)`
  font-size: 18px;
  font-weight: bold;
`;

const LabelTip = styled.View`
  border: 1px solid ${SlateDark};
  border-radius: 12px;
  padding: 16px;
  height: 57px;
  margin-bottom: 16px;
`;

const Row = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const RowLabelContainer = styled.View`
  max-width: 75%;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const RowLabel = styled(BaseText)`
  font-size: 14px;
  padding-left: 8px;
`;

const CopyToClipboardContainer = styled.TouchableOpacity`
  align-items: center;
  justify-content: flex-end;
`;

interface Props {
  isVisible: boolean;
  closeModal: () => void;
  wallet: Wallet;
  domain?: DomainProps;
  email?: string;
}

const ShareAddressModal = ({
  isVisible,
  closeModal,
  wallet,
  domain,
  email,
}: Props) => {
  const {t} = useTranslation();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const {receiveAddress, img, badgeImg} = wallet;

  const copyToClipboard = (text: string) => {
    haptic('impactLight');
    Clipboard.setString(text);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedEmail(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedEmail]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedAddress(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedDomain(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedDomain]);

  const shareAddress = async (text: string) => {
    await Share.share({
      message: text,
    });
  };

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={closeModal}>
      <ShareAddressContainer>
        <SafeAreaView>
          <ModalHeader>
            <ModalHeaderText>{t('Share Address')}</ModalHeaderText>
          </ModalHeader>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{marginHorizontal: -16}}>
            {email ? (
              <LabelTip>
                <Row onPress={() => shareAddress(email)}>
                  <RowLabelContainer>
                    <BitpaySvg width={20} height={20} />
                    <RowLabel numberOfLines={1} ellipsizeMode={'middle'}>
                      {email}
                    </RowLabel>
                  </RowLabelContainer>
                  <CopyToClipboardContainer
                    onPress={() => {
                      copyToClipboard(email);
                      setCopiedEmail(true);
                    }}>
                    {!copiedEmail ? (
                      <CopyToClipboardIcon />
                    ) : (
                      <CopiedSvg width={20} />
                    )}
                  </CopyToClipboardContainer>
                </Row>
              </LabelTip>
            ) : null}

            {domain ? (
              <LabelTip>
                <Row onPress={() => shareAddress(domain.domainName)}>
                  <RowLabelContainer>
                    {domain.domainType === 'ENSDomain' ? (
                      <ENSDomainIcon />
                    ) : (
                      <UnstoppableDomainIcon />
                    )}
                    <RowLabel numberOfLines={1} ellipsizeMode={'middle'}>
                      {domain}
                    </RowLabel>
                  </RowLabelContainer>
                  <CopyToClipboardContainer
                    onPress={() => {
                      copyToClipboard(domain.domainName);
                      setCopiedDomain(true);
                    }}>
                    {!copiedDomain ? (
                      <CopyToClipboardIcon />
                    ) : (
                      <CopiedSvg width={20} />
                    )}
                  </CopyToClipboardContainer>
                </Row>
              </LabelTip>
            ) : null}

            {receiveAddress ? (
              <LabelTip>
                <Row onPress={() => shareAddress(receiveAddress)}>
                  <RowLabelContainer>
                    <CurrencyImage img={img} badgeUri={badgeImg} size={20} />
                    <RowLabel numberOfLines={1} ellipsizeMode={'middle'}>
                      {receiveAddress}
                    </RowLabel>
                  </RowLabelContainer>
                  <CopyToClipboardContainer
                    onPress={() => {
                      copyToClipboard(receiveAddress);
                      setCopiedAddress(true);
                    }}>
                    {!copiedAddress ? (
                      <CopyToClipboardIcon />
                    ) : (
                      <CopiedSvg width={20} />
                    )}
                  </CopyToClipboardContainer>
                </Row>
              </LabelTip>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </ShareAddressContainer>
    </SheetModal>
  );
};

export default ShareAddressModal;
