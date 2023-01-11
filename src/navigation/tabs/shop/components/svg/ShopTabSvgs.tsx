import React from 'react';
import {Theme} from '@react-navigation/native';
import Svg, {Path, Rect} from 'react-native-svg';
import {Action, White} from '../../../../../styles/colors';

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
