import React, {ReactElement} from 'react';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {BaseText, H4, TextAlign} from '../../../components/styled/Text';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  SheetContainer,
  SheetParams,
} from '../../../components/styled/Containers';
import {Platform, Image, ImageSourcePropType} from 'react-native';
import {Action, Black, Slate, White} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';

const OptionsTitleContainer = styled.View`
  margin-bottom: 25px;
`;

const OptionContainer = styled.TouchableOpacity<SheetParams>`
  flex-direction: row;
  align-items: stretch;
  padding-${({placement}) => placement}: 31px;
`;

const OptionIconContainer = styled.View`
  justify-content: center;
  width: 20px;
`;

const OptionTextContainer = styled.View`
  align-items: flex-start;
  justify-content: space-around;
  flex-direction: column;
  margin: 0 20px;
`;

const OptionTitleText = styled(BaseText)`
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
  line-height: 19px;
  color: ${({theme: {dark}}) => (dark ? White : Action)};
`;

const OptionDescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 19px;
  color: ${({theme: {dark}}) => (dark ? Slate : Black)};
`;

export interface Option {
  img?: ReactElement;
  imgSrc?: ImageSourcePropType;
  title?: string;
  description: string;
  onPress: () => void;
}

interface Props extends SheetParams {
  isVisible: boolean;
  closeModal: () => void;
  title?: string;
  options: Array<Option>;
  placement?: 'top' | 'bottom';
}

const OptionsSheet = ({
  isVisible,
  closeModal,
  title,
  placement,
  options,
}: Props) => {
  const sheetPlacement = placement || 'bottom';
  const topStyles = {
    paddingTop: Platform.OS === 'android' ? 0 : 31,
  };
  return (
    <SheetModal
      isVisible={isVisible}
      onBackdropPress={closeModal}
      placement={sheetPlacement}>
      <SheetContainer placement={sheetPlacement}>
        {title ? (
          <OptionsTitleContainer>
            <TextAlign align={'center'}>
              <H4>{title}</H4>
            </TextAlign>
          </OptionsTitleContainer>
        ) : null}
        {options.map(
          ({img, imgSrc, title: optionTitle, description, onPress}, index) => {
            return (
              <OptionContainer
                style={index === 0 && placement === 'top' && topStyles}
                placement={sheetPlacement}
                key={index}
                activeOpacity={ActiveOpacity}
                onPress={async () => {
                  closeModal();
                  await sleep(500);
                  onPress();
                }}>
                {img && <OptionIconContainer>{img}</OptionIconContainer>}
                {imgSrc && (
                  <OptionIconContainer>
                    <Image source={imgSrc} />
                  </OptionIconContainer>
                )}
                <OptionTextContainer>
                  {optionTitle ? (
                    <OptionTitleText>{optionTitle}</OptionTitleText>
                  ) : null}
                  <OptionDescriptionText>{description}</OptionDescriptionText>
                </OptionTextContainer>
              </OptionContainer>
            );
          },
        )}
      </SheetContainer>
    </SheetModal>
  );
};

export default OptionsSheet;
