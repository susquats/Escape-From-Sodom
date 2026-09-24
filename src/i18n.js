// Text for the two languages. t(key, { name }) looks a string up in the current language; the choice is made
// on the title screen and remembered in localStorage.
const STR = {
  en: {
    pageTitle: 'SODOM',
    rotate: 'Turn your phone sideways',
    'title.logoTop': 'ESCAPE FROM', 'title.logo': 'SODOM',
    'title.press': 'PRESS SPACE TO PLAY', 'title.tap': 'TAP TO PLAY',
    'btn.jump': 'JUMP',

    'act1': 'ACT I\nSODOM', 'act2': 'ACT II\nTHE ANGELS', 'act3': 'ACT III\nTHE MOUNTAIN',
    'hint.sodomKeys': '← → move   SPACE jump   R restart', 'hint.sodomTouch': 'Buttons to move & jump',
    'hint.sodomGoal': 'Stomp Sodomites. Touch salt to rescue!',
    'hint.flap': 'TAP or SPACE to flap',
    'hint.steerKeys': '← → steer', 'hint.steerTouch': 'Buttons to steer',

    'name.wife': 'Wife', 'name.daughter1': 'Daughter 1', 'name.daughter2': 'Daughter 2',
    'life.lost': '{name} is lost.',
    'life.salt': '{name} turns to salt!\nTouch the salt to rescue.',
    'life.fell': 'Lost!',
    'life.gameOver': 'GAME OVER\nThe family is gone. Starting over.',
    'life.gameOverCp': 'GAME OVER\nThe family is gone. Back to the checkpoint.',

    'pop.checkpoint': 'CHECKPOINT', 'pop.squish': 'SQUISH!', 'pop.bonk': 'BONK!', 'pop.pfft': 'PFFT!',
    'pop.saved': 'SAVED!', 'pop.lost': 'LOST!', 'pop.hallelujah': 'HALLELUJAH!', 'pop.thud': 'THUD!',
    'pop.aaah': 'AAAAH!',

    'say.flee': 'FLEE!', 'say.dontLook': "Don't look back!", 'say.noWay': 'There is no way across...',
    'say.family': 'My family is alive!', 'say.alive': 'They live! Praise the Lord!', 'say.mother': 'Mother...', 'say.cannotStay': 'We cannot stay.',
    'say.run': 'We must run to the mountain.', 'say.rest': "Let's get some rest in the cave.",
    'wife.caption': 'Your wife looked back, and became a pillar of salt.',

    'credits.title': 'SODOM', 'credits.by': 'A GENESIS 19 PRODUCTION',
    'credits.lot': ['LOT', 'HIMSELF'],
    'credits.wife': "LOT'S WIFE", 'credits.wifeSalt': 'A PILLAR OF SALT', 'credits.wifeAlive': 'HERSELF (SOMEHOW)',
    'credits.d1': ['DAUGHTER 1', 'DAUGHTER 1'], 'credits.d2': ['DAUGHTER 2', 'DAUGHTER 2'],
    'credits.angels': ['TWO ANGELS', 'TWO ANGELS'], 'credits.sodomites': ['SODOMITES', 'VARIOUS'],
    'credits.fire': ['FIRE AND SULFUR', 'THE LORD'], 'credits.salt': ['SALT', 'TABLE SALT'],
    'credits.spared1': 'NO CITIES WERE SPARED', 'credits.spared2': 'IN THE MAKING OF THIS GAME',
    'credits.madeBy': 'MADE FOR FRIENDS BY {name}',
    'rating.0': 'ALONE IN A CAVE', 'rating.1': 'A SMALL FAMILY', 'rating.2': 'MOSTLY FAMILY', 'rating.3': 'THE WHOLE CLAN',
    'card.saved': 'FAMILY SAVED: {n}/3', 'card.thanks': 'THANKS FOR PLAYING',
    'card.again': 'SPACE TO PLAY AGAIN', 'card.againTouch': 'TAP TO PLAY AGAIN',
  },
  es: {
    pageTitle: 'SODOMA',
    rotate: 'Gira tu teléfono horizontalmente',
    'title.logoTop': 'ESCAPA DE', 'title.logo': 'SODOMA',
    'title.press': 'PRESIONA ESPACIO PARA JUGAR', 'title.tap': 'TOCA PARA JUGAR',
    'btn.jump': 'SALTAR',

    'act1': 'ACTO I\nSODOMA', 'act2': 'ACTO II\nLOS ÁNGELES', 'act3': 'ACTO III\nLA MONTAÑA',
    'hint.sodomKeys': '← → mover   ESPACIO saltar   R reiniciar', 'hint.sodomTouch': 'Botones para moverte y saltar',
    'hint.sodomGoal': '¡Pisa a los sodomitas! ¡Toca la sal para rescatar!',
    'hint.flap': 'TOCA o ESPACIO para aletear',
    'hint.steerKeys': '← → guiar', 'hint.steerTouch': 'Botones para guiar',

    'name.wife': 'Tu esposa', 'name.daughter1': 'Tu hija 1', 'name.daughter2': 'Tu hija 2',
    'life.lost': '{name} murió.',
    'life.salt': '¡{name} se convierte en sal!\nToca la sal para rescatarla.',
    'life.fell': '¡Muerte!',
    'life.gameOver': 'FIN DEL JUEGO\nLa familia se ha ido. Empezando de nuevo.',
    'life.gameOverCp': 'FIN DEL JUEGO\nLa familia se ha ido. Volviendo al punto de control.',

    'pop.checkpoint': 'PUNTO DE CONTROL', 'pop.squish': '¡PLAF!', 'pop.bonk': '¡TOC!', 'pop.pfft': '¡PUF!',
    'pop.saved': '¡RESCATADA!', 'pop.lost': '¡MUERTE!', 'pop.hallelujah': '¡ALELUYA!', 'pop.thud': '¡PUM!',
    'pop.aaah': '¡AAAAH!',

    'say.flee': '¡HUYAN!', 'say.dontLook': '¡No miren atrás!', 'say.noWay': 'No hay forma de cruzar...',
    'say.family': '¡Mi familia está viva!', 'say.alive': '¡Viven! ¡Alabado sea el Señor!', 'say.mother': 'Madre...', 'say.cannotStay': 'No podemos quedarnos.',
    'say.run': 'Debemos correr a la montaña.', 'say.rest': 'Descansemos en la cueva.',
    'wife.caption': 'Tu esposa miró atrás y se convirtió en un pilar de sal.',

    'credits.title': 'SODOMA', 'credits.by': 'UNA PRODUCCIÓN DEL GÉNESIS 19',
    'credits.lot': ['LOT', 'ÉL MISMO'],
    'credits.wife': 'TU ESPOSA', 'credits.wifeSalt': 'UN PILAR DE SAL', 'credits.wifeAlive': 'ELLA MISMA (DE ALGÚN MODO)',
    'credits.d1': ['TU HIJA 1', 'TU HIJA 1'], 'credits.d2': ['TU HIJA 2', 'TU HIJA 2'],
    'credits.angels': ['DOS ÁNGELES', 'DOS ÁNGELES'], 'credits.sodomites': ['SODOMITAS', 'VARIOS'],
    'credits.fire': ['FUEGO Y AZUFRE', 'EL SEÑOR'], 'credits.salt': ['SAL', 'SAL DE MESA'],
    'credits.spared1': 'NO SE PERDONÓ NINGUNA CIUDAD', 'credits.spared2': 'DURANTE LA CREACIÓN DE ESTE JUEGO',
    'credits.madeBy': 'HECHO PARA AMIGOS POR {name}',
    'rating.0': 'SOLO EN UNA CUEVA', 'rating.1': 'UNA FAMILIA PEQUEÑA', 'rating.2': 'CASI TODA LA FAMILIA', 'rating.3': 'TODO EL CLAN',
    'card.saved': 'FAMILIA SALVADA: {n}/3', 'card.thanks': 'GRACIAS POR JUGAR',
    'card.again': 'ESPACIO PARA JUGAR DE NUEVO', 'card.againTouch': 'TOCA PARA JUGAR DE NUEVO',
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
