/*\
 * webrtc: serverless network game
 *
 * the two peers meet without a lobby server: the host's session description
 * (SDP, with every ICE candidate already gathered, since nothing can trickle
 * without a server) is gzipped into the hash of an invitation link, and the
 * guest answers with a reply link of the same kind:
 *
 *   host:  peer.invite()      -> game.html#offer=...   (sent to the guest)
 *   guest: peer.join(offer)   -> game.html#answer=...  (sent back to the host)
 *   host:  peer.accept(reply) -> the data channel opens on both sides
 *
 * a reply link opened in the host's own browser is handed to the waiting host
 * tab over a BroadcastChannel (see `relay`), so the host can simply click it.
 *
 * a connected peer is a transport for core/network: `setup(config, handler)`
 * reports `open` with a `{send}` connection, then `data` and `close`.
\*/

define(function () {
  const rtc_config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
  const ice_timeout = 5000 // ms. use whatever was gathered by then
  const relay_name = 'F.LF/webrtc'

  // [--- helpers

  /* compress a session description into a URL-safe base64 string */
  async function pack(desc) {
    const json = JSON.stringify({ type: desc.type, sdp: desc.sdp })
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  async function unpack(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) { base64 += '=' }
    const bytes = Uint8Array.from(atob(base64), function (c) { return c.charCodeAt(0) })
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    return JSON.parse(await new Response(stream).text())
  }
  function wait_ice(pc) {
    return new Promise(function (resolve) {
      if (pc.iceGatheringState === 'complete') {
        resolve()
        return
      }
      const timeout = setTimeout(resolve, ice_timeout)
      pc.addEventListener('icegatheringstatechange', function () {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout)
          resolve()
        }
      })
    })
  }
  function base_url() {
    return window.location.href.split('#')[0]
  }
  function make_link(key, packed) {
    return base_url() + '#' + key + '=' + packed
  }
  /*\
   * webrtc.read
   * the value of `key` in a link, a bare hash, or the packed string itself
  \*/
  function read(key, text) {
    text = (text || '').trim()
    const at = text.indexOf('#')
    if (at < 0) {
      return /^[\w-]+$/.test(text) ? text : null // the packed string itself
    }
    return new URLSearchParams(text.slice(at + 1)).get(key)
  }
  // ---]

  /*\
   * webrtc.Peer
   * one end of the connection. `onopen` is called once the data channel is up,
   * `onfail` if the connection cannot be made or breaks before a game began.
  \*/
  function Peer() {
    const This = this
    this.pc = new RTCPeerConnection(rtc_config)
    this.channel = null
    this.handler = null
    this.inbox = [] // messages that arrived before core/network was set up
    this.pc.ondatachannel = function (event) {
      This.attach(event.channel)
    }
    this.pc.onconnectionstatechange = function () {
      if (This.pc.connectionState === 'failed') {
        This.lost()
      }
    }
  }
  Peer.prototype.attach = function (channel) {
    const This = this
    this.channel = channel
    channel.onmessage = function (event) {
      const data = JSON.parse(event.data)
      if (This.handler) {
        This.handler.on('data', data)
      } else {
        This.inbox.push(data)
      }
    }
    channel.onopen = function () {
      if (This.onopen) { This.onopen() }
    }
    channel.onclose = function () {
      This.lost()
    }
  }
  Peer.prototype.lost = function () {
    if (this.closed) {
      return
    }
    this.closed = true
    if (this.handler) {
      this.handler.on('close')
    } else if (this.onfail) {
      this.onfail()
    }
  }
  /* host: create the invitation link */
  Peer.prototype.invite = async function () {
    this.attach(this.pc.createDataChannel('F.LF'))
    await this.pc.setLocalDescription(await this.pc.createOffer())
    await wait_ice(this.pc)
    return make_link('offer', await pack(this.pc.localDescription))
  }
  /* host: take the guest's reply (a link or the packed answer) */
  Peer.prototype.accept = async function (text) {
    const answer = read('answer', text)
    if (!answer) {
      throw new Error('not a reply link')
    }
    await this.pc.setRemoteDescription(await unpack(answer))
  }
  /* guest: answer the packed offer of an invitation link */
  Peer.prototype.join = async function (offer) {
    await this.pc.setRemoteDescription(await unpack(offer))
    await this.pc.setLocalDescription(await this.pc.createAnswer())
    await wait_ice(this.pc)
    return make_link('answer', await pack(this.pc.localDescription))
  }
  Peer.prototype.close = function () {
    this.closed = true
    this.pc.close()
  }

  // [--- transport interface of core/network
  Peer.prototype.setup = function (config, handler) {
    const channel = this.channel
    this.handler = handler
    handler.on('open', {
      send: function (data) {
        if (channel.readyState === 'open') {
          channel.send(JSON.stringify(data))
        }
      }
    })
    const inbox = this.inbox
    this.inbox = []
    for (let i = 0; i < inbox.length; i++) {
      handler.on('data', inbox[i])
    }
  }
  Peer.prototype.teardown = function () {
    this.close()
  }
  // ---]

  /*\
   * webrtc.relay
   * hand reply links between tabs of the same browser.
   - listen(function (answer)) a host waiting for its reply
   - deliver(answer, function (delivered)) a tab opened with a reply link
  \*/
  const relay = {
    supported: typeof BroadcastChannel !== 'undefined',
    listen: function (onanswer) {
      const bc = new BroadcastChannel(relay_name)
      bc.onmessage = function (event) {
        if (event.data && event.data.answer) {
          bc.postMessage({ ack: true })
          onanswer(event.data.answer)
        }
      }
      return bc
    },
    deliver: function (answer, callback) {
      const bc = new BroadcastChannel(relay_name)
      const timeout = setTimeout(function () {
        bc.close()
        callback(false)
      }, 1500)
      bc.onmessage = function (event) {
        if (event.data && event.data.ack) {
          clearTimeout(timeout)
          bc.close()
          callback(true)
        }
      }
      bc.postMessage({ answer: answer })
    }
  }

  return {
    supported: typeof RTCPeerConnection !== 'undefined' && typeof CompressionStream !== 'undefined',
    Peer: Peer,
    read: read,
    base_url: base_url,
    relay: relay
  }
})
