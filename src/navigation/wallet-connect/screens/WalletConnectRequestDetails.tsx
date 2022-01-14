import React from 'react';
import {Platform} from 'react-native';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {Hr} from '../../../components/styled/Containers';
import {H7} from '../../../components/styled/Text';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import {
  ItemContainer,
  ItemTitleContainer,
  ScrollView,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';
import {HeaderTitle} from '../styled/WalletConnectText';

const RequestDetailsContainer = styled.View`
  padding-bottom: 60px;
`;

const AddressContainer = styled.TouchableOpacity`
  background-color: ${props => (props.theme.dark ? LightBlack : NeutralSlate)};
  border-radius: 40px;
  height: 37px;
  width: 103px;
  justify-content: flex-start;
  padding-right: 13px;
  padding-left: 17px;
  padding-top: ${Platform.OS === 'ios' ? '4px' : 0};
  flex-direction: row;
  align-items: center;
`;

const MessageTitleContainer = styled.View`
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 0;
`;

const MessageNoteContainer = styled.TouchableOpacity`
  align-items: flex-start;
  max-width: 242px;
  justify-content: center;
`;

const WalletConnectRequestDetails = () => {
  return (
    <WalletConnectContainer>
      <ScrollView>
        <RequestDetailsContainer>
          <HeaderTitle>Summary</HeaderTitle>
          <Hr />
          <ItemContainer>
            <ItemTitleContainer>
              <H7>Address</H7>
            </ItemTitleContainer>
            <AddressContainer>
              <H7 numberOfLines={1} ellipsizeMode={'middle'}>
                0x81123j12kj3jk12356s
              </H7>
            </AddressContainer>
          </ItemContainer>
          <Hr />
          <MessageTitleContainer>
            <ItemTitleContainer>
              <H7>Message</H7>
            </ItemTitleContainer>
            <MessageNoteContainer>
              <H7 numberOfLines={3} ellipsizeMode={'tail'}>
                0x423oijasdofigjaeop8rtj9wa8egjwgjw98fjwa98fjas9f8jas9f8asjd98fsdj98fsdfs
              </H7>
            </MessageNoteContainer>
          </MessageTitleContainer>
          <Hr />
        </RequestDetailsContainer>
        <Button buttonStyle={'primary'} onPress={() => {}}>
          Approve
        </Button>
        <Button buttonStyle={'secondary'} onPress={() => {}}>
          Reject
        </Button>
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectRequestDetails;
