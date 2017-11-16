const assert = require('assert')
const rmrf = require('rimraf')
const Server = require('../src/server')
const fetch = require('node-fetch')
const resumer = require('resumer')

const host = '127.0.0.1'
const port = 37373
const url = 'http://' + host + ':' + port

describe('Get', function () {
  this.timeout(60000)
  let server1, server2

  before(async () => {
    rmrf.sync('./orbitdb')
    server1 = await Server({ port, host })
    server2 = await Server({ port: 11111, host: host, ipfsPath: './orbitdb/server2/ipfs', orbitdbPath: './orbitdb/server2' })
  })

  after(async () => {
    if (server2)
      await server2.stop()

    if (server1)
      await server1.stop()

    server1 = null
    server2 = null
  })

  it('throws an error when database doesn\'t exist', async () => {
    const address = '/orbitdb/Qmd8TmZrWASypEp4Er9tgWP4kCNQnW4ncSnvjvyHQ3EVSU/doesntexist'

    let res, json
    try {
      res = await fetch(`${url}${address}`)
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
      res1 = await fetch(`${url}/create/eventlog/hello`)
      json1 = await res1.json()
      // Then query it
      res2 = await fetch(`${url}${json1.address}`)
      json2 = await res2.json()
    } catch (e) {
      assert.equal(e.toString(), null)
    }

    assert.equal(res2.status, 200)
    assert.notEqual(json2, null)
    assert.deepEqual(json2.result, [])
  })

  // Skip for now as libp2p throws an error upon stopping IPFS
  it.skip('returns the query results as a live stream', async () => {
    const entryCount = 4
    let request, res1, json1, json2, result
    try {
      // First create the database
      res1 = await fetch(`${url}/create/eventlog/hello-stream`)
      json1 = await res1.json()

      // Function to verify that all entries were added successfully
      const verifyAdded = async (response) => {
        const result = await response.json()
        assert.equal(response.status, 200)
        assert.notEqual(result, null)
        assert.deepEqual(result.length, entryCount)
        console.log('> Entries were added to database')
      }

      // Start adding events to the database
      const stream = resumer()
      fetch(`${url}/add${json1.address}`, { 
        method: 'POST', 
        body: stream,
        headers: {
          'Content-Type': 'application/octet-stream',
        }
      })
      .then(verifyAdded)
    
      for (let i = 0; i < entryCount; i ++) {
          stream.queue('beep boop ' + i)
          await new Promise(resolve => setTimeout(resolve, 100))        
      }
      stream.end()

      // Query the database until we have <entryCount> number of entries
      const query = () => {
        return new Promise(async (resolve, reject) => {
          // Start listening for the updates and get the response as a stream
          fetch(`http://${host}:11111${json1.address}?live=true`)
            .then((res) => {
              assert.equal(res.status, 200)
              res.body.on('data', (chunk) => {
                const result = JSON.parse(chunk)['result']
                if (result.length === entryCount) {
                  resolve(result)
                }
              })
            })
        })
      }

      // Start the query stream
      result = await query()
    } catch (e) {
      console.error(e)
      assert.equal(e.toString(), null)
    }

    // Check that the result contains all the added values
    result.forEach((entry, idx) => {
      assert.equal(entry.payload.value, 'beep boop ' + idx)
    })
  })
})
