define(function () {
  const PROJECT_TOKEN = 'phc_sReyy9Fusf6pbrWiw42dUnHV3RKAZCBVxDXoiAqqVhrZ'
  const API_HOST = 'https://eu.i.posthog.com'
  const SDK = 'third_party/ph.js'
  const FORCE_PARAM = 'analytics'
  const LOCAL = { 'localhost': true, '127.0.0.1': true, '[::1]': true, '': true }
  const PENDING = 8

  function should_report() {
    try {
      if (new RegExp('[?&]' + FORCE_PARAM + '=1(&|$)').test(window.location.search)) {
        return true
      }
      if (window.location.protocol.indexOf('http') !== 0) {
        return false
      }
      return !LOCAL[window.location.hostname]
    } catch (e) {
      return false
    }
  }

  function Analytics() {
    this.client = null // the SDK once it has loaded and `init` took
    this.started = false // true once `init` decided to report
    this.queued = [] // events raised while the SDK was still loading
  }

  Analytics.prototype.init = function (build) {
    if (this.started || !should_report()) {
      return
    }
    this.started = true
    const This = this
    try {
      require([SDK], function () {
        try {
          const posthog = window.posthog
          posthog.init(PROJECT_TOKEN, {
            api_host: API_HOST,
            defaults: '2026-05-30',
            // the game is a canvas and a few menus, autocapture would report
            // clicks on `<div class="menu_item">` saying less than the events
            // below do. off on purpose
            autocapture: false,
            capture_pageview: true,
            capture_pageleave: true,
            disable_session_recording: true,
            persistence: 'localStorage',
            // no accounts, so nobody is identified and a person profile would
            // be an empty row per visitor
            person_profiles: 'never'
          })
          posthog.register({
            game: 'knesset-fighter',
            version: build && build.version,
            device: build && build.device
          })
          This.client = posthog
          const pending = This.queued
          This.queued = []
          for (let i = 0; i < pending.length; i++) {
            posthog.capture(pending[i][0], pending[i][1])
          }
        } catch (e) {
          This.client = null
          This.queued = []
        }
      }, function () {
        // blocked or missing: drop whatever was waiting. analytics is never a
        // reason for the game to misbehave
        This.queued = []
      })
    } catch (e) {
      this.queued = []
    }
  }

  Analytics.prototype.match_started = function (report) {
    this.capture('match_started', {
      mode: report.mode,
      difficulty: report.difficulty,
      bots: report.bots,
      arena: report.arena,
      network: report.network,
      humans: report.humans,
      fighters: report.fighters.length,
      character: report.character,
      opponents: report.opponents.join(', ')
    })
  }

  Analytics.prototype.match_finished = function (report, outcome) {
    this.capture('match_finished', {
      mode: report.mode,
      difficulty: report.difficulty,
      bots: report.bots,
      arena: report.arena,
      network: report.network,
      fighters: report.fighters.length,
      character: report.character,
      result: outcome.result,
      winners: outcome.winners.join(', '),
      seconds: Math.round(outcome.seconds),
      kills: outcome.stat ? outcome.stat.kill : null,
      attacks: outcome.stat ? outcome.stat.attack : null,
      hp_lost: outcome.stat ? outcome.stat.hp_lost : null
    })
  }

  Analytics.prototype.match_quit = function (report, seconds) {
    this.capture('match_quit', {
      mode: report.mode,
      difficulty: report.difficulty,
      network: report.network,
      character: report.character,
      seconds: Math.round(seconds)
    })
  }

  Analytics.prototype.network_invite = function (as_qr) {
    this.capture('network_invite', { as: as_qr ? 'qr' : 'link' })
  }

  Analytics.prototype.invite_shared = function (method) {
    this.capture('invite_shared', { method: method })
  }

  Analytics.prototype.network_connected = function (role) {
    this.capture('network_connected', { role: role })
  }

  Analytics.prototype.network_failed = function (role) {
    this.capture('network_failed', { role: role })
  }

  Analytics.prototype.capture = function (name, props) {
    if (!this.started) {
      return
    }
    try {
      if (this.client) {
        this.client.capture(name, props)
      } else if (this.queued.length < PENDING) {
        this.queued.push([name, props])
      }
    } catch (e) {
      // a dropped event is not worth a broken frame
    }
  }

  return new Analytics()
})
