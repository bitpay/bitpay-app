import {useTranslation} from 'react-i18next';
import {H3, Paragraph} from '../../../styled/Text';
import Button from '../../../button/Button';
import DeviceFoundIconSvg from '../../../../../assets/img/icon-device-found.svg';
import {
  ActionsRow,
  DescriptionRow,
  Header,
  IconRow,
  Wrapper,
} from '../import-ledger-wallet.styled';

interface Props {
  onLearnHow: () => void;
  onContinue: () => void;
}

export const DeviceFound: React.FC<Props> = props => {
  const {t} = useTranslation();

  return (
    <Wrapper>
      <Header>
        <H3>{t('Device Found')}</H3>
      </Header>

      <DescriptionRow
        style={{
          flexGrow: 0,
        }}>
        <Paragraph>{t('Ethereum account?')}</Paragraph>
      </DescriptionRow>

      <DescriptionRow>
        <Paragraph>
          {t(
            'Prior to continuing, if you are planning to import an Ethereum account, please make sure blind signing is enabled on your Ledger wallet.',
          )}
        </Paragraph>
      </DescriptionRow>

      <IconRow style={{padding: 50}}>
        <DeviceFoundIconSvg />
      </IconRow>

      <ActionsRow>
        <Button onPress={props.onLearnHow}>{t('Learn How')}</Button>
      </ActionsRow>
      <ActionsRow>
        <Button buttonType={'link'} onPress={props.onContinue}>
          {t('Skip')}
        </Button>
      </ActionsRow>
    </Wrapper>
  );
};
