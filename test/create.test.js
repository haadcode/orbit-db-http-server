const assert = require('assert')
const rmrf = require('rimraf')
const Server = require('../src/server')
const fetch = require('node-fetch')

describe('Create', function () {
  this.timeout(20000)
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

  it('creates a new database', async () => {
    const address = '/orbitdb/Qmd8TmZrWASypEp4Er9tgWP4kCNQnW4ncSnvjvyHQ3EVSU/doesntexist'

    let res, json
    try {
      res = await fetch(`http://localhost:37373/create/eventlog/hello`)
      json = await res.json()
    } catch (e) {
      assert.equal(e.toString(), null)
    }

    assert.equal(res.status, 200)
    assert.notEqual(json, null)
    assert.equal(json.name, 'hello')
    assert.equal(json.type, 'eventlog')
    assert.equal(json.address.indexOf('/orbitdb'), 0)
    assert.equal(json.address.indexOf('hello'), 56)
  })
})
