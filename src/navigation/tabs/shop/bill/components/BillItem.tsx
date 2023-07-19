import React from 'react';
import {Image, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import styled, {useTheme} from 'styled-components/native';
import {H6, Paragraph} from '../../../../../components/styled/Text';
import {
  Action,
  LightBlack,
  LuckySevens,
  Slate10,
  Slate30,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {formatFiatAmount} from '../../../../../utils/helper-methods';
import {BaseText} from '../../../../wallet/components/KeyDropdownOption';
import BillStatus from './BillStatus';
import {
  BillPayAccount,
  BillPayment,
} from '../../../../../store/shop/shop.models';
import ChevronDownSvg from '../../../../../../assets/img/bills/chevron-down.svg';
import ChevronUpSvg from '../../../../../../assets/img/bills/chevron-up.svg';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {ActiveOpacity} from '../../../../../components/styled/Containers';
import {useAppDispatch} from '../../../../../utils/hooks';
import {AppActions} from '../../../../../store/app';
import {CustomErrorMessage} from '../../../../wallet/components/ErrorMessages';
import {Analytics} from '../../../../../store/analytics/analytics.effects';

interface BillItemProps {
  account: BillPayAccount;
  payment?: BillPayment;
  variation: 'small' | 'large' | 'header' | 'pay';
  expanded?: boolean;
  selectedAmount?: number;
}

const ItemContainer = styled.View<Partial<BillItemProps>>`
  border-radius: 8px;
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  ${({variation}) =>
    variation === 'header'
      ? 'border: 0; margin-left: 0px;'
      : `
          padding-left: ${variation === 'large' ? 16 : 12}px;
          padding-bottom: ${variation === 'large' ? 16 : 12}px;
          padding-top: ${variation === 'large' ? 16 : 12}px;
          padding-right: ${variation === 'large' ? 16 : 12}px;`}
  margin-bottom: 10px;
`;

const AccountType = styled(Paragraph)`
  font-size: 14px;
  color: ${({theme}) => (theme.dark ? LuckySevens : SlateDark)};
  margin-top: -5px;
`;

const AccountDetailsLeft = styled.View`
  flex-direction: row;
  align-items: center;
  flex-grow: 1;
  flex-shrink: 1;
`;

const AccountDetailsRight = styled.View<Partial<BillItemProps>>`
  ${({variation}) =>
    variation === 'header' || variation === 'pay'
      ? 'align-items: center; flex-direction:row;'
      : 'align-items: flex-end;'}
`;

const AccountBody = styled.View`
  flex-direction: row;
`;

const AccountActions = styled.View`
  margin-top: 9px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const PayButton = styled.View`
  height: 32px;
  background-color: ${Action};
  border-radius: 50px;
  max-width: 90px;
  min-width: 50px;
  padding: 0 20px;
  align-items: center;
  justify-content: center;
`;

const PayButtonText = styled(Paragraph)`
  font-size: 14px;
  color: ${White};
`;

const SelectedAmountContainer = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : Slate10)};
  border-radius: 20px;
  padding: 6px 12px;
  margin-right: 9px;
`;

const AccountBalance = styled(BaseText)<Partial<BillItemProps>>`
  font-size: ${({variation}) => (variation === 'large' ? 16 : 16)}px;
  margin-bottom: ${({variation}) => (variation === 'large' ? -1 : 3)}px;
`;

const AccountFooter = styled.View<Partial<BillItemProps>>`
  background-color: ${({theme}) => (theme.dark ? LightBlack : Slate10)};
  flex-direction: row;
  margin-top: 13px;
  margin-left: ${({variation}) => (variation === 'large' ? -16 : -12)}px;
  margin-right: ${({variation}) => (variation === 'large' ? -16 : -12)}px;
  margin-bottom: ${({variation}) => (variation === 'large' ? -16 : -12)}px;
  padding: 2px 15px;
  border-bottom-right-radius: 6px;
  border-bottom-left-radius: 6px;
`;

const AccountFooterText = styled(Paragraph)`
  color: ${SlateDark};
  color: ${({theme}) => (theme.dark ? White : SlateDark)};
  font-size: 12px;
  flex-grow: 1;
`;

const AccountFooterActionText = styled(AccountFooterText)`
  color: ${({theme}) => (theme.dark ? White : Action)};
  text-align: right;
  font-weight: ${({theme}) => (theme.dark ? 500 : 400)};
`;

export default ({
  account,
  payment,
  variation,
  expanded,
  selectedAmount,
}: BillItemProps) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const theme = useTheme();
  return (
    <ItemContainer variation={variation}>
      <AccountBody>
        <AccountDetailsLeft>
          <Image
            style={{
              height: 30,
              width: 30,
              marginRight: 10,
              marginTop: -4,
              borderRadius: theme.dark ? 30 : 0,
            }}
            resizeMode={'contain'}
            source={{uri: account[account.type].merchantIcon}}
          />
          <View style={{maxWidth: 175}}>
            <H6 numberOfLines={1}>{account[account.type].merchantName}</H6>
            <AccountType numberOfLines={1}>
              {account[account.type].description}
            </AccountType>
          </View>
        </AccountDetailsLeft>
        <AccountDetailsRight variation={variation}>
          {variation === 'header' ? (
            <>
              {selectedAmount ? (
                <SelectedAmountContainer>
                  <H6>{formatFiatAmount(selectedAmount, 'USD')}</H6>
                </SelectedAmountContainer>
              ) : null}
              {expanded ? <ChevronDownSvg /> : <ChevronUpSvg />}
            </>
          ) : (
            <>
              {account.isPayable || !!payment ? (
                <>
                  {variation === 'pay' ? (
                    <PayButton>
                      <PayButtonText>{t('Pay Bill')}</PayButtonText>
                    </PayButton>
                  ) : (
                    <>
                      <AccountBalance variation={variation}>
                        {formatFiatAmount(
                          payment
                            ? payment.amount
                            : account[account.type].balance,
                          'USD',
                        )}
                      </AccountBalance>
                      {variation === 'small' ? (
                        <BillStatus account={account} payment={payment} />
                      ) : null}
                    </>
                  )}
                </>
              ) : null}
            </>
          )}
        </AccountDetailsRight>
      </AccountBody>
      {variation === 'large' || variation === 'pay' ? (
        account.isPayable && variation === 'large' ? (
          <AccountActions>
            <BillStatus account={account} payment={payment} />
            <PayButton>
              <PayButtonText>{t('Pay Bill')}</PayButtonText>
            </PayButton>
          </AccountActions>
        ) : (
          <>
            {!account.isPayable ? (
              <AccountFooter variation={variation}>
                <AccountFooterText>Unable to pay bill</AccountFooterText>
                <TouchableOpacity
                  activeOpacity={ActiveOpacity}
                  onPress={() => {
                    dispatch(
                      AppActions.showBottomNotificationModal(
                        CustomErrorMessage({
                          title: t('Unable to pay bill'),
                          errMsg: t(
                            'We are currently unable to process payments for this bill. We are actively working on a solution.',
                          ),
                        }),
                      ),
                    );
                    dispatch(
                      Analytics.track(
                        'Bill Pay — Clicked Unable To Pay Bill Learn More',
                      ),
                    );
                  }}>
                  <AccountFooterActionText>Learn More</AccountFooterActionText>
                </TouchableOpacity>
              </AccountFooter>
            ) : null}
          </>
        )
      ) : null}
    </ItemContainer>
  );
};
