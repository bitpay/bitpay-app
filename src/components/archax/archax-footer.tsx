import React from 'react';
import styled from 'styled-components/native';
import {NeutralSlate, Black} from '../../styles/colors';
import {H7, Link} from '../styled/Text';
import {ActiveOpacity, Row} from '../styled/Containers';
import {TouchableOpacity} from 'react-native';

const Container = styled.View`
  border: 1px solid blue;
  border-radius: 30px;
  padding: 15px;
  margin: 0 15px 20px 15px;
`;

const ArchaxFooter = () => {
  return (
    <Container>
      <H7 style={{color: Black}}>
        This Financial Promotion has been approved by Archax LTD on November 28,
        2024.
      </H7>
    </Container>
  );
};

export default ArchaxFooter;
