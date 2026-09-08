import React, {ReactElement} from 'react';
import {useTheme} from '@react-navigation/native';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {BaseText, H4, TextAlign} from '../../../components/styled/Text';
import styled, {css} from 'styled-components/native';
import {
  ActiveOpacity,
  SheetContainer,
  SheetParams,
} from '../../../components/styled/Containers';
import {Platform, Image, ImageSourcePropType} from 'react-native';
import {
  Black,
  Slate,
  Slate30,
  White,
  SlateDark,
  Caution,
  Feather,
  LightBlack,
  Warning,
  Warning25,
} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import Back from '../../../components/back/Back';
import AngleRight from '../../../../assets/img/angle-right.svg';
import ClockOutlineIcon from '../../../../assets/img/icon-clock-outline.svg';
import AlertTriangleIcon from '../../../../assets/img/icon-alert-triangle.svg';
import InfoIcon from '../../../components/icons/info/Info';

const OptionsHeaderContainer = styled.View<{cardStyle?: boolean}>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  position: relative;
  margin-bottom: ${({cardStyle}) => (cardStyle ? 12 : 25)}px;
`;

const OptionsHeaderTitleContainer = styled.View`
  position: absolute;
  left: 0;
  right: 0;
  align-items: center;
`;

const OptionsHeaderPlaceholder = styled.View`
  width: 41px;
`;

const OptionContainer = styled(TouchableOpacity)<
  SheetParams & {cardStyle?: boolean}
>`
  flex-direction: row;
  align-items: stretch;
  ${({cardStyle, placement}) =>
    cardStyle
      ? css`
          padding: 16px;
          margin-bottom: 12px;
        `
      : css`
          padding-${placement}: 31px;
        `}
  ${({cardStyle, theme: {dark}}) =>
    cardStyle &&
    css`
      background-color: ${dark ? LightBlack : Feather};
      border-radius: 12px;
    `}
`;

const OptionIconContainer = styled.View`
  justify-content: center;
  width: 20px;
`;

const OptionTextContainer = styled.View<{cardStyle?: boolean}>`
  align-items: flex-start;
  justify-content: center;
  flex-direction: column;
  margin: ${({cardStyle}) => (cardStyle ? '0 8px 0 0' : '0 20px')};
  flex: 1;
`;

const OptionTitleText = styled(BaseText)<{cardStyle?: boolean}>`
  font-style: normal;
  font-weight: ${({cardStyle}) => (cardStyle ? 500 : 600)};
  font-size: 16px;
  line-height: ${({cardStyle}) => (cardStyle ? 24 : 22)}px;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  margin-bottom: 6px;
`;

const OptionDescriptionText = styled(BaseText)<{cardStyle?: boolean}>`
  font-style: normal;
  font-weight: 400;
  font-size: ${({cardStyle}) => (cardStyle ? 16 : 14)}px;
  line-height: ${({cardStyle}) => (cardStyle ? 24 : 20)}px;
  color: ${({cardStyle, theme: {dark}}) =>
    cardStyle ? (dark ? Slate30 : SlateDark) : dark ? Slate : Black};
  margin-top: 3px;
`;

const SubDescriptionContainer = styled.View`
  width: 100%;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
  border-radius: 12px;
  padding: 16px;
  margin-top: 8px;
`;

const SubDescriptionRow = styled.View`
  width: 100%;
  flex-direction: row;
  align-items: center;
`;

const SubDescriptionRowSpacer = styled.View`
  height: 4px;
`;

const SubDescriptionIconContainer = styled.View`
  margin-right: 4px;
`;

const OptionSubDescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: 400;
  font-size: 13px;
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  flex: 1;
`;

const OptionBadgeContainer = styled.View`
  flex-direction: row;
  align-items: center;
  align-self: flex-start;
  background-color: ${Warning25};
  border-radius: 4px;
  padding: 4px 8px;
  margin-bottom: 8px;
`;

const OptionBadgeText = styled(BaseText)`
  font-style: normal;
  font-weight: 400;
  font-size: 13px;
  line-height: 20px;
  color: ${Warning};
`;

export interface SubDescriptionItem {
  icon: 'clock' | 'warning' | 'info';
  text: string;
}

const subDescriptionIcons = {
  clock: ClockOutlineIcon,
  warning: AlertTriangleIcon,
  info: InfoIcon,
};

export interface Option {
  img?: ReactElement;
  imgSrc?: ImageSourcePropType;
  badge?: string;
  subDescriptionItems?: SubDescriptionItem[];
  cardStyle?: boolean;
  title?: string;
  description?: string;
  onPress: () => void;
  optionElement?: any;
  showChevron?: boolean;
}

