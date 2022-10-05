import {BRAZE_EXPORT_API_KEY, BRAZE_REST_API_ENDPOINT} from '@env';
import axios from 'axios';
import {getDeviceId} from './getDeviceId';

interface BrazeUser {
  braze_id?: string;
  external_id?: string;
}
interface BrazeExportUserDataResponse {
  users: BrazeUser[];
}

/**
 * Pings the Braze REST API for user data for the current deviceId and returns the brazeId if an anonymous user exists.
 * Normally when a user logs in, we pass an external_id (EID, assigned from BitPay) to Segment so it knows with which user to associate the data.
 * Anonymous users by definition don't have an assigned EID so we need to query for Braze's underlying brazeId to pass to Segment.
 *
 * @returns The brazeId for the current anonymous user, or undefined if all users are identified.
 */
export const getBrazeIdForAnonymousUser = async () => {
  const deviceId = await getDeviceId();

  const reqUrl = `https://${BRAZE_REST_API_ENDPOINT}/users/export/ids`;
  const reqData = {
    device_id: deviceId,
    fields_to_export: ['braze_id', 'external_id'],
  };
  const reqConfig = {
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${BRAZE_EXPORT_API_KEY}`,
    },
  };

  return axios
    .post<BrazeExportUserDataResponse>(reqUrl, reqData, reqConfig)
    .then(res => {
      const users = res.data.users;

      // multiple users could've been identified (logged in) on the same device install
      const anonUser = users.find(u => {
        // external_id should only exist for identified users, if no external_id exists, this should be our anonymous user
        return !u.external_id;
      });

      // it's possible all users using the device_id are identified, so there is no anonymous user
      return anonUser?.braze_id || undefined;
    })
    .catch(err => {
      console.log('An error occurred while exporting user data from Braze.');
      console.log(JSON.stringify(err));
      return undefined;
    });
};
