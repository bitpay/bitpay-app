import React from 'react';
import styled from 'styled-components/native';
import {LinkBlue} from '../../styles/colors';
import {SubText} from '../styled/Text';

const Container = styled.View`
  border: 1px solid ${LinkBlue};
  border-radius: 30px;
  padding: 15px;
  margin: 15px 15px 20px 15px;
`;

const ArchaxFooter = () => {
  return (
    <Container>
      <SubText style={{textAlign: 'center'}}>
        This Financial Promotion has been approved by Archax LTD on November 28,
        2024.
      </SubText>
    </Container>
  );
};

export default ArchaxFooter;
