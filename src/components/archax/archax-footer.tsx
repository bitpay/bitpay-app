import React from 'react';
import styled from 'styled-components/native';
import {Black} from '../../styles/colors';
import {H7} from '../styled/Text';

const Container = styled.View`
  border: 1px solid blue;
  border-radius: 30px;
  padding: 15px;
  margin: 15px 15px 20px 15px;
`;

const ArchaxFooter = () => {
  return (
    <Container>
      <H7 style={{color: Black, textAlign: 'center'}}>
        This Financial Promotion has been approved by Archax LTD on November 28,
        2024.
      </H7>
    </Container>
  );
};

export default ArchaxFooter;
