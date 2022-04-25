import React, {ReactElement} from 'react';
import AmazonSvg from '../../assets/img/wallet/transactions/amazon.svg';
import WalletConnectSvg from '../../assets/img/wallet/transactions/wallet-connect.svg';
import ShapeShiftSvg from '../../assets/img/wallet/transactions/shapeshift.svg';
import ChangellySvg from '../../assets/img/wallet/transactions/changelly.svg';
import OneInchSvg from '../../assets/img/wallet/transactions/1inch.svg';
import MercadolivreSvg from '../../assets/img/wallet/transactions/mercadolivre.svg';
import CoinbaseSvg from '../../assets/img/wallet/transactions/coinbase.svg';
import BitPaySvg from '../../assets/img/wallet/transactions/bitpay.svg';
import {useTheme} from 'styled-components/native';
import {BitPayTheme} from '../themes/bitpay';
import * as Svg from 'react-native-svg';
import {Success25, Success50} from '../styles/colors';
export const TRANSACTION_ICON_SIZE = 35;

export interface TxIconProps {
  size?: number;
}

export const TxReceivedIcon = ({size = TRANSACTION_ICON_SIZE}: TxIconProps) => {
  const theme = useTheme() as BitPayTheme;

  return (
    <Svg.Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Svg.Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 20C0 8.9543 8.9543 0 20 0C31.0457 0 40 8.9543 40 20C40 31.0457 31.0457 40 20 40C8.9543 40 0 31.0457 0 20Z"
        fill={theme.dark ? '#004D27' : Success25}
      />
      <Svg.Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.044 24.2638L23.6539 21.6539C24.121 21.1868 24.8783 21.1868 25.3455 21.6539C25.8126 22.121 25.8126 22.8784 25.3455 23.3455L20.701 27.99C20.6735 28.0179 20.6447 28.0445 20.6147 28.0696C20.5362 28.1353 20.4514 28.1893 20.3623 28.2317C20.2065 28.306 20.0321 28.3477 19.8479 28.3477C19.6741 28.3477 19.5089 28.3106 19.3599 28.2439C19.2435 28.1919 19.1336 28.1204 19.0354 28.0293C19.0229 28.0178 19.0107 28.006 18.9987 27.9939L14.3503 23.3455C13.8832 22.8784 13.8832 22.121 14.3503 21.6539C14.8174 21.1868 15.5747 21.1868 16.0418 21.6539L18.6518 24.2638L18.6518 13.1961C18.6518 12.5355 19.1873 12 19.8479 12C20.5085 12 21.044 12.5355 21.044 13.1961L21.044 24.2638Z"
        fill={theme.dark ? Success50 : '#004D27'}
      />
    </Svg.Svg>
  );
};

export const TxGiftCardIcon = ({size = TRANSACTION_ICON_SIZE}: TxIconProps) => {
  const theme = useTheme() as BitPayTheme;

  return (
    <Svg.Svg width={size} height={size} viewBox="0 0 41 40" fill="none">
      <Svg.Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20.6938 40C9.64815 40 0.693849 31.0457 0.693849 20C0.693848 8.95431 9.64815 1.35705e-06 20.6938 8.74228e-07C31.7395 3.91405e-07 40.6938 8.9543 40.6938 20C40.6938 31.0457 31.7395 40 20.6938 40Z"
        fill={theme.dark ? '#393939' : '#E1E4E7'}
      />
      <Svg.Path
        d="M29.6715 21.4904L20.4154 12.2342C20.3433 12.1617 20.2449 12.1212 20.1427 12.1212H13.2006C12.9877 12.1212 12.8149 12.294 12.8149 12.5069V19.449C12.8149 19.5512 12.8554 19.6496 12.9279 19.7217L22.1841 28.9779C22.2593 29.0531 22.358 29.0909 22.4568 29.0909C22.5555 29.0909 22.6542 29.0531 22.7294 28.9779L29.6715 22.0358C29.8223 21.885 29.8223 21.6412 29.6715 21.4904ZM16.6717 17.135C16.0326 17.135 15.5147 16.617 15.5147 15.978C15.5147 15.3389 16.0326 14.8209 16.6717 14.8209C17.3107 14.8209 17.8287 15.3389 17.8287 15.978C17.8287 16.617 17.3107 17.135 16.6717 17.135Z"
        fill={theme.dark ? '#9BA3AE' : '#434D5A'}
      />
    </Svg.Svg>
  );
};

