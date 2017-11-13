const assert = require('assert')
const rmrf = require('rimraf')
const Server = require('../src/server')
const fetch = require('node-fetch')

describe('Query', function () {
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

  it('throws an error when database doesn\'t exist', async () => {
    const address = '/orbitdb/Qmd8TmZrWASypEp4Er9tgWP4kCNQnW4ncSnvjvyHQ3EVSU/doesntexist'

    let res, json
    try {
      res = await fetch(`http://localhost:37373${address}`)
      json = await res.json()
    } catch (e) {
      assert.equal(e.toString(), null)
    }

    assert.equal(res.status, 500)
    assert.notEqual(json, null)
    assert.equal(json.error, `Error: Database '${address}' doesn't exist!`)
  })

  it('can query an empty database', async () => {
    let res1, res2, json1, json2
    try {
      // First create the database
      res1 = await fetch(`http://localhost:37373/create/eventlog/hello`)
      json1 = await res1.json()
      // Then query it
      res2 = await fetch(`http://localhost:37373${json1.address}`)
      json2 = await res2.json()
    } catch (e) {
      assert.equal(e.toString(), null)
    }

    assert.equal(res2.status, 200)
    assert.notEqual(json2, null)
    assert.deepEqual(json2.result, [])
  })
})
