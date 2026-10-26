import RNFS from 'react-native-fs';

// Cache storage keeps these backups outside iCloud/Android Auto Backup.
export const modernBackupDirectory =
  RNFS.CachesDirectoryPath + '/bitpay/redux-v2';
const main = modernBackupDirectory + '/persist-root.json';
export const modernFiles = {main, bak: main + '.bak', temp: main + '.tmp'};
