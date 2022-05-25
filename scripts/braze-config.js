const fs = require('fs');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

readline.question(
  'Which platform? (ios, android or enter to cancel): ',
  entry => {
    if (!['ios', 'android'].includes(entry)) {
      readline.close();
      return;
    }
    readline.question('Enter Braze key: ', key => {
      let content;
      const platform = entry.toUpperCase();
      if (platform === 'ANDROID') {
        const file = `${__dirname}/../android/app/src/main/res/values/braze.xml`;
        content = fs.readFileSync(file, 'utf8');
        readline.question('Enter Braze endpoint: ', endpoint => {
          readline.question('Enter fcm senderId: ', senderId => {
            content = content.replace('BRAZE_API_KEY_REPLACE_ME', key);
            content = content.replace(
              'BRAZE_API_ENDPOINT_REPLACE_ME',
              endpoint,
            );
            content = content.replace('BRAZE_SENDER_ID_REPLACE_ME', senderId);
            fs.writeFileSync(file, content);
            console.log(`Braze config successfully updated for ${platform}`);
            readline.close();
          });
        });
      } else {
        const file = `${__dirname}/../ios/BitPayApp/AppDelegate.m`;
        content = fs.readFileSync(file, 'utf8');
        content = content.replace('BRAZE_API_KEY_REPLACE_ME', key);
        fs.writeFileSync(file, content);
        console.log(`Braze config successfully updated for ${platform}`);
        readline.close();
      }
    });
  },
);