export const TxConfirmingIcon = ({
  size = TRANSACTION_ICON_SIZE,
}: TxIconProps) => {
  const theme = useTheme() as BitPayTheme;
  return (
    <Svg.Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Svg.Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20 40C8.95431 40 0 31.0457 0 20C0 8.95431 8.95431 0 20 0C31.0457 0 40 8.95431 40 20C40 31.0457 31.0457 40 20 40Z"
        fill={theme.dark ? '#393939' : '#E1E4E7'}
      />
      <Svg.Path
        d="M10.0001 19.5005L10.0002 19.4938L10 19.4752L10.0003 19.4491C10.0125 17.296 10.7944 15.21 12.2184 13.5337C13.6539 11.844 15.6552 10.6724 17.8892 10.2141C20.1231 9.75574 22.455 10.0382 24.4964 11.0146C25.6424 11.5627 26.6581 12.3109 27.4955 13.2117V12.3487C27.4955 11.6916 28.0562 11.159 28.7478 11.159C29.4394 11.159 30 11.6916 30 12.3487V16.1459C30 16.516 29.8222 16.8465 29.5433 17.0647C29.3889 17.1855 29.2035 17.2719 29.0001 17.3114C28.9186 17.3273 28.8342 17.3356 28.7478 17.3356L24.7509 17.3356C24.0593 17.3356 23.4986 16.803 23.4986 16.1459C23.4986 15.4889 24.0593 14.9562 24.7509 14.9562H25.7563C25.103 14.2093 24.291 13.5921 23.3653 13.1494C21.8374 12.4187 20.0922 12.2072 18.4202 12.5503C16.7482 12.8933 15.2504 13.7702 14.1761 15.0348C13.1018 16.2993 12.5158 17.8754 12.5158 19.5005H12.5079C12.4938 20.1469 11.9378 20.6667 11.2541 20.6667C10.5704 20.6667 10.0143 20.1469 10.0001 19.5005Z"
        fill={theme.dark ? '#9BA3AE' : '#434D5A'}
      />
      <Svg.Path
        d="M11.2524 22.6376L11.2652 22.6377H15.2493C15.9409 22.6377 16.5015 23.1703 16.5015 23.8274C16.5015 24.4845 15.9409 25.0171 15.2493 25.0171H14.2204C14.8777 25.776 15.698 26.4026 16.6347 26.8506C18.1626 27.5813 19.9078 27.7928 21.5798 27.4497C23.2518 27.1067 24.7496 26.2298 25.8239 24.9652C26.8982 23.7007 27.4841 22.1246 27.4841 20.4995H27.492C27.5062 19.8531 28.0621 19.3333 28.7459 19.3333C29.4296 19.3333 29.9856 19.8531 29.9997 20.4995L29.9998 20.5061L30 20.5247L29.9997 20.5508C29.9874 22.704 29.2056 24.79 27.7815 26.4663C26.3461 28.156 24.3448 29.3276 22.1108 29.7859C19.8768 30.2443 17.545 29.9618 15.5036 28.9854C14.3576 28.4374 13.342 27.6892 12.5046 26.7885V27.6246C12.5046 28.2816 11.944 28.8143 11.2524 28.8143C10.5608 28.8143 10.0001 28.2816 10.0001 27.6246L10.0001 23.8273C10.0001 23.1703 10.5608 22.6376 11.2524 22.6376Z"
        fill={theme.dark ? '#9BA3AE' : '#434D5A'}
      />
    </Svg.Svg>
  );
};

const TxSentIcon = ({size = TRANSACTION_ICON_SIZE}: TxIconProps) => {
  const theme = useTheme() as BitPayTheme;

  return (
    <Svg.Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Svg.Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20 40C8.95431 40 1.64958e-07 31.0457 -3.17865e-07 20C-8.00688e-07 8.95431 8.9543 1.35705e-06 20 8.74228e-07C31.0457 3.91405e-07 40 8.95431 40 20C40 31.0457 31.0457 40 20 40Z"
        fill={theme.dark ? '#393939' : '#E1E4E7'}
      />
      <Svg.Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.6517 16.0839L16.0419 18.6937C15.5747 19.1609 14.8174 19.1609 14.3503 18.6937C13.8832 18.2266 13.8832 17.4693 14.3503 17.0022L18.9948 12.3577C19.0222 12.3298 19.051 12.3032 19.0811 12.2781C19.1595 12.2124 19.2444 12.1584 19.3334 12.116C19.4892 12.0416 19.6637 12 19.8479 12C20.0217 12 20.1868 12.0371 20.3358 12.1037C20.4523 12.1557 20.5621 12.2273 20.6604 12.3183C20.6728 12.3299 20.685 12.3417 20.697 12.3537L25.3455 17.0022C25.8126 17.4693 25.8126 18.2266 25.3455 18.6937C24.8784 19.1609 24.121 19.1609 23.6539 18.6937L21.044 16.0838L21.044 27.1515C21.044 27.8121 20.5084 28.3477 19.8479 28.3477C19.1873 28.3477 18.6517 27.8121 18.6517 27.1515L18.6517 16.0839Z"
        fill={theme.dark ? '#9BA3AE' : '#434D5A'}
      />
    </Svg.Svg>
  );
};

