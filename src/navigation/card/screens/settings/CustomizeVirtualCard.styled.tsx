import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {Disclaimer, H3, Paragraph} from '../../../../components/styled/Text';

export const ContentContainer = styled.View`
  padding: ${ScreenGutter};
`;

export const CustomizeVirtualCardHeading = styled(H3)`
  margin-bottom: 24px;
`;

export const CustomizeVirtualCardDescription = styled(Paragraph)`
  margin-bottom: 24px;
`;

export const CustomizeVirtualCardDisclaimer = styled(Disclaimer)`
  margin-bottom: 24px;
`;

export const PreviewContainer = styled.View`
  align-items: center;
`;

export const CurrencyListContainer = styled.View`
  flex-direction: column;
  align-items: center;
  margin-top: 24px;
  margin-bottom: 24px;
`;

export const CtaContainer = styled.View`
  margin-bottom: 64px;
`;

export const IconContainer = styled.View`
  align-items: center;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 25px;
  display: flex;
  height: 50px;
  justify-content: center;
  width: 50px;
`;
