/*\
 * moveicons
 *
 * the icons on the touch gamepad's special move buttons, one per kind of move.
 * they are 24x24, stroked or filled with currentColor. they are hand drawn
 * and public domain (CC0), except for two borrowed drawings:
 * - the fist of the punch_flurry and dragon icons is the one of the gamepad's
 *   attack button (touchcontroller.js)
 * - the fighter of the kick_flurry icon is "High kick" by Delapouite,
 *   https://game-icons.net/1x1/delapouite/high-kick.html, licensed under
 *   CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/), recoloured
 *   and scaled. a move's kind comes from the
 * name of the frame it enters (and, where one name means different moves, its
 * input tag), falling back to the tag alone. `for_moves` picks the icons of
 * all of a character's moves at once, so no two of them look the same.
\*/
define(function () {
  const SVG = '<svg class="touch_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'
  const FILL = 'fill="currentColor" stroke="none"'
  const FADE = 'opacity=".5"'
  function at(x, y, s, body, rot) {
    // the stroke keeps its width whatever the scale
    return '<g transform="translate(' + x + ' ' + y + ')' + (rot ? ' rotate(' + rot + ')' : '') +
      ' scale(' + s + ') translate(-12 -12)" stroke-width="' + +(1.9 / s).toFixed(2) + '">' + body + '</g>'
  }
  // the fist of the gamepad's attack button (touchcontroller.js), drawn in a
  // 1280x1028 box: fist(x, y, w) puts its top left corner at x, y, w wide
  const FIST_PATHS = '<path d="M5812 10135 c-348 -80 -650 -153 -670 -162 -94 -44 -169 -154 -286 -414 -91 -205 -119 -260 -166 -329 -112 -163 -223 -217 -431 -208 -108 5 -113 6 -444 125 -40 14 -102 27 -145 30 -73 5 -87 1 -580 -141 -278 -81 -518 -152 -535 -158 -136 -52 -232 -198 -375 -573 -122 -321 -188 -444 -284 -533 -56 -51 -111 -78 -204 -97 -92 -20 -177 -19 -350 6 -180 25 -315 23 -382 -7 -41 -19 -772 -493 -849 -551 -81 -62 -105 -200 -105 -608 -1 -354 17 -586 66 -870 16 -96 44 -185 135 -440 63 -176 157 -437 208 -580 107 -298 624 -1740 721 -2010 36 -99 156 -434 267 -745 l203 -565 39 -20 c32 -15 66 -20 165 -23 457 -14 1415 259 1465 418 3 11 -61 268 -145 582 -300 1114 -432 1606 -485 1803 -184 681 -394 1463 -397 1479 -3 17 15 24 157 57 88 21 167 38 176 38 11 1 22 -20 37 -76 11 -43 188 -692 392 -1443 204 -751 461 -1696 571 -2100 273 -1004 261 -961 283 -981 34 -33 118 -42 321 -36 639 18 1736 316 1790 486 3 10 -107 526 -245 1147 -437 1965 -780 3518 -777 3521 9 8 343 79 348 74 4 -3 21 -67 37 -141 17 -74 121 -522 232 -995 245 -1050 353 -1513 430 -1840 32 -137 109 -466 170 -730 62 -264 140 -599 174 -744 69 -298 67 -292 165 -311 173 -32 646 15 1146 115 827 166 1415 379 1415 513 0 14 -211 1083 -470 2376 -258 1294 -470 2359 -470 2368 0 11 23 21 88 36 164 38 252 55 257 51 4 -5 147 -649 800 -3594 142 -641 231 -1026 241 -1036 64 -70 395 -78 804 -18 681 99 1306 306 1385 459 12 24 9 55 -35 301 -27 151 -96 544 -155 874 -58 330 -155 877 -215 1215 -60 338 -123 694 -140 790 -17 96 -80 452 -140 790 -126 713 -139 786 -265 1500 -52 294 -104 564 -116 600 -89 279 -391 830 -623 1135 -82 108 -182 206 -236 232 l-45 22 -155 -24 c-85 -13 -375 -58 -645 -100 -269 -41 -511 -82 -537 -91 -69 -22 -148 -78 -283 -198 -144 -129 -234 -187 -352 -227 -74 -26 -100 -30 -164 -27 -141 6 -262 86 -580 387 -287 272 -400 349 -517 357 -46 3 -181 -25 -690 -141z"/><path d="M11440 6642 c0 -10 11 -79 25 -153 13 -74 60 -336 104 -584 44 -247 103 -578 131 -735 28 -157 86 -485 130 -730 44 -245 124 -698 180 -1008 55 -310 103 -587 106 -616 4 -30 1 -85 -5 -122 -45 -259 -308 -461 -794 -608 -86 -26 -662 -171 -1977 -496 -1609 -398 -1520 -375 -1546 -407 -166 -207 -281 -687 -233 -972 15 -85 52 -165 90 -192 l29 -21 393 37 c215 20 532 49 702 65 493 46 2481 225 2955 266 184 15 370 113 561 291 151 142 256 293 304 437 l26 78 39 1017 c22 559 62 1601 90 2315 28 714 49 1300 48 1301 -2 2 -284 179 -627 395 -343 216 -648 408 -677 426 -47 30 -54 32 -54 16z"/>'
  function fist(x, y, w, attrs) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + +(w / 12800).toFixed(6) + ' ' + -(w / 12800).toFixed(6) +
      ') translate(0 -10280)" ' + FILL + (attrs ? ' ' + attrs : '') + '>' + FIST_PATHS + '</g>'
  }
  const FLAME_D = 'M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 3-7 1 1 1 2 2 3 1-2 1-5 1-8z'
  const FLAME = '<path d="' + FLAME_D + '" ' + FILL + '/>'
  // a flame flying right, round head first, pointed tail trailing toward the motion lines
  const FIREBALL = at(15.5, 12, 0.85, FLAME, -90) + '<path d="M1.5 8h5M1 12h4M1.5 16h5"/>'
  // "High kick" by Delapouite, game-icons.net, CC BY 3.0: a fighter kicking
  // high to the right, in a 512x512 box
  const HIGH_KICK = '<path ' + FILL + ' d="M117.842 26.268a15.25 15.25 0 0 0-4.418.76c-5.625 1.858-10.165 7.048-12.6 15.701-2.435 8.653-2.255 20.27 1.668 32.045 3.923 11.775 10.754 21.198 17.9 26.686 7.147 5.488 13.9 6.946 19.526 5.088 5.625-1.858 10.163-7.046 12.597-15.7 2.435-8.653 2.256-20.271-1.668-32.046-3.923-11.776-10.753-21.196-17.9-26.684-5.36-4.116-10.498-5.966-15.105-5.85zm183.933 12.373c-3.461.157-6.505 1.749-8.25 5.344L279.89 68.73l-26.733 32.309s-53.832-9.528-72.039-6.863a518.655 518.655 0 0 0-11.318 1.767c-3.614 12.656-11.809 23.592-24.192 27.682-11.513 3.803-23.674.702-33.761-6.178-4.565 3.511-8.787 7.581-12.557 12.33-18.674 14.66-26.385 24.747-42.1 34.92 3.083-14.864 10.683-29.677 19.026-41.879 1.37-2.003 11.495-10.555 12.888-12.406 7.48-14.706-8.464-41.216-23.476-15.86-1.425 1.979-7.346 18.877-8.817 21.096-14.574 28.867-23.676 47.817-15.474 76.325 2.756 9.578 30.91-4.905 55.23-22.159 26.469 37.34 59.364 48.604 78.373 63.078-23.266 83.384 10.267 147.263 29.276 207.721l-29.149 36.086c-8.868 10.627 48.711 13.113 52.412.75l7.71-33.84c-28.831-90.508-3.142-157.686 17.62-207.722 55.208-59.043 115.23-82.304 168.9-128.791l45.302-9.635c10.848-19.916 10.236-29.748-13.854-30.697l-44.924 17.595c-56.586 31.807-146.01 53.348-186.496 97.99-.897-14.045-17.4-47.3-20.902-58.437 19.373 2.573 45.668 4.223 60.642-2.682 16.005-7.38 33.63-40.796 33.63-40.796l19.663-14.551c17.065-10.058-.63-27.798-12.994-27.24z"/>'
  // the wind gust of the whirlwind: lines curling into spirals
  const GUST = '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8a3 3 0 1 1-3 3"/>'
  // an archimedean spiral of 2.5 turns
  const SPIRAL = '<path stroke-width="2.3" d="' + Array.apply(null, Array(91)).map(function (_, i) {
    const t = i / 90 * 5 * Math.PI
    const r = 0.6 + 9.4 * i / 90
    return (i ? 'L' : 'M') + (12 + r * Math.cos(t)).toFixed(1) + ' ' + (12 + r * Math.sin(t)).toFixed(1)
  }).join('') + '"/>'
  // a sword pointing right: grip, guard, blade
  const SWORD = '<path d="M2.5 12h4M6.5 8v8M6.5 12h15" stroke-width="2.4"/><path d="M21.5 12l-2.5-1.6v3.2z" ' + FILL + '/>'
  const PERSON = '<circle cx="12" cy="7" r="4" ' + FILL + '/><path d="M4 22a8 7 0 0 1 16 0z" ' + FILL + '/>'
  const PLUS = '<path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" ' + FILL + '/>'
  const TELEPORT_RING = '<circle cx="12" cy="12" r="9.5" stroke-dasharray="3.5 3.5"/>'
  const ICONS = {
    fireball: FIREBALL,
    // a smaller fireball low left, a crosshair badge clear of it top right
    chase: at(11.5, 15.5, 0.75, FIREBALL) +
      '<g stroke-width="1.6"><circle cx="18.8" cy="5.2" r="3"/><path d="M18.8 .6v2.6M18.8 7.2v2.6M14.2 5.2h2.6M20.8 5.2h2.6"/></g>',
    flame: FLAME,
    // a flame running right, speed lines behind it
    // someone running, fire left on the ground behind them
    flame_run: '<circle cx="16" cy="4" r="2.3" ' + FILL + '/>' +
      '<path d="M14.5 7.5L12.5 13M14 8.5l4 2.5M14 8.5l-3.5 1.5M12.5 13l3.5 3-1 4.5M12.5 13l-2.5 3.5-3.5.5" stroke-width="2.3"/>' +
      at(4.5, 18, 0.4, FLAME) + at(9, 19.5, 0.3, FLAME),
    // a big flame with someone blown apart inside it, cut out of it
    explosion: '<path fill-rule="evenodd" ' + FILL + ' transform="translate(12 12) scale(1.3) translate(-12 -11)" d="' + FLAME_D +
      'M13.5 10.6a1.25 1.25 0 1 0-2.5 0a1.25 1.25 0 1 0 2.5 0z' +
      'M11.6 12.3L8.7 10.9 8.1 12.1 11.4 13.6V15.5L9.3 18.3 10.4 19 12.25 16.6 14.1 19 15.2 18.3 13.1 15.5V13.6L16.4 12.1 15.8 10.9 12.9 12.3z"/>',
    dash: '<path d="M9 12h12M16 6l6 6-6 6M2 7h6M2 17h6M4 12h2"/>',
    // five bullets standing side by side, the tip of each set apart from its casing
    fist: [0, 1, 2, 3, 4].map(function (i) {
      return '<g transform="translate(' + (1.4 + i * 4.6) + ' 0)" ' + FILL + '><path d="M0 7.8C0 4 1 1.6 1.6 1.6s1.6 2.4 1.6 6.2z"/><rect y="9.6" width="3.2" height="11.8" rx=".6"/></g>'
    }).join(''),
    // the neutral mark of a move with no icon of its own
    impact: '<path d="M10 3h4l-.8 11h-2.4z" ' + FILL + '/><circle cx="12" cy="19" r="2.2" ' + FILL + '/>',
    // the attack button's fist and the fading echoes of the punches before it
    punch_flurry: fist(.5, 1.5, 10, 'opacity=".45"') + fist(.5, 13.5, 10, 'opacity=".45"') + fist(7, 5.5, 16.5),
    uppercut: '<path d="M12 11V2.5M7.5 7L12 2.5 16.5 7"/><rect x="6" y="13" width="12" height="8" rx="2.5"/>',
    // the attack button's fist rising out of a trail of fire
    dragon: '<g opacity=".6">' + at(12, 12.5, 1.05, FLAME, 180) + '</g>' + fist(4.5, .5, 15),
    // up forward, then down forward: a jump in two arrows
    leap: '<path d="M2 20L10.5 5.5M6 7.6L10.5 5.5 10.9 10.5M13.5 5.5L22 20M17.5 17.9L22 20 22.4 15"/>',
    // a fighter kicking high, the kicks before it fading out under the leg
    kick_flurry: '<g transform="translate(1 -.3) scale(.0465)">' + HIGH_KICK + '</g>' +
      '<path stroke-width="2.4" d="M12.5 12.2L22.5 11" opacity=".55"/><path stroke-width="2.4" d="M12.5 12.8L21 17.5" opacity=".3"/>',
    // a tornado: swirls stacked into a funnel, wide on top, curving down to a point
    spin_kick: '<path d="' + [[12.6, 3.5, 9.5], [12, 7.4, 7.4], [11.2, 11.1, 5.4], [10.6, 14.6, 3.6], [10.4, 17.8, 2]].map(function (L) {
      return 'M' + (L[0] - L[2]) + ' ' + L[1] + 'A' + L[2] + ' 1.5 0 0 0 ' + (L[0] + L[2]) + ' ' + L[1] + 'A' + L[2] + ' 1.5 0 0 0 ' + L[0] + ' ' + (L[1] - 1.5)
    }).join('') + 'M10.4 19.3C10.6 20.6 11.2 21.6 12 22.4"/>',
    // a body flying head first, speed lines behind
    tackle: '<circle cx="19" cy="7.5" r="3" ' + FILL + '/><path d="M16.5 11L8 15.5l-3 4.5M12 13.5l-1.5 5" stroke-width="3.2"/>' +
      '<path d="M2 6h7M4 10h5M1.5 14h2.5"/>',
    // a knife: straight spine, curved cutting edge, pointed tip, bolster, riveted handle
    sword: '<path fill-rule="evenodd" ' + FILL + ' d="M2 10.2a1.5 1.5 0 0 1 1.5-1.5H8v7H3.5A1.5 1.5 0 0 1 2 14.2zM4 12.2a.8.8 0 1 0 1.6 0a.8.8 0 1 0-1.6 0zM6 12.2a.8.8 0 1 0 1.6 0a.8.8 0 1 0-1.6 0z"/>' +
      '<path d="M8.6 7.2h1.6v9.6H8.6z" ' + FILL + '/><path d="M11 8.8h10.4L23.2 10.4C21 15.8 15.5 17.2 11 16z" ' + FILL + '/>',
    // a sword swinging down along its arc
    slash_down: at(14, 15.5, 0.62, SWORD, 45) + '<path d="M4 13A10 10 0 0 1 14 3"/><path d="M2 9.5L4 13l3.5-2"/>',
    // a sword swinging up along its arc
    slash_up: at(14, 8.5, 0.62, SWORD, -45) + '<path d="M4 11A10 10 0 0 0 14 21"/><path d="M2 14.5L4 11l3.5 2"/>',
    // a sword thrusting forward, speed lines behind
    sword_dash: at(14.5, 9, 0.8, SWORD) + '<path d="M2 15h7M5 19h9M2 23h4"/>',
    whirlwind: GUST,
    heal: PLUS,
    // a person with a plus over their shoulder
    heal_self: at(10, 13, 0.85, PERSON) + at(19, 5.5, 0.42, PLUS),
    // a plus sent out to someone else
    heal_other: at(6, 7, 0.5, PLUS) + '<path d="M3 16.5h7.5M8 14l2.5 2.5L8 19"/>' + at(17.5, 13.5, 0.75, PERSON),
    // two of the same person
    clone: at(8, 11, 0.75, PERSON) + '<g ' + FADE + '>' + at(16.5, 13, 0.75, PERSON) + '</g>',
    shield: '<path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z" ' + FILL + '/>',
    teleport: TELEPORT_RING + '<circle cx="12" cy="12" r="2.5" ' + FILL + '/>',
    // to the enemy: a crosshair
    teleport_enemy: TELEPORT_RING + '<path d="M12 6v4M12 14v4M6 12h4M14 12h4"/>',
    // to a friend: a heart
    teleport_ally: TELEPORT_RING + '<path d="M12 17.5l-4.8-4.6a2.9 2.9 0 0 1 4.8-3.4 2.9 2.9 0 0 1 4.8 3.4z" ' + FILL + '/>',
    transform: '<path d="M20 12a8 8 0 0 0-14-5.3M4 4v3.5h3.5M4 12a8 8 0 0 0 14 5.3M20 20v-3.5h-3.5"/>',
    arrow: '<path d="M3 21L20 4M20 4h-6.5M20 4v6.5M3 21l4-1M3 21l1-4"/>',
    // five arrows fanning out
    arrow_fan: '<path d="M3 21L21 21M3 21L19.5 14M3 21L15 9M3 21L9 4.5M3 21L3 3"/>' +
      '<path d="M21 21l-3-2v4zM19.5 14l-3.6-.3 1.5 3.3zM15 9l-3.4 1.2 2.2 2.2zM9 4.5l-3.3 1.4 2.9 1.6zM3 3L1 6h4z" ' + FILL + '/>',
    // one big glowing arrow
    arrow_big: '<path d="M21 3l-2 9-2.7-2.7-9.8 9.8-3.6-3.6 9.8-9.8L10 3z" ' + FILL + '/>' +
      '<path d="M3.5 7.5L1.5 6M7.5 3.5L6 1.5M16.5 20.5l1.5 2M20.5 16.5l2 1.5"/>',
    note: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3" ' + FILL + '/><circle cx="17" cy="16" r="3" ' + FILL + '/>',
    // a double gust blowing forward, the one behind fading
    wave: '<g ' + FADE + '>' + at(7.5, 12, 0.66, GUST) + '</g>' + at(15.8, 12, 0.66, GUST),
    // a spiral
    grab: SPIRAL,
    cookie: '<circle cx="12" cy="12" r="9"/><path d="M9 9h.01M14.5 8.5h.01M15 14h.01M9.5 15h.01M12 12h.01" stroke-width="3"/>'
  }
  // frame names are not consistent between characters: first match wins. an
  // optional third column narrows a rule to some input tags, for frame names
  // that mean a different move depending on the input that reaches them
  const BY_NAME = [
    [/chase/i, 'chase'],
    [/biscuit/i, 'cookie'],
    [/force_field/i, 'shield'],
    [/heal_self/i, 'heal_self'],
    [/heal_other/i, 'heal_other'],
    [/heal/i, 'heal'],
    [/\+man/i, 'clone'],
    [/teleport/i, 'teleport_enemy', /^hit_D/],
    [/teleport/i, 'teleport_ally', /^hit_U/],
    [/teleport|disappear/i, 'teleport'],
    [/transform/i, 'transform'],
    [/flute/i, 'note'],
    [/\d_arrow|multi_arrow/i, 'arrow_fan'],
    [/super_arrow/i, 'arrow_big'],
    [/arrow/i, 'arrow'],
    [/catch|grab/i, 'grab'],
    [/blastpush/i, 'wave'],
    [/whirl/i, 'whirlwind'],
    [/jump_sword/i, 'slash_down', /^hit_D/],
    [/jump_sword/i, 'slash_up', /^hit_U/],
    [/dash_sword/i, 'sword_dash'],
    [/sword/i, 'sword'],
    [/explosion/i, 'explosion'],
    [/burn_run|fire_run/i, 'flame_run'],
    [/flame|burn/i, 'flame'],
    [/ball|blast/i, 'fireball'],
    [/singlong|dragon/i, 'dragon'],
    [/jumphit/i, 'leap'],
    [/uppercut/i, 'uppercut'],
    [/many_foot|\d+foot/i, 'kick_flurry'],
    [/c_foot|cleg|spin/i, 'spin_kick'],
    [/fly_crash|tackle/i, 'tackle'],
    [/foot|leg|dash|crash/i, 'dash'],
    [/many_punch/i, 'punch_flurry'],
    [/punch/i, 'fist']
  ]
  const BY_TAG = {
    hit_ja: 'fist',
    hit_Dj: 'fist',
    hit_Da: 'fist',
    hit_Fa: 'fireball',
    hit_Fj: 'dash',
    hit_Ua: 'uppercut',
    hit_Uj: 'uppercut'
  }
  // the next kind to try when a character already shows this one
  const ALT = {
    fist: ['punch_flurry', 'uppercut'],
    punch_flurry: ['fist'],
    uppercut: ['dragon', 'fist'],
    dragon: ['uppercut'],
    dash: ['tackle', 'kick_flurry'],
    tackle: ['dash'],
    kick_flurry: ['spin_kick', 'dash'],
    spin_kick: ['kick_flurry', 'dash'],
    leap: ['dash'],
    sword: ['sword_dash', 'slash_up', 'slash_down'],
    sword_dash: ['sword', 'slash_up', 'slash_down'],
    slash_up: ['slash_down', 'sword'],
    slash_down: ['slash_up', 'sword'],
    flame: ['flame_run'],
    flame_run: ['flame'],
    fireball: ['chase'],
    arrow: ['arrow_fan', 'arrow_big'],
    arrow_fan: ['arrow_big', 'arrow'],
    arrow_big: ['arrow_fan', 'arrow'],
    heal: ['heal_self', 'heal_other', 'shield'],
    heal_self: ['heal_other', 'heal'],
    heal_other: ['heal_self', 'heal'],
    teleport: ['teleport_enemy', 'teleport_ally'],
    teleport_enemy: ['teleport_ally', 'teleport'],
    teleport_ally: ['teleport_enemy', 'teleport'],
    explosion: ['flame']
  }
  // the badge a move gets when its icon is taken and no other kind is left:
  // the direction of its input in a corner, or else a number
  const BADGE = {
    D: '<path d="M19 14.5v6M16.5 18L19 20.5l2.5-2.5"/>',
    F: '<path d="M15.5 17.5h6M19 15l2.5 2.5L19 20"/>',
    U: '<path d="M19 20.5v-6M16.5 17L19 14.5l2.5 2.5"/>',
    j: '<path d="M20.5 14v3.5a2 2 0 0 1-4 0"/>'
  }
  function badged(kind, mark) {
    return at(9.5, 9.5, 0.75, ICONS[kind]) + '<circle cx="19" cy="17.5" r="5" ' + FILL + ' opacity=".35"/>' +
      (BADGE[mark] || '<text x="19" y="20.5" text-anchor="middle" font-size="9" font-weight="bold" ' + FILL + '>' + mark + '</text>')
  }
  const MOVEICONS = {}
  // the kind of icon of a move entering frame `name` through input `tag`
  MOVEICONS.kind = function (name, tag) {
    name = String(name)
    for (let i = 0; i < BY_NAME.length; i++) {
      const R = BY_NAME[i]
      if (R[0].test(name) && (!R[2] || R[2].test(tag))) { return R[1] }
    }
    return BY_TAG[tag] || 'impact'
  }
  MOVEICONS.for_move = function (name, tag) {
    return SVG + ICONS[MOVEICONS.kind(name, tag)] + '</svg>'
  }
  /*\
   * the icons of all of a character's moves, `moves` being [{name, tag}] in
   * button order. a move whose kind an earlier one already shows takes the
   * next unused kind of its ALT list, or else its icon with a direction badge:
   * a character never shows two identical icons. returns [{kind, svg}]
  \*/
  MOVEICONS.for_moves = function (moves) {
    const kinds = moves.map(function (M) { return MOVEICONS.kind(M.name, M.tag) })
    const used = {}
    const out = []
    // first come first served, but a move whose own kind is unique keeps it
    const count = {}
    kinds.forEach(function (k) { count[k] = (count[k] || 0) + 1 })
    for (let i = 0; i < moves.length; i++) {
      let kind = kinds[i]
      let svg = null
      if (used[kind]) {
        const alt = (ALT[kind] || []).filter(function (k) { return !used[k] && !count[k] })
        if (alt.length) {
          kind = alt[0]
        } else {
          // hit_Fa -> F, hit_ja -> j
          let mark = String(moves[i].tag).charAt(4)
          for (let n = 2; used[kind + '#' + mark]; n++) { mark = String(n) }
          svg = badged(kind, mark)
          kind = kind + '#' + mark
        }
      }
      used[kind] = true
      out.push({ kind: kind, svg: SVG + (svg || ICONS[kind]) + '</svg>' })
    }
    return out
  }
  return MOVEICONS
})
