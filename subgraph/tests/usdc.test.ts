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

  test("records a transfer into the fee recipient", () => {
    let event = createTransfer(FEE_RECIPIENT, 250000);
    handleFeeTransfer(event);

    assert.entityCount("FeeEvent", 1);
    assert.fieldEquals("FeeEvent", idOf(event), "amount", "250000");
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

  test("accumulates fees into the daily stat", () => {
    let first = createTransfer(FEES_MANAGER, 1000000);
    handleFeeTransfer(first);
    let second = createTransfer(FEE_RECIPIENT, 500000);
    handleFeeTransfer(second);

    let day = dayId(first.block.timestamp);
    assert.entityCount("DailyStat", 1);
    assert.fieldEquals("DailyStat", day, "fees", "1500000");
  });
});
