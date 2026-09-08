import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import {BaseText, H3, Paragraph} from '../../../styled/Text';
import Button from '../../../button/Button';
import {
  ActionsRow,
  DescriptionRow,
  Header,
  Wrapper,
} from '../import-ledger-wallet.styled';
import {
  Action,
  LightBlue,
  NeutralSlate,
  SlateDark,
} from '../../../../styles/colors';

interface Props {
  onContinue: () => void;
}

const InstructionsCard = styled.View`
  border-radius: 12px;
  background-color: ${({theme}) => (theme.dark ? SlateDark : NeutralSlate)};
  padding: 24px;
  margin-top: 32px;
`;

const InstructionsRow = styled.View<{isFirst: boolean}>`
  display: flex;
  flex-direction: row;
  margin-top: ${({isFirst}) => (isFirst ? 0 : 24)}px;
`;

const InstructionNumberColumn = styled.View`
  flex-grow: 0;
`;

const InstructionNumberIcon = styled.View`
  background-color: ${LightBlue};
  border-radius: 40px;
  height: 25px;
  width: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const InstructionNumberText = styled(BaseText)`
  color: ${Action};
`;

const InstructionsTextColumn = styled.View`
  flex: 1;
`;

const InstructionsText = styled(BaseText)`
  font-size: 16px;
  font-weight: 400;
`;

export const LearnHow: React.FC<Props> = props => {
  const {t} = useTranslation();
  const instructions = [
    t('Connect and unlock your Ledger device.'),
    t('Open your preferred compatible wallet.'),
    t('Navigate to Settings, then Blind Signing.'),
    t('Toggle settings so Blind Signing is Enabled.'),
  ];

  return (
    <Wrapper>
      <Header>
        <H3>{t('Enable Blind Signing')}</H3>
      </Header>

      <DescriptionRow>
        <Paragraph>
          {t('Enabling blind signing allows you to manage and sign transactions from your Ledger wallet using the BitPay app.')}
        </Paragraph>
      </DescriptionRow>

      <InstructionsCard>
        {instructions.map((inst, idx) => (
          <InstructionsRow key={idx} isFirst={idx <= 0}>
            <InstructionNumberColumn>
              <InstructionNumberIcon>
                <InstructionNumberText>{idx + 1}</InstructionNumberText>
              </InstructionNumberIcon>
            </InstructionNumberColumn>

            <InstructionsTextColumn>
              <InstructionsText>{inst}</InstructionsText>
            </InstructionsTextColumn>
          </InstructionsRow>
        ))}
      </InstructionsCard>

      <ActionsRow>
        <Button onPress={props.onContinue}>{t('Continue')}</Button>
      </ActionsRow>
    </Wrapper>
  );
};
