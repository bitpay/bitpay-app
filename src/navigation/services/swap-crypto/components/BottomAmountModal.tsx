import React from 'react';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';
import {useTheme} from '../../../../contexts';
import {Black, White} from '../../../../styles/colors';
import BottomAmount, {BottomAmountProps, LimitsOpts} from './BottomAmount';
import {Platform, SafeAreaView, StyleSheet, ViewProps} from 'react-native';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {BottomAmountPillsProps} from './BottomAmountPills';

const styles = StyleSheet.create({
  amountModalContainer: {
    flex: 1,
    marginBottom: Platform.OS === 'ios' ? 25 : 10,
  },
});

const StyledAmountModalContainer: React.FC<ViewProps> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[
        styles.amountModalContainer,
        {backgroundColor: theme.dark ? Black : White},
        style,
      ]}
      {...rest}
    />
  );
};

type BottomAmountModalProps = BottomAmountProps & {
  isVisible: boolean;
  onBackdropPress: () => void;
  modalTitle?: string;
  limitsOpts?: LimitsOpts;
  onSendMaxPressed?: () => any;
  initialAmount?: number;
  /** Callback fired on each amount change with validity status */
  onAmountChange?: (
    amount: number,
    displayAmount: string,
    fromPill?: boolean,
    isValid?: boolean,
  ) => void;
  pillsOpts?: BottomAmountPillsProps;
};

const AmountModalContainerHOC = gestureHandlerRootHOC(
  (props: React.PropsWithChildren) => {
    return (
      <StyledAmountModalContainer>{props.children}</StyledAmountModalContainer>
    );
  },
);

const BottomAmountModal: React.FC<BottomAmountModalProps> = props => {
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
      onBackdropPress={onBackdropPress}
      // Use 'collapse' instead of 'close' to fire handleDismiss in SheetModal after backdrop press animation completes, preventing potential UI jank
      backdropPressBehavior={'collapse'}>
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
