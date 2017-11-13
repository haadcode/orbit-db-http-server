const get = async (req, res) => {
  try {
    // Get the database address from the request
    const address = req.params[0]

    // Open the requested database
    const db = await req.orbitdb.open(address, {
      create: false,
      sync: true,
      localOnly: true,
    })

    // Load the database
    await db.load()

    // Query for all results
    const ressult = db.iterator({ limit: -1 }).collect()

    // Return the results
    res.send({
      result: ressult
    })
  } catch (e) {
    // TODO: return 404 if the database doesn't exist
    res.status(500).send({ error: e.toString() })
  }
}

module.exports = get
