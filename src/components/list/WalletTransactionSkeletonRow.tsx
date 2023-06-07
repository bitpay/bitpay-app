import React from 'react';
import {View} from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import styled, {useTheme} from 'styled-components/native';
import {TRANSACTION_ICON_SIZE} from '../../constants/TransactionIcons';
import {LightBlack} from '../../styles/colors';

const USE_NEW_ARCH_WORKAROUND = true;

const WorkaroundSkeletonItem = styled.View`
  background: ${({theme}) => theme.dark ? LightBlack : '#E1E9EE'};
`;

const WorkaroundHeader = styled(WorkaroundSkeletonItem)`
  border-radius: 0;
  height: 55px;
  width: 100%;
`;

const WorkaroundRow = styled.View`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 15px;
`;

const WorkaroundIcon = styled(WorkaroundSkeletonItem)`
  border-radius: 50px;
  height: ${TRANSACTION_ICON_SIZE}px;
  margin-right: 8px;
  width: ${TRANSACTION_ICON_SIZE}px;
`;

const WorkaroundHeading = styled(WorkaroundSkeletonItem)`
  height: 18px;
  width: 150px;
`;

const WorkaroundDetails = styled.View`
  align-items: flex-end;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  margin-left: auto;
`;

const WorkaroundDetailsTop = styled(WorkaroundSkeletonItem)`
  height: 14px;
  margin-bottom: 5px;
  width: 80px;
`;

const WorkaroundDetailsBottom = styled(WorkaroundSkeletonItem)`
  height: 12px;
  width: 70px;
`;

const NonAnimatedNewArchWorkaround = () => {
  return (
    <>
      <WorkaroundHeader />

      <WorkaroundRow>
        <WorkaroundIcon />

        <WorkaroundHeading />

        <WorkaroundDetails>
          <WorkaroundDetailsTop />

          <WorkaroundDetailsBottom />
        </WorkaroundDetails>
      </WorkaroundRow>
    </>
  );
};

const WalletTransactionSkeletonRow = () => {
  const theme = useTheme();

  if (USE_NEW_ARCH_WORKAROUND) {
    return <NonAnimatedNewArchWorkaround />
  }

  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
      highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
      <View>
        <SkeletonPlaceholder.Item width="100%" height={55} />

        <SkeletonPlaceholder.Item
          flexDirection={'row'}
          alignItems={'center'}
          justifyContent={'space-between'}
          padding={15}>
          <SkeletonPlaceholder.Item
            width={TRANSACTION_ICON_SIZE}
            height={TRANSACTION_ICON_SIZE}
            borderRadius={50}
            marginRight={8}
          />
          <SkeletonPlaceholder.Item width={150} height={18} borderRadius={4} />
          <SkeletonPlaceholder.Item marginLeft={'auto'} alignItems={'flex-end'}>
            <SkeletonPlaceholder.Item
              width={80}
              height={14}
              borderRadius={4}
              marginBottom={5}
            />
            <SkeletonPlaceholder.Item width={70} height={12} borderRadius={4} />
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder.Item>
      </View>
    </SkeletonPlaceholder>
  );
};

export default WalletTransactionSkeletonRow;
