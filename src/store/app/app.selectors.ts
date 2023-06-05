import {createSelector} from 'reselect';
import {AppSelector} from '..';

export const selectNotificationsAccepted: AppSelector<boolean> = ({APP}) =>
  APP.notificationsAccepted;

export const selectConfirmedTxAccepted: AppSelector<boolean> = ({APP}) =>
  APP.confirmedTxAccepted;

export const selectAnnouncementsAccepted: AppSelector<boolean> = ({APP}) =>
  APP.announcementsAccepted;

export const selectSettingsNotificationState = createSelector(
  [
    selectNotificationsAccepted,
    selectConfirmedTxAccepted,
    selectAnnouncementsAccepted,
  ],
  (notificationsAccepted, confirmedTxAccepted, announcementsAccepted) => {
    return {
      pushNotifications: notificationsAccepted,
      confirmedTx: confirmedTxAccepted,
      announcements: announcementsAccepted,
    };
  },
);
