import React, {ReactNode, useState} from 'react';
import CustomizeHomeCard from '../../../../../components/customize-home-card/CustomizeHomeCard';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../../store';
import styled from 'styled-components/native';
import {CurrencySelectionOptions} from '../../../../../constants/CurrencySelectionOptions';
import {ItemProps} from '../../../../../components/list/CurrencySelectionRow';

const HeaderImg = styled.View`
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  flex: 1;
  flex-wrap: wrap;
`;

const CardListContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  flex-wrap: wrap;
`;

const CustomizeHomeContainer = styled.SafeAreaView`
  flex: 1;
`;

const CustomizeHomeCardContainer = styled.View`
  margin: 10px 0;
`;

const ScrollViewContainer = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const Img = styled.View<{isFirst: boolean}>`
  width: 20px;
  height: 20px;
  min-height: 22px;
  margin-left: ${({isFirst}) => (isFirst ? 0 : '-3px')};
`;

const KeyCardComponent = (
  walletList: ItemProps[],
  value: number,
  show: boolean,
) => {
  /** TODO: Assign stored value */
  const [checked, setChecked] = useState(show);
  const _onCTAPress = () => {
    /** TODO: Store the value and Redirect me */
    setChecked(!checked);
  };

  const HeaderComponent = (
    <HeaderImg>
      {walletList &&
        walletList.map(
          (wallet, index) =>
            wallet && (
              <Img key={index} isFirst={index === 0 || index % 7 === 0}>
                {wallet.roundIcon(20)}
              </Img>
            ),
        )}
    </HeaderImg>
  );

  return (
    <CustomizeHomeCardContainer>
      <CustomizeHomeCard
        header={HeaderComponent}
        body={{
          title: 'Main Key',
          value: `$ ${value}`,
        }}
        footer={{
          onCTAPress: _onCTAPress,
          checked: checked,
        }}
      />
    </CustomizeHomeCardContainer>
  );
};

const CustomizeHome = () => {
  const keys = useSelector(({WALLET}: RootState) => WALLET.keys);
  const cardsList: Array<ReactNode | null> = [];

  if (keys) {
    Object.values(keys).map(key => {
      const {wallets, totalBalance = 0, show} = key;
      const list = wallets.map(({currencyAbbreviation}) =>
        CurrencySelectionOptions.find(
          ({id}: {id: string | number}) => id === currencyAbbreviation,
        ),
      );

      !!list.length &&
        cardsList.push(
          KeyCardComponent(list as ItemProps[], totalBalance, !!show),
        );
    });
  }

  return (
    <CustomizeHomeContainer>
      <ScrollViewContainer>
        <CardListContainer>{cardsList.map(card => card)}</CardListContainer>
      </ScrollViewContainer>
    </CustomizeHomeContainer>
  );
};

export default CustomizeHome;
