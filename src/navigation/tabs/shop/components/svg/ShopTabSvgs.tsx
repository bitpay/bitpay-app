import React from 'react';
import {Theme} from '@react-navigation/native';
import Svg, {Path, Rect, Circle, G} from 'react-native-svg';
import {Action, Midnight, White} from '../../../../../styles/colors';

const getOptionIconFill = (theme: Theme) => {
  return theme.dark ? White : Action;
};

export const ArchiveSvg = ({theme}: {theme: Theme}) => {
  return (
    <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <Path
        d="M19.7336 3.90273L16.0973 0.266364C15.9268 0.0958642 15.6956 5.14886e-05 15.4545 0H4.54545C4.30437 5.14886e-05 4.07318 0.0958642 3.90273 0.266364L0.266364 3.90273C0.0958642 4.07318 5.14886e-05 4.30437 0 4.54545V17.2727C0 17.996 0.287337 18.6897 0.7988 19.2012C1.31026 19.7127 2.00396 20 2.72727 20H17.2727C17.996 20 18.6897 19.7127 19.2012 19.2012C19.7127 18.6897 20 17.996 20 17.2727V4.54545C19.9999 4.30437 19.9041 4.07318 19.7336 3.90273ZM10 16.3636L5.45455 10.9091H8.18182V7.27273H11.8182V10.9091H14.5455L10 16.3636ZM3.10364 3.63636L4.92182 1.81818H15.0782L16.8964 3.63636H3.10364Z"
        fill={getOptionIconFill(theme)}
      />
    </Svg>
  );
};

export const InvoiceSvg = ({theme}: {theme: Theme}) => {
  return (
    <Svg width="17" height="20" viewBox="0 0 17 20" fill="none">
      <Path
        d="M15.625 0H0.625C0.28 0 0 0.28 0 0.625V20L3.125 18.125L5.625 20L8.125 18.125L10.625 20L13.125 18.125L16.25 20V0.625C16.25 0.28 15.97 0 15.625 0ZM8.75 14.375H3.125V13.125H8.75V14.375ZM8.75 10H3.125V8.75H8.75V10ZM8.75 5.625H3.125V4.375H8.75V5.625ZM13.125 14.375H10.625V13.125H13.125V14.375ZM13.125 10H10.625V8.75H13.125V10ZM13.125 5.625H10.625V4.375H13.125V5.625Z"
        fill={getOptionIconFill(theme)}
      />
    </Svg>
  );
};

export const PrintSvg = ({theme}: {theme: Theme}) => {
  return (
    <Svg width="16" height="17" viewBox="0 0 16 17" fill="none">
      <Path d="M12 0.5H4V3.5H12V0.5Z" fill={getOptionIconFill(theme)} />
      <Path
        d="M12 5.5H4C1.8 5.5 0 7.3 0 9.5V12.5C0 13.1 0.4 13.5 1 13.5H3V15.5C3 16.1 3.4 16.5 4 16.5H12C12.6 16.5 13 16.1 13 15.5V13.5H15C15.6 13.5 16 13.1 16 12.5V9.5C16 7.3 14.2 5.5 12 5.5ZM11 14.5H5V10.5H11V14.5Z"
        fill={getOptionIconFill(theme)}
      />
    </Svg>
  );
};

export const ExternalLinkSvg = ({theme}: {theme: Theme}) => {
  const fill = getOptionIconFill(theme);
  return (
    <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <Path
        d="M16 0H9.99997L12.293 2.293L7.29297 7.293L8.70697 8.707L13.707 3.707L16 6V0Z"
        fill={fill}
      />
      <Path
        d="M15 16H1C0.448 16 0 15.552 0 15V1C0 0.448 0.448 0 1 0H8V2H2V14H14V8H16V15C16 15.552 15.552 16 15 16Z"
        fill={fill}
      />
    </Svg>
  );
};

export const CloseSvg = ({theme}: {theme: Theme}) => {
  const rectColor = theme.dark ? White : '#434D5A';
  return (
    <Svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <Rect
        x="12.4141"
        y="13.4142"
        width="2"
        height="21"
        rx="1"
        transform="rotate(-45 12.4141 13.4142)"
        fill={rectColor}
      />
      <Rect
        x="13.4141"
        y="28.4142"
        width="2"
        height="21"
        rx="1"
        transform="rotate(-135 13.4141 28.4142)"
        fill={rectColor}
      />
    </Svg>
  );
};

export const AddSvg = ({theme}: {theme: Theme}) => {
  const circleColor = theme.dark ? Midnight : '#ECEFFD';
  const plusColor = theme.dark ? White : Action;
  return (
    <Svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <Circle cx="20" cy="20" r="20" fill={circleColor} />
      <Path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M29.0996 18.7H21.2996V10.9C21.2996 10.12 20.7796 9.59998 19.9996 9.59998C19.2196 9.59998 18.6996 10.12 18.6996 10.9V18.7H10.8996C10.1196 18.7 9.59961 19.22 9.59961 20C9.59961 20.78 10.1196 21.3 10.8996 21.3H18.6996V29.1C18.6996 29.88 19.2196 30.4 19.9996 30.4C20.7796 30.4 21.2996 29.88 21.2996 29.1V21.3H29.0996C29.8796 21.3 30.3996 20.78 30.3996 20C30.3996 19.22 29.8796 18.7 29.0996 18.7Z"
        fill={plusColor}
      />
    </Svg>
  );
};

