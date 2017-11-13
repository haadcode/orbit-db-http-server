const path = require('path')
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

const Logger = require('logplease')
const logger = Logger.create("orbit-db-http-server", { color: Logger.Colors.Yellow })
Logger.setLogLevel('ERROR')

const defaultDataDir = './orbitdb'

const startIpfsAndOrbitDB = async (options) => {
  logger.debug("IPFS path:", options.ipfsPath)
  logger.debug("OrbitDB path:", options.orbitdbPath)
  return new Promise((resolve, reject) => {
    logger.debug("Starting IPFS")
    const ipfs = new IPFS({
      start: true,
      repo: options.ipfsPath || path.join(defaultDataDir, '/ipfs'),
      EXPERIMENTAL: {
        pubsub: true,
      },
      config: {
        Addresses: {
          Swarm: [
            '/ip4/0.0.0.0/tcp/0',
            // '/dns4/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star',
          ],
        },
      },
    })
    ipfs.on('error', reject)
    ipfs.on('ready', () => {
      logger.debug("IPFS started")
      logger.debug("Starting OrbitDB")
      const orbitdb = new OrbitDB(ipfs, options.orbitdbPath || defaultDataDir)
      resolve({ orbitdb: orbitdb, ipfs: ipfs })
    })
  })
}

module.exports = startIpfsAndOrbitDB
