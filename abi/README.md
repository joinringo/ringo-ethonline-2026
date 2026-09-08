# abi/

`RingoManager.json` — the four events RingoManager emits on Polygon mainnet.
`subgraph/abis/` carries a copy.

It was **reconstructed from the chain**, not exported from the backend. The
proxy `0x6816374F4Bf692A8b317d9b03cF510DD81C40841` is verified, but its
implementation `0x3B9e0e3d0b8cDac44734E6397b0Ca53Ac716A15f` is not — on
Polygonscan, Sourcify and Blockscout alike — so there is no published ABI to
download.

What is fact here, and how it was established:

* **Types** — `keccak256(signature)` equals the `topic0` of real logs, for all
  four events.
* **`indexed` flags** — the number of indexed inputs equals the topic count of
  1000 sampled logs per event, and the non-indexed inputs account exactly for
  the data words. `QuestionCreated` has 3 topics / 0 data words,
  `RingoCreatedAndFilled` 4 / 3, `RingoResolved` 3 / 1, `RingoInvalidated`
  2 / 1.
* **Names** — `ringoId`, `winner` and `amount` come from the signature a block
  explorer decodes `RingoResolved` with. The others (`questionId`, `userA`,
  `userB`, `amountA`, `amountB`, `escrow`, `timestamp`) are this repo's names.
  They only feed codegen; nothing on chain depends on them.

If `libs/util/src/abis/RingoManager.abi.ts` ever becomes reachable, diff it
against this file rather than replacing it blind — a name change is harmless
(it lands in `subgraph/src/abi-adapters.ts`), an `indexed` change is not.
