import React, {ReactElement} from 'react';
import styled from 'styled-components/native';
import { FlatList} from 'react-native';
import { CurrencyImageContainer } from '../styled/Containers';
import { MainLabel, MainNote, SecondaryLabel, SecondaryNote } from '../styled/Text';
import { ListContainer, RowContainer, RowDetailsContainer } from '../styled/Containers';

interface WalletsProps {
  walletList?: Array<WalletProps>
}

interface WalletProps{
  id: number;
  img: () => ReactElement;
  mainLabel?: string;
  secondaryLabel?: string;
  mainNote?: string;
  secondaryNote?: string;
}

interface Props {
  id: number,
  wallet: WalletProps
}

const NoteContainer = styled.View`
  flex: 1;
  flex-direction: column;
  margin-left: 12px;
  justify-content: center;
`;

const WalletItemContent = ({wallet}: Props) => {
  const {mainLabel, secondaryLabel, img, mainNote, secondaryNote} = wallet;
  
  return (
    <RowContainer>
      <CurrencyImageContainer>{img()}</CurrencyImageContainer>
      <RowDetailsContainer>
        <MainLabel>{mainLabel}</MainLabel>
        <SecondaryLabel>{secondaryLabel}</SecondaryLabel>
      </RowDetailsContainer>
      <NoteContainer>
        <MainNote>{mainNote}</MainNote>
        <SecondaryNote>{secondaryNote}</SecondaryNote>
      </NoteContainer>      
    </RowContainer>
  );
};

const WalletDetailsList = ({
  walletList
}: WalletsProps) => {
  return (
    <ListContainer>
      <FlatList
        data={walletList}
        renderItem={({ item }) => 
        <WalletItemContent 
          wallet={item} 
          id={item.id} 
        />
        }
      />
    </ListContainer>
  );
};

export default WalletDetailsList;