export const SyncSvg = ({active, theme}: {active: boolean; theme: Theme}) => {
  const color = active || theme.dark ? White : Action;
  return (
    <Svg width="20" height="21" viewBox="0 0 20 21" fill="none">
      <G id="Group">
        <G id="Union">
          <Path
            d="M0.000140919 9.51027L0.000143251 9.50361L0 9.48493L0.000279922 9.45883C0.0119292 7.30346 0.755463 5.21536 2.10982 3.5373C3.47494 1.84589 5.37826 0.67314 7.50286 0.214316C9.62745 -0.24451 11.8451 0.0382808 13.7866 1.0156C14.8765 1.56426 15.8424 2.31323 16.6388 3.21498V2.35109C16.6388 1.69336 17.172 1.16016 17.8298 1.16016C18.4875 1.16016 19.0207 1.69336 19.0207 2.35109V6.15223C19.0207 6.52265 18.8516 6.85356 18.5863 7.07199C18.4395 7.19293 18.2631 7.27939 18.0697 7.31896C17.9922 7.33483 17.912 7.34316 17.8298 7.34316L14.0286 7.34316C13.3709 7.34316 12.8377 6.80996 12.8377 6.15223C12.8377 5.4945 13.3709 4.9613 14.0286 4.9613H14.9848C14.3635 4.21359 13.5912 3.5958 12.7108 3.15262C11.2578 2.42116 9.598 2.20951 8.0079 2.55291C6.41779 2.89631 4.99329 3.77403 3.97159 5.03993C2.94989 6.30582 2.39265 7.88351 2.39265 9.51027H2.38514C2.37166 10.1573 1.84295 10.6776 1.1927 10.6776C0.542458 10.6776 0.0136259 10.1573 0.000140919 9.51027Z"
            fill={color}
          />
          <Path
            d="M1.19106 12.6506L1.20324 12.6507H4.99222C5.64995 12.6507 6.18315 13.1839 6.18315 13.8416C6.18315 14.4993 5.64995 15.0325 4.99222 15.0325H4.01375C4.63882 15.7923 5.419 16.4195 6.30985 16.8679C7.7629 17.5994 9.42265 17.811 11.0128 17.4676C12.6029 17.1243 14.0274 16.2465 15.0491 14.9806C16.0708 13.7147 16.628 12.1371 16.628 10.5103H16.6355C16.649 9.86325 17.1777 9.34286 17.828 9.34286C18.4782 9.34286 19.0069 9.86325 19.0204 10.5103L19.0205 10.5169L19.0207 10.5356L19.0204 10.5617C19.0087 12.7171 18.2652 14.8052 16.9108 16.4833C15.5457 18.1747 13.6424 19.3474 11.5178 19.8062C9.39321 20.2651 7.17555 19.9823 5.23409 19.005C4.14423 18.4563 3.17833 17.7074 2.38199 16.8057V17.6427C2.38199 18.3004 1.84879 18.8336 1.19106 18.8336C0.533324 18.8336 0.000126115 18.3004 0.000126144 17.6427L0.00012631 13.8416C0.000126339 13.1838 0.533324 12.6506 1.19106 12.6506Z"
            fill={color}
          />
        </G>
      </G>
    </Svg>
  );
};

export const SearchSvg = ({
  active,
  theme,
}: {
  active?: boolean;
  theme: Theme;
}) => {
  const color = active || theme.dark ? White : Action;
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <G id="zoom-2">
        <G id="zoom">
          <Path
            id="Shape"
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M17.3283 15.206L23.0613 20.939L20.9393 23.061L15.2063 17.328C11.3816 20.0494 6.1094 19.3857 3.0785 15.8012C0.04759 12.2167 0.269346 6.90752 3.58862 3.58825C6.90788 0.26898 12.217 0.0472237 15.8015 3.07813C19.3861 6.10904 20.0498 11.3812 17.3283 15.206ZM10.0003 2.99998C6.13435 2.99998 3.00035 6.13399 3.00035 9.99998C3.00476 13.8641 6.13618 16.9956 10.0003 17C13.8663 17 17.0003 13.866 17.0003 9.99998C17.0003 6.13399 13.8663 2.99998 10.0003 2.99998Z"
            fill={color}
          />
        </G>
      </G>
    </Svg>
  );
};

export const InfoSvg = ({theme}: {theme: Theme}) => {
  const color = Action;
  return (
    <Svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <Circle
        cx="8.5"
        cy="8.5"
        r="7.5"
        stroke={color}
        stroke-linecap="square"
      />
      <Path
        d="M8.42498 9.99998V8.64998C9.59172 8.64998 10.6004 7.71105 10.6004 6.62498C10.6004 5.5389 9.59172 4.59998 8.42498 4.59998C7.55916 4.59998 6.7267 5.20275 6.40039 5.89665"
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Circle cx="8.29961" cy="11.9" r="0.7" fill={color} />
    </Svg>
  );
};