type SheetPlacement = 'top' | 'bottom';

interface Props extends SheetParams {
  isVisible: boolean;
  closeModal: () => void;
  title?: string;
  onBack?: () => void;
  options: Array<Option>;
  placement?: SheetPlacement;
  paddingHorizontal?: number;
}

const OptionsSheet = ({
  isVisible,
  closeModal,
  title,
  onBack,
  options,
  paddingHorizontal,
}: Props) => {
  const theme = useTheme();
  const hasCardStyle = options.some(option => option.cardStyle);
  const sheetPlacement = 'bottom' as SheetPlacement;
  const topStyles = {
    paddingTop: Platform.OS === 'android' ? 0 : 31,
  };
  return (
    <SheetModal
      modalLibrary={'bottom-sheet'}
      isVisible={isVisible}
      onBackdropPress={closeModal}
      placement={sheetPlacement}>
      <SheetContainer
        placement={sheetPlacement}
        paddingHorizontal={paddingHorizontal}>
        {title ? (
          <OptionsHeaderContainer cardStyle={hasCardStyle}>
            {onBack ? (
              <TouchableOpacity onPress={onBack}>
                <Back opacity={1} />
              </TouchableOpacity>
            ) : (
              <OptionsHeaderPlaceholder />
            )}
            <OptionsHeaderTitleContainer pointerEvents="none">
              <TextAlign align={'center'}>
                <H4>{title}</H4>
              </TextAlign>
            </OptionsHeaderTitleContainer>
            <OptionsHeaderPlaceholder />
          </OptionsHeaderContainer>
        ) : null}
        {options.map(
          (
            {
              img,
              imgSrc,
              title: optionTitle,
              description,
              badge,
              subDescriptionItems,
              cardStyle,
              onPress,
              optionElement,
              showChevron,
            },
            index,
          ) => {
            return (
              <OptionContainer
                style={index === 0 && sheetPlacement === 'top' && topStyles}
                placement={sheetPlacement}
                cardStyle={cardStyle}
                key={index}
                activeOpacity={ActiveOpacity}
                onPress={async () => {
                  closeModal();
                  await sleep(500);
                  onPress();
                }}>
                {optionElement ? (
                  <>{optionElement()}</>
                ) : (
                  <>
                    {img && <OptionIconContainer>{img}</OptionIconContainer>}
                    {imgSrc && (
                      <OptionIconContainer>
                        <Image source={imgSrc} />
                      </OptionIconContainer>
                    )}
                    <OptionTextContainer cardStyle={cardStyle}>
                      {badge ? (
                        <OptionBadgeContainer>
                          <OptionBadgeText>{badge}</OptionBadgeText>
                        </OptionBadgeContainer>
                      ) : null}
                      {optionTitle ? (
                        <OptionTitleText cardStyle={cardStyle}>
                          {optionTitle}
                        </OptionTitleText>
                      ) : null}
                      <OptionDescriptionText cardStyle={cardStyle}>
                        {description}
                      </OptionDescriptionText>
                      {subDescriptionItems &&
                        subDescriptionItems.length > 0 && (
                          <SubDescriptionContainer>
                            {subDescriptionItems.map((item, itemIndex) => {
                              const ItemIcon = subDescriptionIcons[item.icon];
                              return (
                                <React.Fragment key={itemIndex}>
                                  {itemIndex > 0 && <SubDescriptionRowSpacer />}
                                  <SubDescriptionRow>
                                    <SubDescriptionIconContainer>
                                      <ItemIcon
                                        width={16}
                                        height={16}
                                        size={16}
                                        bgColor={theme.dark ? White : SlateDark}
                                        color={
                                          item.icon === 'warning'
                                            ? Caution
                                            : theme.dark
                                            ? White
                                            : SlateDark
                                        }
                                      />
                                    </SubDescriptionIconContainer>
                                    <OptionSubDescriptionText>
                                      {item.text}
                                    </OptionSubDescriptionText>
                                  </SubDescriptionRow>
                                </React.Fragment>
                              );
                            })}
                          </SubDescriptionContainer>
                        )}
                    </OptionTextContainer>
                    {showChevron && (
                      <OptionIconContainer>
                        <AngleRight />
                      </OptionIconContainer>
                    )}
                  </>
                )}
              </OptionContainer>
            );
          },
        )}
      </SheetContainer>
    </SheetModal>
  );
};

export default OptionsSheet;
