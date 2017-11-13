const assert = require('assert')
const rmrf = require('rimraf')
const Server = require('../src/server')
const fetch = require('node-fetch')
const FormData = require('form-data')

describe('Add', function () {
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

  it('can add an entry to a database', async () => {
    let event, res1, res2, json1, json2
    try {
      // First create the database
      res1 = await fetch(`http://localhost:37373/create/eventlog/hello`)
      json1 = await res1.json()
      // Then add an entry
      event = JSON.stringify({ hello: 'hello' })
      res2 = await fetch(`http://localhost:37373/add${json1.address}`, { 
        method: 'POST', 
        body: event,
        headers: {
          'Content-Type': 'text/plain',
        }
      })
      json2 = await res2.json()
    } catch (e) {
      console.error(e.toString())
      assert.equal(e.toString(), null)
    }

    assert.equal(res2.status, 200)
    assert.notEqual(json2, null)
    assert.notEqual(json2.hash, null)
    assert.equal(json2.hash.indexOf('Qm'), 0)
    assert.notEqual(json2, null)
    assert.equal(json2.payload.op, 'ADD')
    assert.deepEqual(json2.payload.value, event)
    assert.equal(json2.clock.time, 1)
  })

  it('returns 500 if entry was not specified', async () => {
    let res1, res2, json1, json2
    try {
      // First create the database
      res1 = await fetch(`http://localhost:37373/create/eventlog/hello2`)
      json1 = await res1.json()
      // Then add an entry (null)
      res2 = await fetch(`http://localhost:37373/add${json1.address}`, { 
        method: 'POST', 
        body: null,
        headers: {
          'Content-Type': 'text/plain',
        }
      })
      json2 = await res2.text()
    } catch (e) {
      console.error(e.toString())
      assert.equal(e.toString(), null)
    }

    assert.equal(res2.status, 500)
    assert.notEqual(json2, null)
    assert.notEqual(json2.error, 'Error: Database entry was undefined')
  })

  it('can add multiple entries to a database', async () => {
    const entryCount = 32
    let event, res1, res2, json1, json2
    try {
      // First create the database
      res1 = await fetch(`http://localhost:37373/create/eventlog/hello-many`)
      json1 = await res1.json()
      // Then add the entries
      for (let i = 0; i < entryCount; i ++) {
        event = JSON.stringify({ hello: 'hello' })
        res2 = await fetch(`http://localhost:37373/add${json1.address}`, { 
          method: 'POST', 
          body: i.toString(),
          headers: {
            'Content-Type': 'text/plain',
          }
        })
      }
      res2 = await fetch(`http://localhost:37373${json1.address}`)
      json2 = await res2.json()
    } catch (e) {
      console.error(e.toString())
      assert.equal(e.toString(), null)
    }

    assert.equal(res2.status, 200)
    assert.notEqual(json2, null)
    assert.equal(json2.result.length, entryCount)
    assert.equal(json2.result[0].payload.value, '0')
    assert.equal(json2.result[json2.result.length - 1].payload.value, (entryCount - 1).toString())
    assert.equal(json2.result[0].clock.time, 1)
    assert.equal(json2.result[json2.result.length - 1].clock.time, entryCount)
  })
})
