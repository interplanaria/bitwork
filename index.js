const {Peer, Messages, Inventory} = require('b2p2p')
const bsv = require('bsv')
const es = require('event-stream')
const engine = { bpu: require('bpu'), txo: require('txo') }
const RpcClient = require('bitcoind-rpc')
class Bitwork {
  constructor(gene) {

    this.request = {}  // request stub
    this.response = {} // response stub

    if (!gene || !gene.rpc || !gene.rpc.user || !gene.rpc.pass) {
      console.log("Error: please pass 'rpc.user' and 'rpc.pass' attributes when initializing")
      process.exit(1)
    }

    // RPC
    const rpcconfig = Object.assign({
      protocol: "http",
      host: "127.0.0.1",
      port: "8332",
    }, (gene && gene.rpc ? gene.rpc : {}))
    this.rpc = new RpcClient(rpcconfig)

    // PEER
    let m = new Messages({ Block: bsv.Block, BlockHeader: bsv.BlockHeader, Transaction: bsv.Transaction, MerkleBlock: bsv.MerkleBlock })
    let g = Object.assign({ host: "127.0.0.1", messages: m }, (gene && gene.peer ? gene.peer : {}))
    this.peer = new Peer(g)
    this.peer.on("disconnect", function() { console.log("disconnected") })
    this.peer.on("error", function(e) { console.log("Err", e) })
    this.peer.on("notfound", function(e) { console.log("notfound", e) })
    this.peer.on("reject", function(e) { console.log("reject", e) })
    this.peer.on('block', async (e) => {
      let header = e.block.header.toObject()
      if (this.onblock) {
        if (this.request.type === 'block') {
          this.request.type = null
          header.height = this.current_block.height
        } else if (this.request.type === 'onblock') {
          header.height = await this.height(header.hash)
        }
        if (this.parse) {
          let processed = await this.process(e.block.transactions, {
            i: header.height,
            h: header.hash,
            t: header.time
          })
          this.onblock({ header: header, tx: processed })
        } else {
          this.onblock({ header: header, tx: e.block.transactions })
        }
      }
    })
    this.peer.on('headers', (message) => {
      if (message.headers.length > 0) {
        let headers = message.headers.map(header => { return header.toObject() })
        this.response.header = this.response.header.concat(headers)
        let lastHeader = headers[headers.length-1]
        let nextHash = lastHeader.hash
        if (this.request.header.at) this.sendHeader(this.response.header)
        else if (typeof this.request.header.to !== 'undefined') this.sendHeader(this.response.header)
        else this.header({ from: nextHash }, true)
      } else {
        this.sendHeader(this.response.header)
      }
      if (this.request.type === 'header') {
        this.request.type = null
      }
    })
    this.peer.on('tx', async (message) => {
      if (this.request.mempool.has(message.transaction.hash)) {
        if (this.request.type === 'mempool') {
          this.response.mempool.push(message.transaction)
          if (this.onmempool && this.response.mempool.length >= this.mempoolCounter) {
            if (this.parse) {
              let processed = await this.process(this.response.mempool)
              this.onmempool({ tx: processed })
            } else {
              this.onmempool({ tx: this.response.mempool })
            }
            this.onmempool = null
            this.request.type = null
          }
        } else if (this.request.type === 'onmempool') {
          if (this.parse) {
            let processed = await this.process([message.transaction])
            if (processed.length > 0) this.onmempool(processed[0])
          } else {
            this.onmempool(message.transaction)
          }
        }
      }
    })
    this.peer.on('inv', (message) => {
      this.request.mempool = new Set()
      this.mempoolCounter = message.inventory.length
      message.inventory.forEach((i) => {
        let hash = i.hash.toString('hex').match(/.{2}/g).reverse().join("")
        this.request.mempool.add(hash)
      })
      if (this.request.type) {
        this.peer.sendMessage(this.peer.messages.GetData(message.inventory))
      }
    })
    this.peer.connect()
  }
  process(items, options) {
    return new Promise((resolve, reject) => {
      let p = es.readArray(items)
        .pipe(es.map((data, cb) => {
          this.parse(data, options).then((parsed) => {
            cb(null, parsed)
          })
        }))
      if (this.filter) p = p.pipe(es.filterSync(this.filter))
      if (this.map) p = p.pipe(es.mapSync((e) => {
        let mapped = this.map(e)
        let res = Object.assign({"$": mapped}, {tx: e.tx})
        if (e.blk) res.blk = e.blk
        return res
      }))
      p.pipe(es.writeArray(function (err, array){
        resolve(array)
      }))
    })
  }
  async sendHeader(res) {
    try {
      let height = await this.height(res[0].hash)
      res.forEach((header, index) => {
        header.height = height + index
      })
      this.onheader(res)
    } catch (e) {
      throw e
    }
  }
  height(hash) {
    return new Promise((resolve, reject) => {
      this.rpc.getBlockHeader(hash, function(err, res) {
        if (err) reject(err)
        else resolve(res.result.height)
      })
    })
  }
  hash(height) {
    return new Promise((resolve, reject) => {
      this.rpc.getBlockHash(height, function(err, res) {
        if (err) reject(err)
        else resolve(res.result)
      })
    })
  }
  blockHeader(hash) {
    return new Promise((resolve, reject) => {
      this.rpc.getBlockHeader(hash, function(err, res) {
        if (err) reject(err)
        else resolve(res.result)
      })
    })
  }
  info() {
    return new Promise((resolve, reject) => {
      this.rpc.getBlockchainInfo(function(err, res) {
        if (err) reject(err)
        else resolve(res.result)
      })
    })
  }
  previous(id) {
    return new Promise(async (resolve, reject) => {
      try {
        let hash = await this.resolve(id)
        let h = await this.blockHeader(hash)
        resolve(h.previousblockhash)
      } catch (e) {
        reject(e)
      }
    })
  }
  on(e, cb) {
    if (e === 'ready') {
      this.peer.on("ready", cb)
    } else if (e === 'mempool') {
      this.request.type = "onmempool"
      this.onmempool = cb
    } else if (e === 'block') {
      this.request.type = "onblock"
      this.onblock = cb
    }
  }
  use(name, lambda, arg) {
    if (name === 'parse') {
      if (typeof lambda === 'function') {
        this.parse = lambda
      } else {
        if (lambda === 'hex') {
          this.parse = async (r) => { return new bsv.Transaction(r).toString('hex') }
        } else if (lambda === 'txo') {
          this.parse = (r, blk) => {
            return engine.txo.fromTx(r, {h: true}).then(async (t) => {
              if (blk)  t.blk = blk
              return t
            })
          }
        } else if (lambda === 'bpu' && arg) {
          this.parse = (r, blk) => {
            return engine.bpu.parse(arg(r)).then(async (t) => {
              if (blk) t.blk = blk
              return t
            })
          }
        } else if (lambda === 'bob') {
          this.parse = (r, blk) => {
            return engine.bpu.parse({
              tx: { r: r }, 
              transform: (o, c) => {
                if (c.buf && c.buf.byteLength > 512) {
                  o.ls = o.s
                  o.lb = o.b
                  delete o.s
                  delete o.b
                }
                return o
              },
              split: [
                { token: { s: "|" }, }, 
                { token: { op: 106 }, include: "l" }
              ]
            }).then(async (t) => {
              if (blk) t.blk = blk
              return t
            })
          }
        }
      }
    } else if (name === 'map') {
      this.map = lambda
    } else if (name === 'filter') {
      this.filter = lambda
    }
  }
  mempool() {
    return new Promise((resolve, reject) => {
      this.request.type = "mempool"
      this.onmempool = resolve
      this.response.mempool = []
      this.peer.sendMessage(this.peer.messages.MemPool())
    })
  }
  resolve(id) {
    return new Promise(async (resolve, reject) => {
      try {
        if (typeof id === 'number') {
          let hash = await this.hash(id)
          let header = await this.blockHeader(hash)
          this.current_block = header
          resolve(hash)
        } else if (typeof id === 'object') {
          this.current_block = id
          resolve(id.hash)
        } else {
          this.blockHeader(id).then((header) => {
            this.current_block = header
            resolve(id)
          })
        }
      } catch (e) {
        reject(e)
      }
    })
  }
  block(id) {
    return new Promise((resolve, reject) => {
      this.resolve(id).then((hash) => {
        this.request.type = "block"
        this.onblock = resolve
        this.peer.sendMessage(this.peer.messages.GetData.forBlock(hash))
      })
    })
  }
  header(g, continued) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!continued) {
          this.onheader = resolve
          this.request.header = g
          this.request.type = 'header'
          this.response.header = []
        }
        if (typeof g.at !== 'undefined') {
          let currenthash = await this.resolve(g.at)
          let header = await this.blockHeader(currenthash)
          resolve(header)
        } else if (typeof g.from !== 'undefined') {
          if (continued) {
            let from = await this.resolve(g.from)
            if (typeof g.to !== 'undefined') {
              let to = await this.resolve(g.to)
              this.peer.sendMessage(this.peer.messages.GetHeaders({ starts: [from], stop: to }))
            } else {
              this.peer.sendMessage(this.peer.messages.GetHeaders({ starts: [g.from] }))
            }
          } else {
            let from = await this.previous(g.from)
            if (typeof g.to !== 'undefined') {
              let h = await this.resolve(g.to)
              this.peer.sendMessage(this.peer.messages.GetHeaders({ starts: [from], stop: h }))
            } else {
              this.peer.sendMessage(this.peer.messages.GetHeaders({ starts: [from] }))
            }
          }
        }
      } catch (e) {
        reject(e)
      }
    })
  }
  get(type, name, ...args) {
    if (type === 'mempool') {
      return this.mempool(...args)
    } else if (type === 'block') {
      return this.block(...args)
    } else if (type === 'header') {
      return this.header(...args)
    } else if (type === 'info') {
      return this.info(...args)
    } else if (type === 'rpc') {
      return new Promise((resolve, reject) => {
        if (this.rpc[name]) {
          this.rpc[name](...args, (err, res) => {
            if (err) reject(err)
            else resolve(res.result)
          })
        } else {
          reject("No such JSON-RPC method exists")
        }
      })
    } else {
      console.log("No such method exist", type)
    }
  }
}
module.exports = Bitwork
