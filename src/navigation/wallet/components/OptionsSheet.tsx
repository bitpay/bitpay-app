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
import {
  Black,
  Slate,
  White,
  SlateDark,
  Warning,
  Caution,
} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const OptionsTitleContainer = styled.View`
  margin-bottom: 25px;
`;

const OptionContainer = styled(TouchableOpacity)<SheetParams>`
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
  flex: 1;
`;

const OptionTitleText = styled(BaseText)`
  font-style: normal;
  font-weight: 600;
  font-size: 16px;
  line-height: 22px;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  margin-bottom: 6px;
`;

const OptionDescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? Slate : Black)};
  margin-top: 3px;
`;

const SubDescriptionContainer = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? '#000000' : '#F5F5F5')};
  border-radius: 8px;
  padding: 12px 14px;
  margin-top: 12px;
`;

const OptionSubDescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: 400;
  font-size: 13px;
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const BoldText = styled(BaseText)`
  font-weight: 700;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

export interface Option {
  img?: ReactElement;
  imgSrc?: ImageSourcePropType;
  subDescription?: string;
  title?: string;
  description?: string;
  onPress: () => void;
  optionElement?: any;
}

type SheetPlacement = 'top' | 'bottom';

interface Props extends SheetParams {
  isVisible: boolean;
  closeModal: () => void;
  title?: string;
  options: Array<Option>;
  placement?: SheetPlacement;
  paddingHorizontal?: number;
}

const renderSubDescription = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return <BoldText key={index}>{boldText}</BoldText>;
    }
    return part;
  });
};

const OptionsSheet = ({
  isVisible,
  closeModal,
  title,
  options,
  paddingHorizontal,
}: Props) => {
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
          <OptionsTitleContainer>
            <TextAlign align={'center'}>
              <H4>{title}</H4>
            </TextAlign>
          </OptionsTitleContainer>
        ) : null}
        {options.map(
          (
            {
              img,
              imgSrc,
              title: optionTitle,
              description,
              subDescription,
              onPress,
              optionElement,
            },
            index,
          ) => {
            return (
              <OptionContainer
                style={index === 0 && sheetPlacement === 'top' && topStyles}
                placement={sheetPlacement}
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
                    <OptionTextContainer>
                      {optionTitle ? (
                        <OptionTitleText>{optionTitle}</OptionTitleText>
                      ) : null}
                      <OptionDescriptionText>
                        {description}
                      </OptionDescriptionText>
                      {subDescription && (
                        <SubDescriptionContainer>
                          <OptionSubDescriptionText>
                            {renderSubDescription(subDescription)}
                          </OptionSubDescriptionText>
                        </SubDescriptionContainer>
                      )}
                    </OptionTextContainer>
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
