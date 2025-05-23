import React from 'react';
import ScanRoot from './screens/Scan';
import {Root} from '../../Root';
import {baseNavigatorOptions} from '../../constants/NavigationOptions';
import HeaderBackButton from '../../components/back/HeaderBackButton';

interface ScanProps {
  Scan: typeof Root;
}
export enum ScanScreens {
  Root = 'ScanRoot',
}

export type ScanGroupParamList = {
  ScanRoot: {onScanComplete?: (data: string) => void} | undefined;
};

const ScanGroup: React.FC<ScanProps> = ({Scan}) => {
  return (
    <Scan.Group
      screenOptions={() => ({
        ...baseNavigatorOptions,
        headerLeft: () => <HeaderBackButton />,
      })}>
      <Scan.Screen name={ScanScreens.Root} component={ScanRoot} />
    </Scan.Group>
  );
};

export default ScanGroup;
