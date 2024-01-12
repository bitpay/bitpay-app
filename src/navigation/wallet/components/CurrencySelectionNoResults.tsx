import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {Trans, useTranslation} from 'react-i18next';
import GhostSvg from '../../../../assets/img/ghost-cheeky.svg';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  NoResultsContainer,
  NoResultsDescription,
  NoResultsImgContainer,
} from '../../../components/styled/Containers';
import {BaseText, Link} from '../../../components/styled/Text';
import {Key} from '../../../store/wallet/wallet.models';

interface CurrencySelectionNoResultsProps {
  query: string | undefined;
  walletKey?: Key | undefined;
}

const CurrencySelectionNoResults: React.VFC<
  CurrencySelectionNoResultsProps
> = props => {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const {query, walletKey} = props;

  return (
    <NoResultsContainer>
      <NoResultsImgContainer>
        <GhostSvg style={{marginTop: 20}} />
      </NoResultsImgContainer>

      <NoResultsDescription>
        <Trans
          i18nKey="WeCouldntFindMatchForArg"
          values={{query}}
          components={[<BaseText style={{fontWeight: 'bold'}} />]}
        />
      </NoResultsDescription>

      {walletKey ? (
        <Link
          style={{marginTop: 10, height: 50}}
          onPress={() => {
            haptic('soft');
            navigation.navigate('AddWallet', {
              key: walletKey,
              isCustomToken: true,
              isToken: true,
            });
          }}>
          {t('Add Custom Token')}
        </Link>
      ) : null}
    </NoResultsContainer>
  );
};

export default CurrencySelectionNoResults;
