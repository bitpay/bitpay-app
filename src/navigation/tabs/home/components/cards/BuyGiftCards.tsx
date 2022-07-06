import React from 'react';
import {useTranslation} from 'react-i18next';
import LinkCard from './LinkCard';

const BuyGiftCards = () => {
  const {t} = useTranslation();
  return (
    <LinkCard
      description={t('Buy gift cards from major retailers')}
      onPress={() => null}
    />
  );
};

export default BuyGiftCards;
