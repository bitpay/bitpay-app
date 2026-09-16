import React, {useEffect, useState} from 'react';
import moment from 'moment';
import {useTheme} from '../../../contexts';
import {CoinbaseTransactionProps} from '../../../api/coinbase/coinbase.types';
import {
  ScreenGutter,
  ActiveOpacity,
} from '../../../components/styled/Containers';
import {BaseText, TextAlign} from '../../../components/styled/Text';
import {SlateDark, White, NeutralSlate} from '../../../styles/colors';
import {Hr} from '../../../components/styled/Containers';

import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CoinbaseGroupParamList} from '../CoinbaseGroup';
import CoinbaseIcon from '../components/CoinbaseIcon';
import {View, Text, ScrollView, SafeAreaView, StyleSheet} from 'react-native';
import {formatCryptoAddress} from '../../../utils/helper-methods';
import {useTranslation} from 'react-i18next';
import CopySvg from '../../../../assets/img/copy.svg';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import haptic from '../../../components/haptic-feedback/haptic';
import Clipboard from '@react-native-clipboard/clipboard';
import {parseTransactionTitle} from './CoinbaseAccount';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const screenGutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  transactionContainer: {
    flex: 1,
  },
  transactionScrollContainer: {
    marginTop: 10,
    paddingHorizontal: screenGutter,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  headerIcon: {},
  summaryContainer: {
    marginTop: 20,
  },
  details: {
    marginTop: 10,
  },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
  },
  detailInfo: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  hashText: {
    fontSize: 16,
    paddingRight: 20,
    paddingLeft: 10,
  },
  item: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
    letterSpacing: 0,
  },
  title: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: 'bold',
    letterSpacing: 0,
    borderBottomColor: '#000000',
    borderBottomWidth: 2,
  },
  copyToClipboard: {
    width: '80%',
    paddingHorizontal: 10,
    flexDirection: 'row',
  },
  copyImgContainer: {
    justifyContent: 'center',
  },
});

const HeaderTitle = ({children}: {children: React.ReactNode}) => {
  const theme = useTheme();
  return (
    <Text style={[styles.headerTitle, {color: theme.dark ? White : SlateDark}]}>
      {children}
    </Text>
  );
};

const DetailInfo = ({
  align,
  children,
}: {
  align: 'center' | 'left' | 'right' | 'justify';
  children: React.ReactNode;
}) => (
  <TextAlign align={align} style={styles.detailInfo}>
    {children}
  </TextAlign>
);

const HashText = ({
  children,
  numberOfLines,
  ellipsizeMode,
}: {
  children: React.ReactNode;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
}) => {
  const theme = useTheme();
  return (
    <BaseText
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      style={[styles.hashText, {color: theme.dark ? NeutralSlate : '#6F7782'}]}>
      {children}
    </BaseText>
  );
};

const Item = ({children}: {children: React.ReactNode}) => (
  <BaseText style={styles.item}>{children}</BaseText>
);

const Title = ({children}: {children: React.ReactNode}) => (
  <BaseText style={styles.title}>{children}</BaseText>
);

const CopyToClipboard = ({
  onPress,
  activeOpacity,
  children,
}: {
  onPress?: () => void;
  activeOpacity?: number;
  children: React.ReactNode;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={activeOpacity}
    style={styles.copyToClipboard}>
    {children}
  </TouchableOpacity>
);

export type CoinbaseTransactionScreenParamList = {
  tx: CoinbaseTransactionProps;
};

const CoinbaseTransaction = ({
  route,
}: NativeStackScreenProps<CoinbaseGroupParamList, 'CoinbaseTransaction'>) => {
  const {t} = useTranslation();
  const {tx} = route.params;
  const [copied, setCopied] = useState(false);

  const parseTime = (timestamp?: string) => {
    if (!timestamp) {
      return '';
    }
    return moment(timestamp).format('MMM D, YYYY hh:mm a');
  };

  const getIcon = () => {
    return CoinbaseIcon(tx);
  };

  const copyToClipboard = (data: string) => {
    haptic('impactLight');
    if (!copied) {
      Clipboard.setString(data);
      setCopied(true);
    }
  };

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => {
      setCopied(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <SafeAreaView style={styles.transactionContainer}>
      <ScrollView style={styles.transactionScrollContainer}>
        <View style={styles.headerContainer}>
          <View>
            <HeaderTitle>{parseTransactionTitle(tx)}</HeaderTitle>
          </View>
          <View style={styles.headerIcon}>{getIcon()}</View>
        </View>
        <View style={styles.summaryContainer}>
          <Title>{t('Summary')}</Title>
          <Hr />
          <View style={styles.details}>
            <View style={styles.detail}>
              <Item>{t('Amount')}</Item>
              <DetailInfo align="right">
                {tx.amount.amount} {tx.amount.currency}
              </DetailInfo>
            </View>
            <Hr />
            <View style={styles.detail}>
              <Item>{t('Native Amount')}</Item>
              <DetailInfo align="right">
                {tx.native_amount.amount} {tx.native_amount.currency}
              </DetailInfo>
            </View>
            <Hr />
            <View style={styles.detail}>
              <Item>{t('Status')}</Item>
              <DetailInfo align="right">{tx.status}</DetailInfo>
            </View>
            <Hr />
            <View style={styles.detail}>
              <Item>{t('Date')}</Item>
              <DetailInfo align="right">{parseTime(tx.created_at)}</DetailInfo>
            </View>
            <Hr />
            {tx.network?.hash ? (
              <>
                <View style={styles.detail}>
                  <Item>{t('Hash')}</Item>
                  <CopyToClipboard
                    onPress={() => copyToClipboard(tx.network.hash)}
                    activeOpacity={ActiveOpacity}>
                    <HashText numberOfLines={1} ellipsizeMode={'tail'}>
                      {tx.network.hash}
                    </HashText>
                    <View style={styles.copyImgContainer}>
                      {!copied ? (
                        <CopySvg width={17} />
                      ) : (
                        <CopiedSvg width={17} />
                      )}
                    </View>
                  </CopyToClipboard>
                </View>
                <Hr />
              </>
            ) : null}
            {tx.to && tx.to.address ? (
              <>
                <View style={styles.detail}>
                  <Item>{t('To')}</Item>
                  <DetailInfo align="right">
                    {formatCryptoAddress(tx.to.address)}
                  </DetailInfo>
                </View>
                <Hr />
              </>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CoinbaseTransaction;
