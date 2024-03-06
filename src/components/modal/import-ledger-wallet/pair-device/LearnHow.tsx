import styled from 'styled-components/native';
import {BaseText, H3, Paragraph} from '../../../styled/Text';
import Button from '../../../button/Button';
import {
  ActionsRow,
  DescriptionRow,
  Header,
  Wrapper,
} from '../import-ledger-wallet.styled';
import {Action, NeutralSlate, SlateDark} from '../../../../styles/colors';

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
  background-color: #eceffd;
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

const INSTRUCTIONS = [
  'Connect and unlock your Ledger device.',
  'Open your preferred compatible wallet.',
  'Navigate to Settings, then Blind Signing.',
  'Toggle settings so Blind Signing is Enabled.',
];

export const LearnHow: React.FC<Props> = props => {
  return (
    <Wrapper>
      <Header>
        <H3>Enable Blind Signing</H3>
      </Header>

      <DescriptionRow>
        <Paragraph>
          Enabling blind signing allows you to manage and sign transactions from
          your Ledger wallet using the BitPay app.
        </Paragraph>
      </DescriptionRow>

      <InstructionsCard>
        {INSTRUCTIONS.map((inst, idx) => (
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
        <Button onPress={props.onContinue}>Continue</Button>
      </ActionsRow>
    </Wrapper>
  );
};
