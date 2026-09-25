// Text for the two languages. t(key, { name }) looks a string up in the current language; the choice is made
// on the title screen and remembered in localStorage.
const STR = {
  en: {
    pageTitle: 'SODOM',
    rotate: 'Turn your phone sideways',
    'title.logoTop': 'ESCAPE FROM', 'title.logo': 'SODOM',
    'title.press': 'PRESS SPACE TO PLAY', 'title.tap': 'TAP TO PLAY',
    'btn.jump': 'JUMP', 'btn.paused': 'PAUSED', 'btn.resume': 'Tap to resume',

    'act1': 'ACT I\nSODOM', 'act2': 'ACT II\nTHE ANGELS', 'act3': 'ACT III\nTHE MOUNTAIN',
    'hint.sodomKeys': '← → move   SPACE jump   R restart', 'hint.sodomTouch': 'Buttons to move & jump',
    'hint.sodomGoal': 'Stomp Sodomites. Touch salt to rescue!',
    'hint.flap': 'TAP or SPACE to flap',
    'hint.steerKeys': '← → steer', 'hint.steerTouch': 'Buttons to steer',

    'name.wife': 'Wife', 'name.daughter1': 'Daughter 1', 'name.daughter2': 'Daughter 2',
    'gone.wife': 'Your wife is gone.', 'gone.daughter1': 'Your daughter is gone.', 'gone.daughter2': 'Your other daughter is gone.',
    'life.salt': '{name} turns to salt!\nTouch the salt to rescue.',
    'life.fell': 'Lost!',
    'life.gameOver': 'GAME OVER\nThe family is gone. Starting over.',
    'life.gameOverCp': 'GAME OVER\nThe family is gone. Back to the checkpoint.',

    'pop.checkpoint': 'CHECKPOINT', 'pop.squish': 'SQUISH!', 'pop.bonk': 'BONK!', 'pop.pfft': 'PFFT!',
    'pop.saved': 'SAVED!', 'pop.lost': 'LOST!', 'pop.hallelujah': 'HALLELUJAH!', 'pop.thud': 'THUD!',
    'pop.aaah': 'AAAAH!',

    'say.flee': 'FLEE!', 'say.dontLook': "Don't look back!", 'say.noWay': 'There is no way across...',
    'say.family': 'My family is alive!', 'say.alive': 'They live! Praise the Lord!', 'say.mother': 'Mother...', 'say.cannotStay': 'We cannot stay.',
    'say.run': 'We must run to the mountain.', 'say.cheer': 'Yes! We made it!', 'say.rest': "Let's get some rest in that cave.",
    'wife.caption': 'Your wife looked back, and became a pillar of salt.',

    'credits.title': 'ESCAPE FROM SODOM', 'credits.by': 'A GENESIS 19 PRODUCTION',
    'credits.lot': ['LOT', 'HIMSELF'],
    'credits.wife': "LOT'S WIFE", 'credits.wifeSalt': 'SODIUM CHLORIDE', 'credits.wifeAlive': 'SODIUM CHLORIDE',
    'credits.d1': ['DAUGHTER 1', 'DAUGHTER 2'], 'credits.d2': ['DAUGHTER 2', 'DAUGHTER 1'],
    'credits.angels': ['TWO ANGELS', 'GABRIEL AND MICHAEL'],
    'credits.fire': ['FIRE AND SULFUR', 'YAHWEH'],
    'credits.spared1': 'NO CITIES WERE SPARED', 'credits.spared2': 'IN THE MAKING OF THIS GAME',
    'card.again': 'SPACE: PLAY AGAIN', 'card.menu': 'ESC: MAIN MENU',
    'card.againTouch': 'PLAY AGAIN', 'card.menuTouch': 'MAIN MENU',
  },
  es: {
    pageTitle: 'SODOMA',
    rotate: 'Gira tu teléfono horizontalmente',
    'title.logoTop': 'ESCAPA DE', 'title.logo': 'SODOMA',
    'title.press': 'PRESIONA ESPACIO PARA JUGAR', 'title.tap': 'TOCA PARA JUGAR',
    'btn.jump': 'SALTAR', 'btn.paused': 'PAUSA', 'btn.resume': 'Toca para continuar',

    'act1': 'ACTO I\nSODOMA', 'act2': 'ACTO II\nLOS ÁNGELES', 'act3': 'ACTO III\nLA MONTAÑA',
    'hint.sodomKeys': '← → mover   ESPACIO saltar   R reiniciar', 'hint.sodomTouch': 'Botones para moverte y saltar',
    'hint.sodomGoal': '¡Pisa a los sodomitas! ¡Toca la sal para rescatar!',
    'hint.flap': 'TOCA o ESPACIO para aletear',
    'hint.steerKeys': '← → guiar', 'hint.steerTouch': 'Botones para guiar',

    'name.wife': 'Tu esposa', 'name.daughter1': 'Tu hija 1', 'name.daughter2': 'Tu hija 2',
    'gone.wife': 'Tu esposa ya no está.', 'gone.daughter1': 'Tu hija ya no está.', 'gone.daughter2': 'Tu otra hija ya no está.',
    'life.salt': '¡{name} se convierte en sal!\nToca la sal para rescatarla.',
    'life.fell': '¡Muerte!',
    'life.gameOver': 'FIN DEL JUEGO\nLa familia se ha ido. Empezando de nuevo.',
    'life.gameOverCp': 'FIN DEL JUEGO\nLa familia se ha ido. Volviendo al punto de control.',

    'pop.checkpoint': 'PUNTO DE CONTROL', 'pop.squish': '¡PLAF!', 'pop.bonk': '¡TOC!', 'pop.pfft': '¡PUF!',
    'pop.saved': '¡RESCATADA!', 'pop.lost': '¡MUERTE!', 'pop.hallelujah': '¡ALELUYA!', 'pop.thud': '¡PUM!',
    'pop.aaah': '¡AAAAH!',

    'say.flee': '¡HUYAN!', 'say.dontLook': '¡No miren atrás!', 'say.noWay': 'No hay forma de cruzar...',
    'say.family': '¡Mi familia está viva!', 'say.alive': '¡Viven! ¡Alabado sea el Señor!', 'say.mother': 'Madre...', 'say.cannotStay': 'No podemos quedarnos.',
    'say.run': 'Debemos correr a la montaña.', 'say.cheer': '¡Sí! ¡Lo logramos!', 'say.rest': 'Descansemos en aquella cueva.',
    'wife.caption': 'Tu esposa miró atrás y se convirtió en un pilar de sal.',

    'credits.title': 'ESCAPA DE SODOMA', 'credits.by': 'PRODUCCIÓN DE GÉNESIS 19',
    'credits.lot': ['LOT', 'ÉL MISMO'],
    'credits.wife': 'ESPOSA', 'credits.wifeSalt': 'CLORURO DE SODIO', 'credits.wifeAlive': 'CLORURO DE SODIO',
    'credits.d1': ['HIJA 1', 'HIJA 2'], 'credits.d2': ['HIJA 2', 'HIJA 1'],
    'credits.angels': ['DOS ÁNGELES', 'GABRIEL Y MIGUEL'],
    'credits.fire': ['FUEGO Y AZUFRE', 'YAHVÉ'],
    'credits.spared1': 'NO SE PERDONÓ NINGUNA CIUDAD', 'credits.spared2': 'DURANTE LA CREACIÓN DE ESTE JUEGO',
    'card.again': 'ESPACIO: JUGAR DE NUEVO', 'card.menu': 'ESC: MENÚ PRINCIPAL',
    'card.againTouch': 'JUGAR DE NUEVO', 'card.menuTouch': 'MENÚ PRINCIPAL',
  },
};

export const LANGS = ['en', 'es'];
const KEY = 'sodom-lang';
let lang = 'en';
try {
  const saved = localStorage.getItem(KEY);
  if (LANGS.includes(saved)) lang = saved;
} catch { /* storage unavailable: stay on English */ }

function applyToPage() {
  document.documentElement.lang = lang;
  document.title = STR[lang].pageTitle;
  const hint = document.getElementById('rotate-hint');
  if (hint) hint.textContent = STR[lang].rotate;
}
applyToPage();

export const getLang = () => lang;
export function setLang(l) {
  if (!LANGS.includes(l)) return;
  lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  applyToPage();
}

// t() in an explicit language (e.g. to build both title logos up front)
export const tIn = (key, l) => STR[l][key];

export function t(key, vars = {}) {
  const s = STR[lang][key] ?? STR.en[key] ?? key;
  return typeof s === 'string' ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : s;
}
