import React, {memo} from 'react';
import {
  CurrencyColumn,
  CurrencyImageContainer,
  ActiveOpacity,
} from '../styled/Containers';
import {RowContainer} from '../styled/Containers';
import {H5, H7} from '../styled/Text';
import AngleRightSvg from '../../../assets/img/angle-right.svg';
import {Key} from '../../store/wallet/wallet.models';
import KeySvg from '../../../assets/img/key.svg';
import {AvailableWalletsPill} from './GlobalSelectRow';
import {useTranslation} from 'react-i18next';

interface Props {
  item: Key;
  emit: (item: Key) => void;
}

const KeyGlobalSelectRow = ({item, emit}: Props) => {
  const {t} = useTranslation();
  const {keyName, wallets} = item;
  return (
    <RowContainer activeOpacity={ActiveOpacity} onPress={() => emit(item)}>
      <CurrencyImageContainer>{KeySvg({})}</CurrencyImageContainer>
      <CurrencyColumn>
        <H5>{keyName}</H5>
      </CurrencyColumn>
      <AvailableWalletsPill>
        <H7 medium={true}>
          {wallets.length} {t('Wallets')}
        </H7>
      </AvailableWalletsPill>
      <AngleRightSvg />
    </RowContainer>
  );
};

export default memo(KeyGlobalSelectRow);
