const assert = require('assert')
const rmrf = require('rimraf')
const Server = require('../src/server')
const fetch = require('node-fetch')
const resumer = require('resumer')

const host = '127.0.0.1'
const port = 37373
const url = 'http://' + host + ':' + port

describe('Add', function () {
  this.timeout(20000)
  let server 

  before(async () => {
    rmrf.sync('./orbitdb')
    server = await Server({ port, host })
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
      res1 = await fetch(`${url}/create/eventlog/hello`)
      json1 = await res1.json()
      // Then add an entry
      event = JSON.stringify({ hello: 'hello' })
      res2 = await fetch(`${url}/add${json1.address}`, { 
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
      res1 = await fetch(`${url}/create/eventlog/hello2`)
      json1 = await res1.json()
      // Then add an entry (null)
      res2 = await fetch(`${url}/add${json1.address}`, { 
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
    let res1, res2, json1, json2
    try {
      // First create the database
      res1 = await fetch(`${url}/create/eventlog/hello-many`)
      json1 = await res1.json()
      // Then add the entries
      for (let i = 0; i < entryCount; i ++) {
        res2 = await fetch(`${url}/add${json1.address}`, { 
          method: 'POST', 
          body: i.toString(),
          headers: {
            'Content-Type': 'text/plain',
          }
        })
      }
      res2 = await fetch(`${url}${json1.address}`)
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

  it('can add entries as a stream', async () => {
    const entryCount = 10
    let res1, res2, res3, json1, json2, json3
    try {
      // First create the database
      res1 = await fetch(`${url}/create/eventlog/hello-stream`)
      json1 = await res1.json()

      const stream = resumer()
      let i = 0

      const interval = setInterval(async () => {
        if (i < entryCount) {
          stream.queue('beep boop ' + i)
        } else {
          clearInterval(interval)
          stream.end()
        }
        i ++
      }, 100)

      res2 = await fetch(`${url}/add${json1.address}`, { 
        method: 'POST', 
        body: stream,
        headers: {
          'Content-Type': 'application/octet-stream',
        }
      })

      json2 = await res2.json()
      assert.equal(res2.status, 200)
      assert.notEqual(json2, null)
      assert.deepEqual(json2.length, entryCount)

      // Then query the results
      res3 = await fetch(`${url}${json1.address}`)
      json3 = await res3.json()
    } catch (e) {
      assert.equal(e.toString(), null)
    }

    assert.equal(res3.status, 200)
    assert.notEqual(json3, null)
    for (let a = 0; a < entryCount; a ++) {
      const entry = json3.result[a]
      assert.equal(entry.payload.value, 'beep boop ' + a)
    }
  })
})
