/*\
 * touchcontroller
 *
 * touch controller for LF2
\*/
define(['LF/util'], function (util) {
  const controllers = []
  const SVG = '<svg class="touch_icon" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
  const ICON = {
    att: '<svg class="touch_icon" viewBox="0 0 1280 1028" fill="currentColor"><g transform="translate(0 1028) scale(.1 -.1)"><path d="M5812 10135 c-348 -80 -650 -153 -670 -162 -94 -44 -169 -154 -286 -414 -91 -205 -119 -260 -166 -329 -112 -163 -223 -217 -431 -208 -108 5 -113 6 -444 125 -40 14 -102 27 -145 30 -73 5 -87 1 -580 -141 -278 -81 -518 -152 -535 -158 -136 -52 -232 -198 -375 -573 -122 -321 -188 -444 -284 -533 -56 -51 -111 -78 -204 -97 -92 -20 -177 -19 -350 6 -180 25 -315 23 -382 -7 -41 -19 -772 -493 -849 -551 -81 -62 -105 -200 -105 -608 -1 -354 17 -586 66 -870 16 -96 44 -185 135 -440 63 -176 157 -437 208 -580 107 -298 624 -1740 721 -2010 36 -99 156 -434 267 -745 l203 -565 39 -20 c32 -15 66 -20 165 -23 457 -14 1415 259 1465 418 3 11 -61 268 -145 582 -300 1114 -432 1606 -485 1803 -184 681 -394 1463 -397 1479 -3 17 15 24 157 57 88 21 167 38 176 38 11 1 22 -20 37 -76 11 -43 188 -692 392 -1443 204 -751 461 -1696 571 -2100 273 -1004 261 -961 283 -981 34 -33 118 -42 321 -36 639 18 1736 316 1790 486 3 10 -107 526 -245 1147 -437 1965 -780 3518 -777 3521 9 8 343 79 348 74 4 -3 21 -67 37 -141 17 -74 121 -522 232 -995 245 -1050 353 -1513 430 -1840 32 -137 109 -466 170 -730 62 -264 140 -599 174 -744 69 -298 67 -292 165 -311 173 -32 646 15 1146 115 827 166 1415 379 1415 513 0 14 -211 1083 -470 2376 -258 1294 -470 2359 -470 2368 0 11 23 21 88 36 164 38 252 55 257 51 4 -5 147 -649 800 -3594 142 -641 231 -1026 241 -1036 64 -70 395 -78 804 -18 681 99 1306 306 1385 459 12 24 9 55 -35 301 -27 151 -96 544 -155 874 -58 330 -155 877 -215 1215 -60 338 -123 694 -140 790 -17 96 -80 452 -140 790 -126 713 -139 786 -265 1500 -52 294 -104 564 -116 600 -89 279 -391 830 -623 1135 -82 108 -182 206 -236 232 l-45 22 -155 -24 c-85 -13 -375 -58 -645 -100 -269 -41 -511 -82 -537 -91 -69 -22 -148 -78 -283 -198 -144 -129 -234 -187 -352 -227 -74 -26 -100 -30 -164 -27 -141 6 -262 86 -580 387 -287 272 -400 349 -517 357 -46 3 -181 -25 -690 -141z"/><path d="M11440 6642 c0 -10 11 -79 25 -153 13 -74 60 -336 104 -584 44 -247 103 -578 131 -735 28 -157 86 -485 130 -730 44 -245 124 -698 180 -1008 55 -310 103 -587 106 -616 4 -30 1 -85 -5 -122 -45 -259 -308 -461 -794 -608 -86 -26 -662 -171 -1977 -496 -1609 -398 -1520 -375 -1546 -407 -166 -207 -281 -687 -233 -972 15 -85 52 -165 90 -192 l29 -21 393 37 c215 20 532 49 702 65 493 46 2481 225 2955 266 184 15 370 113 561 291 151 142 256 293 304 437 l26 78 39 1017 c22 559 62 1601 90 2315 28 714 49 1300 48 1301 -2 2 -284 179 -627 395 -343 216 -648 408 -677 426 -47 30 -54 32 -54 16z"/></g></svg>',
    // shield
    def: SVG + '<path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z" stroke="none"/></svg>',
    // up arrow over three short horizontal lines
    jump: SVG +
      '<path d="M12 14V3.5M6.5 9l5.5-5.5L17.5 9" fill="none" stroke-width="2.4"/>' +
      '<path d="M8 17.5v5M12 17.5v5M16 17.5v5" fill="none" stroke-width="1.6"/></svg>'
  }
  let touches = []; let eventtype
  function touch_fun(event) {
    if (!TC.enabled) { return }
    eventtype = event.type
    touches = event.touches
    for (const i in controllers) {
      if (!controllers[i].sync) {
        controllers[i].fetch()
      }
    }
    if (TC.preventDefault) {
      event.preventDefault()
    }
  }
  for (const event in { touchstart: 0, touchmove: 0, touchenter: 0, touchend: 0, touchleave: 0, touchcancel: 0 }) {
    document.addEventListener(event, touch_fun, false)
  }
  window.addEventListener('resize', function () {
    for (let i = 0; i < controllers.length; i++) {
      controllers[i].resize()
    }
  }, false)

  function TC(config) {
    const $ = this
    $.config = config
    if ($.config.layout === 'gamepad') {
      $.state = { up: 0, down: 0, left: 0, right: 0, def: 0, jump: 0, att: 0 }
      $.button = {
        up: { label: '&uarr;' },
        down: { label: '&darr;' },
        left: { label: '&larr;' },
        right: { label: '&rarr;' },
        def: { label: ICON.def },
        jump: { label: ICON.jump },
        att: { label: ICON.att }
      }
    } else if ($.config.layout === 'functionkey') {
      $.state = { F1: 0, F2: 0, F4: 0, F7: 0 }
      $.button = {
        F1: { label: 'F1' }, F2: { label: 'F2' }, F4: { label: 'F4' }, F7: { label: 'F7' }
      }
    }
    $.child = []
    $.sync = true
    $.pause_state = false
    controllers.push(this)
    for (const key in $.button) {
      const el = document.createElement('div')
      util.div('touch_control_holder').appendChild(el)
      el.className = 'touch_controller_button'
      el.innerHTML = '<span>' + $.button[key].label + '</span>'
      $.button[key].el = el
    }
    $.resize()
  }
  TC.enabled = false
  TC.preventDefault = false
  TC.enable = function (en) {
    TC.enabled = en
  }
  TC.prototype.type = 'touch'
  TC.prototype.resize = function () {
    const $ = this
    const w = window.innerWidth
    let h = window.innerHeight
    if ($.config.layout === 'gamepad') {
      let sizeA = 0.20
      let sizeB = 0.20
      let sizeC = 0.25
      const padL = 0.1
      const padR = 0.2
      let offy = 0
      const R = 0.65
      if (h > w) {
        offy = h / 2
        h = w / 16 * 9 * 1.5
      } else {
        offy = h / 5
      }
      sizeA *= h
      sizeB *= h
      sizeC *= h
      this.set_button_pos({
        // 'name':[ left, top, width, height ],
        up: [sizeA * padL, h / 2 - sizeA + offy, sizeA * 2, sizeA * R],
        down: [sizeA * padL, h / 2 + sizeA * (1 - R) + offy, sizeA * 2, sizeA * R],
        left: [sizeA * padL, h / 2 - sizeA + offy, sizeA * R, sizeA * 2],
        right: [sizeA * (2 - R + padL), h / 2 - sizeA + offy, sizeA * R, sizeA * 2],
        def: [w - sizeB * (1.5 + padR), h / 2 + offy, sizeB, sizeB],
        jump: [w - sizeB - sizeC * (1 + padR), h / 2 - sizeB + offy, sizeB, sizeB],
        att: [w - sizeC * (1 + padR), h / 2 - sizeC + offy, sizeC, sizeC]
      })
    } else if ($.config.layout === 'functionkey') {
      $.paused($.pause_state)
    }
  }
  TC.prototype.set_button_pos = function (sett) {
    const $ = this
    for (const I in sett) {
      const B = $.button[I]
      B.left = sett[I][0]
      B.top = sett[I][1]
      B.right = sett[I][0] + sett[I][2]
      B.bottom = sett[I][1] + sett[I][3]
      B.el.style.left = B.left + 'px'
      B.el.style.top = B.top + 'px'
      B.el.style.width = (B.right - B.left) + 'px'
      B.el.style.height = (B.bottom - B.top) + 'px'
    }
  }
  TC.prototype.paused = function (pause) {
    const $ = this
    const w = window.innerWidth
    const h = window.innerHeight
    this.pause_state = pause
    TC.preventDefault = !pause
    if ($.config.layout === 'functionkey') {
      const size = 0.08 * (h < w ? h : w)
      let offy = 0
      let offx = 0
      if (h > w) {
        offx = -w / 10
        offy = h / 2.5
      }
      if (pause) {	// expand the collection
        const Fleft = h / 10 - size / 2 + offx
        const Ftop = h / 10 - size / 2 + offy
        this.set_button_pos({
          F1: [Fleft, Ftop, size, size],
          F2: [Fleft + size * 1.5, Ftop, size, size],
          F4: [Fleft + size * 1.5 * 3, Ftop, size, size],
          F7: [Fleft + size * 1.5 * 6, Ftop, size, size]
        })
        for (var i in { F1: 0, F2: 0, F4: 0, F7: 0 }) {
          if (!$.hidden) { show($.button[i]) }
          $.button[i].disabled = 10 // disable for 10 frames
        }
      } else {	// collapse
        this.set_button_pos({
          F1: [h / 10 - size / 2, h / 10 - size / 2 + offy, size, size],
          F2: [h / 10 - size / 2, h / 10 - size / 2 + offy, size, size],
          F4: [h / 10 - size / 2, h / 10 - size / 2 + offy, size, size],
          F7: [h / 10 - size / 2, h / 10 - size / 2 + offy, size, size]
        })
        if (!$.hidden) {
          show($.button.F1)
        }
        $.button.F1.disabled = false
        for (var i in { F2: 0, F4: 0, F7: 0 }) {
          hide($.button[i])
          $.button[i].disabled = true
        }
      }
    }
  }
  TC.prototype.hide = function () {
    const $ = this
    for (const i in $.button) {
      hide($.button[i])
      $.button[i].disabled = true
    }
    $.hidden = true
  }
  TC.prototype.show = function () {
    const $ = this
    $.hidden = false
    for (const i in $.button) {
      show($.button[i])
      $.button[i].disabled = false
    }
  }
  TC.prototype.restart = function () {
    const $ = this
    if ($.config.layout === 'functionkey') {
      this.paused(false)
    }
  }
  TC.prototype.clear_states = function () {
    for (const I in this.state) {
      this.state[I] = 0
    }
  }
  TC.prototype.fetch = function () {
    const $ = this
    for (const key in $.button) {
      if ($.button[key].disabled) {
        if (typeof $.button[key].disabled === 'number') {
          $.button[key].disabled--
        }
        continue
      }
      let down = false
      for (var i = 0; i < touches.length; i++) {
        const T = touches[i]
        if (point_in_rect(T.clientX, T.clientY, $.button[key])) {
          down = true
          break
        }
      }
      if ((down && !$.state[key]) || (!down && $.state[key])) {
        for (var i = 0; i < $.child.length; i++) {
          $.child[i].key(key, down)
        }
        $.state[key] = down
        if (down) {
          $.button[key].el.style.border = '2px solid rgb(255, 170, 170)'
        } else {
          $.button[key].el.style.border = '2px solid rgb(170, 255, 255)'
        }
      }
    }
  }
  TC.prototype.flush = function () {
  }

  return TC

  // util
  function show(B) {
    B.el.style.visibility = 'visible'
  }
  function hide(B) {
    B.el.style.visibility = 'hidden'
  }
  function inbetween(x, L, R) {
    let l, r
    if (L <= R) {
      l = L
      r = R
    } else {
      l = R
      r = L
    }
    return x >= l && x <= r
  }
  function point_in_rect(Px, Py, R) {
    return (inbetween(Px, R.left, R.right) && inbetween(Py, R.top, R.bottom))
  }
})
