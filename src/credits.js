import { t } from './i18n.js';

export const MADE_BY = 'YOUR NAME HERE';


export function creditLines(lost) {
  return [
    t('credits.title'), '', '', '',
    t('credits.lot'),
    [t('credits.wife'), t('credits.wifeSalt')],
    t('credits.d1'),
    t('credits.d2'),
    t('credits.angels'),
    t('credits.fire'), '', '', '',
    t('credits.by'),
  ];
}
