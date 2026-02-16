import React from 'react';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';
import styled from 'styled-components/native';
import {Black, White} from '../../../../styles/colors';
import BottomAmount, {AmountProps, LimitsOpts} from './BottomAmount';
import {Platform} from 'react-native';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {BottomAmountPillsProps} from './BottomAmountPills';

const StyledAmountModalContainer = styled.SafeAreaView<{platform: string}>`
  background-color: ${({theme}) => (theme.dark ? Black : White)};
  flex: 1;
  margin-bottom: ${({platform}) => (platform === 'ios' ? 25 : 10)}px;
`;

type AmountModalProps = AmountProps & {
  isVisible: boolean;
  onBackdropPress: () => void;
  modalTitle?: string;
  limitsOpts?: LimitsOpts;
  onSendMaxPressed?: () => any;
  initialAmount?: number;
  /** Callback fired on each amount change with validity status */
  onAmountChange?: (amount: number, isValid: boolean) => void;
  pillsOpts?: BottomAmountPillsProps;
};

const AmountModalContainerHOC = gestureHandlerRootHOC(
  (props: React.PropsWithChildren) => {
    return (
      <StyledAmountModalContainer platform={Platform.OS}>
        {props.children}
      </StyledAmountModalContainer>
    );
  },
);

const BottomAmountModal: React.FC<AmountModalProps> = props => {
  const {
    onBackdropPress,
    onSendMaxPressed,
    isVisible,
    modalTitle,
    limitsOpts,
    initialAmount,
    onAmountChange,
    pillsOpts,
    ...amountProps
  } = props;

  return (
    <SheetModal
      modalLibrary={'bottom-sheet'}
      isVisible={isVisible}
      backdropOpacity={0.2}
      onBackdropPress={onBackdropPress}>
      <AmountModalContainerHOC>
        <BottomAmount
          {...amountProps}
          limitsOpts={limitsOpts}
          onSendMaxPressed={onSendMaxPressed}
          initialAmount={initialAmount}
          onAmountChange={onAmountChange}
          pillsOpts={pillsOpts}
        />
      </AmountModalContainerHOC>
    </SheetModal>
  );
};

export default BottomAmountModal;
