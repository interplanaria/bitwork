# bitwork

> Bitcoin networking made simple.

[View Full Documentation](https://bitwork.network)

bitwork is the easiest, yet powerful way to process data from the bitcoin network.

It makes interacting with bitcoin as easy as making an HTTP GET request, or listening to WebSockets!

![bitwork](bitwork.png)

It abstracts the complex and esoteric low level networking APIs (P2P protocol + JSON-RPC) into a unified, easy-to-use interface that resembles a simple HTTP request.

![stack](stack.png)

Underneath, bitwork takes care of all the complexities in fetching and listening to data from the P2P network, as well as make use of the JSON-RPC API for some features which when combined, enables an extremely user-friendly yet powerful API.

Finally, it has [a built-in data processing engine](#_3-use) which parses the incoming transaction byte stream into structured programmable objects which makes programmers' jobs significantly easier.

---

# Who is this for?

This library is for **reading DIRECTLY from a bitcoin node,** which means this is for those **who run a bitcoin node of their own**. If you already have access to a Bitcoin node via JSON-RPC and P2P, this library is for you.

> NOTE: Most developers shouldn't need to run their own bitcoin node as it will become exponentially harder to maintain as the blockchain grows. (For example, it is already possible for blockchains like Bitcoin SV to grow at a speed of 2GB per block, which is approximately 10 minutes)
>
> Instead, look into solutions for synchronizing only the required data subset **without having to run a node**. See [Bitbus](https://bitbus.network).


---

# What problems does it solve?

What problems does Bitwork solve? 

Short answer: Everything related to Bitcoin data processing. 

Long answer:

## 1. P2P

Working with the P2P protocol directly is very tedious and has a lot of unintuitive limitations. Let's just take one example: the `"getheaders"` API. Here's a description of how it works:

> "Return a headers packet containing the headers of blocks starting right after the last known hash in the block locator object, up to hash_stop or 2000 blocks"

There are several problems here:

1. First, you can only get headers for 2000 blocks at a time.
2. Second, "blocks starting **right after** the last known hash", which means if you say "Get headers from hash X to Y", it **will NOT include the block X itself**! Such a simple query is tedious if you're directly trying to use the P2P protocol.
3. Third, you can only use block hash to query headers, no height. Again, tedious.

Another example, the header returned by the P2P protocol doesn't include a `"nextblockhash"` field. This is understandable if we remember that the main purpose of the P2P protocol is for block propagation (and not for querying). However it's still true that it's inconvenient (You can get this information through JSON-RPC)

Also due to its P2P nature, developers must programm in a [message passing pattern](https://en.wikipedia.org/wiki/Message_passing) when trying to process data from the blockchain. This means you call a `sendMessage` to make a request, and then also implement a separate event listener which listens to data from the network and distinguish random data from the actual response you're expecting. This creates a messy [spaghetti code](https://en.wikipedia.org/wiki/Spaghetti_code) and is not desirable. Ideally you should be able to **interact with the P2P network with just a few lines of code, just like you would with HTTP.**

Bitwork solves these problems by functioning as an abstraction layer which frees developers from having to worry about all these quirks.

**Bitwork lets you treat Bitcoin like HTTP.**

## 2. JSON-RPC

JSON-RPC is meant to be a more user friendly way to query the blockchain, but the performance is worse than P2P. Currently it doesn't support streaming, so it takes up a lot of memory and often crashes the node itself when the block is too large. (This is a new type of problem only possible in a scaling blockchain like Bitcoin SV)

There are also several other performance and synchronization issues with JSON-RPC. It's better to use the P2P protocol directly when possible.

**Bitwork mostly uses the P2P protocol directly, and uses JSON-RPC methods when it's necessary.**

## 3. ZeroMQ

Working with Zeromq to listen to blockchain events is sketchy. It has synchronization issues with the JSON-RPC API. For example sometimes there will be a ZeroMQ event trigger, but the JSON-RPC won't return a response when you query the same event immediately, and you will have to try another query several seconds later. This is more severe during peak transaction periods, which is when the realtime feature matters the most.

One solution to mitigate this issue is to never trust Zeromq 100% and use a hybrid approach of ZeroMQ plus constant polling.

But this is a mediocre solution at best, and there is no reason to do this if we directly listen to the P2P network.

**Bitwork directly listens to the P2P network instead of relying on ZeroMQ.**

## 4. Usability

There simply does not exist a single high level API that makes interacting with a Bitcoin node as simple as making a HTTP request.

Bitwork makes everything simple, and will get rid of all your headaches dealing with Bitcoin data.

**It just works.**

---

# Install

First install the package to your app folder

```
npm install --save bitwork
```

---

# Usage

First you must initialize it:

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", () => {
  // YOUR LOGIC
})
```

The constructor can take the following attributes:

- `rpc`: RPC settings
  - `protocol`: JSON-RPC access protocol (**optional.** default: "http")
  - `host`: JSON-RPC endpoint IP (**optional.** default: "127.0.0.1")
  - `port`: JSON-RPC port (**optional.** default: 8332)
  - `user`: JSON-RPC username (**required**)
  - `pass`: JSON-RPC password (**required**)
- `peer`: P2P settings
  - `host`: Peer IP to connect to (**optional.** default: 127.0.0.1)

---

# Quickstart

Let's try.

First, install bitwork

```
npm install --save bitwork
```

Second, create a file `listener.js`.

```
const bitwork = require('bitwork')
// Remember to replace the "user" and "pass" with your OWN JSON-RPC username and password!
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", async () => {
  bit.on("mempool", (e) => {
    console.log(e)
  })
})
```

run

```
node listener
```

That's it! You'll start seeing new transactions flow in, in realtime.

Next, let's try reading a block. Create another file `read.js`:

```
const bitwork = require('bitwork')
// Remember to replace the "user" and "pass" with your OWN JSON-RPC username and password!
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", async () => {
  let { header, tx } = await bit.get("block", 598924)
  console.log("block header = ", header)
  console.log("block transactions = ", tx)
})
```

and run:

```
node read
```

You'll get the full block content for block height 598924!

---

# API

There are three API methods:

1. **get:** fetch data from the blockchain.
2. **on:** listen to data from the blockchain.
3. **use:** attach middlewares.

## 1. get

### a. mempool

#### Syntax

```
bit.get("mempool").then((mepool) => {
  //  mempool := {
  //    tx: <array of mempool transactions>
  //  }
})
```

#### Example

Get mempool transactions

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", () => {
  bit.get("mempool").then((mempool) => {
    console.log("mempool transactions = ", mempool.tx)
  })
})
```

or using async/await:

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", async () => {
  let mempool = await bit.get("mempool");
  console.log("mempool transactions = ", mempool.tx)
})
```

### b. block

#### Syntax

```
bit.get("block", <hash|height>).then((block) => {
  //  block := {
  //    header: <block header object>,
  //    tx: <array of mempool transactions>
  //  }
})
```


#### Example


Get by block height

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", async () => {
  let block = await bit.get("block", 598924)
  console.log("block header = ", block.header)
  console.log("block transactions = ", block.tx)
})
```

Get by block hash

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", async () => {
  let block = await bit.get("block", "000000000000000000a3ec7e52e0f3fea4a4e6a2e3a3b1a9c473aeb36daa0076")
  console.log("block header = ", block.header)
  console.log("block transactions = ", block.tx)
})
```

### c. header

#### Syntax

```
bit.get("header", <Query>).then((headers) => {
  //  headers := <array of headers>
})
```

Where the `<Query>` is an object which may have the following attributes:

- `at`: Specify the exact position of the block (hash or height).
- `from`: Specify the position to fetch from (hash or height)
- `to`: Specify the position to end fetching (hash or height)

#### Example

Get a block header at a specific height:

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", async () => {
  let header = await bit.get(
    "header", 
    { at: 598848 }
  ).catch((e) => { console.log("E = ", e) })
  console.log("header = ", header)
})
```

Get a block header at a specific hash:

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", async () => {
  let header = await bit.get(
    "header", 
    { at: "000000000000000000a3ec7e52e0f3fea4a4e6a2e3a3b1a9c473aeb36daa0076" }
  ).catch((e) => { console.log("E = ", e) })
  console.log("header = ", header)
})
```

Get block headers starting from a height, until the end (blockchain tip)

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", async () => {
  let headers = await bit.get(
    "header", 
    { from: 598848 }
  ).catch((e) => { console.log("E = ", e) })
  console.log("headers = ", headers)
})
```

Get block headers starting from a block hash, until the end (blockchain tip)

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", async () => {
  let headers = await bit.get(
    "header", 
    { from: "000000000000000000a3ec7e52e0f3fea4a4e6a2e3a3b1a9c473aeb36daa0076" }
  ).catch((e) => { console.log("E = ", e) })
  console.log("headers = ", headers)
})
```

Get block headers between two heights:

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", async () => {
  let headers = await bit.get(
    "header", 
    { from: 598848, to: 598850 }
  ).catch((e) => { console.log("E = ", e) })
  console.log("headers = ", headers)
})
```

Get block headers between a height and a hash:


