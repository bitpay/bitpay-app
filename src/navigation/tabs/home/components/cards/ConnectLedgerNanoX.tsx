import {useTranslation} from 'react-i18next';
import LedgerLogoIconSvg from '../../../../../../assets/img/icon-ledger-logo.svg';
import {AppActions} from '../../../../../store/app';
import {useAppDispatch} from '../../../../../utils/hooks';
import LinkCard from './LinkCard';

const LedgerLogoIcon = () => {
  return <LedgerLogoIconSvg />;
};

export const ConnectLedgerNanoXCard: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  const onPress = () => {
    dispatch(AppActions.importLedgerModalToggled(true));
  };

  return (
    <LinkCard
      image={LedgerLogoIcon}
      description={t('Connect your Ledger Nano X!')}
      onPress={onPress}
    />
  );
};
