const bitwork = require('../index')
const bit = new bitwork({ buffer: 3, rpc: { user: "root", pass: "bitcoin" } })
const fs = require('fs')
const es = require('event-stream')
bit.use("parse", "bob")
bit.on("ready", async () => {
  let blk = await bit.get("block", 593965)
  //let blk = await bit.get("block", 598966)
  console.log(blk.tx)

  console.log("start stream")
  let counter = 0;
  let fileStream = fs.createWriteStream("p.json")
  console.time("Ha")
  blk.tx
    .pipe(es.mapSync((data) => {
      counter++;
      if (counter%1000 === 0) console.log(counter)
      return data;
    }))
    .pipe(es.stringify())
    .pipe(fileStream)
    .on("close", () => {
      console.timeEnd("Ha")
    })
  //console.log(blk)
})