```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", async () => {
  let headers = await bit.get("header", {
    from: "000000000000000000a3ec7e52e0f3fea4a4e6a2e3a3b1a9c473aeb36daa0076",
    to: 598850
  }).catch((e) => { console.log("E = ", e) })
  console.log("headers = ", headers)
})
```

### d. JSON-RPC

#### Syntax

```
bit.get("rpc", <JSON-RPC method>, ...<JSON-RPC arguments>).then((response) => {
  // response := <JSON-RPC response> 
}).catch((e) => {
  // e := <error message>
})
```

Where `<JSON-RPC method>` may be ANY of the methods shown at https://github.com/bitpay/bitcoind-rpc/blob/master/lib/index.js#L160

#### Example

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", async () => {
  let info = await bit.get("rpc", "getInfo")
  console.log("info = ", info)
})
```

will print something like:

```
info =  {
  version: 100020100,
  protocolversion: 70015,
  blocks: 598980,
  timeoffset: 0,
  connections: 41,
  proxy: '',
  difficulty: 129757875307.3484,
  testnet: false,
  stn: false,
  paytxfee: 0,
  relayfee: 0.00001,
  errors: "Warning: Unknown block versions being mined! It's possible unknown rules are in effect",
  maxblocksize: 2000000000,
  maxminedblocksize: 128000000
}
```

You can also pass additional arguments;

```
const bitwork = require('../index')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.use("parse", "bob")
bit.on("ready", async () => {
  let tx = await bit.get("rpc", "getRawTransaction", "da80aa6f5a21b41485b73d268af1d3f89d360cd5c6147b4214af8d5add612b12")
  console.log('tx = ', tx)
})
```

---

## 2. on

The `on` method lets you create an event listener:

### a. mempool

Listen to realtime incoming mempool transactions via P2P

#### Syntax

```
bit.on("mempool", (e) => {
  //  e := <new transaction object>
})
```

#### Example

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", async () => {
  bit.on("mempool", (e) => {
    console.log("New transaction = ", e)
  })
})
```

### b. block

Listen to realtime incoming blocks via P2P

#### Syntax

```
bit.on("block", (e) => {
  //  e := {
  //    header: <new block header>,
  //    tx: <array of transaction objects in the block>
  //  }
})
```

#### Example

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", async () => {
  bit.on("block", (e) => {
    console.log("header = ", e.header)
    console.log("transactions = ", e.tx)
  })
})
```

### c. ready

Must use before calling any other methods:

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.on("ready", () => {
  // YOUR APP LOGIC GOES HERE
})
```

---

## 3. use

The `use` method is used for attaching middleware.

![flow](flow.png)

There are three middleware types:

1. **Parse:** The parser which deserializes an incoming raw transaction into any format that's easy to use in programs.
2. **Filter:** Filter the transactions based on a tester function.
3. **Map:** Transform the transactions through a map function.

> Note that these three steps are executed in this specific order. The transaction goes through a parser, and then gets filtered, and finally mapped.


The processors are attached to bitwork through the following syntax:

```
bit.use(<processor>, <name or lambda function>)
```


### a. parse

`parse` is the first step. parse is used for deserializing an incoming raw transaction byte stream into a JavaScript object.

![serialize](serialize.png)

Here are the parsers currently supported natively:

1. bob: https://medium.com/@_unwriter/hello-bob-94701d278afb
2. txo: https://github.com/interplanaria/txo
3. hex: raw hex string format

