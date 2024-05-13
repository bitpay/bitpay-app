import styled from 'styled-components/native';
import {Black, Warning25} from '../../../../styles/colors';
import {Paragraph as _Paragraph} from '../../../styled/Text';
import WarningBrownSvg from '../../../../../assets/img/warning-brown.svg';

const Paragraph = styled(_Paragraph)`
  color: ${Black};
  flex: 1;
`;

const DescriptionColumn = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: ${Warning25};
  border-radius: 12px;
  padding: 8px 12px 8px 12px;
  margin-top: 32px;
`;

const WarningImageContainer = styled.View`
  padding-right: 8px;
`;

export const ErrorDescriptionColumn = ({error}: {error: string}) => {
  return (
    <DescriptionColumn>
      <WarningImageContainer>
        <WarningBrownSvg />
      </WarningImageContainer>
      <Paragraph>{error}</Paragraph>
    </DescriptionColumn>
  );
};
