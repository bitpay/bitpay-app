import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {useAppDispatch} from '../../../utils/hooks';
import styled from 'styled-components/native';
import {FlatList} from 'react-native';
import {find} from 'lodash';
import moment from 'moment';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {formatFiatAmount, shouldScale} from '../../../utils/helper-methods';
import {Hr, ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, Balance, H5} from '../../../components/styled/Text';
import {Air, Black, LightBlack, SlateDark, White} from '../../../styles/colors';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import LinkingButtons from '../../tabs/home/components/LinkingButtons';
import TransactionRow from '../../../components/list/TransactionRow';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import GlobalSelect from '../../../navigation/wallet/screens/GlobalSelect';

import {getCoinbaseExchangeRate} from '../../../store/coinbase/coinbase.effects';
import {StackScreenProps} from '@react-navigation/stack';
import {CoinbaseStackParamList} from '../CoinbaseStack';
import {CoinbaseTransactionProps} from '../../../api/coinbase/coinbase.types';
import CoinbaseIcon from '../components/CoinbaseIcon';
import {CoinbaseEffects} from '../../../store/coinbase';
import {
  dismissOnGoingProcessModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';

const AccountContainer = styled.View`
  flex: 1;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
`;

const BalanceContainer = styled.View`
  margin: 20px 0;
  padding: 0 15px 10px;
  flex-direction: column;
`;

const Type = styled(BaseText)`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : '#E1E4E7')};
  padding: 2px 4px;
  border-radius: 3px;
  margin-bottom: 7px;
`;

const TransactionListHeader = styled.View`
  padding: 10px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#F5F6F7')};
`;

const BorderBottom = styled.View`
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : Air)};
`;

const EmptyListContainer = styled.View`
  justify-content: space-between;
  align-items: center;
  margin-top: 50px;
`;

const SkeletonContainer = styled.View`
  margin-bottom: 20px;
`;

const GlobalSelectContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

export const WalletSelectMenuContainer = styled.View`
  padding: ${ScreenGutter};
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  max-height: 75%;
`;

export const WalletSelectMenuHeaderContainer = styled.View`
  padding: 50px 0;
`;

export type CoinbaseAccountScreenParamList = {
  accountId: string;
};

const CoinbaseAccount = ({
  route,
}: StackScreenProps<CoinbaseStackParamList, 'CoinbaseAccount'>) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {accountId} = route.params;

  const [customSupportedCurrencies, setCustomSupportedCurrencies] = useState(
    [] as string[],
  );
  const [modalTitle, setModalTitle] = useState('');
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [fiatAmount, setFiatAmount] = useState(0);
  const [txs, setTxs] = useState([] as CoinbaseTransactionProps[]);

  const exchangeRates = useSelector(
    ({COINBASE}: RootState) => COINBASE.exchangeRates,
  );
  const user = useSelector(
    ({COINBASE}: RootState) => COINBASE.user[COINBASE_ENV],
  );
  const transactions = useSelector(
    ({COINBASE}: RootState) => COINBASE.transactions[COINBASE_ENV],
  );
  const account = useSelector(({COINBASE}: RootState) => {
    return find(COINBASE.accounts[COINBASE_ENV], {id: accountId});
  });

  const txsStatus = useSelector<RootState, 'success' | 'failed' | null>(
    ({COINBASE}) => COINBASE.getTransactionsStatus,
  );

  const txsLoading = useSelector<RootState, boolean>(
    ({COINBASE}) => COINBASE.isApiLoading,
  );

  const [isLoading, setIsLoading] = useState<boolean>();
  const [errorLoadingTxs, setErrorLoadingTxs] = useState<boolean>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: account?.name,
    });
  }, [navigation]);

  const parseTime = (timestamp?: string) => {
    if (!timestamp) return '';
    return moment(timestamp).format('MMM D, YYYY');
  };

  const parseAmount = (amount?: string, coin?: string) => {
    if (!amount || !coin) return '';
    return amount + ' ' + coin;
  };

  const getIcon = (coinbaseTx: CoinbaseTransactionProps) => {
    return CoinbaseIcon(coinbaseTx);
  };

  const onPressTransaction = useMemo(
    () => (transaction: any) => {
      navigation.navigate('Coinbase', {
        screen: 'CoinbaseTransaction',
        params: {tx: transaction},
      });
    },
    [],
  );

  const renderItem = useCallback(
    ({item}) => (
      <TransactionRow
        icon={getIcon(item)}
        description={item.details.title}
        details={item.details.subtitle}
        time={parseTime(item.created_at)}
        value={parseAmount(item.amount.amount, item.amount.currency)}
        onPressTransaction={() => onPressTransaction(item)}
      />
    ),
    [],
  );

  const listFooterComponent = () => {
    return (
      <>
        {isLoading ? (
          <SkeletonContainer>
            <WalletTransactionSkeletonRow />
          </SkeletonContainer>
        ) : null}
      </>
    );
  };

  const listEmptyComponent = () => {
    return (
      <>
        {!isLoading && !errorLoadingTxs && (
          <EmptyListContainer>
            <H5>It's a ghost town in here</H5>
            <GhostSvg style={{marginTop: 20}} />
          </EmptyListContainer>
        )}

        {!isLoading && errorLoadingTxs && (
          <EmptyListContainer>
            <H5>Could not update transaction history</H5>
            <GhostSvg style={{marginTop: 20}} />
          </EmptyListContainer>
        )}
      </>
    );
  };

  useEffect(() => {
    if (account && account.balance) {
      const fa = getCoinbaseExchangeRate(
        account.balance.amount,
        account.balance.currency,
        exchangeRates,
      );
      setFiatAmount(fa);
      const currencies: string[] = [];
      currencies.push(account.balance.currency.toLowerCase());
      setCustomSupportedCurrencies(currencies);
    }

    if (transactions && transactions[accountId]) {
      const tx = transactions[accountId].data;
      setTxs(tx);
    }

    if (txsLoading) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }

    if (txsStatus && txsStatus === 'failed') {
      setErrorLoadingTxs(true);
    }
  }, [account, transactions, txsLoading]);

  const selectWalletfromDeposit = async () => {
    // Deposit:
    //   Transfer from same coin BitPay wallet to the current Coinbase Account
    // setModalTitle('Select a wallet for sending funds to Coinbase');

    dispatch(
      showOnGoingProcessModal(OnGoingProcessMessages.FETCHING_COINBASE_DATA),
    );
    dispatch(CoinbaseEffects.createAddress(accountId)).then(newAddress => {
      dispatch(dismissOnGoingProcessModal());
      navigation.navigate('Wallet', {
        screen: 'GlobalSelect',
        params: {
          context: 'deposit',
          toCoinbase: {
            account: account?.name || 'Coinbase',
            currency: account?.currency.code.toLowerCase() || '',
            address: newAddress,
            title: 'Send from',
          },
        },
      });
    });
  };

  const selectWalletToWithdraw = () => {
    // Withdraw:
    //   Transfer from current Coinbase Account to any same coin BitPay wallet
    setModalTitle(
      'Select a wallet you are going to deposit funds from Coinbase',
    );
    setWalletModalVisible(true);
  };

  const selectedWallet = () => {
    setWalletModalVisible(false);
    // TODO: Create Coinbase transaction and send to selected wallet
  };

  return (
    <AccountContainer>
      <BalanceContainer>
        <Row>
          <Balance scale={shouldScale(account?.balance.amount)}>
            {account?.balance.amount} {account?.balance.currency}
          </Balance>
        </Row>
        <Row>
          <H5>
            {fiatAmount
              ? formatFiatAmount(
                  fiatAmount,
                  user?.data.native_currency.toLowerCase() || 'usd',
                )
              : '...'}{' '}
            {user?.data.native_currency}
          </H5>
          {account?.primary && <Type>Primary</Type>}
        </Row>
        <LinkingButtons
          receive={{cta: selectWalletfromDeposit, label: 'deposit'}}
          send={{cta: selectWalletToWithdraw, label: 'withdraw'}}
          buy={{cta: () => null, hide: true}}
          swap={{cta: () => null, hide: true}}
        />
      </BalanceContainer>
      <Hr />
      <FlatList
        ListHeaderComponent={() => {
          return (
            <TransactionListHeader>
              <H5>Transactions</H5>
            </TransactionListHeader>
          );
        }}
        data={txs}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <BorderBottom />}
        ListFooterComponent={listFooterComponent}
        ListEmptyComponent={listEmptyComponent}
      />
      <SheetModal
        isVisible={walletModalVisible}
        onBackdropPress={() => setWalletModalVisible(false)}>
        <GlobalSelectContainer>
          <GlobalSelect
            title={modalTitle}
            customSupportedCurrencies={customSupportedCurrencies}
            useAsModal={true}
            onDismiss={selectedWallet}
          />
        </GlobalSelectContainer>
      </SheetModal>
    </AccountContainer>
  );
};

export default CoinbaseAccount;