To use BOB, simply add `bit.use("parse", "bob")`

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.use("parse", "bob")
bit.on("ready", async () => {
  let blk = await bit.get("block", 598966)
  console.log(JSON.stringify(blk, null, 2))
})
```

This will give you:

1. `"header"`: the block header for 598966
2. `"tx"`: all transactions in block 598966, DESERIALIZED with BOB.

Which looks like this:

<pre class='scroll'><code>
{
  "header": {
    "hash": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
    "version": 549453824,
    "prevHash": "0000000000000000006d8e25371046c57f9cbbe251d84b1d0c636721de23c5e7",
    "merkleRoot": "8c9bbd17117f0d3848d6089ea1e7ef2dfd310e0e5a61bf9d4ac2cf4b9d994ca7",
    "time": 1567860575,
    "bits": 403221253,
    "nonce": 1908806409,
    "height": 598966
  },
  "tx": [
    {
      "tx": {
        "h": "03f4052af378df64d5f416c7174d088178f2a679b67a451956f1d3c1c65b4f01"
      },
      "in": [],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "TBICBeU94joq/WU8fS3P9NMyAbg=",
                  "s": "L\u0012\u0002\u0005�=�:*�e<}-���2\u0001�",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 1250008636,
            "i": 0,
            "a": "17wDvnpvv7XSWjMRfnhjcdvY6jzonNKL5A"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "ef4bd1ea1761ac9e18ff23daa4b158fd0d3e309afe862a4ccfbec79ab5e7b6e2"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEQCICqt2eEPUqk0jUyivM+HCQTl2UDfscLUJh9bPhJKKXtUAiBtO9MlrXT+ovXPrwXcxUtWb+npT2dHe0H8xVOWO0t370E=",
                  "s": "0D\u0002 *���\u000fR�4�L��χ\t\u0004��@߱��&\u001f[>\u0012J){T\u0002 m;�%�t���ϯ\u0005��KVo��OgG{A��S�;Kw�A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "Alf5FWfHo8hM0OHuPe8tmnwgJLWR/YP/WcWrgy3fC2xR",
                  "s": "\u0002W�\u0015gǣ�L���=�-�| $�����Yū�-�\u000blQ",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "2c3f27a5a30bcd3f4633a7ece2feee8cda14b46bf747e088d6e29be69b35605f",
            "i": 2,
            "a": "1BPX3yd9gh4rtZDBsPkewiu5NRHJ9iVTBq"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEQCIFKMz3Iq+wBfZAtEeOB3w7a4h31WU7MvqEMqHe9npkeUAiAwEhbvrX5E9JeBzId6UhdpeyVe48mdk2UVgMO5TGRxs0E=",
                  "s": "0D\u0002 R��r*�\u0000_d\u000bDx�wö��}VS�/�C*\u001d�g�G�\u0002 0\u0012\u0016�~D���̇zR\u0017i{%^�ɝ�e\u0015�ùLdq�A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "Alf5FWfHo8hM0OHuPe8tmnwgJLWR/YP/WcWrgy3fC2xR",
                  "s": "\u0002W�\u0015gǣ�L���=�-�| $�����Yū�-�\u000blQ",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "2694cf5a57585b01ddb3ff2dbfee51143b2ae621112e43ec53689089d8958d37",
            "i": 0,
            "a": "1BPX3yd9gh4rtZDBsPkewiu5NRHJ9iVTBq"
          }
        },
        {
          "i": 2,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEUCIQDhXK532PwWt5rKyLHg3aUYAfAc+vSKY89pjDfULnONXAIgdTSy8l/l7cycoyU4zOtcvzxl1acLTu2CeR0829s2tuhB",
                  "s": "0E\u0002!\u0000�\\�w��\u0016���ȱ�ݥ\u0018\u0001�\u001c��c�i�7�.s�\\\u0002 u4��_��̜�%8��\\�<eէ\u000bN�y\u001d<��6��A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "Alf5FWfHo8hM0OHuPe8tmnwgJLWR/YP/WcWrgy3fC2xR",
                  "s": "\u0002W�\u0015gǣ�L���=�-�| $�����Yū�-�\u000blQ",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "623ceb77295719ad4d0cb255c3dfc69c1a97ba6696dc4f2c366963b230cf249c",
            "i": 0,
            "a": "1BPX3yd9gh4rtZDBsPkewiu5NRHJ9iVTBq"
          }
        },
        {
          "i": 3,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEUCIQCQ6ZINwOdvfQ0wtrXNhFB/S261lQjXwyy4aeba6cIUwgIgMwPy09NGH3s6FIgRoVVKKdrPxcJyaa7S9oOOYazrZwlB",
                  "s": "0E\u0002!\u0000��\r��o}\r0��̈́PKn��\b��,�i����\u0014�\u0002 3\u0003���F\u001f{:\u0014�\u0011�UJ)����ri�����a��g\tA",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "Alf5FWfHo8hM0OHuPe8tmnwgJLWR/YP/WcWrgy3fC2xR",
                  "s": "\u0002W�\u0015gǣ�L���=�-�| $�����Yū�-�\u000blQ",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "0a93cfadaf5ab317f463dd3d499eeb0ca9cb1ea17675b669d7187c5560b9a48d",
            "i": 1,
            "a": "1BPX3yd9gh4rtZDBsPkewiu5NRHJ9iVTBq"
          }
        },
        {
          "i": 4,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEQCIFFvYp6RF0iYsD9M7lIL6LeBCh156Lc0cbGucN816g0lAiBx4wvkPusHGKk3Pn4QrYzUOb6S2l8tjtpMgoZYi8BeKkE=",
                  "s": "0D\u0002 Qob��\u0017H��?L�R\u000b跁\n\u001dy�4q��p�5�\r%\u0002 q�\u000b�>�\u0007\u0018�7>~\u0010���9���_-��L��X��^*A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "Alf5FWfHo8hM0OHuPe8tmnwgJLWR/YP/WcWrgy3fC2xR",
                  "s": "\u0002W�\u0015gǣ�L���=�-�| $�����Yū�-�\u000blQ",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "20973e969c5aff76fe6fc2a930d8984f248bc66a981f7c949b6a3290fef84c57",
            "i": 0,
            "a": "1BPX3yd9gh4rtZDBsPkewiu5NRHJ9iVTBq"
          }
        },
        {
          "i": 5,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEUCIQDpTc9iO7fzctOkVc/KZVXSmLNXxG2K0pay4LnVtjHtSQIgKsjGv34qQsm7liDYCeEY+3bzkPXH5RYCVqS/OfW0bj9B",
                  "s": "0E\u0002!\u0000�M�b;��rӤU��eUҘ�W�m�Җ��ն1�I\u0002 *�ƿ~*Bɻ� �\t�\u0018�v����\u0016\u0002V��9��n?A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "Alf5FWfHo8hM0OHuPe8tmnwgJLWR/YP/WcWrgy3fC2xR",
                  "s": "\u0002W�\u0015gǣ�L���=�-�| $�����Yū�-�\u000blQ",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "8c912a9bc0a609368f207ec17e85e1bf82c4b867128e6287ef119dc68cdc2bee",
            "i": 0,
            "a": "1BPX3yd9gh4rtZDBsPkewiu5NRHJ9iVTBq"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUh5SFh0WVd5R2VQckhWaXNuTmRTOTMxVnQ2Q3FvdVV5Wg==",
                  "s": "1HyHXtYWyGePrHVisnNdS931Vt6CqouUyZ",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "cmVsYXl4Lmlv",
                  "s": "relayx.io",
                  "ii": 2,
                  "i": 1
                },
                {
                  "op": 0,
                  "ops": "OP_0",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MA==",
                  "s": "0",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "eyJjaGFubmVsIjoyLCJhbW91bnQiOjE1LCJjdXJyZW5jeSI6IkNOWSIsInN5bWJvbCI6IsKlIn0=",
                  "s": "{\"channel\":2,\"amount\":15,\"currency\":\"CNY\",\"symbol\":\"¥\"}",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "PW83OWj4Xgu+IpsmHobhLhH//Xs=",
                  "s": "=o79h�^\u000b�\"�&\u001e��.\u0011��{",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 1618339,
            "i": 1,
            "a": "16bqT77M6Pgw29qkqkDs1zzgw3B9dyrXfG"
          }
        },
        {
          "i": 2,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "cfN+nDz3X39U0rvAAt+/fpxi77o=",
                  "s": "q�~�<�_Tһ�\u0002߿~�b�",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 904155303,
            "i": 2,
            "a": "1BPX3yd9gh4rtZDBsPkewiu5NRHJ9iVTBq"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "0eda510ff9f9298e8f8846938337a9e1d63f815f720fd923814f6c5ff8849615"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 0,
                  "ops": "OP_0",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "MEQCICxD/kFG712DMY424Fq72koeLUiHA5+w987I6pYgU0tbAiAuBwxEPdD9gtBGvJsQW5yYrBX4kRI5K7Ahj8dlHb1pQ0E=",
                  "s": "0D\u0002 ,C�AF�]�1�6�Z��J\u001e-H�\u0003������ SK[\u0002 .\u0007\fD=����F��\u0010[���\u0015��\u00129+�!��e\u001d�iCA",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "MEQCIHBEIPx1uxyxvH0SNJBzO8w0re+7fyqesH20MqiqnvuiAiAxaPjjgi6lukqBoN2Zf2cJhAAy0lmRwyAsZohV+HCKEEE=",
                  "s": "0D\u0002 pD �u�\u001c��}\u00124�s;�4��*��}�2�����\u0002 1h��.��J��ݙg\t�\u00002�Y�� ,f�U�p�\u0010A",
                  "ii": 2,
                  "i": 2
                },
                {
                  "b": "UiEDhMyOLIg+j1d9HMgMqjWcuWeK8x7Hh6cVLZx+T3+hUaAhA8NgxcGTmoGzg5D9aPm4T7nSoH6G+gJpyUtWPYI4cFvfIQK7YvGBy9CAD0pUyQYpGUBtbpuW1Mlfg+R65ph44EiivVOu",
                  "s": "R!\u0003�̎,�>�W}\u001c�\f�5��g��\u001eǇ�\u0015-�~O�Q�!\u0003�`���������h��O�Ҡ~��\u0002i�KV=�8p[�!\u0002�b��Ѐ\u000fJT�\u0006)\u0019@mn����_��z�x�H��S�",
                  "ii": 3,
                  "i": 3
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "581ade6c619865146f82b584bfafbeae6e1c8cf7f73c88388b8d9f9011d62792",
            "i": 1,
            "a": "38xCKKUfygup8gkK95JS3UsjcDNYH8pqfV"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "76UhsCCZQ72RelgiZ+6nNJVoDPw=",
                  "s": "�!� �C��zX\"g�4�h\f�",
                  "ii": 1,
                  "i": 1
                },
                {
                  "op": 135,
                  "ops": "OP_EQUAL",
                  "ii": 2,
                  "i": 2
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 43607606,
            "i": 0,
            "a": "3PY9EwDHJY1cjqwESxDDSEb1WkanUx9UeJ"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "YYxc8aaLPAvMZSiO9kpEpfbuWXg=",
                  "s": "a�\\�<\u000b�e(��JD���Yx",
                  "ii": 1,
                  "i": 1
                },
                {
                  "op": 135,
                  "ops": "OP_EQUAL",
                  "ii": 2,
                  "i": 2
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 42895324,
            "i": 1,
            "a": "3AaockL1djNMnAxpqDya7XMGuRzRTionLq"
          }
        },
        {
          "i": 2,
          "tape": [
            {
              "cell": [
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "LvLYBo6u9J440Lt7Bb42CZQPm6o=",
                  "s": ".��\u0006����8л{\u0005�6\t�\u000f��",
                  "ii": 1,
                  "i": 1
                },
                {
                  "op": 135,
                  "ops": "OP_EQUAL",
                  "ii": 2,
                  "i": 2
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 44977364,
            "i": 2,
            "a": "35yFvTK4HpXPY4P7PJ9FmDPwg6o7jmXZ5S"
          }
        },
        {
          "i": 3,
          "tape": [
            {
              "cell": [
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "yACLD0eXYIvUqo9cDnfwhH8yauU=",
                  "s": "�\u0000�\u000fG�`�Ԫ�\\\u000ew��2j�",
                  "ii": 1,
                  "i": 1
                },
                {
                  "op": 135,
                  "ops": "OP_EQUAL",
                  "ii": 2,
                  "i": 2
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 48537568,
            "i": 3,
            "a": "3KvXien9LGfgHBvuak8D1uLjT3YV7ri4gp"
          }
        },
        {
          "i": 4,
          "tape": [
            {
              "cell": [
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "XG3adqD/H24b46STQh0WKwGnGEU=",
                  "s": "\\m�v��\u001fn\u001b㤓B\u001d\u0016+\u0001�\u0018E",
                  "ii": 1,
                  "i": 1
                },
                {
                  "op": 135,
                  "ops": "OP_EQUAL",
                  "ii": 2,
                  "i": 2
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 36886314,
            "i": 4,
            "a": "3A7jgwNg5RUoLCEYJkgk5FTXtsjRsL2ydL"
          }
        },
        {
          "i": 5,
          "tape": [
            {
              "cell": [
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "T6fLmAYDds3hXW69BQdnBuXjrwQ=",
                  "s": "O�˘\u0006\u0003v��]n�\u0005\u0007g\u0006��\u0004",
                  "ii": 1,
                  "i": 1
                },
                {
                  "op": 135,
                  "ops": "OP_EQUAL",
                  "ii": 2,
                  "i": 2
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 60501821,
            "i": 5,
            "a": "38xCKKUfygup8gkK95JS3UsjcDNYH8pqfV"
          }
        },
        {
          "i": 6,
          "tape": [
            {
              "cell": [
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "6RAXJXNNtl+n5U61UHeuhe0FnLI=",
                  "s": "�\u0010\u0017%sM�_��N�Pw���\u0005��",
                  "ii": 1,
                  "i": 1
                },
                {
                  "op": 135,
                  "ops": "OP_EQUAL",
                  "ii": 2,
                  "i": 2
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 51331006,
            "i": 6,
            "a": "3NwLeDpgsoPNvrFecH7KtBaqsjLEnjHN3A"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "02a32e90a93ebb3f6c27afcf3344c92285ee22bb6fb269219002737fda7b5a3a"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 0,
                  "ops": "OP_0",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "MEQCIBbv3Y08BvTnITS/Cx4d519Q2NIM9Lc+BJGJuW4s/i2yAiAaJLLm/3vRpQ4Vay9cczvDp5rio6wqvbDRnNgMthVnK0E=",
                  "s": "0D\u0002 \u0016�ݍ<\u0006��!4�\u000b\u001e\u001d�_P��\f��>\u0004���n,�-�\u0002 \u001a$���{ѥ\u000e\u0015k/\\s;ç�⣬*��ќ�\f�\u0015g+A",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "MEQCIGQ0QqIKqOezW5jU85n5c7dqMa2Lg98gJCxDTGsnc4VmAiA4WlnT0EyZIdro79dCfwYrYaPCrJH9nNGTZ7JiLlVYvUE=",
                  "s": "0D\u0002 d4B�\n��[����s�j1���� $,CLk's�f\u0002 8ZY��L�!����B\u0006+a�¬���ѓg�b.UX�A",
                  "ii": 2,
                  "i": 2
                },
                {
                  "b": "UiEDs3+rIwLqTQVcChCQY6rNrwWbW6zVd/wELeRcoAtZWuUhA38JbN9xkVv4fRtCb2TJ9kUzLLJ5X4zAHCuhuWKVO2+KIQMMZFfyXYZ7HWuzF+uxxmJtnRQY6nTeoWkc3oGq3vgKDFOu",
                  "s": "R!\u0003��#\u0002�M\u0005\\\n\u0010�c�ͯ\u0005�[��w�\u0004-�\\�\u000bYZ�!\u0003\tl�q�[�}\u001bBod��E3,�y_��\u001c+��b�;o�!\u0003\fdW�]�{\u001dk�\u0017��bm�\u0014\u0018�tޡi\u001cށ���\n\fS�",
                  "ii": 3,
                  "i": 3
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "8c491843f85dccd23c11d80467893d4aa956bbbe3b6173f5c209789198bc096c",
            "i": 7,
            "a": "3LwrcqDRsAf1uGi4AF7KTuJa65c92mW8GC"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "gyxdzgSSo9B9UX5a1mRV0Iv22JM=",
                  "s": "�,]�\u0004���}Q~Z�dUЋ�ؓ",
                  "ii": 1,
                  "i": 1
                },
                {
                  "op": 135,
                  "ops": "OP_EQUAL",
                  "ii": 2,
                  "i": 2
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 3261644,
            "i": 0,
            "a": "3DebbJkFoNMeGYhrTeZuNeTuDVc5Z2n8T1"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "T6fLmAYDds3hXW69BQdnBuXjrwQ=",
                  "s": "O�˘\u0006\u0003v��]n�\u0005\u0007g\u0006��\u0004",
                  "ii": 1,
                  "i": 1
                },
                {
                  "op": 135,
                  "ops": "OP_EQUAL",
                  "ii": 2,
                  "i": 2
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 54823986,
            "i": 1,
            "a": "38xCKKUfygup8gkK95JS3UsjcDNYH8pqfV"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "abebcf4d9e6e05ebe32e37e833e6f54f8d0f96024ae1e42510c2e8ab83fc5fa0"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEUCIQCQlWJBVWJIqzCij2PJP2wP9GyCMpC25tXIXy39N5n0nAIgAVQ6rsF1c8gTXz7+K6/r7bXT/DmRGIKASWPpnTIIH21B",
                  "s": "0E\u0002!\u0000��bAUbH�0��c�?l\u000f�l�2�����_-�7���\u0002 \u0001T:��us�\u0013_>�+������9�\u0018��Ic�2\b\u001fmA",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "AxAWA5kf+Gu3wnzLKKDfnH3XV0PYarGJyjoj2nC3+/QM",
                  "s": "\u0003\u0010\u0016\u0003�\u001f�k��|�(�ߜ}�WC�j���:#�p���\f",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "6d1e5949514fe3b43faa1f4d8b7e918db7ee34b52424a9173f7fbc160755c00c",
            "i": 1,
            "a": "1EB9d3j214EUDdT6sT2iAyAiBC9HGpg6kL"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "2rixOjei1NfDF9rax37ElTOwjUo=",
                  "s": "ڸ�:7����\u0017���~ĕ3��J",
                  "ii": 1,
                  "i": 1
                },
                {
                  "op": 135,
                  "ops": "OP_EQUAL",
                  "ii": 2,
                  "i": 2
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 4000000,
            "i": 0,
            "a": "3MdWV1STSWM81oPjy8TzSnwhtQBwda3WA2"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "cBJYT+M8Mobg/Aui4DthdqjUAAw=",
                  "s": "p\u0012XO�<2���\u000b��;av��\u0000\f",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 6639546,
            "i": 1,
            "a": "1BDaf7iYboqf5MGQZTeoVayFtWiNJeFk7t"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "4d0594c1d72bf3da5cfe38c245d9a6e3962e1eb3572a9c12cc2b2d577798f959"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEQCIBwR666TC+iPsiSIocNonUp0aozw6RlSwH73659x8vMoAiB/vGvAHy7kYZVXZjUutHWIZ1bsqshQ152Z04Z/VAz5fkE=",
                  "s": "0D\u0002 \u001c\u0011뮓\u000b菲$���h�Jtj���\u0019R�~��q��(\u0002 �k�\u001f.�a�Wf5.�u�gV��Pם�ӆT\f�~A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "A1zLhMhLXkdqXsIC96A2GJaUvdvnf0DHNM75EjaWpV+N",
                  "s": "\u0003\\˄�K^Gj^�\u0002��6\u0018�����@�4��\u00126��_�",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "66f33fe236ebbee139310606f39379455c470082fa2b3b87bcdbab3e8532a3aa",
            "i": 1,
            "a": "16PG2aed66j6TPBc87hVJ1ZLs45biHXo95"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUx0eU1FNmI1QW5Nb3BRckJQTGs0RkdOOFVCdWh4S3Fybg==",
                  "s": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "AQ==",
                  "s": "\u0001",
                  "ii": 2,
                  "i": 1
                },
                {
                  "b": "eyJ0IjoyNC4zMiwiaCI6NTMsInAiOjEwMTMsImMiOjQwLCJ3cyI6MS41fQ==",
                  "s": "{\"t\":24.32,\"h\":53,\"p\":1013,\"c\":40,\"ws\":1.5}",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MTZQRzJhZWQ2Nmo2VFBCYzg3aFZKMVpMczQ1YmlIWG85NQ==",
                  "s": "16PG2aed66j6TPBc87hVJ1ZLs45biHXo95",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "MTU2Nzg2MDUzMg==",
                  "s": "1567860532",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "Ow5S/hoVjs+oiP4YmZOT7IaCHMk=",
                  "s": ";\u000eR�\u001a\u0015�Ϩ��\u0018���솂\u001c�",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 1099152,
            "i": 1,
            "a": "16PG2aed66j6TPBc87hVJ1ZLs45biHXo95"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "ba1d145825459599d5eb408865285177fb58e043c63b6f4d93e669b0096eb114"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEQCIE98OnoUcYFaqxx1UO0bBZ/OM6b4s+o5dRxDNWA9uR0vAiBFa0ZVAj+pVZHKThO+YgLDRCRFXvShjS2O8cIjkuefm0E=",
                  "s": "0D\u0002 O|:z\u0014q�Z�\u001cuP�\u001b\u0005��3����9u\u001cC5`=�\u001d/\u0002 EkFU\u0002?�U��N\u0013�b\u0002�D$E^���-���#�矛A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "AjABPL/g2u13/3ZRu6u08H9cqA24ILyz7RjKs04O98Xh",
                  "s": "\u00020\u0001<����w�vQ����\\�\r� ���\u0018ʳN\u000e���",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "474666813b77dc7a88166839655725c47c746bba37fcc3e56d79e313d40f9636",
            "i": 1,
            "a": "18LQqaNtwmsm8Az4ntCo2tm7Bh1KVn7JN"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUx0eU1FNmI1QW5Nb3BRckJQTGs0RkdOOFVCdWh4S3Fybg==",
                  "s": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "AQ==",
                  "s": "\u0001",
                  "ii": 2,
                  "i": 1
                },
                {
                  "b": "eyJ0IjoyMy43OSwiaCI6NzgsInAiOjEwMTcsImMiOjEsIndzIjoyLjYsIndkIjoxODB9",
                  "s": "{\"t\":23.79,\"h\":78,\"p\":1017,\"c\":1,\"ws\":2.6,\"wd\":180}",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MThMUXFhTnR3bXNtOEF6NG50Q28ydG03QmgxS1ZuN0pO",
                  "s": "18LQqaNtwmsm8Az4ntCo2tm7Bh1KVn7JN",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "MTU2Nzg2MDUzMg==",
                  "s": "1567860532",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "AWMdfoy2U9Gd/kb5hiIZgLCEW/g=",
                  "s": "\u0001c\u001d~��Sѝ�F��\"\u0019���[�",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 310665,
            "i": 1,
            "a": "18LQqaNtwmsm8Az4ntCo2tm7Bh1KVn7JN"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "abc10874434f0898ca0b83afdcd2dea4f431541b6499154116f2598d1c548c26"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEQCIDz1PFyMZeGo3k7qX46jj5e4tTffnCZAzNBk+e8YX05NAiBgw4qFLH+oGZtQzml5J1qJ/smJaj9/6Ag3zHgX3qab7kE=",
                  "s": "0D\u0002 <�<\\�e��N�_������7ߜ&@��d��\u0018_NM\u0002 `Ê�,�\u0019�P�iy'Z��ɉj?�\b7�x\u0017ަ��A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "AuweQzPSK7uVjy5faOgBKsuMsDQvGLvssJrBzFidboAT",
                  "s": "\u0002�\u001eC3�+���._h�\u0001*ˌ�4/\u0018�찚��X�n�\u0013",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "e719caa75a9435378caf9213dde4ed5b4dd7052b82d6f1cf6db547dc409783df",
            "i": 1,
            "a": "1ge8KhgmQCH72ojz8vXNia6zT9DAskiZH"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUx0eU1FNmI1QW5Nb3BRckJQTGs0RkdOOFVCdWh4S3Fybg==",
                  "s": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "AQ==",
                  "s": "\u0001",
                  "ii": 2,
                  "i": 1
                },
                {
                  "b": "eyJ0IjoyNS4zLCJoIjo5NCwicCI6MTAxMSwiYyI6NDAsIndzIjoxLjUsIndkIjozNTB9",
                  "s": "{\"t\":25.3,\"h\":94,\"p\":1011,\"c\":40,\"ws\":1.5,\"wd\":350}",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MWdlOEtoZ21RQ0g3Mm9qejh2WE5pYTZ6VDlEQXNraVpI",
                  "s": "1ge8KhgmQCH72ojz8vXNia6zT9DAskiZH",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "MTU2Nzg2MDUzNw==",
                  "s": "1567860537",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "B382xOHvdLVhzbqL9Br5QlOne0M=",
                  "s": "\u00076���t�aͺ��\u001a�BS�{C",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 396239,
            "i": 1,
            "a": "1ge8KhgmQCH72ojz8vXNia6zT9DAskiZH"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "9fddaba3dff8cf5e537362a631b4ca528605f7644356cb9362284a151e757f32"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEQCIGZwQ8Pd3e8+mUtczkjqHy3yXAfFcIGeb0pxGGMGjCe0AiAlSCb+DuJmExwvgRLpHSJWUfBD8cbnjCYq3Zz4QfNcwEE=",
                  "s": "0D\u0002 fpC����>�K\\�H�\u001f-�\\\u0007�p��oJq\u0018c\u0006�'�\u0002 %H&�\u000e�f\u0013\u001c/�\u0012�\u001d\"VQ�C���&*ݜ�A�\\�A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "ArHCWYMv8/f6COdKxKz/mqBBp7lt531X145kpEF6UinN",
                  "s": "\u0002��Y�/���\b�JĬ���A��m�}W׎d�AzR)�",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "87fa7cd8b0fe2dc899cacd0daf0e02cf7c16d3ddc8eb15e54f92bee43c2ada14",
            "i": 1,
            "a": "1Jrev7SumXNqbK62zhv9DFCVokKKhNCuvu"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUx0eU1FNmI1QW5Nb3BRckJQTGs0RkdOOFVCdWh4S3Fybg==",
                  "s": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "AQ==",
                  "s": "\u0001",
                  "ii": 2,
                  "i": 1
                },
                {
                  "b": "eyJ0Ijo3LjYzLCJoIjo3NSwicCI6MTAxNSwiYyI6OTUsIndzIjo1LjcsIndkIjoyOTB9",
                  "s": "{\"t\":7.63,\"h\":75,\"p\":1015,\"c\":95,\"ws\":5.7,\"wd\":290}",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MUpyZXY3U3VtWE5xYks2MnpodjlERkNWb2tLS2hOQ3V2dQ==",
                  "s": "1Jrev7SumXNqbK62zhv9DFCVokKKhNCuvu",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "MTU2Nzg2MDUwOQ==",
                  "s": "1567860509",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "w94rv5iG0nei70z4VwwvapC/Pe8=",
                  "s": "��+����w��L�W\f/j��=�",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 626811,
            "i": 1,
            "a": "1Jrev7SumXNqbK62zhv9DFCVokKKhNCuvu"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "b75edb12f24694e0b1c103d33ea0bc12eea915bce7dafcb029a148358a28e0df"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEQCIA595ioEC7wsAb52753w0KdF4GwgKRcIURuLx7y9/5KlAiB9gRGmWcHz5uoJmbPPDNdAenn78/jZZEPJA/IJofRJa0E=",
                  "s": "0D\u0002 \u000e}�*\u0004\u000b�,\u0001�v��ЧE�l )\u0017\bQ\u001b�Ǽ����\u0002 }�\u0011�Y����\t���\f�@zy����dC�\u0003�\t��IkA",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "Akmgxr2Yi4itWOwnP7M+3cf2EWf1Lo3eOgj3ayxUMKHE",
                  "s": "\u0002I�ƽ����X�'?�>���\u0011g�.��:\b�k,T0��",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "34843592cdca999db7c4e124b78a5fb7608cd2b47274dd2d4da5c6543bce42d9",
            "i": 1,
            "a": "1CL2ELxvSaP5UhNCDfeoYPLhtXTSRBmTwZ"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUx0eU1FNmI1QW5Nb3BRckJQTGs0RkdOOFVCdWh4S3Fybg==",
                  "s": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "AQ==",
                  "s": "\u0001",
                  "ii": 2,
                  "i": 1
                },
                {
                  "b": "eyJ0IjoyMy45MSwiaCI6ODgsInAiOjEwMTgsImMiOjQwLCJ3cyI6MS42NCwid2QiOjE2OX0=",
                  "s": "{\"t\":23.91,\"h\":88,\"p\":1018,\"c\":40,\"ws\":1.64,\"wd\":169}",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MUNMMkVMeHZTYVA1VWhOQ0RmZW9ZUExodFhUU1JCbVR3Wg==",
                  "s": "1CL2ELxvSaP5UhNCDfeoYPLhtXTSRBmTwZ",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "MTU2Nzg2MDIzOA==",
                  "s": "1567860238",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "fEJQTzIZbeFXdPJ3gXAfqVW+hkc=",
                  "s": "|BPO2\u0019m�Wt�w�p\u001f�U��G",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 242850,
            "i": 1,
            "a": "1CL2ELxvSaP5UhNCDfeoYPLhtXTSRBmTwZ"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "9c496a37bac9f7105677bd8624b8bdf254e20a98731ff0dc768045645aa2615d"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEQCIFWAwzQIxsYLb/3siYJ+u/e70+WI5B/qDkAIqMfghMjfAiAJmJWCdhqcd+I+AAZyRkXlHCkXHbWcqv1tVxqlVZolxkE=",
                  "s": "0D\u0002 U��4\b��\u000bo�쉂~������\u001f�\u000e@\b������\u0002 \t���v\u001a�w�>\u0000\u0006rFE�\u001c)\u0017\u001d����mW\u001a�U�%�A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "AqfWGjkJ6J7iihljFK+7C415FTat/0hpCd2fWUa35Pk8",
                  "s": "\u0002��\u001a9\t��\u0019c\u0014��\u000b�y\u00156��Hi\tݟYF���<",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "07916faf77b33f2d9b5cbde9a369436fda20682143b12adeaa57555e9deb4f43",
            "i": 1,
            "a": "1EUSgkvfDcFsCwDmDUahfqsfxk6Eo4fKXU"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUx0eU1FNmI1QW5Nb3BRckJQTGs0RkdOOFVCdWh4S3Fybg==",
                  "s": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "AQ==",
                  "s": "\u0001",
                  "ii": 2,
                  "i": 1
                },
                {
                  "b": "eyJ0IjoxNi4wMSwiaCI6NjcsInAiOjEwMTksInIiOjAuMjUsImMiOjQwLCJ3cyI6NS43LCJ3ZCI6MzQwfQ==",
                  "s": "{\"t\":16.01,\"h\":67,\"p\":1019,\"r\":0.25,\"c\":40,\"ws\":5.7,\"wd\":340}",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MUVVU2drdmZEY0ZzQ3dEbURVYWhmcXNmeGs2RW80ZktYVQ==",
                  "s": "1EUSgkvfDcFsCwDmDUahfqsfxk6Eo4fKXU",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "MTU2Nzg2MDUyOA==",
                  "s": "1567860528",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "k8pOq83DqotilyWdRn7XO+iWpjI=",
                  "s": "��N��ê�b�%�F~�;薦2",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 267244,
            "i": 1,
            "a": "1EUSgkvfDcFsCwDmDUahfqsfxk6Eo4fKXU"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "7f21e4318e2caaf52431c6b447e404f5bfbfeba13ae606e77fa3c784ab447ed1"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEQCIHcWX08OTauUBnPTB1DVKikLbLBbtL8AyGSoH8Tc/LnlAiByQMfbtERzBTfF5LHrDTy7Vg4F01UhCrT6aJPDcmSlQkE=",
                  "s": "0D\u0002 w\u0016_O\u000eM��\u0006s�\u0007P�*)\u000bl�[��\u0000�d�\u001f�����\u0002 r@�۴Ds\u00057���\r<�V\u000e\u0005�U!\n��h��rd�BA",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "AkMXekQYV7z8hshuM1/iBvnXXQFCuSes1lvO4reMmQPT",
                  "s": "\u0002C\u0017zD\u0018W����n3_�\u0006��]\u0001B�'��[�ⷌ�\u0003�",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "6a20ed26e02522b43920b5b104f919874aa638c4c350c8a34c879a397be216cb",
            "i": 1,
            "a": "1D8rRT19WjitwYSCPi5zLHWFPnDi71R7jE"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUx0eU1FNmI1QW5Nb3BRckJQTGs0RkdOOFVCdWh4S3Fybg==",
                  "s": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "AQ==",
                  "s": "\u0001",
                  "ii": 2,
                  "i": 1
                },
                {
                  "b": "eyJ0IjoxMy4yNSwiaCI6ODcsInAiOjEwMTksInIiOjAuNTEsImMiOjkwLCJ3cyI6My42LCJ3ZCI6MjAwfQ==",
                  "s": "{\"t\":13.25,\"h\":87,\"p\":1019,\"r\":0.51,\"c\":90,\"ws\":3.6,\"wd\":200}",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MUQ4clJUMTlXaml0d1lTQ1BpNXpMSFdGUG5EaTcxUjdqRQ==",
                  "s": "1D8rRT19WjitwYSCPi5zLHWFPnDi71R7jE",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "MTU2Nzg2MDMzMA==",
                  "s": "1567860330",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "hR2tF//8xq9hzV2IBP0IWvWrp1w=",
                  "s": "�\u001d�\u0017��Ưa�]�\u0004�\bZ���\\",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 205676,
            "i": 1,
            "a": "1D8rRT19WjitwYSCPi5zLHWFPnDi71R7jE"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "b4b07bfc814ef90b4bc441b9d8fbec4be4c2a269e2b37407c323c79807aabd05"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEUCIQD2B50+P8Bfpw1u+3DK1eC4Jts52oRUyguRJsr8KWJYEgIgJIrKP9/+zOXdmdnk5jxeXqL2/4M/FbWX55McOyyspDdB",
                  "s": "0E\u0002!\u0000�\u0007�>?�_�\rn�p���&�9ڄT�\u000b�&��)bX\u0012\u0002 $��?����ݙ���<^^����?\u0015���\u001c;,��7A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "A76Er7NvrR/3MvbHlqVD0GZ+g4uoXJVpmNoQEBAkcnm+",
                  "s": "\u0003����o�\u001f�2�ǖ�C�f~���\\�i��\u0010\u0010\u0010$ry�",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "70286b9104696bc001b48b83e915b07ba25c9eb9209ce12bf428d4588009baad",
            "i": 1,
            "a": "1PcfuJU3dbHADjVegffyXFqxBFtT5JZfFX"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUx0eU1FNmI1QW5Nb3BRckJQTGs0RkdOOFVCdWh4S3Fybg==",
                  "s": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "AQ==",
                  "s": "\u0001",
                  "ii": 2,
                  "i": 1
                },
                {
                  "b": "eyJ0IjoyOC40OCwiaCI6ODMsInAiOjEwMTUsImMiOjIwLCJ3cyI6Mi4xLCJ3ZCI6MjcwfQ==",
                  "s": "{\"t\":28.48,\"h\":83,\"p\":1015,\"c\":20,\"ws\":2.1,\"wd\":270}",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MVBjZnVKVTNkYkhBRGpWZWdmZnlYRnF4QkZ0VDVKWmZGWA==",
                  "s": "1PcfuJU3dbHADjVegffyXFqxBFtT5JZfFX",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "MTU2Nzg2MDUzNQ==",
                  "s": "1567860535",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "+BHMqICN6ohHQjI1KQVE1xXAt78=",
                  "s": "�\u0011̨���GB25)\u0005D�\u0015���",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 920205,
            "i": 1,
            "a": "1PcfuJU3dbHADjVegffyXFqxBFtT5JZfFX"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "9718547ed99647c9c7584aeeddda51eeeb5a2a004ba36cb6c83db6c499e85224"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEUCIQDOSBxFi0XfWmIcsHaKsMVdQmvjSfZSqinl9t/TIlkApgIgVH7q5FO6BAmGTig/+nYCPoTevQUAZMmn5MwNw6sW8JtB",
                  "s": "0E\u0002!\u0000�H\u001cE�E�Zb\u001c�v���]Bk�I�R�)����\"Y\u0000�\u0002 T~��S�\u0004\t�N(?�v\u0002>�޽\u0005\u0000dɧ��\rë\u0016�A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "AkX6Kddd9MEQOTl71Cg9a3Zj+lYoWj87Nwb4GVqeEMQd",
                  "s": "\u0002E�)�]��\u001099{�(=kvc�V(Z?;7\u0006�\u0019Z�\u0010�\u001d",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "41e935625bbd8aca40e59cde2cbb6f9b339cc5cb962b8f7043cc07d8fab5731e",
            "i": 1,
            "a": "1BP73rMurAeM8K8VaEYUvmJVvQ8UBoBMeq"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUx0eU1FNmI1QW5Nb3BRckJQTGs0RkdOOFVCdWh4S3Fybg==",
                  "s": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "AQ==",
                  "s": "\u0001",
                  "ii": 2,
                  "i": 1
                },
                {
                  "b": "eyJ0IjozMS45OSwiaCI6NzQsInAiOjEwMDgsImMiOjIwLCJ3cyI6NC42LCJ3ZCI6MjMwfQ==",
                  "s": "{\"t\":31.99,\"h\":74,\"p\":1008,\"c\":20,\"ws\":4.6,\"wd\":230}",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MUJQNzNyTXVyQWVNOEs4VmFFWVV2bUpWdlE4VUJvQk1lcQ==",
                  "s": "1BP73rMurAeM8K8VaEYUvmJVvQ8UBoBMeq",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "MTU2Nzg2MDI2OA==",
                  "s": "1567860268",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "cd91ZWG5vC72UxmZ+lyDt0XS9K8=",
                  "s": "q�uea��.�S\u0019��\\��E���",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 342434,
            "i": 1,
            "a": "1BP73rMurAeM8K8VaEYUvmJVvQ8UBoBMeq"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "0ec75f0a2a91147d1b377ea158fedb5827a11756d413d9808b8a60e4f9dc0b39"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEUCIQDdfzDoJtMLCXlS3D3R8GVkZVL4QNo2KvNfW7thiZVOIgIgGwK2VQAKqUJvWYiMEJCL67lKdWJcw6NnxRpDPJPvXU1B",
                  "s": "0E\u0002!\u0000�0�&�\u000b\tyR�=��edeR�@�6*�_[�a��N\"\u0002 \u001b\u0002�U\u0000\n�BoY��\u0010���Jub\\ãg�\u001aC<��]MA",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "AzLzYfD+OtUZmmdWef0aFV1BK4aGVsReeTqrqdMqonE8",
                  "s": "\u00032�a��:�\u0019�gVy�\u001a\u0015]A+��V�^y:���*�q<",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "cae28b3201d93ee127ea3eecf7c89f1e5376c23bcfee0c3dc7c3d1c3c0754403",
            "i": 1,
            "a": "1JdezVNDTEiyxEin97V95tS6cGXEpVB1GU"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUx0eU1FNmI1QW5Nb3BRckJQTGs0RkdOOFVCdWh4S3Fybg==",
                  "s": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "AQ==",
                  "s": "\u0001",
                  "ii": 2,
                  "i": 1
                },
                {
                  "b": "eyJ0IjoxNC43OSwiaCI6ODIsInAiOjEwMTgsImMiOjkwLCJ3cyI6My42LCJ3ZCI6OTB9",
                  "s": "{\"t\":14.79,\"h\":82,\"p\":1018,\"c\":90,\"ws\":3.6,\"wd\":90}",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MUpkZXpWTkRURWl5eEVpbjk3Vjk1dFM2Y0dYRXBWQjFHVQ==",
                  "s": "1JdezVNDTEiyxEin97V95tS6cGXEpVB1GU",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "MTU2Nzg2MDUzNw==",
                  "s": "1567860537",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "wWjTjstJzMHex73crtcNurN1OJc=",
                  "s": "�hӎ�I���ǽܮ�\r��u8�",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 272886,
            "i": 1,
            "a": "1JdezVNDTEiyxEin97V95tS6cGXEpVB1GU"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "f554b79d8282555f281594f12d9c5c09eb8b1a298a67db8d2cc313b2a37bf64a"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEUCIQD4Q5gmbCKUKQB85FYLUfwZ1L+5tF9dSBNlc6qKJrNgzgIgShxF2BLvzOzoogqV7fbgGL8SKsmL9ylhbWhykh0NvRNB",
                  "s": "0E\u0002!\u0000�C�&l\"�)\u0000|�V\u000bQ�\u0019Կ��_]H\u0013es��&�`�\u0002 J\u001cE�\u0012����\n����\u0018�\u0012*ɋ�)amhr�\u001d\r�\u0013A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "A3Qm7vwrfLTmmHIstx6k7wQeTEDFzZUr6a7Ty4vbdMLk",
                  "s": "\u0003t&��+|��r,�\u001e��\u0004\u001eL@�͕+��ˋ�t��",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "64c7b7cf8ed045714b832817f0b4d189b80bebfca3f35a28437ea456ff32d148",
            "i": 1,
            "a": "1AuTpEdBpmaeDjiN8h1Su8jg2zCbRwYevD"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUx0eU1FNmI1QW5Nb3BRckJQTGs0RkdOOFVCdWh4S3Fybg==",
                  "s": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "AQ==",
                  "s": "\u0001",
                  "ii": 2,
                  "i": 1
                },
                {
                  "b": "eyJ0IjoxNS4zMywiaCI6NjIsInAiOjEwMjUsImMiOjQwLCJ3cyI6NC4xLCJ3ZCI6MzUwfQ==",
                  "s": "{\"t\":15.33,\"h\":62,\"p\":1025,\"c\":40,\"ws\":4.1,\"wd\":350}",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MUF1VHBFZEJwbWFlRGppTjhoMVN1OGpnMnpDYlJ3WWV2RA==",
                  "s": "1AuTpEdBpmaeDjiN8h1Su8jg2zCbRwYevD",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "MTU2Nzg2MDUzNA==",
                  "s": "1567860534",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "bKUlRdCoAQRfMESkXGR8CFIcWqk=",
                  "s": "l�%EШ\u0001\u0004_0D�\\d|\bR\u001cZ�",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 259943,
            "i": 1,
            "a": "1AuTpEdBpmaeDjiN8h1Su8jg2zCbRwYevD"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "7f3e631a25637ef1d40afa63ae85c53b19d0f3075c3e2a6f1daa03c8c5f36360"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEUCIQCR1xGdy4RDvVE2Z6ON2SoPoLkalVg90f8u8bqG93BqDgIgVVU4wPlwEL5EEOU6DvCZckRMemjgsPkkSrUoPTWhEz5B",
                  "s": "0E\u0002!\u0000��\u0011�˄C�Q6g���*\u000f��\u001a�X=��.��pj\u000e\u0002 UU8��p\u0010�D\u0010�:\u000e�rDLzh��$J�(=5�\u0013>A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "Ai4HOA0dO3lFfcgzyMiqWA+A50JjZ0C4NgKUSIJRXOt/",
                  "s": "\u0002.\u00078\r\u001d;yE}�3�ȪX\u000f��Bcg@�6\u0002�H�Q\\�",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "63801c36b3ed34016cf8c09155f2e934252ec4dc1cad11e312a7c7234848b65f",
            "i": 1,
            "a": "16KhAyhV8Pak5hTN25jWHRw54q6naRvmQN"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUx0eU1FNmI1QW5Nb3BRckJQTGs0RkdOOFVCdWh4S3Fybg==",
                  "s": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "AQ==",
                  "s": "\u0001",
                  "ii": 2,
                  "i": 1
                },
                {
                  "b": "eyJ0IjozMCwiaCI6NTUsInAiOjEwMTQsImMiOjQwLCJ3cyI6Mi4xfQ==",
                  "s": "{\"t\":30,\"h\":55,\"p\":1014,\"c\":40,\"ws\":2.1}",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MTZLaEF5aFY4UGFrNWhUTjI1aldIUnc1NHE2bmFSdm1RTg==",
                  "s": "16KhAyhV8Pak5hTN25jWHRw54q6naRvmQN",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "MTU2Nzg2MDUzOQ==",
                  "s": "1567860539",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "OmGmcD+getBEYLNnGF9ig65F4+E=",
                  "s": ":a�p?�z�D`�g\u0018_b��E��",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 362047,
            "i": 1,
            "a": "16KhAyhV8Pak5hTN25jWHRw54q6naRvmQN"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "3e28bbb1043bfc03e69194a4532c1e503bcdc10fc378fb9c4c4a00b0208b607d"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEUCIQDazjQSAdBiCohA1Xuozf3jLZ16C6f4U5F6zrVYG2231wIgfStbdad/2fsC0JAoxiFmkcXIo04wdqVlEP5SzfnujvJB",
                  "s": "0E\u0002!\u0000��4\u0012\u0001�b\n�@�{����-�z\u000b��S�zεX\u001bm��\u0002 }+[u���\u0002А(�!f��ȣN0v�e\u0010�R����A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "Ar8SzCFdsENA68pihvVkrkY05Os2cfDoJQDdV/9soe81",
                  "s": "\u0002�\u0012�!]�C@��b��d�F4��6q��%\u0000�W�l��5",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "41430a6c0ad4cd85268688b5194bd93b5da18ee638414f8676a9d7ae0e1c9a95",
            "i": 1,
            "a": "17FWGWfsDPs5vnervY7fWwS7EgKU4naSVC"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUx0eU1FNmI1QW5Nb3BRckJQTGs0RkdOOFVCdWh4S3Fybg==",
                  "s": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "AQ==",
                  "s": "\u0001",
                  "ii": 2,
                  "i": 1
                },
                {
                  "b": "eyJ0IjoxMi41OSwiaCI6NDEsInAiOjEwMTAsImMiOjAsIndzIjo2LjIsIndkIjoyNzB9",
                  "s": "{\"t\":12.59,\"h\":41,\"p\":1010,\"c\":0,\"ws\":6.2,\"wd\":270}",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MTdGV0dXZnNEUHM1dm5lcnZZN2ZXd1M3RWdLVTRuYVNWQw==",
                  "s": "17FWGWfsDPs5vnervY7fWwS7EgKU4naSVC",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "MTU2Nzg2MDQ4Mw==",
                  "s": "1567860483",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "RI8CZ9N7qM79Y2A3oeX5GMNQEwc=",
                  "s": "D�\u0002g�{���c`7���\u0018�P\u0013\u0007",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 613467,
            "i": 1,
            "a": "17FWGWfsDPs5vnervY7fWwS7EgKU4naSVC"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "1820c76ac28e89003571b80b91f7bdda59e371a5e38463e2a353a5fedc06539a"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEUCIQCNqZxmze/kGpP/WPhD/eGKK3tf6S6Y79pGU+SeOudjKgIgR16dUmei/3eKYhYj+lbQtyYjf9PItXlMtZVq5N9tqhhB",
                  "s": "0E\u0002!\u0000���f���\u001a��X�C��+{_�.���FS�:�c*\u0002 G^�Rg��w�b\u0016#�Vз&#�ȵyL��j��m�\u0018A",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "AjUjMj5YQ4o9oydwvEECMmel8wzyrFGsLTfvzh4Qtgn0",
                  "s": "\u00025#2>XC�=�'p�A\u00022g��\f�Q�-7��\u001e\u0010�\t�",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "39a186eb962c7c5030fc4853f24f001055b81e74a1a79c8d3ded138a009ae54e",
            "i": 1,
            "a": "1GGvxcgGE3gaGK7jBn4XMwvxBf9eKVKH3o"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUx0eU1FNmI1QW5Nb3BRckJQTGs0RkdOOFVCdWh4S3Fybg==",
                  "s": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "AQ==",
                  "s": "\u0001",
                  "ii": 2,
                  "i": 1
                },
                {
                  "b": "eyJ0IjoxNy4wMiwiaCI6NzcsInAiOjEwMjAsImMiOjc1LCJ3cyI6MS41LCJ3ZCI6MTQwfQ==",
                  "s": "{\"t\":17.02,\"h\":77,\"p\":1020,\"c\":75,\"ws\":1.5,\"wd\":140}",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MUdHdnhjZ0dFM2dhR0s3akJuNFhNd3Z4QmY5ZUtWS0gzbw==",
                  "s": "1GGvxcgGE3gaGK7jBn4XMwvxBf9eKVKH3o",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "MTU2Nzg2MDUyMw==",
                  "s": "1567860523",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "p40rNcdIZiQ/BL+KuixTYn5ucB8=",
                  "s": "��+5�Hf$?\u0004���,Sb~np\u001f",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 331612,
            "i": 1,
            "a": "1GGvxcgGE3gaGK7jBn4XMwvxBf9eKVKH3o"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    },
    {
      "tx": {
        "h": "b4e1bdb6177ece9b75d8450c47e6c1240504409e8f61bad5a8f3bcb48fff67ad"
      },
      "in": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "b": "MEUCIQCvPs7z6JFpu31mhEQvzxZB1i7xJIb3p1ULsbvHsf1u1AIgTMBvTY5079UbyNyKUmPnUjPD5osBteLzzErHrRUGsWpB",
                  "s": "0E\u0002!\u0000�>���i�}f�D/�\u0016A�.�$���U\u000b��Ǳ�n�\u0002 L�oM�t��\u001b�܊Rc�R3��\u0001����Jǭ\u0015\u0006�jA",
                  "ii": 0,
                  "i": 0
                },
                {
                  "b": "Ah4neps6BPFZyW1etCz15L9Mh4rwOwXoIm6omBnbvLsx",
                  "s": "\u0002\u001e'z�:\u0004�Y�m^�,��L���;\u0005�\"n��\u0019ۼ�1",
                  "ii": 1,
                  "i": 1
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "h": "ea8c2317c44c2830d8abc9223fc7ddfef7c5df9acce3e979069e6d30c8ee3fcb",
            "i": 1,
            "a": "19jbxrx3vNysyTmchJCdQPxTFv2CU8SjXo"
          }
        }
      ],
      "out": [
        {
          "i": 0,
          "tape": [
            {
              "cell": [
                {
                  "op": 106,
                  "ops": "OP_RETURN",
                  "ii": 0,
                  "i": 0
                }
              ],
              "i": 0
            },
            {
              "cell": [
                {
                  "b": "MUx0eU1FNmI1QW5Nb3BRckJQTGs0RkdOOFVCdWh4S3Fybg==",
                  "s": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn",
                  "ii": 1,
                  "i": 0
                },
                {
                  "b": "AQ==",
                  "s": "\u0001",
                  "ii": 2,
                  "i": 1
                },
                {
                  "b": "eyJ0IjoxNy4xLCJoIjo2NywicCI6MTAyNiwiYyI6NDAsIndzIjo1LjcsIndkIjozNjB9",
                  "s": "{\"t\":17.1,\"h\":67,\"p\":1026,\"c\":40,\"ws\":5.7,\"wd\":360}",
                  "ii": 3,
                  "i": 2
                },
                {
                  "b": "MTlqYnhyeDN2TnlzeVRtY2hKQ2RRUHhURnYyQ1U4U2pYbw==",
                  "s": "19jbxrx3vNysyTmchJCdQPxTFv2CU8SjXo",
                  "ii": 4,
                  "i": 3
                },
                {
                  "b": "MTU2Nzg2MDMzMw==",
                  "s": "1567860333",
                  "ii": 5,
                  "i": 4
                }
              ],
              "i": 1
            }
          ],
          "e": {
            "v": 0,
            "i": 0,
            "a": "false"
          }
        },
        {
          "i": 1,
          "tape": [
            {
              "cell": [
                {
                  "op": 118,
                  "ops": "OP_DUP",
                  "ii": 0,
                  "i": 0
                },
                {
                  "op": 169,
                  "ops": "OP_HASH160",
                  "ii": 1,
                  "i": 1
                },
                {
                  "b": "X8+pk8zgWrwxtTOQ1YUGqA1UbkQ=",
                  "s": "_ϩ���Z�1�3�Յ\u0006�\rTnD",
                  "ii": 2,
                  "i": 2
                },
                {
                  "op": 136,
                  "ops": "OP_EQUALVERIFY",
                  "ii": 3,
                  "i": 3
                },
                {
                  "op": 172,
                  "ops": "OP_CHECKSIG",
                  "ii": 4,
                  "i": 4
                }
              ],
              "i": 0
            }
          ],
          "e": {
            "v": 159922,
            "i": 1,
            "a": "19jbxrx3vNysyTmchJCdQPxTFv2CU8SjXo"
          }
        }
      ],
      "blk": {
        "i": 598966,
        "h": "000000000000000002b888b9b9d806b27103df8ebf29dfc359f9d4e6ef4cc427",
        "t": 1567860575
      }
    }
  ]
}
</code></pre>

To use TXO, simply add `bit.use("parse", "txo")`


```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.use("parse", "txo")
bit.on("ready", async () => {
  bit.on("mempool", (e) => {
    console.log(e)
  })
})
```

To use raw hex format, add `bit.use("parse", "hex")`

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.use("parse", "hex")
bit.on("ready", async () => {
  bit.on("mempool", (e) => {
    console.log(e)
  })
})
```


### b. filter

The second stage is "filter". This is where you filter the parsed transaction set based on a filter function. 

![filter](filter.png)

Depending on whether an input passes the filter function test, it gets included in or excluded from the result set.

It works the same way [Array.prototype.filter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter) does. Here's an example where we're trying to filter non-OP_RETURN transactions:

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.use("parse", "bob")
bit.use("filter", (e) => e.out[0].tape[0].cell[0].ops !== "OP_RETURN")
bit.on("ready", async () => {
  let mempool = await bit.get("mempool")
  console.log("mempool =", mempool)
})
```

This also applies to listeners. When you run the following code, it will only trigger the `"mempool"` event when the incoming transaction passes the filter test:


```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.use("parse", "bob")
bit.use("filter", (e) => e.out[0].tape[0].cell[0].ops !== "OP_RETURN")
bit.on("ready", async () => {
  bit.on("mempool", (e) => {
    console.log("ONLY NON-OPRETURN TXS", e)
  })
})
```


### c. map

The last stage is "map". Map lets you transform the incoming data into a desired format.

![map](map.png)

It works the same way [Array.prototype.map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) does, **BUT WITH A TWIST**. 

For every transformed object, it auto-attaches a couple of transaction related metadata such as `tx.h` (transaction id) and `blk` (block metadata)


#### Syntax

Use the following to declare a `map` function for a bitwork instance:

```
bit.use("map", <transformer function>)
```

#### How it works

Once a "map" middleware is set, all requests (both `get` and `on`) will go through the `map` step before returning a response.

However, **unlike the previous steps (`parse` and `filter`) using `map` adds an additional structure.**

For a mempool transaction:

1. it wraps each transformed object in a `$` attribute.
2. it also auto-attaches an additional `tx.h` attribute which indicates the transaction id.

Example:

```
{
  "$": <transformed object>,
  "tx": {
    "h": <transaction id>
  }
}
```

For a transaction in a block, it attaches one more attribute `blk`:

```
{
  "$": <transformed object>,
  "tx": {
    "h": <transaction id>
  },
  "blk": {
    "i": <block height (index)>,
    "h": <block hash>,
    "t": <block time>
  }
}
```


Here's an example:


```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.use("parse", "bob")
bit.use("filter", (e) => e.out[0].tape[0].cell[0].ops !== "OP_RETURN")
bit.use("map", (e) => e.out[0])
bit.on("ready", async () => {
  let mempool = await bit.get("mempool")
  //
  // Since we have a "map" middleware, the transformed
  // transactions are wrapped inside a "$" attribute.
  // Also, an additional "tx.h" attribute is auto-attached.
  //
  //  mempool := {
  //    "tx": [{
  //      "$": <e.out[0]>,
  //      "tx": {
  //        "h": <transaction id>
  //      }
  //    }, {
  //      "$": <e.out[0]>,
  //      "tx": {
  //        "h": <transaction id>
  //      }
  //    }, {
  //      ...
  //    }, {
  //      "$": <e.out[0]>,
  //      "tx": {
  //        "h": <transaction id>
  //      }
  //    }]
  //  }
  //
})
```

This also applies to listeners:


```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.use("parse", "bob")
bit.use("filter", (e) => e.out[0].tape[0].cell[0].ops !== "OP_RETURN")
bit.use("map", (e) => e.out[0].tape[0].cell.slice(1))
bit.on("ready", async () => {
  bit.on("mempool", (mempool) => {
    //
    // Since we have a "map" middleware, the transformed
    // transactions are wrapped inside a "$" attribute.
    // Also, an additional "tx.h" attribute is auto-attached.
    //
    //  mempool := {
    //    "$": <e.out[0].tape[0].cell.slice(1)>,
    //    "tx": {
    //      "h": <transaction id>
    //    }
    //  }
    //
    })
    console.log("ONLY the OPRETURN cells", e)
})
```

In case of block related requests, we also have an additional `blk` attribute attached automatically:

```
const bitwork = require('bitwork')
const bit = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
bit.use("parse", "bob")
bit.use("filter", (e) => e.out[0].tape[0].cell[0].ops !== "OP_RETURN")
bit.use("map", (e) => e.out[0].tape[0].cell.slice(1))
bit.on("ready", async () => {
  let block = await bit.get("block", 588000)
  //
  // Since we have a "map" middleware, the transformed
  // transactions are wrapped inside a "$" attribute.
  // Also, an additional "tx.h" attribute is auto-attached.
  //
  //  block := {
  //    header: <block header>,
  //    tx: [
  //      {
  //        "$": <.out[0].tape[0].cell.slice(1)>,  
  //        "tx": {
  //          "h": <transaction id>
  //        },
  //        "blk": {
  //          "i": <block height>,
  //          "h": <block hash>,
  //          "t": <block time>
  //        }
  //      },
  //      ...
  //      {
  //        "$": <.out[0].tape[0].cell.slice(1)>,  
  //        "tx": {
  //          "h": <transaction id>
  //        },
  //        "blk": {
  //          "i": <block height>,
  //          "h": <block hash>,
  //          "t": <block time>
  //        }
  //      }
  //    ]
  //  }
  //
})
```

> **NOTE**
>
> The "map" step is separate from the "parse" step because the "parse" takes care of deserialization, which won't vary much across applications, whereas "map" functions are application specific and will be different for every app.

---

# Troubleshoot

## 1. How many bitworks to create?

At the moment, you should create a new instance for each purpose.

For example if you want to **fetch** as well as **listen**, you must instantiate two separate bitwork objects.

```
const bitwork = require('bitwork')
const fetcher = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
fetcher.on("ready", async () => {
  /******************************************************
  * Step 1. First fetch the mempool with "fetcher".
  ******************************************************/
  let mempool = await fetcher.get("mempool")
  console.log("current mempool = ", mempool)
  /******************************************************
  * Step 2. Start listening to the mempool with "listener"
  ******************************************************/
  const listener = new bitwork({ rpc: { user: "root", pass: "bitcoin" } })
  listener.on("ready", async () => {
    listener.on("mempool", (e) => {
      console.log("new mempool transaction", e)
    })
  })
})
```

This also applies to listeners. If you want to listen to both mempool transaction events and block events, create two separate listeners for each.
