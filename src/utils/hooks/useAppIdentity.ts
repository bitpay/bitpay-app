import BitAuth from 'bitauth';
import {useDispatch, useSelector} from 'react-redux';
import {useLogger} from '.';
import {RootState} from '../../store';
import {AppActions} from '../../store/app';
import {AppIdentity} from '../../store/app/app.models';

const useAppIdentity = (): {identity?: AppIdentity; error?: any} => {
  const dispatch = useDispatch();
  const logger = useLogger();
  const {APP} = useSelector((root: RootState) => root);

  let identity = APP.identity[APP.network];

  if (!identity || !Object.keys(identity).length || !identity.priv) {
    try {
      logger.info('Generating new App Identity...');
      identity = BitAuth.generateSin();
    } catch (error) {
      logger.error('Error generating App Identity: ' + JSON.stringify(error));
      return {error};
    }

    dispatch(AppActions.successGenerateAppIdentity(APP.network, identity));
  }

  return {identity};
};

export default useAppIdentity;
