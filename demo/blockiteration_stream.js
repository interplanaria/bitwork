const bitwork = require('../index')
const bit = new bitwork({ buffer: 10, rpc: { user: "root", pass: "bitcoin" } })
const es = require('event-stream')
bit.use("parse", "txo")
bit.on("ready", async () => {
  //let headers = await bit.get("header", { from: 598000, to: 598005 })
  try {
    let headers = await bit.get("header", { from: 598777 })
    console.log("headers = ", headers)
    for(let i=0; i<headers.length; i++) {
      console.time("block " + headers[i].height)
      let blk = await bit.get("block", headers[i])
      blk.tx
        .pipe(es.map((o) => {
          return o.tx
        }))
        .pipe(es.stringify())
        .pipe(process.stdout)
      console.timeEnd("block " + headers[i].height)
//      console.log(JSON.stringify(blk, null, 2))
    }
  } catch (e) {
    console.log("____", e)
    let header = await bit.info()
    console.log(header)
  }
})
