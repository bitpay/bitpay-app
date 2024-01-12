import moment from 'moment';

export const WithinSameMonth = (time1: number, time2: number): boolean => {
  if (!time1 || !time2) {
    return false;
  }
  const date1 = new Date(time1);
  const date2 = new Date(time2);
  return GetMonthYear(date1) === GetMonthYear(date2);
};

export const WithinSameMonthTimestamp = (
  time1: string,
  time2: string,
): boolean => {
  if (!time1 || !time2) {
    return false;
  }
  const _date1 = Date.parse(time1);
  const _date2 = Date.parse(time2);
  return WithinSameMonth(_date1, _date2);
};

export const GetMonthYear = (date: Date): string => {
  return `${date.getMonth()}-${date.getFullYear()}`;
};

export const WithinPastDay = (time: number): boolean => {
  const now = new Date();
  const date = new Date(time);
  return now.getTime() - date.getTime() < 1000 * 60 * 60 * 24;
};

export const IsDateInCurrentMonth = (time: number): boolean => {
  const now = new Date();
  const date = new Date(time);
  return GetMonthYear(now) === GetMonthYear(date);
};

export const GetAmFormatDate = (time: number) => {
  return moment(time).format('MM/DD/YYYY hh:mm a');
};

export const GetAmTimeAgo = (time: number) => {
  return moment(time).fromNow();
};
