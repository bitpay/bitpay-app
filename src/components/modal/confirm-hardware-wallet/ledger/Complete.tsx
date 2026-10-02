import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import {Check} from '../../../../components/icons/check/Check';
import {H3} from '../../../../components/styled/Text';
import {Success} from '../../../../styles/colors';
import {
  Header,
  Wrapper,
} from '../../import-ledger-wallet/import-ledger-wallet.styled';

const IconWrapper = styled.View`
  flex-direction: row;
  justify-content: center;
  padding-bottom: 4px;
  padding-top: 28px;
`;

export const ConfirmLedgerComplete: React.FC = () => {
  const {t} = useTranslation();

  return (
    <Wrapper
      style={{
        minHeight: 0,
      }}>
      <IconWrapper>
        <Check size={40} color={Success} />
      </IconWrapper>

      <Header
        style={{
          marginBottom: 24,
        }}>
        <H3>{t('Approved!')}</H3>
      </Header>
    </Wrapper>
  );
};
