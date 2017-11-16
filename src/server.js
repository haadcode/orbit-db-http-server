const express = require('express')
const bodyParser = require('body-parser')
const startIpfsAndOrbitDB = require('./start-ipfs-and-orbitdb')
const stoppable = require('stoppable')

// Route handlers
const create = require('./routes/create')
const get = require('./routes/get')
const add = require('./routes/add')

// Logging
const Logger = require('logplease')
const logger = Logger.create("orbit-db-http-server", { color: Logger.Colors.Yellow })
Logger.setLogLevel('ERROR')

// Default port
const defaultPort = require('../src/default-port')

// Start
const startHttpServer = async (options = {}) => {
  // Bind to a specific host if given
  const host = options.host
  // Make sure we have a port
  const port = options.port || defaultPort

  logger.log(`Start http-server in port ${port}`)

  // Create the server
  const app = express()

  return new Promise((resolve, reject) => {
    // Start the HTTP server
    let server = app.listen({ port: port, host: host }, async () => {
      server = stoppable(server, 1000)
      // Start IPFS and OrbitDB
      let { orbitdb, ipfs } = await startIpfsAndOrbitDB(options)
      // Add a state info object to the server
      server.state = {
        // Set the port the server was started
        port: port,
        // Set the state to started
        started: true,
      }
      // Add a stop function that resets the server state after the server was closed
      const stopFunc = server.stop
      server.stop = () => {
        return new Promise(async (resolve) => {
          await orbitdb.disconnect()
          ipfs.stop(() => {
            delete server.state
            stopFunc(() => resolve())
          })
        })
      }

      const logRequest = (req, res, next) => {
        logger.debug(`[${req.method}] ${req.url}`)
        req.logger = logger
        next()
      }

      const useOrbitDB = (req, res, next) => {
        req.orbitdb = orbitdb
        next()
      }

      // Setup routes
      app.use(logRequest) // Logging
      app.use(bodyParser.text({ type: 'text/plain' }))
      app.use(useOrbitDB) // Pass OrbitDB instance to the route handlers
      app.get('/', (req, res) => res.send('OrbitDB')) // Default index page
      app.get('/orbitdb/*', get) // Query a database
      app.get('/create/:type/:name', create) // Create a new databse
      app.post('/add/orbitdb/*', add) // Add an entry to a databse

      // Started
      const startedText = `OrbitDB server started at http://${server.address().address}:${port}/`
      logger.log(startedText)
      console.log(startedText)

      // Return the server
      resolve(server)
    })
  })
}

module.exports = startHttpServer
