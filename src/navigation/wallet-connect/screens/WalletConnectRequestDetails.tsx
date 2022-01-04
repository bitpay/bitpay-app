import {useTheme} from '@react-navigation/native';
import React from 'react';
import {StyleProp, TextStyle} from 'react-native';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {BaseText, H7} from '../../../components/styled/Text';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import {WalletConnectContainer, ScrollView} from './WalletConnectIntro';

const TitleText = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 18px;
  text-transform: uppercase;
  margin-bottom: 12px;
`;

const Hr = styled.View<{isDark: boolean}>`
  border-bottom-color: ${({isDark}) => (isDark ? LightBlack : '#ebebeb')};
  border-bottom-width: 1px;
`;

const RequestDetailsContainer = styled.View`
  padding-bottom: 60px;
`;

const DetailItemContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 71px;
`;

const DetailItemTitleContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const MessageTitleContainer = styled.View`
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 0;
`;

const DetailItemNoteContainer = styled.View`
  align-items: flex-start;
  max-width: 242px;
  justify-content: center;
`;

const AddressContainer = styled.View`
  background-color: ${NeutralSlate};
  border-radius: 40px;
  height: 37px;
  width: 103px;
  justify-content: flex-start;
  padding: 0 10px;
  flex-direction: row;
  align-items: center;
`;

const WalletConnectRequestDetails = () => {
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  return (
    <WalletConnectContainer>
      <ScrollView>
        <RequestDetailsContainer>
          <TitleText style={textStyle}>SUMMARY</TitleText>
          <Hr isDark={theme.dark} />
          <DetailItemContainer>
            <DetailItemTitleContainer>
              <H7 style={textStyle}>Address</H7>
            </DetailItemTitleContainer>
            <AddressContainer>
              <H7 numberOfLines={1} ellipsizeMode={'middle'}>
                0x81123j12kj3jk12356s
              </H7>
            </AddressContainer>
          </DetailItemContainer>
          <Hr isDark={theme.dark} />
          <MessageTitleContainer>
            <DetailItemTitleContainer>
              <H7 style={textStyle}>Message</H7>
            </DetailItemTitleContainer>
            <DetailItemNoteContainer>
              <H7 numberOfLines={3} ellipsizeMode={'tail'}>
                0x423oijasdofigjaeop8rtj9wa8egjwgjw98fjwa98fjas9f8jas9f8asjd98fsdj98fsdfs
              </H7>
            </DetailItemNoteContainer>
          </MessageTitleContainer>
          <Hr isDark={theme.dark} />
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
