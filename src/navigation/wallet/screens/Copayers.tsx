import React, {useState, useEffect} from 'react';
import {StackNavigationProp} from '@react-navigation/stack';
import {TouchableOpacity} from 'react-native-gesture-handler';
import Clipboard from '@react-native-community/clipboard';
import {RouteProp, useRoute} from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import styled, {useTheme} from 'styled-components/native';
import {Image, ScrollView, RefreshControl, Share} from 'react-native';
import {
  Paragraph,
  BaseText,
  H6,
  TextAlign,
  HeaderTitle,
} from '../../../components/styled/Text';
import {
  TitleContainer,
  RowContainer,
  ActiveOpacity,
  ActionContainer,
} from '../../../components/styled/Containers';
import haptic from '../../../components/haptic-feedback/haptic';
import {WalletStackParamList} from '../WalletStack';
import {White, SlateDark} from '../../../styles/colors';
import {useNavigation} from '@react-navigation/native';
import Button from '../../../components/button/Button';
import {useTranslation} from 'react-i18next';
import {useLogger} from '../../../utils/hooks';
import {Status} from '../../../store/wallet/wallet.models';

const CircleCheckIcon = require('../../../../assets/img/circle-check.png');
interface CopayersProps {
  navigation: StackNavigationProp<WalletStackParamList, 'Copayers'>;
}

const Gutter = '10px';
const JoinCopayersContainer = styled.View`
  padding: ${Gutter};
`;

const AuthorizedContainer = styled(BaseText)`
  margin: 0 20px;
`;

const QRCodeContainer = styled.View`
  align-items: center;
  margin: 15px;
`;

const QRCodeBackground = styled.View`
  background-color: ${White};
  width: 225px;
  height: 225px;
  justify-content: center;
  align-items: center;
  border-radius: 12px;
`;

const CopayersContainer = styled(RowContainer)`
  padding: 18px;
  border-style: solid;
  border-top-width: 1px;
  border-top-color: ${({theme}) => (theme.dark ? '#434D5A' : '#E1E4E7')};
`;

const Copayers: React.FC<CopayersProps> = props => {
  const {t} = useTranslation();
  const logger = useLogger();
  const route = useRoute<RouteProp<WalletStackParamList, 'Copayers'>>();
  const {wallet, status} = route.params || {};
  const [walletStatus, setWalletStatus] = useState(status);
  const [copied, setCopied] = useState(false);
  const {navigation} = props;
  const navigationRef = useNavigation();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const walletName =
      wallet?.walletName ||
      wallet?.credentials?.walletName ||
      `${wallet?.currencyName} multisig`;
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>{`${walletName} [${wallet?.m}-${wallet?.n}]`}</HeaderTitle>
      ),
    });
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await updateWalletStatus();
    setRefreshing(false);
  };

  const updateWalletStatus = () => {
    return new Promise<void>(resolve => {
      wallet?.getStatus({network: wallet?.network}, (err: any, st: Status) => {
        if (err) {
          const errStr =
            err instanceof Error ? err.message : JSON.stringify(err);
          logger.error(`error [getStatus]: ${errStr}`);
        } else {
          setWalletStatus(st?.wallet);
          if (st?.wallet && st?.wallet?.status === 'complete') {
            wallet.openWallet({}, () => {
              navigationRef.goBack();
            });
          }
        }
        return resolve();
      });
    });
  };

  const copyToClipboard = () => {
    haptic('impactLight');
    if (!copied) {
      Clipboard.setString(walletStatus.secret);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 3000);
    }
  };

  const shareInvitation = async () => {
    await Share.share({
      message: walletStatus.secret,
    });
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          tintColor={theme.dark ? White : SlateDark}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }>
      <JoinCopayersContainer>
        <Paragraph>
          {t(
            'Share this invitation with the devices joining this account. Each copayer has their own recovery phrase. To recover funds stored in a Shared Wallet you will need the recovery phrase from each copayer.',
          )}
        </Paragraph>
        <TouchableOpacity
          onPress={copyToClipboard}
          activeOpacity={ActiveOpacity}>
          <QRCodeContainer>
            <QRCodeBackground>
              <QRCode value={walletStatus.secret} size={200} />
            </QRCodeBackground>
          </QRCodeContainer>
        </TouchableOpacity>
        <TitleContainer>
          <TextAlign align={'left'}>
            <H6>{t('Waiting for authorized copayers to join')}</H6>
          </TextAlign>
        </TitleContainer>
        {walletStatus.copayers.map((item: any, index: any) => {
          return (
            <CopayersContainer key={index} activeOpacity={ActiveOpacity}>
              <Image source={CircleCheckIcon} />
              <AuthorizedContainer>{item.name}</AuthorizedContainer>
            </CopayersContainer>
          );
        })}

        <ActionContainer>
          <Button onPress={shareInvitation}>
            {t('Share this Invitation')}
          </Button>
        </ActionContainer>
      </JoinCopayersContainer>
    </ScrollView>
  );
};

export default Copayers;
