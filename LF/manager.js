/*\
 * manager
 *
 * drives the user interface and starts matches.
 *
 * the UI itself is plain HTML (game/game.html): every screen is in the document
 * at all times and `switch_UI` only swaps a `state-<screen>` class on `.LFroot`,
 * which the stylesheets turn into visibility. this manager therefore never
 * touches `style.display` and never builds UI elements; it fills in text,
 * toggles classes and listens for clicks.
 *
 * the window is always fitted to the screen (see `resizer`), there is no
 * maximize/restore state.
\*/
define(['LF/global', 'LF/network', 'LF/soundpack', 'LF/match', 'LF/util', 'LF/touchcontroller', 'third_party/random',
  'core/util', 'LF/sprite-select', 'core/sprite-dom', 'core/controller', 'core/resourcemap', 'core/support',
  'LF/webrtc', 'third_party/qrcode'],
  function (global, network, Soundpack, Match, util, Touchcontroller, Random,
    Futil, Fsprite, Fsprite_dom, Fcontroller, Fresourcemap, Fsupport,
    webrtc, qrcode) {
    function Manager(pack, buildinfo) {
      const param = util.location_parameters()

      let char_list,
        img_list,
        upcoming_list,
        AI_list,
        bg_list,
        timer,
        randomseed,
        resourcemap
      const manager = this
      let settings
      let session
      let controllers
      let window_state
      let flow // what the player picked on the way from the front page to the fight

      /* a network game runs in lockstep: both peers replay the same menu flow
       * and the same simulation, so their random streams have to agree. they
       * therefore share this fixed seed, while a local session is seeded fresh
       * on every load (see `create`) so that the 'Random' character and
       * background picks actually differ from one run to the next. */
      const network_randomseed = 824163532
      // stored once the player went through the control settings; a guest of
      // a network game who never did is asked to before joining
      const keyboard_set_key = 'F.LF/keyboard_set'

      this.create = function () {
        require(['core/css!' + pack.path + 'UI/UI.css'], function () { })

        const root = util.div() // the `.LFroot` element; also initializes util.root/util.container

        // device class. touch controls are for mobile devices, the control
        // settings screen is for desktop users; the stylesheet does the hiding.
        const is_mobile = !!Fsupport.mobile
        root.classList.add(is_mobile ? 'mobile' : 'desktop')

        // window sizing. the window always behaves like a fullscreen window,
        // i.e. it is scaled to fit whatever space the browser gives us.
        window_state =
        {
          wide: false,
          allow_wide: false
        }

        let alert_then // called once the alert is dismissed
        util.div('alert_box_ok').onclick = function () {
          util.div('alert_box').hidden = true
          if (alert_then) {
            const then = alert_then
            alert_then = null
            then()
          }
        }
        manager.alert = function (mess, then) {
          console.error(mess)
          util.div('alert_message').innerHTML = mess
          util.div('alert_box').hidden = false
          alert_then = then
        }

        session =
        {
          network: false,
          control: null,
          player: []
        }

        const settings_format_version = 1.00003
        settings =
        {
          version: settings_format_version,
          control:
            [
              {
                type: 'keyboard',
                config: { up: 'w', down: 'x', left: 'a', right: 'd', def: 'z', jump: 'q', att: 's' }
              },
              {
                /* player 2 does not exist until the player sets a controller up in
                   the control settings; that is what unlocks local PvP */
                type: 'none',
                config: { up: 'u', down: 'm', left: 'h', right: 'k', def: ',', jump: 'i', att: 'j' }
              }
            ],
          player:
            [
              { name: 'player1' }, { name: 'player2' }
            ],
          support_sound: false
        }
        if (Fsupport.localStorage) {
          if (Fsupport.localStorage.getItem('F.LF/settings')) {
            const obj = JSON.parse(Fsupport.localStorage.getItem('F.LF/settings'))
            if (obj.version === settings_format_version) {
              settings = obj
            }
          }
        }
        for (var i = 0; i < settings.player.length; i++) {
          session.player[i] = settings.player[i]
        }

        // control
        const functionkey_config = { esc: 'esc', F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6', F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10' }
        controllers =
        {
          keyboard:
          {
            c0: new Fcontroller(settings.control[0].config),
            c1: new Fcontroller(settings.control[1].config),
            f: new Fcontroller(functionkey_config)
          }
        }
        if (is_mobile) {
          controllers.touch =
          {
            c: new Touchcontroller({ layout: 'gamepad' }),
            f: new Touchcontroller({ layout: 'functionkey' })
          }
          controllers.touch.c.hide()
          controllers.touch.f.hide()
          // a mobile device always plays with the single touch gamepad
          settings.control[0].type = 'touch'
          settings.control[1].type = 'none'
        }
        session.control =
        {
          f: controllers.keyboard.f,
          length: 0,
          my_offset: 0
        }
        setup_controllers()

        // setup resource map
        util.organize_package(pack)
        resourcemap = new Fresourcemap(util.setup_resourcemap(pack))
        Fsprite.masterconfig_set('resourcemap', resourcemap)
        Fsprite_dom.masterconfig_set('resourcemap', resourcemap)

        // icon
        const icon = document.createElement('link')
        icon.rel = 'icon'
        icon.href = Fsprite.resolve_resource(pack.data.icon)
        document.head.appendChild(icon)

        // sound
        if (!settings.support_sound) {
          manager.sound = new Soundpack(null)
          Soundpack.support(function (features) {
            settings.support_sound = true
            setup_sound()
          })
        } else {
          setup_sound()
        }
        function setup_sound() {
          manager.sound = new Soundpack({
            packs: pack.data.sound,
            resourcemap: resourcemap
          })
        }

        // rand
        manager.random = function () {
          return randomseed.next()
        }
        randomseed = new Random()
        randomseed.seed(Math.floor(Math.random() * 0x7FFFFFFF))

        // prepare
        // `hidden` characters stay loadable (their data and specialattacks) but are not offered in selection
        char_list = util.selectA_from(pack.data.object, function (O) {
          return O.type === 'character' && !O.hidden
        })
        char_list[-1] = { name: 'Random' }
        img_list = Futil.extract_array(char_list, 'pic').pic
        // upcoming characters: a portrait shown grayed out in the grid, never playable
        upcoming_list = (pack.data.preview || []).slice(0)
        AI_list = pack.data.AI.slice(0)
        bg_list = pack.data.background.slice(0)
        bg_list[-1] = { name: 'Random' }

        this.create_UI()
        const offer = webrtc.read('offer', window.location.hash)
        const answer = webrtc.read('answer', window.location.hash)
        // a link pasted into a tab already running the game only changes the hash
        window.addEventListener('hashchange', function () {
          if (webrtc.read('offer', window.location.hash) || webrtc.read('answer', window.location.hash)) {
            window.location.reload()
          }
        })
        if (offer) {
          this.UI_list.network_game.join(offer) // opened with an invitation link
        } else if (answer) {
          this.UI_list.network_game.relay(answer) // opened with a reply link
        } else if (param.demo) {
          this.start_demo(true)
        } else if (param.demo_display) {
          this.start_demo(false)
        } else if (param.debug) {
          this.start_debug()
        } else {
          this.switch_UI('frontpage')
        }

        if (param.debug_a) {
          this.network_debug('active')
        }
        if (param.debug_b) {
          this.network_debug('passive')
        }
        //
        window.addEventListener('resize', resizer, false)
        resizer()
      }
      /*\
       * manager.setup_controllers
       * bind `session.control` to whatever the settings ask for.
       * `session.control.length` is the number of human players the game offers:
       * 1 by default, 2 once a second controller was set up in the control
       * settings (which is what unlocks local PvP), 4 during a network game.
       * `multiplayer_ready` on `.LFroot` lets the stylesheet show the PvP entry.
      \*/
      function setup_controllers() {
        if (session.network) {
          return // a network session manages its own controllers
        }
        let length = 0
        for (let i = 0; i < settings.control.length; i++) {
          if (settings.control[i].type === 'none') {
            break // player n+1 cannot exist without player n
          }
          if (settings.control[i].type === 'touch' && !controllers.touch) {
            settings.control[i].type = 'keyboard' // a touch setting stored by a mobile device
          }
          if (settings.control[i].type === 'touch') {
            session.control[i] = controllers.touch.c
            session.control.f = controllers.touch.f
          } else {
            session.control[i] = controllers.keyboard['c' + i]
            session.control.f = controllers.keyboard.f
          }
          length++
        }
        if (!length) { // there is always a player 1
          settings.control[0].type = 'keyboard'
          session.control[0] = controllers.keyboard.c0
          session.control.f = controllers.keyboard.f
          length = 1
        }
        session.control.length = length
        if (length > 1) {
          util.div().classList.add('multiplayer_ready')
        } else {
          util.div().classList.remove('multiplayer_ready')
        }
      }
      /*\
       * start a network session over `server` (a lobby server, or `{transport}`).
       * `param.role` is 'active' (its players come first) or 'passive', and
       * `param.per_peer` the number of players at each end: 2 by default, 1 in
       * a game made with an invitation link, which then starts PvP right away.
      \*/
      function create_network_controllers(server, param) {
        const per_peer = param.per_peer || 2
        const handler = {
          on: function (event, mess) {
            switch (event) {
              case 'open':
                var controller_config = { up: 'w', down: 'x', left: 'a', right: 'd', def: 'z', jump: 'q', att: 's' }
                if (per_peer === 2 && settings.control[1].type === 'none') {
                  settings.control[1].type = 'keyboard' // a network game always plays two local players
                  setup_controllers()
                }
                session.network = true
                randomseed.seed(network_randomseed) // both peers must draw the same numbers
                const own = [] // the controllers of this end
                for (let i = 0; i < per_peer; i++) {
                  own[i] = session.control[i]
                }
                const offset = param.role === 'active' ? 0 : per_peer
                for (let i = 0; i < per_peer * 2; i++) {
                  session.control[i] = i >= offset && i < offset + per_peer
                    ? new network.controller('local', own[i - offset])
                    : new network.controller('remote', controller_config)
                }
                session.control.my_offset = offset
                session.control.length = per_peer * 2
                session.control.f = new network.controller('dual', session.control.f)
                util.div().classList.remove('network_guest')
                util.div().classList.add('network_session')
                util.div().classList.add('multiplayer_ready')
                network.transfer(
                  'session', // name
                  function () { // send
                    return {
                      buildversion: buildinfo.version,
                      player: settings.player
                    }
                  },
                  function (info) { // receive
                    if (buildinfo.version !== info.buildversion) {
                      manager.alert('Your program version (' + buildinfo.timestamp + ') is incompatible with your peer (' + info.buildversion + '). Please reload.')
                    }
                    for (let i = 0; i < per_peer; i++) {
                      session.player[offset + i] = settings.player[i]
                      session.player[per_peer - offset + i] = info.player[i]
                    }
                    manager.UI_list.settings.keychanger.call(manager.UI_list.settings)
                    if (server.transport) {
                      // the selection clock runs in lockstep, so it does not
                      // matter which end gets here first
                      flow = new_flow('pvp')
                      start_character_selection()
                    }
                  })
                break
              case 'close':
                if (server.transport) {
                  manager.alert('Your opponent left the game', manager.UI_list.network_game.quit)
                } else {
                  manager.alert('peer disconnected')
                }
                break
              case 'log':
                console.log(mess)
                break
              case 'error':
                manager.alert(mess)
                break
              case 'sync_error':
                manager.alert('FATAL: synchronization error')
                break
            }
          }
        }
        network.setup({
          server: server,
          param: param
        }, handler)
      }
      this.UI_list =
      {
        frontpage:
        {
          create: function () {
            menu_onclick(util.div('frontpage_menu'), function (action) {
              if (action === 'arcade') {
                manager.sound.play('1/m_ok')
                manager.switch_UI('arcade_menu')
              } else if (action === 'local_pvp') {
                flow = new_flow('pvp')
                manager.sound.play('1/m_ok')
                start_character_selection()
              } else if (action === 'network_game') {
                if (window.location.href.indexOf('http') === 0) {
                  manager.sound.play('1/m_ok')
                  manager.UI_list.network_game.choose()
                } else {
                  manager.alert('network game must run under http://')
                }
              } else if (action === 'settings') {
                manager.switch_UI('settings')
              }
            })
          }
        },
        arcade_menu:
        {
          create: function () {
            menu_onclick(util.div('arcade_mode_menu'), function (action) {
              if (action === 'exit') {
                manager.sound.play('1/m_cancel')
                manager.switch_UI('frontpage')
                return
              }
              flow = new_flow(action) // '1v1', 'ffa' or '1vx'
              manager.sound.play('1/m_ok')
              manager.switch_UI('difficulty')
            })
          }
        },
        difficulty:
        {
          create: function () {
            const level = { easy: 0, normal: 1, difficult: 2 }
            menu_onclick(util.div('difficulty_menu'), function (action) {
              if (action === 'back') {
                manager.sound.play('1/m_cancel')
                manager.switch_UI('arcade_menu')
                return
              }
              flow.difficulty = level[action] || 0
              manager.sound.play('1/m_ok')
              if (flow.mode === '1v1') {
                start_character_selection() // a single opponent, nothing else to ask
              } else {
                manager.switch_UI('bot_count')
              }
            })
          }
        },
        bot_count:
        {
          create: function () {
            const numbers = util.div('bot_count').getElementsByClassName('number')
            for (let i = 0; i < numbers.length; i++) {
              const number = numbers[i]
              number.onclick = function () {
                flow.bots = parseInt(number.getAttribute('data-count'))
                manager.sound.play('1/m_ok')
                start_character_selection()
              }
            }
            menu_onclick(util.div('bot_count'), function (action) {
              if (action === 'back') {
                manager.sound.play('1/m_cancel')
                manager.switch_UI('difficulty')
              }
            })
          }
        },
        settings:
        {
          create: function () {
            menu_onclick(util.div('settings_menu'), function () {
              if (Fsupport.localStorage) {
                Fsupport.localStorage.setItem('F.LF/settings', JSON.stringify(settings))
                Fsupport.localStorage.setItem(keyboard_set_key, '1')
              }
              const network_game = manager.UI_list.network_game
              if (network_game.joining) {
                network_game.reply(network_game.joining) // the keys are set, join now
              } else {
                manager.switch_UI('frontpage')
              }
            })
            this.keychanger.call(this)
          },
          /*\
           * (re)connect the static control table to the current controllers.
           * every column the settings know about is wired, including the one of
           * a player 2 who is not set up yet: clicking its type is what adds a
           * second human player (and unlocks local PvP).
          \*/
          keychanger: function () {
            const table = util.div('keychanger')
            const key_rows = table.getElementsByClassName('row_key')
            const column = this.column = []
            const columns = Math.max(session.control.length, settings.control.length)
            let change_active = false

            for (let i = 0; i < columns; i++) {
              column[i] = new Control(i)
            }

            /* the controller types a player can cycle through */
            function types_of(num) {
              const types = ['keyboard']
              if (controllers.touch) {
                types.push('touch')
              }
              if (num > 0 && !session.network) {
                types.push('none') // player 1 always exists, a network game needs two
              }
              return types
            }

            function Control(num) {
              const name = table.querySelector('.row_name .player_col_' + num)
              const type = table.querySelector('.row_type .player_col_' + num)
              const cells = {}
              for (let i = 0; i < key_rows.length; i++) {
                const key = key_rows[i].getAttribute('data-key')
                cells[key] = key_rows[i].querySelector('.player_col_' + num)
                add_changer(cells[key], key)
              }
              this.update = update
              update()
              if (session.control[num] && session.control[num].role !== undefined) {
                name.onclick = null // a remote player, nothing to change here
                type.onclick = null
                return
              }
              name.onclick = function () {
                const player = settings.player[num - session.control.my_offset]
                if (!player) {
                  return
                }
                name.innerHTML = player.name = (prompt('Enter player name:', name.innerHTML) || name.innerHTML)
              }
              type.onclick = function () {
                const types = types_of(num)
                const next = types[(types.indexOf(settings.control[num].type) + 1) % types.length]
                settings.control[num].type = next
                setup_controllers()
                // the number of players may have changed, rewire the table
                manager.UI_list.settings.keychanger.call(manager.UI_list.settings)
              }
              function add_changer(cell, name) {
                let target
                cell.onclick = function () {
                  if (!session.control[num] || session.control[num].type !== 'keyboard') {
                    return
                  }
                  if (!change_active) {
                    change_active = true
                    target = this
                    target.classList.add('changing')
                    document.addEventListener('keydown', keydown, true)
                  } else {
                    if (target) {
                      target.classList.remove('changing')
                      target = null
                      change_active = false
                    }
                    document.removeEventListener('keydown', keydown, true)
                  }
                }
                function keydown(e) {
                  const con = session.control[num]
                  if (!e) { e = window.event }
                  const value = e.keyCode
                  cell.innerHTML = Fcontroller.keycode_to_keyname(value)
                  con.config[name] = Fcontroller.keycode_to_keyname(value)
                  con.keycode[name] = value
                  target.classList.remove('changing')
                  change_active = false
                  document.removeEventListener('keydown', keydown, true)
                }
              }
              function update() {
                const con = session.control[num]
                const player = session.player[num]
                name.innerHTML = con && player ? player.name : ''
                if (!con) { // this player is not set up
                  type.innerHTML = settings.control[num] ? settings.control[num].type : 'none'
                } else {
                  type.innerHTML = con.role === 'remote' ? 'network' : con.type
                }
                for (const I in cells) {
                  if (con && con.type === 'keyboard') {
                    cells[I].innerHTML = con.config[I]
                  } else {
                    cells[I].innerHTML = '-'
                  }
                }
              }
            }
          },
          onactive: function () {
            for (let i = 0; i < this.column.length; i++) {
              this.column[i].update()
            }
          }
        },
        /*\
         * the serverless network game (see LF/webrtc). the host picks how to
         * send the invitation; a page opened with that invitation link is the
         * guest, it plays player 2 and cannot leave the game except by quitting.
        \*/
        network_game:
        {
          create: function () {
            const This = this
            menu_onclick(util.div('network_menu'), function (action) {
              if (action === 'back') {
                manager.sound.play('1/m_cancel')
                manager.switch_UI('frontpage')
              } else {
                manager.sound.play('1/m_ok')
                This.invite(action === 'invite_qr')
              }
            })
            util.div('network_cancel').onclick = function () {
              This.close()
              This.choose()
            }
            util.div('network_quit').onclick = this.quit
            util.div('network_copy').onclick = function () {
              const button = this
              const link = util.div('network_link')
              link.select()
              if (navigator.clipboard) {
                navigator.clipboard.writeText(link.value).then(copied, copy_selection)
              } else {
                copy_selection()
              }
              function copy_selection() {
                document.execCommand('copy')
                copied()
              }
              function copied() {
                button.innerHTML = "Copied<span class='label_local'>הועתק</span>"
                setTimeout(function () {
                  button.innerHTML = "Copy<span class='label_local'>העתק</span>"
                }, 1500)
              }
            }
            util.div('network_share').onclick = function () {
              navigator.share({ title: document.title, url: util.div('network_link').value })
                .catch(function () { }) // the player closed the share sheet
            }
            util.div('network_connect').onclick = function () {
              This.accept(util.div('network_reply').value)
            }
          },
          onactive: function () {
            Fcontroller.block(false) // let the link fields get their keys
          },
          deactive: function () {
            Fcontroller.block(true)
          },
          /* the front page entry: offer the two ways of inviting */
          choose: function () {
            this.step('choose')
            manager.switch_UI('network_game')
          },
          step: function (name) {
            set_class(util.div('network_game'), 'step-', name)
          },
          status: function (label, label_local) {
            util.div('network_status').innerHTML =
              "<div class='label'>" + label + "</div><div class='label_local'>" + label_local + '</div>'
          },
          /* show `link` as a QR code and/or as text to copy and share */
          show_link: function (link, as_qr, as_text) {
            const qr = util.div('network_qr')
            qr.hidden = !(link && as_qr)
            if (link && as_qr) {
              const code = qrcode(0, 'L')
              code.addData(link)
              code.make()
              qr.src = code.createDataURL(4, 4)
            }
            util.div('network_link_row').hidden = !(link && as_text)
            util.div('network_link').value = link || ''
            util.div('network_share').hidden = !navigator.share
          },
          open_peer: function () {
            const This = this
            this.close()
            const peer = this.peer = new webrtc.Peer()
            peer.onfail = function () {
              if (peer === This.peer) {
                This.status('Could not connect. Please try again.', 'החיבור נכשל. נסו שוב.')
              }
            }
            return peer
          },
          close: function () {
            if (this.peer) {
              this.peer.close()
              this.peer = null
            }
            if (this.listener) {
              this.listener.close()
              this.listener = null
            }
          },
          /* host: create an invitation and wait for the reply */
          invite: function (as_qr) {
            const This = this
            this.step('invite')
            this.show_link(null)
            util.div('network_reply').value = ''
            if (!webrtc.supported) {
              this.status('This browser cannot play network games', 'הדפדפן הזה לא תומך במשחק ברשת')
              return
            }
            this.status('Preparing the invitation...', 'מכין הזמנה...')
            const peer = this.open_peer()
            peer.onopen = function () { This.start(peer, 'active') }
            peer.invite().then(function (link) {
              if (peer !== This.peer) {
                return // cancelled meanwhile
              }
              if (as_qr) {
                This.status('Let your friend scan this code with their phone', 'תנו לחבר לסרוק את הקוד עם הטלפון')
              } else {
                This.status('Send this link to your friend', 'שלחו את הקישור הזה לחבר')
              }
              This.show_link(link, as_qr, !as_qr)
              if (webrtc.relay.supported) {
                // the reply link may well be opened in this very browser
                This.listener = webrtc.relay.listen(function (answer) {
                  This.accept(answer)
                })
              }
            }, peer.onfail)
          },
          /* host: connect with the guest's reply link */
          accept: function (text) {
            const This = this
            const peer = this.peer
            if (!peer || peer.accepting) {
              return
            }
            peer.accepting = true
            this.status('Connecting...', 'מתחבר...')
            peer.accept(text).catch(function () {
              peer.accepting = false
              This.status('That is not a reply link to this invitation', 'זה לא קישור תשובה להזמנה הזאת')
            })
          },
          /*\
           * guest: opened with an invitation link. a desktop player who never
           * set the keyboard up does that first (the settings screen comes
           * back to `reply`).
          \*/
          join: function (offer) {
            util.div().classList.add('network_guest')
            if (!webrtc.supported) {
              this.step('join')
              this.status('This browser cannot play network games', 'הדפדפן הזה לא תומך במשחק ברשת')
              manager.switch_UI('network_game')
              return
            }
            const keyboard_set = Fsupport.localStorage && Fsupport.localStorage.getItem(keyboard_set_key)
            if (!controllers.touch && !keyboard_set) {
              this.joining = offer
              manager.switch_UI('settings')
              return
            }
            this.reply(offer)
          },
          /* guest: answer the invitation with a reply link */
          reply: function (offer) {
            const This = this
            this.joining = null
            this.step('reply')
            this.show_link(null)
            this.status('Preparing your reply...', 'מכין תשובה...')
            manager.switch_UI('network_game')
            const peer = this.open_peer()
            peer.onopen = function () { This.start(peer, 'passive') }
            peer.join(offer).then(function (link) {
              if (peer !== This.peer || session.network) {
                return // already connected
              }
              This.status('Send this reply link back to whoever invited you', 'שלחו את קישור התשובה בחזרה למי שהזמין אתכם')
              This.show_link(link, true, true)
            }, peer.onfail)
          },
          /* a page opened with a reply link: hand it to the waiting host tab */
          relay: function (answer) {
            const This = this
            util.div().classList.add('network_guest')
            this.step('relay')
            this.show_link(null)
            manager.switch_UI('network_game')
            if (!webrtc.relay.supported) {
              not_delivered()
              return
            }
            this.status('Looking for the invitation...', 'מחפש את ההזמנה...')
            webrtc.relay.deliver(answer, function (delivered) {
              if (delivered) {
                This.status('Reply delivered. You can close this tab and go back to the game.',
                  'התשובה נמסרה. אפשר לסגור את הלשונית ולחזור למשחק.')
              } else {
                not_delivered()
              }
            })
            function not_delivered() {
              This.status('No invitation is waiting in this browser. Paste this link into the game that invited you.',
                'אין הזמנה ממתינה בדפדפן הזה. הדביקו את הקישור במשחק שהזמין אתכם.')
              This.show_link(window.location.href, false, true)
            }
          },
          start: function (peer, role) {
            if (this.listener) {
              this.listener.close()
              this.listener = null
            }
            this.status('Connected!', 'מחובר!')
            create_network_controllers({ transport: peer }, { role: role, per_peer: 1 })
          },
          /* leave the network game: start over on a clean front page */
          quit: function () {
            manager.UI_list.network_game.close()
            window.location.replace(webrtc.base_url())
          }
        },
        character_selection:
        {
          create: function () {
            const This = this
            this.picker = new grid_picker(util.div('character_grid'))
            const grid = character_entries()
            this.picker.build(grid.entries, { columns: grid.side, home: grid.center })
            this.picker.onmove = function () {
              This.refresh()
            }
            this.picker.onclick_cell = function (index) {
              This.pointer_pick(index)
            }
          },
          onactive: function () {
            this.begin()
          },
          /*\
           * set the screen up for the current `flow`: how many characters are
           * chosen, by whom, and whether the opponents are shown as a single
           * portrait or as a roster
          \*/
          begin: function () {
            const screen = util.div('character_selection')
            this.simultaneous = flow.mode === 'pvp' // every human picks at once
            this.humans = this.simultaneous ? session.control.length : 1
            this.total = this.simultaneous
              ? this.humans
              : (flow.mode === '1v1' ? 2 : 1 + flow.bots)
            this.done = []
            flow.picks = []
            set_class(screen, 'mode_', this.simultaneous
              ? (this.humans === 2 ? 'pvp' : 'roster')
              : (this.total === 2 ? '1v1' : 'roster'))
            build_roster(this.total - 1)
            this.picker.layout()
            this.picker.reset_cursors(this.simultaneous ? this.humans : 1)
            this.refresh()
          },
          /*\
           * what a fighter slot shows: the chosen character once it is settled,
           * otherwise the entry the cursor choosing it currently sits on
          \*/
          slot_state: function (s) {
            if (this.simultaneous) {
              if (s >= this.humans) {
                return null
              }
              if (this.done[s]) {
                return character_state(flow.picks[s].character, true)
              }
              return character_state(this.picker.cursor_entry(s).character, false)
            }
            if (s < flow.picks.length) {
              return character_state(flow.picks[s].character, true)
            }
            if (s === flow.picks.length) {
              return character_state(this.picker.cursor_entry(0).character, false)
            }
            return null
          },
          refresh: function () {
            const screen = util.div('character_selection')
            const step = flow.picks.length
            let title = 'own'
            if (this.simultaneous) {
              title = 'pvp'
            } else if (step > 0) {
              title = this.total === 2 ? 'opponent' : 'opponents'
            }
            set_class(screen, 'step_', title)
            if (title === 'opponents') {
              util.div('character_selection', 'count').innerHTML =
                Math.min(step, this.total - 1) + ' / ' + (this.total - 1)
            }
            set_preview(util.div('preview_left'), this.slot_state(0))
            if (screen.classList.contains('mode_roster')) {
              const entries = util.div('roster').getElementsByClassName('roster_entry')
              for (let i = 0; i < entries.length; i++) {
                set_roster_entry(entries[i], this.slot_state(i + 1))
              }
            } else {
              set_preview(util.div('preview_right'), this.slot_state(1))
            }
          },
          key: function (num, key) {
            const p = this.simultaneous ? num : 0
            if (this.simultaneous ? num >= this.humans : num !== 0) {
              return // this controller has nothing to choose here
            }
            switch (key) {
              case 'left': this.picker.move(p, -1, 0); break
              case 'right': this.picker.move(p, 1, 0); break
              case 'up': this.picker.move(p, 0, -1); break
              case 'down': this.picker.move(p, 0, 1); break
              case 'att': this.confirm(p); break
              case 'jump': this.cancel(p); break
            }
          },
          /* clicking or tapping a cell chooses it for whoever is up next */
          pointer_pick: function (index) {
            if (session.network) {
              return // a network match must stay in sync with the remote peer
            }
            let p = 0
            if (this.simultaneous) {
              for (p = 0; p < this.humans; p++) {
                if (!this.done[p]) { break }
              }
              if (p >= this.humans) { return }
            }
            this.picker.set_cursor(p, index)
            this.confirm(p)
          },
          confirm: function (p) {
            const entry = this.picker.cursor_entry(p)
            const character = entry.character === -1 ? random_character() : entry.character
            if (this.simultaneous) {
              if (this.done[p]) {
                return
              }
              flow.picks[p] = { kind: 'human', character: character }
              this.done[p] = true
              this.picker.lock_cursor(p, true)
            } else {
              flow.picks.push({
                kind: flow.picks.length === 0 ? 'human' : 'computer',
                character: character
              })
              this.picker.set_cursor(0, this.picker.home) // the next choice starts on random again
            }
            manager.sound.play('1/m_join')
            if (this.complete()) {
              manager.switch_UI('arena_selection')
            } else {
              this.refresh()
            }
          },
          cancel: function (p) {
            if (this.simultaneous) {
              if (this.done[p]) {
                this.done[p] = false
                flow.picks[p] = null
                this.picker.lock_cursor(p, false)
                manager.sound.play('1/m_cancel')
                this.refresh()
                return
              }
              for (let i = 0; i < this.humans; i++) {
                if (this.done[i]) { return } // somebody is already committed
              }
              if (session.network) {
                return // a network game is only left by quitting
              }
              manager.sound.play('1/m_cancel')
              manager.switch_UI('frontpage')
              return
            }
            if (flow.picks.length) {
              flow.picks.pop()
              manager.sound.play('1/m_cancel')
              this.refresh()
            } else {
              manager.sound.play('1/m_cancel')
              manager.switch_UI(flow.mode === '1v1' ? 'difficulty' : 'bot_count')
            }
          },
          complete: function () {
            if (this.simultaneous) {
              for (let i = 0; i < this.humans; i++) {
                if (!this.done[i]) { return false }
              }
              return true
            }
            return flow.picks.length >= this.total
          },
          frame: function () {
            fetch_controllers()
          }
        },
        arena_selection:
        {
          create: function () {
            const This = this
            this.picker = new grid_picker(util.div('arena_grid'))
            this.picker.build(arena_entries())
            this.picker.onclick_cell = function (index) {
              if (session.network) {
                return // a network match must stay in sync with the remote peer
              }
              This.picker.set_cursor(0, index)
              This.confirm()
            }
          },
          onactive: function () {
            this.picker.layout()
            this.picker.reset_cursors(1)
          },
          /* any controller drives the arena cursor */
          key: function (num, key) {
            switch (key) {
              case 'left': this.picker.move(0, -1, 0); break
              case 'right': this.picker.move(0, 1, 0); break
              case 'up': this.picker.move(0, 0, -1); break
              case 'down': this.picker.move(0, 0, 1); break
              case 'att': this.confirm(); break
              case 'jump':
                manager.sound.play('1/m_cancel')
                manager.switch_UI('character_selection')
                break
            }
          },
          confirm: function () {
            flow.arena = this.picker.cursor_entry(0).arena
            manager.sound.play('1/m_ok')
            manager.start_match({
              players: flow_players(),
              options: { background: flow.arena, difficulty: flow.difficulty }
            })
          },
          frame: function () {
            fetch_controllers()
          }
        },
        gameplay:
        {
          allow_wide: true,
          create: function () {
            manager.overlay_mess = new message_overlay(util.div('message_overlay'))
            manager.summary = new summary_dialog(util.div('summary_dialog'))
            manager.gameplay = util.div('gameplay')
            manager.canvas = get_canvas()
            manager.background_layer = new Fsprite({
              canvas: manager.canvas,
              type: 'group'
            })
            manager.panel_layer = new Fsprite({
              canvas: manager.canvas,
              type: 'group',
              wh: { w: pack.data.UI.data.panel.width, h: pack.data.UI.data.panel.height }
            })

            if (Fsprite.renderer === 'DOM') {
              manager.panel_layer.el.className = 'panel'
              manager.background_layer.el.className = 'background'
            }
            const panels = []
            for (let i = 0; i < 8; i++) {
              const pane = new Fsprite({
                canvas: manager.panel_layer,
                img: pack.data.UI.data.panel.pic,
                wh: 'fit'
              })
              pane.set_x_y(pack.data.UI.data.panel.pane_width * (i % 4), pack.data.UI.data.panel.pane_height * Math.floor(i / 4))
              panels.push(pane)
            }
            function get_canvas() {
              if (Fsprite.renderer === 'DOM') {
                return new Fsprite({
                  div: util.div('gameplay'),
                  type: 'group'
                })
              } else if (Fsprite.renderer === 'canvas') {
                const canvas_node = util.div('gameplay').getElementsByClassName('canvas')[0]
                canvas_node.width = global.application.window.width
                canvas_node.height = global.application.window.height
                return new Fsprite({
                  canvas: canvas_node,
                  type: 'group',
                  bgcolor: '#676767',
                  wh: { w: global.application.window.width, h: global.application.window.height }
                })
              }
            }
          }
        }
      }
      /*\
       * manager.resizer
       * fit the game window to the screen. the game always behaves as if it was
       * in fullscreen: the container is scaled by a single factor so that it fits
       * the browser window, and centered in whatever space is left over.
      \*/
      function resizer() {
        const want_wide = window_state.allow_wide &&
          window.innerWidth / window.innerHeight > 15 / 9
        if (want_wide !== window_state.wide) {
          set_wide(want_wide)
        }
        const width = util.container.offsetWidth
        const height = util.container.offsetHeight
        if (!width || !height) {
          return
        }
        let ratio = Math.min(window.innerWidth / width, window.innerHeight / height)
        ratio = Math.floor(ratio * 100) / 100
        if (!ratio) {
          return
        }
        const canx = Math.floor((window.innerWidth - width * ratio) / 2)
        const cany = Math.floor((window.innerHeight - height * ratio) / 2)
        if (Fsupport.css3dtransform) {
          util.container.style[Fsupport.css3dtransform] =
            'translate3d(' + canx + 'px,' + cany + 'px,0) ' +
            'scale3d(' + ratio + ',' + ratio + ',1.0) '
        } else if (Fsupport.css2dtransform) {
          util.container.style[Fsupport.css2dtransform] =
            'translate(' + canx + 'px,' + cany + 'px) ' +
            'scale(' + ratio + ',' + ratio + ') '
        }
      }
      /*\
       * manager.set_wide
       * on a wide screen the gameplay view gets wider and shorter, the UI panel
       * becomes translucent and the background moves up behind it.
      \*/
      function set_wide(wide) {
        window_state.wide = wide
        if (wide) {
          util.div().classList.add('wide')
        } else {
          util.div().classList.remove('wide')
        }
        if (manager.background_layer) {
          manager.background_layer.set_x_y(0, wide ? -pack.data.UI.data.panel.height : 0)
          manager.panel_layer.set_alpha(wide ? 0.5 : 1.0)
        }
        const canvas = util.div('canvas')
        if (canvas.width && manager.canvas) { // using canvas rendering backend
          const owidth = global.application.window.width
          const wide_width = global.application.window.wide_width
          if (wide) { // widen the canvas
            canvas.width = wide_width
            const offx = Math.floor((wide_width - owidth) / 2)
            canvas.style.left = -offx + 'px'
            manager.canvas.set_x_y(offx, 0)
            manager.canvas.set_w(wide_width)
          } else { // restore the canvas
            canvas.width = owidth
            canvas.style.left = 0
            manager.canvas.set_x_y(0, 0)
            manager.canvas.set_w(owidth)
          }
          manager.canvas.render()
        }
      }
      this.frame = function () {
        this.dispatch_event('frame')
      }
      this.key = function () {
        this.dispatch_event('key', arguments)
      }
      this.dispatch_event = function (event, args) {
        const active = this.UI_list[this.active_UI]
        if (active && active[event]) {
          active[event].apply(active, args)
        }
      }
      this.create_UI = function () {
        for (const I in this.UI_list) {
          if (this.UI_list[I].create) {
            this.UI_list[I].create.call(this.UI_list[I])
          }
        }
      }
      /*\
       * manager.switch_UI
       * show a screen. the screens are plain HTML and are selected by the
       * `state-<name>` class on `.LFroot`, nothing else is touched.
      \*/
      this.switch_UI = function (page) {
        this.dispatch_event('deactive')
        this.active_UI = page
        const classes = util.div().classList
        for (let i = classes.length - 1; i >= 0; i--) {
          if (classes[i].indexOf('state-') === 0) {
            classes.remove(classes[i])
          }
        }
        classes.add('state-' + page)
        const allow_wide = !!this.UI_list[page].allow_wide
        if (window_state.allow_wide !== allow_wide) {
          window_state.allow_wide = allow_wide
          resizer()
        }
        this.dispatch_event('onactive')
      }
      /*\
       * manager.match_end
       * the match is over or was quit: choose fighters for the same mode again
      \*/
      this.match_end = function (event) {
        if (!flow) {
          this.switch_UI('frontpage')
          return
        }
        flow.picks = []
        flow.arena = -1
        start_character_selection()
      }
      this.start_match = function (config) {
        this.switch_UI('gameplay')

        if (timer) {
          network.clearInterval(timer)
          timer = null
        }

        for (let i = 0; i < session.control.length; i++) {
          session.control[i].child = []
        }
        if (!config.demo_mode) {
          session.control.f.child = []
          if (session.control.f.show) {
            session.control.f.show()
          }
        }

        const match = new Match
          ({
            manager: this,
            'package': pack
          })
        match.create
          ({
            control: config.demo_mode ? null : session.control.f,
            player: get_players(),
            background: { id: get_background() },
            set: {
              weapon: true,
              demo_mode: config.demo_mode
            }
          })
        return match

        function get_players() {
          const players = config.players
          const arr = []
          for (let i = 0; i < players.length; i++) {
            if (players[i].use) {
              arr.push({
                name: players[i].name,
                controller: players[i].type === 'human' ? session.control[i] : { type: 'AIscript', id: AI_list[players[i].selected_AI].id },
                id: char_list[players[i].selected].id,
                team: players[i].team === 0 ? 10 + i : players[i].team
              })
            }
          }
          return arr
        }
        function get_background() {
          const options = config.options
          if (options.background === -1) {
            return bg_list[Math.floor(randomseed.next() * bg_list.length)].id
          } else {
            return bg_list[options.background].id
          }
        }
      }
      this.network_debug = function (role) {
        create_network_controllers({
          address: 'http://localhost:8001',
          library: 'network.js',
          path: '/peer'
        }, {
          id1: role === 'active' ? 'a' : 'b',
          id2: role === 'active' ? 'b' : 'a',
          role: role
        })
      }
      this.start_debug = function () {
        const match = this.start_match({
          players: [
            {
              use: true,
              name: 'Player1',
              type: 'human',
              selected: 3,
              team: 1
            },
            {
              use: true,
              name: 'Player2',
              type: 'human',
              selected: 3,
              team: 2
            }
          ],
          options: {
            background: -1, // random
            difficulty: 2 // difficult
          }
        })
      }
      this.start_demo = function (playable) {
        const This = this
        if (playable) {
          util.div().classList.add('demo')
          util.div('demo_notice').hidden = false
          util.div('here_button').onclick = start_game

          session.control.f.child = [{
            key: function (K, D) { if (K === 'esc' && D) { start_game() } }
          }]
          session.control.f.sync = false
        }
        function start_game() {
          match.destroy()
          util.div('demo_notice').hidden = true
          util.div().classList.remove('demo')
          This.switch_UI('frontpage')
        }
        var match = this.start_match({
          demo_mode: true,
          players: [
            {
              use: true,
              name: 'CRUSHER',
              type: 'computer',
              selected: char_index(13), // Lapid
              selected_AI: 0,
              team: 1
            },
            {
              use: true,
              name: 'dumbass',
              type: 'computer',
              selected: char_index(15), // Golan
              selected_AI: 2,
              team: 2
            }
          ],
          options: {
            background: 6,
            difficulty: 2
          }
        })
      }

      // [--- UI helpers. they only set text and toggle classes, all looks are CSS

      /* call `handler(action, index)` when a menu item is clicked */
      function menu_onclick(menu, handler) {
        const items = menu.getElementsByClassName('menu_item')
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          const index = i
          item.onclick = function () {
            handler(item.getAttribute('data-action'), index)
          }
        }
      }

      /*\
       * a fresh game setup. `mode` is one of
       * - `1v1`  the player and one opponent
       * - `ffa`  the player and `bots` opponents, everybody on their own
       * - `1vx`  the player against `bots` opponents playing as one team
       * - `pvp`  every controller is a human player, they pick at the same time
      \*/
      function new_flow(mode) {
        return {
          mode: mode,
          difficulty: 1, // index into `difficulty_AI`
          bots: 1,
          picks: [], // { kind:'human'|'computer', character }
          arena: -1 // index into `bg_list`, -1 being random
        }
      }
      /*\
       * hand the controllers over to the selection screens and show the grid
      \*/
      function start_character_selection() {
        if (Fsupport.localStorage) {
          Fsupport.localStorage.setItem('F.LF/settings', JSON.stringify(settings))
        }
        for (let i = 0; i < session.control.length; i++) {
          session.control[i].sync = true
          if (session.control[i].type === 'touch') {
            session.control[i].show()
            Touchcontroller.enable(true)
            /* the selection screens are picked by tapping them, so the touch
               gamepad must not swallow the touch events. a starting match turns
               this back on (Touchcontroller.paused) to stop the page from
               scrolling and zooming while playing. */
            Touchcontroller.preventDefault = false
          }
        }
        session.control.f.sync = true
        session.control.f.child = []
        if (session.control.f.hide) {
          session.control.f.hide()
        }
        // the selection screens run on their own clock, like a match does
        if (timer) {
          network.clearInterval(timer)
        }
        timer = network.setInterval(function () { manager.frame() }, 1000 / 12)
        for (let i = 0; i < session.control.length; i++) {
          const num = i
          session.control[i].child = [{
            key: function (K, D) { if (D) { manager.key(num, K) } }
          }]
        }
        manager.switch_UI('character_selection')
      }
      function fetch_controllers() {
        for (let i = 0; i < session.control.length; i++) {
          session.control[i].fetch()
        }
        manager.sound.TU()
      }
      /* index into `char_list` of the character with data `id` */
      function char_index(id) {
        for (let i = 0; i < char_list.length; i++) {
          if (char_list[i].id === id) { return i }
        }
        return 0
      }
      function random_character() {
        return Math.floor(randomseed.next() * char_list.length)
      }
      /* the AI script of each difficulty, by AI id of the content package */
      const difficulty_AI = [3, 2, 1] // easy: dumbass, normal: challangar, difficult: crusher
      function difficulty_AI_index() {
        const id = difficulty_AI[flow.difficulty]
        for (let i = 0; i < AI_list.length; i++) {
          if (AI_list[i].id === id) {
            return i
          }
        }
        return 0
      }
      /*\
       * the entries of the character grid: an odd sided square (3x3 for up to
       * 8 characters) with random in the center cell, where the cursor starts,
       * and the characters of the package around it in reading order, then the
       * upcoming characters (`upcoming`: shown grayed out, never selectable).
       * the cells left over are `null`, shown blank and never selectable.
      \*/
      function character_entries() {
        let side = Math.max(3, Math.ceil(Math.sqrt(char_list.length + upcoming_list.length + 1)))
        if (side % 2 === 0) {
          side++
        }
        const center = (side * side - 1) / 2
        const entries = []
        let next = 0
        let next_upcoming = 0
        for (let i = 0; i < side * side; i++) {
          if (i === center) {
            entries.push({ character: -1, name: char_list[-1].name })
          } else if (next < char_list.length) {
            entries.push({ character: next, name: char_list[next].name, pic: img_list[next] })
            next++
          } else if (next_upcoming < upcoming_list.length) {
            const U = upcoming_list[next_upcoming]
            entries.push({ upcoming: true, name: U.name, name_local: U.name_local, pic: U.pic })
            next_upcoming++
          } else {
            entries.push(null)
          }
        }
        return { entries: entries, side: side, center: center }
      }
      function arena_entries() {
        const entries = [{ arena: -1, name: bg_list[-1].name }]
        for (let i = 0; i < bg_list.length; i++) {
          entries.push({ arena: i, name: bg_list[i].name, pic: bg_list[i].preview })
        }
        return entries
      }
      /* what a preview shows for a character, -1 being random */
      function character_state(character, locked) {
        if (character === -1 || character === null || character === undefined) {
          return { name: char_list[-1].name, pic: null, locked: !!locked }
        }
        return { name: char_list[character].name, pic: img_list[character], locked: !!locked }
      }
      /*\
       * turn the picks into the player list a match expects. the humans come
       * first, because a match takes their controller from their position.
      \*/
      function flow_players() {
        const players = []
        for (let i = 0; i < flow.picks.length; i++) {
          const pick = flow.picks[i]
          players.push({
            use: true,
            type: pick.kind,
            name: pick.kind === 'human'
              ? (session.player[i] ? session.player[i].name : 'player' + (i + 1))
              : char_list[pick.character].name,
            selected: pick.character,
            selected_AI: difficulty_AI_index(),
            team: flow_team(i)
          })
        }
        return players
      }
      function flow_team(i) {
        if (flow.mode === 'ffa' ||
          (flow.mode === 'pvp' && flow.picks.length > 2)) {
          return 0 // independent: a match gives every one of them its own team
        }
        return i === 0 ? 1 : 2 // the player against the rest
      }

      // ---]

      // constructor
      this.create()
    }

    /*\
     * clone the `<template>` of a holder element. the markup of repeated items
     * (grid cells, roster entries) lives in game.html, only their number is
     * decided here.
    \*/
    function clone_template(holder) {
      const template = holder.getElementsByTagName('template')[0]
      return document.importNode(template.content, true).firstElementChild
    }
    /*\
     * replace the `prefix...` class of an element by `prefix + name`
    \*/
    function set_class(el, prefix, name) {
      const classes = el.classList
      for (let i = classes.length - 1; i >= 0; i--) {
        if (classes[i].indexOf(prefix) === 0) {
          classes.remove(classes[i])
        }
      }
      if (name) {
        classes.add(prefix + name)
      }
    }
    function fill_portrait(el, state) {
      if (state && state.pic) {
        el.style.backgroundImage = 'url("' + Fsprite_dom.resolve_resource(state.pic) + '")'
        el.classList.remove('random')
      } else {
        el.style.backgroundImage = ''
        if (state) {
          el.classList.add('random') // shows the '?' of the markup
        } else {
          el.classList.remove('random')
        }
      }
    }
    function set_state_classes(el, state) {
      if (state && state.locked) {
        el.classList.add('locked')
      } else {
        el.classList.remove('locked')
      }
      if (state) {
        el.classList.remove('empty')
      } else {
        el.classList.add('empty')
      }
    }
    function set_preview(panel, state) {
      fill_portrait(panel.getElementsByClassName('preview_portrait')[0], state)
      panel.getElementsByClassName('preview_name')[0].innerHTML = state ? state.name : ''
      set_state_classes(panel, state)
    }
    function set_roster_entry(entry, state) {
      fill_portrait(entry.getElementsByClassName('roster_portrait')[0], state)
      entry.getElementsByClassName('roster_name')[0].innerHTML = state ? state.name : ''
      set_state_classes(entry, state)
    }
    /* as many roster entries as there are opponents */
    function build_roster(count) {
      const roster = util.div('roster')
      const entries = roster.getElementsByClassName('roster_entry')
      while (entries.length > count) {
        roster.removeChild(entries[entries.length - 1])
      }
      while (entries.length < count) {
        roster.appendChild(clone_template(roster))
      }
    }

    /*\
     * grid_picker
     * a grid of selectable entries (characters, arenas) with one cursor per
     * player who is choosing. the cells are cloned from the `<template>` inside
     * the grid, so the grid grows and shrinks with the content package.
     *
     * the cursor of player `p` is the class `cursor_p<p>` on a cell, and
     * `locked_p<p>` once that player settled on it; everything else is CSS.
     *
     * `options.columns` fixes the number of cells in a row (otherwise the grid
     * stays roughly square), `options.home` is where the cursors start. a
     * `null` entry is a `blank` cell that the cursors skip, an entry marked
     * `upcoming` is an `upcoming` cell: shown, but skipped all the same.
    \*/
    function grid_picker(grid) {
      this.grid = grid
      this.cells = []
      this.entries = []
      this.cursor = []
      this.locked = []
      this.fixed_columns = 0
      this.home = 0
    }
    grid_picker.prototype.build = function (entries, options) {
      const This = this
      options = options || {}
      this.fixed_columns = options.columns || 0
      this.home = options.home || 0
      for (let i = 0; i < this.cells.length; i++) {
        this.grid.removeChild(this.cells[i])
      }
      this.cells = []
      this.entries = entries
      for (let i = 0; i < entries.length; i++) {
        const cell = clone_template(this.grid)
        const index = i
        fill_portrait(cell.getElementsByClassName('cell_portrait')[0], entries[i])
        const label = cell.getElementsByClassName('cell_label')[0]
        if (entries[i] && entries[i].upcoming) {
          label.innerHTML = "<span class='label'>soon</span><span class='label_local'>בקרוב</span>" // instead of the name
        } else {
          label.innerHTML = entries[i] ? entries[i].name : '&nbsp;' // keeps the blank cell as tall as the others
        }
        cell.className = this.cell_class(i)
        cell.onclick = function () {
          if (This.selectable(index) && This.onclick_cell) {
            This.onclick_cell(index)
          }
        }
        this.grid.appendChild(cell)
        this.cells.push(cell)
      }
    }
    /*\
     * choose how many cells fit in a row so that the grid stays roughly square,
     * whatever the content package holds. must run while the grid is visible.
    \*/
    grid_picker.prototype.layout = function () {
      if (!this.cells.length) {
        return
      }
      const cell = this.cells[0]
      const margin = parseInt(window.getComputedStyle(cell).marginLeft) || 0
      const outer = cell.offsetWidth + margin * 2
      if (!outer) {
        return
      }
      const columns = this.fixed_columns || Math.ceil(Math.sqrt(this.cells.length))
      this.grid.style.width = (columns * outer) + 'px'
    }
    grid_picker.prototype.reset_cursors = function (count) {
      for (let i = 0; i < this.cells.length; i++) {
        this.cells[i].className = this.cell_class(i)
      }
      this.cursor = []
      this.locked = []
      for (let p = 0; p < count; p++) {
        this.cursor[p] = this.home
        this.locked[p] = false
        this.paint(p, true)
      }
    }
    /* whether a cursor may rest on cell `i`: not blank, not upcoming */
    grid_picker.prototype.selectable = function (i) {
      const entry = this.entries[i]
      return !!entry && !entry.upcoming
    }
    grid_picker.prototype.cell_class = function (i) {
      const entry = this.entries[i]
      return !entry ? 'cell blank' : entry.upcoming ? 'cell upcoming' : 'cell'
    }
    grid_picker.prototype.paint = function (p, on) {
      const cell = this.cells[this.cursor[p]]
      if (!cell) {
        return
      }
      if (on) {
        cell.classList.add('cursor_p' + p)
      } else {
        cell.classList.remove('cursor_p' + p)
        cell.classList.remove('locked_p' + p)
      }
    }
    grid_picker.prototype.set_cursor = function (p, index) {
      if (this.locked[p] || this.cursor[p] === index || !this.selectable(index)) {
        return
      }
      this.paint(p, false)
      this.cursor[p] = index
      this.paint(p, true)
      if (this.onmove) {
        this.onmove(p, index)
      }
    }
    grid_picker.prototype.lock_cursor = function (p, on) {
      this.locked[p] = on
      const cell = this.cells[this.cursor[p]]
      if (on) {
        cell.classList.add('locked_p' + p)
      } else {
        cell.classList.remove('locked_p' + p)
      }
    }
    grid_picker.prototype.cursor_entry = function (p) {
      return this.entries[this.cursor[p]]
    }
    /* how many cells the stylesheet put in a row */
    grid_picker.prototype.columns = function () {
      if (this.fixed_columns) {
        return this.fixed_columns
      }
      const top = this.cells[0].offsetTop
      for (let i = 1; i < this.cells.length; i++) {
        if (this.cells[i].offsetTop !== top) {
          return i
        }
      }
      return this.cells.length
    }
    grid_picker.prototype.move = function (p, dx, dy) {
      const n = this.cells.length
      if (!n || this.locked[p]) {
        return
      }
      let index = this.cursor[p]
      if (dx) { // in reading order, wrapping around and over the blank cells
        for (let step = 0; step < n; step++) {
          index = (index + dx + n) % n
          if (this.selectable(index)) {
            break
          }
        }
      }
      if (dy) { // within the column, wrapping around
        const columns = this.columns()
        const rows = Math.ceil(n / columns)
        const column = index % columns
        let row = Math.floor(index / columns)
        for (let step = 0; step < rows; step++) { // skip a short last row and the blank cells
          row = (row + dy + rows) % rows
          if (row * columns + column < n && this.selectable(row * columns + column)) {
            break
          }
        }
        index = Math.min(row * columns + column, n - 1)
      }
      this.set_cursor(p, index)
    }

    /*\
     * message_overlay
     * the in game `pause`/`demo`/`loading` message. the message name is a class,
     * the stylesheet picks the slice of the artwork.
    \*/
    function message_overlay(div) {
      this.el = div
    }
    message_overlay.prototype.set = function (mess) {
      this.el.className = 'message_overlay ' + mess
      this.el.hidden = false
    }
    message_overlay.prototype.show = function () {
      this.el.hidden = false
    }
    message_overlay.prototype.hide = function () {
      this.el.hidden = true
    }

    /*\
     * summary_dialog
     * the end of match table. the rows are in the document, unused ones are
     * hidden and the remaining ones stack up by themselves.
    \*/
    function summary_dialog(div) {
      this.el = div
      this.rows = div.getElementsByClassName('summary_row')
      this.time = div.getElementsByClassName('summary_time')[0]
    }
    summary_dialog.columns = ['col_name', 'col_kill', 'col_attack', 'col_hp_lost', 'col_mp_usage', 'col_picking', 'col_status']
    summary_dialog.prototype.show = function () {
      this.el.hidden = false
    }
    summary_dialog.prototype.hide = function () {
      this.el.hidden = true
    }
    /*\
     * summary_dialog.set_info
     - info (array) one entry per player:
     | [ Icon, Name, Kill, Attack, HP Lost, MP Usage, Picking, Status ]
    \*/
    summary_dialog.prototype.set_info = function (info) {
      for (let i = 0; i < this.rows.length; i++) {
        if (i < info.length) {
          this.set_row_data(i, info[i])
          this.rows[i].hidden = false
        } else {
          this.rows[i].hidden = true
        }
      }
    }
    summary_dialog.prototype.set_time = function (time) {
      this.time.innerHTML = time
    }
    summary_dialog.prototype.set_row_data = function (i, data) {
      const row = this.rows[i]
      row.getElementsByClassName('icon')[0].style.backgroundImage =
        'url("' + Fsprite_dom.resolve_resource(data[0]) + '")'
      for (let j = 0; j < summary_dialog.columns.length; j++) {
        row.getElementsByClassName(summary_dialog.columns[j])[0].innerHTML = data[j + 1]
      }
      if (data[7].indexOf('Win') !== -1) {
        row.classList.remove('lose')
      } else {
        row.classList.add('lose')
      }
    }

    return Manager
  })
