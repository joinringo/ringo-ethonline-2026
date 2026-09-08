#!/usr/bin/env node
/**
 * Finds the block a contract was created in, so `startBlock` in subgraph.yaml
 * is a fact rather than a guess.
 *
 *   node scripts/find-start-block.mjs
 *   node scripts/find-start-block.mjs 0xSomeOtherAddress
 *   RPC_URL=https://your-node node scripts/find-start-block.mjs
 *
 * How it works: binary search on `eth_getCode`. The contract has no code at
 * any block before it was deployed and code at every block after, so the
 * boundary between those two is the creation block.
 *
 * Caveat worth knowing before you trust a result: this needs an RPC that will
 * serve historical state. Plenty of free endpoints only keep the last ~128
 * blocks and answer "0x" for everything older, which would make this script
 * confidently report the wrong block — a number that is too high, silently
 * dropping every market opened before it. The sanity check at the end catches
 * the common version of that failure, but if anything looks off, read the
 * creation block off Polygonscan instead: open the contract, click the
 * "Contract Creation" transaction, take its block number.
 */

const DEFAULT_ADDRESS = "0x6816374F4Bf692A8b317d9b03cF510DD81C40841";
const DEFAULT_RPC = "https://polygon-rpc.com";

const address = process.argv[2] ?? DEFAULT_ADDRESS;
const rpcUrl = process.env.RPC_URL ?? DEFAULT_RPC;

let requestId = 0;

async function rpc(method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++requestId,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC ${method} returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(`RPC ${method}: ${payload.error.message}`);
  }
  return payload.result;
}

const toHex = (n) => "0x" + n.toString(16);

async function hasCodeAt(block) {
  const code = await rpc("eth_getCode", [address, toHex(block)]);
  return code !== "0x" && code !== "0x0";
}

async function main() {
  const head = Number(await rpc("eth_blockNumber", []));
  console.log(`Address:   ${address}`);
  console.log(`RPC:       ${rpcUrl}`);
  console.log(`Chain head: ${head.toLocaleString("en-US")}\n`);

  if (!(await hasCodeAt(head))) {
    console.error(
      "No code at this address on the current chain head.\n" +
        "Either the address is wrong, or this RPC is pointed at a different network."
    );
    process.exit(1);
  }

  let low = 0;
  let high = head;
  let probes = 0;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    probes++;
    process.stdout.write(`\rProbing… ${probes} requests, range ${high - low} blocks   `);
    if (await hasCodeAt(mid)) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  process.stdout.write("\r".padEnd(60) + "\r");

  // If the search lands on block 0, the RPC almost certainly answered "0x" for
  // every historical block rather than the contract existing since genesis.
  if (low === 0) {
    console.error(
      "Search converged on block 0, which is not a real answer.\n" +
        "This RPC is not serving historical state. Try an archive endpoint with\n" +
        "RPC_URL=… or read the block off Polygonscan."
    );
    process.exit(1);
  }

  const block = await rpc("eth_getBlockByNumber", [toHex(low), false]);
  const when = new Date(Number(block.timestamp) * 1000).toISOString().slice(0, 10);

  console.log(`Created in block ${low.toLocaleString("en-US")}  (${when})`);
  console.log(`Confirmed in ${probes} requests.\n`);
  console.log("Put it in subgraph.yaml, in BOTH data sources:\n");
  console.log(`      startBlock: ${low}`);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