export const TxErrorIcon = ({size = TRANSACTION_ICON_SIZE}: TxIconProps) => {
  const theme = useTheme() as BitPayTheme;

  return (
    <Svg.Svg width={size} height={size} viewBox="0 0 40 41" fill="none">
      <Svg.Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M-1.19209e-06 20.0601C-1.19209e-06 9.01436 8.9543 0.0600574 20 0.0600574C31.0457 0.0600574 40 9.01436 40 20.0601C40 31.1058 31.0457 40.0601 20 40.0601C8.9543 40.0601 -1.19209e-06 31.1058 -1.19209e-06 20.0601Z"
        fill={theme.dark ? '#A71C1C' : '#FFCDCD'}
      />
      <Svg.Path
        d="M21.9043 20.2504L27.904 26.25C28.3774 26.7234 28.3774 27.4909 27.904 27.9642C27.4307 28.4375 26.6632 28.4375 26.1899 27.9642L20.1902 21.9645L14.1905 27.9642C13.7171 28.4375 12.9497 28.4375 12.4763 27.9642C12.0029 27.4907 12.0029 26.7234 12.4763 26.2499L18.4759 20.2502L12.4763 14.2506C12.0029 13.7773 12.0029 13.0098 12.4763 12.5364C12.9496 12.0629 13.7171 12.0629 14.1904 12.5364L20.1901 18.5361L26.1899 12.5363C26.6632 12.0629 27.4307 12.0629 27.9041 12.5363C28.3774 13.0098 28.3774 13.7773 27.9041 14.2506L21.9043 20.2504Z"
        fill={theme.dark ? '#FFCDCD' : '#CD4040'}
      />
    </Svg.Svg>
  );
};

export const TxContractInteractionIcon = ({
  size = TRANSACTION_ICON_SIZE,
}: TxIconProps) => {
  const theme = useTheme() as BitPayTheme;

  return (
    <Svg.Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Svg.Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20 40C8.9543 40 0 31.0457 0 20C0 8.9543 8.9543 0 20 0C31.0457 0 40 8.9543 40 20C40 31.0457 31.0457 40 20 40Z"
        fill={theme.dark ? '#393939' : '#E1E4E7'}
      />
      <Svg.Path
        d="M21.7771 25.0419L18.99 25.7516L19.6997 22.9644L28.1159 14.5482C28.3913 14.2726 28.765 14.1177 29.1546 14.1177C29.5443 14.1177 29.918 14.2726 30.1934 14.5482V14.5482C30.469 14.8236 30.6239 15.1973 30.6239 15.5869C30.6239 15.9766 30.469 16.3503 30.1934 16.6257L21.7771 25.0419Z"
        fill={theme.dark ? '#9BA3AE' : '#434D5A'}
      />
      <Svg.Line
        x1="10.1618"
        y1="25.1323"
        x2="17.0591"
        y2="25.1323"
        stroke={theme.dark ? '#9BA3AE' : '#434D5A'}
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </Svg.Svg>
  );
};

export const TxMovedIcon = ({size = TRANSACTION_ICON_SIZE}: TxIconProps) => {
  const theme = useTheme() as BitPayTheme;

  return (
    <Svg.Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Svg.Path
        opacity="0.2"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M-1.19209e-06 20C-1.19209e-06 8.9543 8.9543 -1.19209e-06 20 -1.19209e-06C31.0457 -1.19209e-06 40 8.9543 40 20C40 31.0457 31.0457 40 20 40C8.9543 40 -1.19209e-06 31.0457 -1.19209e-06 20Z"
        fill={theme.dark ? '#393939' : '#E1E4E7'}
      />
      <Svg.Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M23.9161 18.6517L21.3063 16.0419C20.8391 15.5747 20.8391 14.8174 21.3063 14.3503C21.7734 13.8832 22.5307 13.8832 22.9978 14.3503L27.6423 18.9948C27.6702 19.0222 27.6968 19.051 27.7219 19.0811C27.7876 19.1595 27.8416 19.2444 27.884 19.3334C27.9584 19.4892 28 19.6637 28 19.8479C28 20.0217 27.9629 20.1868 27.8963 20.3358C27.8443 20.4523 27.7727 20.5621 27.6817 20.6604C27.6701 20.6728 27.6583 20.685 27.6463 20.697L22.9978 25.3455C22.5307 25.8126 21.7734 25.8126 21.3063 25.3455C20.8391 24.8784 20.8391 24.121 21.3063 23.6539L23.9162 21.044L12.8485 21.044C12.1879 21.044 11.6523 20.5084 11.6523 19.8479C11.6523 19.1873 12.1879 18.6517 12.8485 18.6517L23.9161 18.6517Z"
        fill={theme.dark ? '#9BA3AE' : '#434D5A'}
      />
    </Svg.Svg>
  );
};

