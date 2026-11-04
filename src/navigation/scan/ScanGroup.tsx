import React from 'react';
import {Theme} from '@react-navigation/native';
import ScanRoot from './screens/Scan';
import {Root} from '../../Root';
import {useStackScreenOptions} from '../utils/headerHelpers';

interface ScanProps {
  Scan: typeof Root;
  theme: Theme;
}
export enum ScanScreens {
  // eslint-disable-next-line @typescript-eslint/no-shadow -- enum member name is public API (ScanScreens.Root); it does not reference the imported Root
  Root = 'ScanRoot',
}

export type ScanGroupParamList = {
  ScanRoot: {onScanComplete?: (data: string) => void} | undefined;
};

const ScanGroup = ({Scan, theme}: ScanProps) => {
  const commonOptions = useStackScreenOptions(theme);
  return (
    <Scan.Group screenOptions={commonOptions}>
      <Scan.Screen name={ScanScreens.Root} component={ScanRoot} />
    </Scan.Group>
  );
};

export default ScanGroup;
