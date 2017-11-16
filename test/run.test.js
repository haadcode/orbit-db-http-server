const assert = require('assert')
const rmrf = require('rimraf')
const fetch = require('node-fetch')
const Server = require('../src/server')

const defaultPort = require('../src/default-port')

const host = '127.0.0.1'
const port = 37373
const url = 'http://' + host + ':' + port

describe('Start & Stop', function () {
  this.timeout(20000)

  describe('Defaults', () => {
    let server 

    before(async () => {
      rmrf.sync('./orbitdb')
      server = await Server()
    })

    after(async () => {
      if (server)
        await server.stop()

      server = null
    })

    it('starts the http server', async () => {
      assert.notEqual(server, null)
      assert.equal(server.state.started, true)
      assert.equal(server.state.port, defaultPort)
    })

    it('server info contains the port where the server started', async () => {
      assert.notEqual(server.state, null)
      assert.equal(server.state.port, defaultPort)
    })

    it('returns index page', async () => {
      let res, text
      try {
        res = await fetch(`${url}/`)
        text = await res.text()
      } catch (e) {
        assert.equal(e.toString(), null)
      }

      assert.equal(res.status, 200)
      assert.equal(text, 'OrbitDB')
    })

    it('stops the http server', async () => {
      await server.stop()
      assert.equal(server.state, null)
    })
  })

  describe('With options', () => {
    it('starts the http server in a specified port', async () => {
      const port = 44556
      let server = await Server({ port: port, host: host })
      assert.notEqual(server, null)
      assert.notEqual(server.state, null)
      assert.equal(server.state.started, true)
      assert.equal(server.state.port, port)
      await server.stop()
    })
  })
})
