import React from 'react';
import styled from 'styled-components/native';
import {LinkBlue} from '../../styles/colors';
import {SubText} from '../styled/Text';

const Container = styled.View<{isSmallScreen?: boolean}>`
  border: 1px solid ${LinkBlue};
  border-radius: 30px;
  padding: ${({isSmallScreen}) => (isSmallScreen ? '8px 15px' : '15px')};
  margin: ${({isSmallScreen}) =>
    isSmallScreen ? '10px 15px 20px 15px' : '15px 15px 20px 15px'};
`;

interface ArchaxFooterProps {
  isSmallScreen?: boolean;
}

const ArchaxFooter: React.FC<ArchaxFooterProps> = ({isSmallScreen}) => {
  return (
    <Container isSmallScreen={isSmallScreen}>
      <SubText style={{textAlign: 'center'}}>
        This Financial Promotion has been approved by Archax LTD on November 28,
        2024.
      </SubText>
    </Container>
  );
};

export default ArchaxFooter;
