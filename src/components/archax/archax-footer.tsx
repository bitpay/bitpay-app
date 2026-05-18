import React from 'react';
import styled from 'styled-components/native';
import {LinkBlue} from '../../styles/colors';
import {SubText} from '../styled/Text';

type ArchaxFooterContainerProps = {
  isSmallScreen?: boolean;
  $matchParentWidth?: boolean;
};

const Container = styled.View<ArchaxFooterContainerProps>`
  border: 1px solid ${LinkBlue};
  border-radius: 40px;
  padding: ${(props: ArchaxFooterContainerProps) =>
    props.isSmallScreen ? '8px 15px' : '15px'};
  margin: ${(props: ArchaxFooterContainerProps) =>
    props.$matchParentWidth
      ? '0 0 20px 0'
      : props.isSmallScreen
      ? '10px 15px 20px 15px'
      : '15px 15px 20px 15px'};
  width: ${(props: ArchaxFooterContainerProps) =>
    props.$matchParentWidth ? '100%' : 'auto'};
`;

interface ArchaxFooterProps {
  isSmallScreen?: boolean;
  matchParentWidth?: boolean;
}

const ArchaxFooter: React.FC<ArchaxFooterProps> = ({
  isSmallScreen,
  matchParentWidth,
}) => {
  return (
    <Container
      isSmallScreen={isSmallScreen}
      $matchParentWidth={matchParentWidth}>
      <SubText style={{textAlign: 'center'}}>
        This Financial Promotion has been approved by Archax LTD on March 17,
        2026.
      </SubText>
    </Container>
  );
};

export default ArchaxFooter;
