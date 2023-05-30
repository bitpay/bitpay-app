import {useTranslation} from 'react-i18next';
import FloatingActionButton, {
  FloatingActionButtonProps,
} from '../../../components/floating-action-button/FloatingActionButton';
import {DisabledDark, White} from '../../../styles/colors';
import {Svg, Path} from 'react-native-svg';

const PlusIcon: React.FC<
  Pick<FloatingActionButtonProps, 'disabled'>
> = props => {
  const fillColor = props.disabled ? DisabledDark : White;

  return (
    <Svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <Path
        fill={fillColor}
        d="M7 0C6.44772 0 6 0.447716 6 1V6H1C0.447716 6 0 6.44772 0 7C0 7.55228 0.447716 8 1 8H6V13C6 13.5523 6.44772 14 7 14C7.55228 14 8 13.5523 8 13V8H13C13.5523 8 14 7.55228 14 7C14 6.44771 13.5523 6 13 6H8V1C8 0.447716 7.55228 0 7 0Z"
      />
    </Svg>
  );
};

export const AddFundsButton: React.FC<
  Pick<FloatingActionButtonProps, 'onPress' | 'disabled'>
> = props => {
  const {t} = useTranslation();

  return (
    <FloatingActionButton
      onPress={props.onPress}
      icon={<PlusIcon disabled={props.disabled} />}
      hAlign={'center'}
      vAlign={'bottom'}
      disabled={props.disabled}
      allowDisabledPress={true}>
      {t('Add Funds')}
    </FloatingActionButton>
  );
};
