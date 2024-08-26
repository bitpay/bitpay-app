import React, {useEffect} from 'react';
import Button from '../../../button/Button';
import {useState} from 'react';
import {H4, H7, Paragraph} from '../../../styled/Text';
import {
  ActionsRow,
  DescriptionRow,
  Header,
  Wrapper,
} from '../import-ledger-wallet.styled';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {
  Column,
  Hr,
  RowContainerWithoutBorders,
} from '../../../../components/styled/Containers';
import Checkbox from '../../../../components/checkbox/Checkbox';
import WalletRow, {WalletRowProps} from '../../../../components/list/WalletRow';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {successCreateKey} from '../../../../store/wallet/wallet.actions';
import styled from 'styled-components/native';
import {useTheme} from 'styled-components/native';
import {Slate30, SlateDark} from '../../../../styles/colors';
import {View} from 'react-native';
import {buildUIFormattedWallet} from '../../../../store/wallet/utils/wallet';

interface Props {
  onComplete: () => void;
  onAddByDerivationPathSelected: () => void;
  scannedWalletsIds?: string[];
}

const WalletsFoundContainer = styled.View`
  padding-top: 24px;
  padding-bottom: 5px;
`;

export const SelectWalletsToImport: React.FC<Props> = props => {
  const [uiFormattedWallets, setUiFormattedWallets] = useState<
    (WalletRowProps & {selected: boolean})[]
  >([]);
  const [selectedWallets, setSelectedWallets] = useState<number>();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const theme = useTheme();
  const {rates} = useAppSelector(({RATE}) => RATE);
  const dispatch = useAppDispatch();

  const _onComplete = () => {
    const key = keys['readonly/ledger'];
    const walletsToRemove = props.scannedWalletsIds;
    const walletsToPersist = key.wallets.filter(
      (wallet: Wallet) => !walletsToRemove?.includes(wallet.id),
    );
    const newWallets = key.wallets.filter(wallet => {
      return uiFormattedWallets.find(
        uiFormattedWallet => uiFormattedWallet.id === wallet.id,
      )?.selected;
    });
    key.wallets = [...walletsToPersist, ...newWallets];
    dispatch(
      successCreateKey({
        key,
      }),
    );
    props.onComplete();
  };

  const onPress = (
    wallet: WalletRowProps & {
      selected: boolean;
    },
  ) => {
    const _uiFormattedWallets = uiFormattedWallets.map(uiFormattedWallet => {
      if (uiFormattedWallet.id === wallet.id) {
        uiFormattedWallet.selected = !uiFormattedWallet.selected;
      }
      return uiFormattedWallet;
    });
    setUiFormattedWallets(_uiFormattedWallets);
    setSelectedWallets(
      _uiFormattedWallets.filter(wallet => wallet.selected).length,
    );
  };

  useEffect(() => {
    const scannedWalletsIds = props.scannedWalletsIds;
    const wallets = keys['readonly/ledger']?.wallets?.filter((wallet: Wallet) =>
      scannedWalletsIds?.includes(wallet.id),
    );
    if (wallets && wallets[0]) {
      let _uiFormattedWallets: (WalletRowProps & {selected: boolean})[] = [];
      wallets.forEach(wallet => {
        const _uiFormattedWallet = uiFormattedWallets.find(
          uiFormattedWallet => {
            uiFormattedWallet.id === wallet.id;
          },
        );
        _uiFormattedWallets.push({
          ...buildUIFormattedWallet(
            wallet as Wallet,
            defaultAltCurrency.isoCode,
            rates,
            dispatch,
            'symbol',
          ),
          selected: _uiFormattedWallet ? _uiFormattedWallet.selected : true,
        });
        setUiFormattedWallets(_uiFormattedWallets);
      });
      setSelectedWallets(_uiFormattedWallets.length);
    }
  }, [keys, props.scannedWalletsIds]);

  return (
    <Wrapper>
      <Header>
        <H4>Connect Wallets</H4>
      </Header>

      <DescriptionRow>
        {props.scannedWalletsIds && props.scannedWalletsIds[0] ? (
          <Paragraph style={{textAlign: 'center'}}>
            We've identified wallets on your Ledger with balances or activity.
            Choose which ones you want to add.
          </Paragraph>
        ) : (
          <Paragraph style={{textAlign: 'center'}}>
            We didn't identify new wallets on your Ledger with balances or
            activity. You can add wallets by entering their derivation paths
            manually
          </Paragraph>
        )}
      </DescriptionRow>

      {uiFormattedWallets[0] ? (
        <>
          <WalletsFoundContainer>
            {uiFormattedWallets.length > 1 ? (
              <H7
                style={{
                  fontWeight: '700',
                  color: theme.dark ? Slate30 : SlateDark,
                }}>
                {uiFormattedWallets.length} Wallets Found
              </H7>
            ) : (
              <H7
                style={{
                  fontWeight: '700',
                  color: theme.dark ? Slate30 : SlateDark,
                }}>
                {uiFormattedWallets.length} Wallet Found
              </H7>
            )}
          </WalletsFoundContainer>
          <Hr />
        </>
      ) : null}
      {uiFormattedWallets.map((uiFormattedWallet, index) => (
        <RowContainerWithoutBorders
          key={index}
          onPress={() => onPress(uiFormattedWallet)}>
          <Column style={{maxWidth: '90%'}}>
            <WalletRow
              id={uiFormattedWallet.id}
              hideBalance={false}
              isLast={false}
              onPress={() => onPress(uiFormattedWallet)}
              wallet={uiFormattedWallet}
            />
          </Column>
          <Column style={{maxWidth: '10%'}}>
            <Checkbox
              checked={uiFormattedWallet.selected}
              onPress={() => onPress(uiFormattedWallet)}
            />
          </Column>
        </RowContainerWithoutBorders>
      ))}

      {selectedWallets ? (
        <ActionsRow>
          {selectedWallets > 1 ? (
            <Button onPress={_onComplete}>
              Connect {selectedWallets} Wallets
            </Button>
          ) : (
            <Button onPress={_onComplete}>
              Connect {selectedWallets} Wallet
            </Button>
          )}
        </ActionsRow>
      ) : null}

      <View style={{flexGrow: 1}}>
        <ActionsRow>
          <Button
            buttonType={'link'}
            onPress={props.onAddByDerivationPathSelected}>
            Add by Derivation Path
          </Button>
        </ActionsRow>
      </View>
    </Wrapper>
  );
};
