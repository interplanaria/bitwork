const bitwork = require('../index')
const listeners = {
  block: new bitwork({ rpc: { user: "root", pass: "bitcoin" } }),
  mempool: new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
};
["block", "mempool"].forEach((type) => {
  let listener = listeners[type];
  listener.use("parse", "bob")
  listener.on("ready", () => {
    listener.on(type, (e) => {
      console.log(type, e)
    })
  })
})
