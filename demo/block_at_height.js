const bitwork = require('../index')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.use("parse", "bob")
bit.on("ready", async () => {
  let blk = await bit.get("block", 598966)
  console.log(JSON.stringify(blk, null, 2))
})