export const TxBroadcastIcon = ({
  size = TRANSACTION_ICON_SIZE,
}: TxIconProps) => {
  const theme = useTheme() as BitPayTheme;

  return (
    <Svg.Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Svg.Path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M-1.19209e-06 20C-1.19209e-06 8.9543 8.9543 -1.19209e-06 20 -1.19209e-06C31.0457 -1.19209e-06 40 8.9543 40 20C40 31.0457 31.0457 40 20 40C8.9543 40 -1.19209e-06 31.0457 -1.19209e-06 20Z"
        fill={theme.dark ? '#393939' : '#E1E4E7'}
      />
      <Svg.Path
        d="M28 21.1248C28.5523 21.1248 29 20.677 29 20.1248V19.9998C28.9973 17.6138 28.0483 15.3262 26.3611 13.6389C24.6739 11.9518 22.3863 11.0027 20.0002 11H19.8752C19.3229 11 18.8752 11.4478 18.8752 12V12.25C18.8752 12.8022 19.3229 13.25 19.8752 13.25H20.0002C21.7898 13.2517 23.5056 13.9635 24.7711 15.2289C26.0366 16.4944 26.7483 18.2102 26.7501 19.9998V20.1248C26.7501 20.677 27.1978 21.1248 27.7501 21.1248H28Z"
        fill={theme.dark ? '#9BA3AE' : '#434D5A'}
      />
      <Svg.Path
        d="M12.6462 16.3063C12.9841 15.8694 13.6232 15.8728 14.0137 16.2633L18.0823 20.3319L18.9141 19.5001C19.3046 19.1095 19.9378 19.1095 20.3283 19.5001L20.502 19.6737C20.8925 20.0643 20.8925 20.6974 20.502 21.088L19.6702 21.9198L23.7367 25.9863C24.1273 26.3768 24.1306 27.0159 23.6938 27.3539C22.3217 28.4153 20.6286 29 18.8752 29C16.7866 29 14.7835 28.1703 13.3066 26.6935C11.8297 25.2166 11 23.2135 11 21.1248C11 19.3715 11.5847 17.6783 12.6462 16.3063Z"
        fill={theme.dark ? '#9BA3AE' : '#434D5A'}
      />
      <Svg.Path
        d="M25.6251 20.1248C25.6251 20.6771 25.1774 21.1249 24.6251 21.1249H24.3751C23.8228 21.1249 23.3751 20.6771 23.3751 20.1249V19.9999C23.3751 19.1047 23.0196 18.2463 22.3866 17.6134C21.7537 16.9805 20.8953 16.6249 20.0002 16.6249H19.8752C19.3229 16.6249 18.8752 16.1772 18.8752 15.6249V15.375C18.8752 14.8226 19.3229 14.375 19.8752 14.375H20.0002C21.4915 14.3767 22.9211 14.97 23.9756 16.0244C25.0301 17.0789 25.6233 18.5085 25.6251 19.9999V20.1248Z"
        fill={theme.dark ? '#9BA3AE' : '#434D5A'}
      />
    </Svg.Svg>
  );
};

export const TransactionIcons: {[key in string]: ReactElement} = {
  amazon: (
    <AmazonSvg width={TRANSACTION_ICON_SIZE} height={TRANSACTION_ICON_SIZE} />
  ),
  walletConnect: (
    <WalletConnectSvg
      width={TRANSACTION_ICON_SIZE}
      height={TRANSACTION_ICON_SIZE}
    />
  ),
  shapeshift: (
    <ShapeShiftSvg
      width={TRANSACTION_ICON_SIZE}
      height={TRANSACTION_ICON_SIZE}
    />
  ),
  changelly: (
    <ChangellySvg
      width={TRANSACTION_ICON_SIZE}
      height={TRANSACTION_ICON_SIZE}
    />
  ),
  oneInch: (
    <OneInchSvg width={TRANSACTION_ICON_SIZE} height={TRANSACTION_ICON_SIZE} />
  ),
  mercadolibre: (
    <MercadolivreSvg
      width={TRANSACTION_ICON_SIZE}
      height={TRANSACTION_ICON_SIZE}
    />
  ),
  coinbase: (
    <CoinbaseSvg width={TRANSACTION_ICON_SIZE} height={TRANSACTION_ICON_SIZE} />
  ),
  debitcard: (
    <BitPaySvg width={TRANSACTION_ICON_SIZE} height={TRANSACTION_ICON_SIZE} />
  ),
  giftcards: <TxGiftCardIcon />,
  sent: <TxSentIcon />,
  received: <TxReceivedIcon />,
  moved: <TxMovedIcon />,
  confirming: <TxConfirmingIcon />,
  error: <TxErrorIcon />,
  broadcast: <TxBroadcastIcon />,
  contractInteraction: <TxContractInteractionIcon />,
};
