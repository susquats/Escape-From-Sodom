import { t } from './i18n.js';

export const MADE_BY = 'YOUR NAME HERE';

const DOTS = 19;
const row = ([label, value]) => `${label} ${'.'.repeat(Math.max(2, DOTS - label.length))} ${value}`;

export function creditLines(lost) {
  return [
    t('credits.title'), '', t('credits.by'), '', '',
    row(t('credits.lot')),
    row([t('credits.wife'), lost.has('wife') ? t('credits.wifeSalt') : t('credits.wifeAlive')]),
    row(t('credits.d1')),
    row(t('credits.d2')),
    row(t('credits.angels')),
    row(t('credits.sodomites')),
    row(t('credits.fire')),
    row(t('credits.salt')), '', '',
    t('credits.spared1'), t('credits.spared2'), '', '',
    t('credits.madeBy', { name: MADE_BY }),
  ];
}
