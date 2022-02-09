import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../../../../store';
import styled from 'styled-components/native';
import {Key} from '../../../../../store/wallet/wallet.models';
import CustomizeWalletCardComponent from '../components/CustomizeWalletCardComponent';
import {toggleHomeKeyCard} from '../../../../../store/wallet/wallet.actions';
import {Dispatch} from 'redux';

const CardListContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  flex-wrap: wrap;
`;

const CustomizeHomeContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollViewContainer = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const createCustomizeCardList = (dispatch: Dispatch, keys: Key[]) => {
  const list: JSX.Element[] = [];
  const hasKeys = keys.length;
  const hasGiftCards = false;
  const hasCoinbase = false;

  if (hasKeys) {
    const walletCards = keys
      .filter(key => key)
      .map(key => {
        const {wallets, totalBalance = 0} = key;

        return (
          <CustomizeWalletCardComponent
            key={key.id}
            checked={!!key.show}
            wallets={wallets}
            totalBalance={totalBalance}
            onPress={() => {
              dispatch(toggleHomeKeyCard({keyId: key.id, show: !key.show}));
            }}
          />
        );
      });

    list.push(...walletCards);
  }

  if (hasCoinbase) {
    // TODO
  }

  if (hasGiftCards) {
    // TODO
  }

  return list;
};

const CustomizeHome = () => {
  const dispatch = useDispatch();
  const keys = useSelector<RootState, {[k: string]: Key}>(
    ({WALLET}) => WALLET.keys,
  );
  const cardsList = createCustomizeCardList(dispatch, Object.values(keys));

  return (
    <CustomizeHomeContainer>
      <ScrollViewContainer>
        <CardListContainer>{cardsList.map(card => card)}</CardListContainer>
      </ScrollViewContainer>
    </CustomizeHomeContainer>
  );
};

export default CustomizeHome;
