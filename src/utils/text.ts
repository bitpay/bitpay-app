export const arrayToSentence = (arr: string[]) => {
  if (!arr || arr.length < 1) {
    return '';
  }

  if (arr.length === 1) {
    return arr[0];
  }

  if (arr.length === 2) {
    return arr.join(' and ');
  }

  return arr.slice(0, -1).join(', ') + ', and ' + arr.slice(-1);
};
