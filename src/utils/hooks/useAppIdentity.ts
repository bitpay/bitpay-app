import BitAuth from 'bitauth';
import {useDispatch, useSelector} from 'react-redux';
import {useLogger} from '.';
import {Network} from '../../constants';
import {RootState} from '../../store';
import {AppActions} from '../../store/app';
import {AppIdentity} from '../../store/app/app.models';

const useAppIdentity = (
  network?: Network,
): {identity?: AppIdentity; error?: any} => {
  const dispatch = useDispatch();
  const logger = useLogger();
  const appNetwork = useSelector(({APP}: RootState) => APP.network);
  const _network = network || (appNetwork as Network);

  let identity = useSelector(({APP}: RootState) => APP.identity[_network]);

  if (!identity || !Object.keys(identity).length || !identity.priv) {
    try {
      identity = BitAuth.generateSin();
    } catch (error) {
      logger.error('Error generating App Identity: ' + JSON.stringify(error));
      return {error};
    }

    dispatch(AppActions.successGenerateAppIdentity(_network, identity));
  }

  return {identity};
};

export default useAppIdentity;
