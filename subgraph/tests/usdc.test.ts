import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  afterEach,
  assert,
  clearStore,
  describe,
  newMockEvent,
  test,
} from "matchstick-as/assembly/index";
import { Transfer } from "../generated/USDC/ERC20";
import { handleFeeTransfer } from "../src/usdc";
import { dayId } from "../src/helpers";

const FEES_MANAGER = "0xF1Ccb04C363F1df8D6081D2e32c70f7a85814E92";
const FEE_RECIPIENT = "0x3eFBc153573C469d14846f2Af6Eb1245768C83cE";
const RANDOM_WALLET = "0x1111111111111111111111111111111111111111";
const PAYER = "0x2222222222222222222222222222222222222222";

function createTransfer(to: string, value: i32): Transfer {
  let event = changetype<Transfer>(newMockEvent());
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam(
      "from",
      ethereum.Value.fromAddress(Address.fromString(PAYER))
    )
  );
  event.parameters.push(
    new ethereum.EventParam(
      "to",
      ethereum.Value.fromAddress(Address.fromString(to))
    )
  );
  event.parameters.push(
    new ethereum.EventParam(
      "value",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(value))
    )
  );
  return event;
}

function idOf(event: Transfer): string {
  return event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
}

describe("USDC fee transfers", () => {
  afterEach(() => {
    clearStore();
  });

  test("records a transfer into the FeesManager", () => {
    let event = createTransfer(FEES_MANAGER, 1500000);
    handleFeeTransfer(event);

    assert.entityCount("FeeEvent", 1);
    assert.fieldEquals("FeeEvent", idOf(event), "amount", "1500000");
    assert.fieldEquals(
      "FeeEvent",
      idOf(event),
      "to",
      FEES_MANAGER.toLowerCase()
    );
  });

  test("ignores a transfer into the downstream fee recipient", () => {
    // This test used to assert the opposite, and it was the over-count.
    // 0x3eFBc153… is a co-mingled hot EOA and a sweep destination, not a
    // collection point. Measured on the deployed index, all 5 transfers that
    // ever reached it were external noise totalling $1,930.20, which was 43.4%
    // of the whole lifetime fee figure and took the implied take rate to 16.80%
    // of volume, above the 12.5% contractual maximum.
    let event = createTransfer(FEE_RECIPIENT, 250000);
    handleFeeTransfer(event);

    assert.entityCount("FeeEvent", 0);
    assert.entityCount("DailyStat", 0);
  });

  test("ignores a sweep OUT of the FeesManager", () => {
    // The double-count guard, which had no test at all: the one test with this
    // shape used PAYER as the sender both times, so it would have stayed green
    // if isInternalMove were deleted.
    let event = createTransfer(FEE_RECIPIENT, 90000);
    event.parameters[0] = new ethereum.EventParam(
      "from",
      ethereum.Value.fromAddress(Address.fromString(FEES_MANAGER))
    );
    handleFeeTransfer(event);

    assert.entityCount("FeeEvent", 0);
  });

  test("ignores a transfer to any other address", () => {
    let event = createTransfer(RANDOM_WALLET, 9999999);
    handleFeeTransfer(event);

    // This is the test that matters: without it, a dropped topic filter would
    // index every USDC transfer on Polygon and nobody would notice until the
    // sync stalled.
    assert.entityCount("FeeEvent", 0);
    assert.entityCount("DailyStat", 0);
  });

  test("accumulates only real fees into the daily stat", () => {
    // Two collections plus one transfer to the downstream recipient. Only the
    // two collections count. Asserting 1500000 here is what let the day-level
    // fee figure run 2.3x reality.
    // logIndex has to be bumped by hand: newMockEvent() hands back the same
    // transaction hash and logIndex every call, so two transfers built from it
    // share an eventId and the second silently overwrites the first. Real
    // transfers in one transaction always differ by logIndex.
    let first = createTransfer(FEES_MANAGER, 1000000);
    handleFeeTransfer(first);
    let second = createTransfer(FEES_MANAGER, 500000);
    second.logIndex = first.logIndex.plus(BigInt.fromI32(1));
    handleFeeTransfer(second);
    let downstream = createTransfer(FEE_RECIPIENT, 500000);
    downstream.logIndex = first.logIndex.plus(BigInt.fromI32(2));
    handleFeeTransfer(downstream);

    let day = dayId(first.block.timestamp);
    assert.entityCount("DailyStat", 1);
    assert.fieldEquals("DailyStat", day, "fees", "1500000");
    assert.entityCount("FeeEvent", 2);
  });
});
