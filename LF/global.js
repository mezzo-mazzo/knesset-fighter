/*\
 * global.js
 *
 * global constants of a game
 *
 * note to data changers: tweak entries in this file very carefully. do not add or delete entries.
\*/
define(['LF/util'], function (util) {
  const G = {}

  G.application = {}
  const GA = G.application
  GA.window = {}
  GA.window.width = 1588 // 2x port: 794 -> 1588
  GA.window.outer_width = 1608 // 2x port: 804 -> 1608
  GA.window.wide_width = 2000 // 2x port: 1000 -> 2000
  GA.window.height = 1100 // 2x port: 550 -> 1100
  GA.window.outer_height = 1180 // 2x port: 590 -> 1180
  GA.viewer = {}
  GA.viewer.height = 800 // 2x port: 400 -> 800
  GA.camera = {}
  GA.camera.speed_factor = 1 / 18

  /*\
   * global.combo_list
   [ property ]
   * list of combos
   | { name:'DvA', seq:['def','down','att']} //example
  \*/
  G.combo_list = [
    { name: 'D<A', seq: ['def', 'left', 'att'], clear_on_combo: false },
    { name: 'D>A', seq: ['def', 'right', 'att'], clear_on_combo: false },
    { name: 'DvA', seq: ['def', 'down', 'att'] },
    { name: 'D^A', seq: ['def', 'up', 'att'] },
    { name: 'D<J', seq: ['def', 'left', 'jump'] },
    { name: 'D>J', seq: ['def', 'right', 'jump'] },
    { name: 'DvJ', seq: ['def', 'down', 'jump'] },
    { name: 'D^J', seq: ['def', 'up', 'jump'] },
    { name: 'D<AJ', seq: ['def', 'left', 'att', 'jump'] },
    { name: 'D>AJ', seq: ['def', 'right', 'att', 'jump'] },
    { name: 'DJA', seq: ['def', 'jump', 'att'] }
  ]
  G.combo_tag =
  { // look up from combo name to tag name
    def: 'hit_d',
    jump: 'hit_j',
    att: 'hit_a',
    'D<A': 'hit_Fa',
    'D>A': 'hit_Fa',
    DvA: 'hit_Da',
    'D^A': 'hit_Ua',
    'D<J': 'hit_Fj',
    'D>J': 'hit_Fj',
    DvJ: 'hit_Dj',
    'D^J': 'hit_Uj',
    'D<AJ': 'hit_Fj',
    'D>AJ': 'hit_Fj',
    DJA: 'hit_ja'
  }
  G.combo_dir =
  {
    'D<A': 'left',
    'D>A': 'right',
    'D<J': 'left',
    'D>J': 'right',
    'D<AJ': 'left',
    'D>AJ': 'right'
  }
  G.combo_priority =
  { // larger number is higher priority
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    def: 0,
    jump: 0,
    att: 0,
    run: 0,
    'D>A': 1,
    'D<A': 1,
    DvA: 1,
    'D^A': 1,
    DvJ: 1,
    'D^J': 1,
    'D>J': 1,
    'D<J': 1,
    'D<AJ': 1,
    'D>AJ': 1,
    DJA: 1
  }

  G.gameplay = {}
  const GC = G.gameplay
  GC.framerate = 30

  /*\
   * global.gameplay.default
   [ property ]
   * What are the defaults?
   *
   * default means `otherwise specified`. all defaults get overridden, and (mostly) you can set the specific property in data files. so it might not be meaningful to change default values.
   * if any of them cannot be overridden, please move them out of default.
  \*/
  GC.default = {}
  GC.default.health = {}
  GC.default.health.hp_full = 500
  GC.default.health.mp_full = 500
  GC.default.health.mp_start = 200 // it cannot be overriden

  GC.default.itr = {}
  GC.default.itr.zwidth = 24 // default itr zwidth; 2x port: 12 -> 24
  GC.default.itr.hit_stop = 3 // default stall when hit somebody
  GC.default.itr.throw_injury = 10

  GC.default.cpoint = {}
  GC.default.cpoint.hurtable = 0 // default cpoint hurtable
  GC.default.cpoint.cover = 0 // default cpoint cover
  GC.default.cpoint.vaction = 135 // default frame being thrown

  GC.default.wpoint = {}
  GC.default.wpoint.cover = 0

  GC.default.effect = {}
  GC.default.effect.num = 0 // default effect num

  GC.default.fall = {}
  GC.default.fall.value = 20 // default fall
  GC.default.fall.dvy = -13.8 // default dvy when falling; 2x port: -6.9 -> -13.8

  GC.default.weapon = {}
  GC.default.weapon.vrest = 9 // default weapon vrest

  GC.default.character = {}
  GC.default.character.arest = 7 // default character arest

  GC.default.machanics = {}
  GC.default.machanics.mass = 1 // default mass; weight = mass * gravity

  /*\
   * global.gameplay
   [ property ]
   * gameplay constants
   *
   * these are defined constants over the game, tweak them carefully otherwise it might introduce bugs
  \*/

  GC.recover = {}
  GC.recover.fall = -0.45 // fall recover constant
  GC.recover.bdefend = -0.5 // bdefend recover constant

  GC.effect = {}
  GC.effect.num_to_id = 300 // convert effect num to id
  GC.effect.duration = 3 // default effect lasting duration
  GC.effect.heal_max = 100 // the max hp that can be recovered by healing effects
  GC.effect.disappear = {
    shadow_blink: 120,
    body_blink: 150,
  }

  GC.character = {}
  GC.character.bounceup = {} // bounce up during fall
  GC.character.bounceup.limit = {}
  GC.character.bounceup.limit.xy = 26.8 // defined speed threshold to bounce up again; 2x port: 13.4 -> 26.8
  GC.character.bounceup.limit.y = 22 // y threshold; will bounce if any one of xy,y is overed; 2x port: 11 -> 22
  GC.character.bounceup.y = 8.5 // defined bounce up speed; 2x port: 4.25 -> 8.5
  GC.character.bounceup.absorb = // how much dvx to absorb when bounce up
  { // 2x port: keys (speed) and values (absorb amount) both doubled
    18: 2,
    28: 8,
    40: 20,
    80: 40,
    120: 60
  }

  GC.defend = {}
  GC.defend.injury = {}
  GC.defend.injury.factor = 0.1 // defined defend injury factor; meaning only that portion of injury will be done for an effective defence
  GC.defend.break_limit = 40 // defined defend break
  GC.defend.absorb = // how much dvx to absorb when defence is broken
  { // look up table; 2x port: keys (speed) and values (absorb amount) both doubled
    10: 0,
    30: 10
  }

  GC.fall = {}
  GC.fall.KO = 60 // defined KO
  GC.fall.wait180 = // the wait of 180 depends on effect.dvy
  // meaing the stronger the dvy, the longer it waits
  { // lookup; 2x port: keys (dvy, spatial) doubled, values (wait ticks, time) unchanged
    // dvy:wait
    14: 1,
    18: 2,
    22: 3,
    26: 4,
    30: 5,
    34: 6
  }

  GC.friction = {}
  GC.friction.fell = // defined friction at the moment of fell onto ground
  { // a lookup table; 2x port: keys (speed) and values (friction) both doubled
    // speed:friction
    4: 0,
    6: 2,
    10: 4, // smaller or equal to 6, value is 4
    12: 8,
    18: 10,
    26: 14,
    50: 18 // guess entry
  }

  // physics
  GC.min_speed = 2 // defined minimum speed; 2x port: 1 -> 2
  GC.gravity = 3.4 // defined gravity; 2x port: 1.7 -> 3.4

  GC.weapon = {}
  GC.weapon.bounceup = {} // when a weapon falls onto ground
  GC.weapon.bounceup.limit = 16 // defined limit to bounce up again; 2x port: 8 -> 16
  GC.weapon.bounceup.speed = {}
  GC.weapon.bounceup.speed.y = -7.4 // defined bounce up speed; 2x port: -3.7 -> -7.4
  GC.weapon.bounceup.speed.x = 6 // 2x port: 3 -> 6
  GC.weapon.bounceup.speed.z = 3 // 2x port: 1.5 -> 3
  GC.weapon.soft_bounceup = {} // when heavy weapon being hit by character punch
  GC.weapon.soft_bounceup.speed = {}
  GC.weapon.soft_bounceup.speed.y = -4 // 2x port: -2 -> -4

  GC.weapon.hit = {} // when a weapon hit others
  GC.weapon.hit.vx = -6 // absolute speed; 2x port: -3 -> -6
  GC.weapon.hit.vy = 0

  GC.weapon.reverse = {} // when a weapon is being hit while travelling in air
  GC.weapon.reverse.factor = {}
  GC.weapon.reverse.factor.vx = -0.4
  GC.weapon.reverse.factor.vy = -2
  GC.weapon.reverse.factor.vz = -0.4

  GC.combo = {}
  GC.combo.timeout = 10 // how many TUs a combo will still be effective after being fired

  GC.unspecified = -842150451 // 0xCDCDCDCD, one kind of HEX label
  GC.specialattack_projectiles = [201, 202, 222] // 222: Ben-Gvir's bullet (Rudolf's shuriken copy). Special attacks that shoot projectiles. Used to apply physics

  return G
})
