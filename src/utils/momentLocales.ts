import moment from 'moment';
// Month names for the languages the app ships translations for, instead of
// every locale moment has (moment/min/locales, ~440 KB).
import 'moment/locale/de';
import 'moment/locale/es';
import 'moment/locale/fr';
import 'moment/locale/ja';
import 'moment/locale/nl';
import 'moment/locale/pt';
import 'moment/locale/ru';
import 'moment/locale/zh-cn';

// Registering a locale also switches moment's global locale to it, so put
// the global back to English, as moment/min/locales does.
moment.locale('en');
