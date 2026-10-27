import React, {useState, useLayoutEffect} from 'react';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Clipboard from '@react-native-clipboard/clipboard';
import {RouteProp, useRoute} from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import {useTheme} from '../../../contexts';
import {
  Image,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  Paragraph,
  BaseText,
  H6,
  TextAlign,
  HeaderTitle,
} from '../../../components/styled/Text';
import {
  RowContainer,
  ActiveOpacity,
  CtaContainer,
  HeaderTitleContainer,
} from '../../../components/styled/Containers';
import haptic from '../../../components/haptic-feedback/haptic';
import {WalletGroupParamList} from '../WalletGroup';
import {White, SlateDark, Slate30} from '../../../styles/colors';
import {useNavigation} from '@react-navigation/native';
import Button from '../../../components/button/Button';
import {useTranslation} from 'react-i18next';
import {useLogger} from '../../../utils/hooks';
import {useAppDispatch} from '../../../utils/hooks';
import {shareNative} from '../../../utils/share';

const CircleCheckIcon = require('../../../../assets/img/circle-check.png');
interface CopayersProps {
  navigation: NativeStackNavigationProp<WalletGroupParamList, 'Copayers'>;
}
const gutterPx = 10;

const styles = StyleSheet.create({
  viewContainer: {
    flex: 1,
  },
  joinCopayersContainer: {
    padding: gutterPx,
    marginBottom: 20,
  },
  authorizedContainer: {
    marginVertical: 0,
    marginHorizontal: 20,
  },
  qrCodeContainer: {
    alignItems: 'center',
    margin: 15,
  },
  qrCodeBackground: {
    backgroundColor: White,
    width: 225,
    height: 225,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  copayersContainer: {
    padding: 18,
    borderStyle: 'solid',
    borderBottomWidth: 1,
  },
});

const ViewContainer: React.FC<React.ComponentProps<typeof SafeAreaView>> = ({
  style,
  ...rest
}) => <SafeAreaView style={[styles.viewContainer, style]} {...rest} />;

const JoinCopayersContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.joinCopayersContainer, style]} {...rest} />;

const AuthorizedContainer: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => <BaseText style={[styles.authorizedContainer, style]} {...rest} />;

const QRCodeContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.qrCodeContainer, style]} {...rest} />;

const QRCodeBackground: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.qrCodeBackground, style]} {...rest} />;

const CopayersContainer: React.FC<
  React.ComponentProps<typeof RowContainer>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <RowContainer
      style={[
        styles.copayersContainer,
        {borderBottomColor: theme.dark ? SlateDark : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const Copayers: React.FC<CopayersProps> = props => {
  const {t} = useTranslation();
  const logger = useLogger();
  const dispatch = useAppDispatch();
  const route = useRoute<RouteProp<WalletGroupParamList, 'Copayers'>>();
  const {wallet, status} = route.params || {};
  const [walletStatus, setWalletStatus] = useState(status);
  const [copied, setCopied] = useState(false);
  const {navigation} = props;
  const navigationRef = useNavigation();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    const walletName =
      wallet?.walletName ||
      wallet?.credentials?.walletName ||
      `${wallet?.currencyName} multisig`;
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>{`${walletName} [${wallet?.m}-${wallet?.n}]`}</HeaderTitle>
      ),
    });
  }, [
    navigation,
    wallet?.credentials?.walletName,
    wallet?.currencyName,
    wallet?.m,
    wallet?.n,
    wallet?.walletName,
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await updateWalletStatus();
    } finally {
      setRefreshing(false);
    }
  };

  const updateWalletStatus = () => {
    if (!wallet) {
      return Promise.resolve();
    }

    return new Promise<void>(resolve => {
      wallet.getStatus({}, (err, st) => {
        if (err) {
          const errStr =
            err instanceof Error ? err.message : JSON.stringify(err);
          logger.error(`error [updateWalletStatus] [getStatus]: ${errStr}`);
          resolve();
          return;
        }

        if (!st?.wallet) {
          resolve();
          return;
        }

        setWalletStatus(st.wallet);
        if (st.wallet.status === 'complete') {
          wallet.openWallet({}, () => {
            navigationRef.goBack();
          });
        }

        resolve();
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
    await dispatch(shareNative({message: walletStatus.secret}));
  };

  return (
    <ViewContainer>
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
          <HeaderTitleContainer>
            <TextAlign align={'left'}>
              <H6>{t('Waiting for authorized copayers to join')}</H6>
            </TextAlign>
          </HeaderTitleContainer>
          {walletStatus.copayers.map((item: any, index: any) => {
            return (
              <CopayersContainer key={index} activeOpacity={ActiveOpacity}>
                <Image source={CircleCheckIcon} />
                <AuthorizedContainer>{item.name}</AuthorizedContainer>
              </CopayersContainer>
            );
          })}
        </JoinCopayersContainer>
      </ScrollView>
      <CtaContainer>
        <Button onPress={shareInvitation}>{t('Share this Invitation')}</Button>
      </CtaContainer>
    </ViewContainer>
  );
};

export default Copayers;
