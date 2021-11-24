import React, {ReactNode} from 'react';
import styled from 'styled-components/native';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import {Action, NeutralSlate, White} from '../../../../styles/colors';
import ArrowRight from '../../../../../assets/img/arrow-right.svg';
import Haptic from '../../../../components/haptic-feedback/haptic';

const ButtonsRow = styled.View`
  width: 100%;
  justify-content: space-evenly;
  flex-direction: row;
`;

const ButtonContainer = styled.View`
  align-items: center;
`;

const ButtonText = styled.Text<{theme: string}>`
  font-size: 12px;
  line-height: 18px;
  color: ${({theme}: {theme: string}) => (theme === 'light' ? Action : White)};
  margin-top: 5px;
`;

const LinkButton = styled.TouchableOpacity<{theme: string}>`
  height: 43px;
  width: 43px;
  border-radius: 11px;
  align-items: center;
  justify-content: center;
  background: ${({theme}: {theme: string}) =>
    theme === 'light' ? NeutralSlate : '#0C204E'};
`;

const LinkingButtons = () => {
  const colorScheme = useSelector(({APP}: RootState) => APP.colorScheme);

  const _onPress = (action: string) => {
    Haptic('impactLight');

    switch (action) {
      case 'buy':
        /** TODO: Redirect me*/
        break;
      case 'swap':
        /** TODO: Redirect me*/
        break;
      case 'receive':
        /** TODO: Redirect me*/
        break;
      case 'send':
        /** TODO: Redirect me*/
        break;
    }
  };

  const buttonsList: Array<{label: string; img: ReactNode}> = [
    // TODO: update icons
    {label: 'buy', img: () => <ArrowRight />},
    {label: 'swap', img: () => <ArrowRight />},
    {label: 'receive', img: () => <ArrowRight />},
    {label: 'send', img: () => <ArrowRight />},
  ];
  return (
    <ButtonsRow>
      {buttonsList.map(button => (
        <ButtonContainer>
          <LinkButton
            theme={colorScheme}
            onPress={() => _onPress(button.label)}>
            {button.img()}
          </LinkButton>
          <ButtonText theme={colorScheme}>
            {button.label.toUpperCase()}
          </ButtonText>
        </ButtonContainer>
      ))}
    </ButtonsRow>
  );
};

export default LinkingButtons;
