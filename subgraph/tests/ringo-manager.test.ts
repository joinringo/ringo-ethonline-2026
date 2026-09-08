/**
 * These tests hold one thing in place above all: every handler keys on the
 * hashed ringoId from the topic, so the four events of one ringo land on one
 * Market. The earlier version keyed on a value decoded out of
 * `transaction.input`, which on this contract is an ERC-4337 `handleOps` blob —
 * it decoded without erroring and produced a different id per transaction. The
 * first two tests below are what catches a regression back to that.
 */
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  afterEach,
  assert,
  clearStore,
  describe,
  newMockEvent,
  test,
} from "matchstick-as/assembly/index";
import {
  QuestionCreated,
  RingoCreatedAndFilled,
  RingoInvalidated,
  RingoResolved,
} from "../generated/RingoManager/RingoManager";
import {
  handleQuestionCreated,
  handleRingoCreatedAndFilled,
  handleRingoInvalidated,
  handleRingoResolved,
} from "../src/ringo-manager";

// What graph-node hands back for an indexed dynamic `bytes`: the topic, i.e.
// keccak256(ringoId). Any 32 bytes work here; what matters is that every event
// of one ringo carries the same value.
const RINGO_A =
  "0x05b4129ff90ab10ea3edce521d245203793f7b7b0c6512a88eb48fc6cdb3919d";

// A different ringo, to prove two of them do not collapse into one Market.
const RINGO_B =
  "0x27e9b9fbef58bda1b4ea45d6e9280a39e29460fcb3748cde6e5630334c91b48f";

const QUESTION_ID =
  "0x00000000000000000000000000000000000000000000000000000000000000ff";
const ALICE = "0x4444444444444444444444444444444444444444";
const BOB = "0x5555555555555555555555555555555555555555";
const CAROL = "0x6666666666666666666666666666666666666666";
const RESOLVER = "0x7777777777777777777777777777777777777777";

describe("RingoManager", () => {
  afterEach(() => {
    clearStore();
  });

  test("the four events of one ringo land on a single Market", () => {
    handleQuestionCreated(createQuestionCreated(QUESTION_ID));
    handleRingoCreatedAndFilled(createFill(ALICE, BOB, 1000000, 1000000));
    handleRingoResolved(createResolved(2000000, ALICE));

    assert.entityCount("Market", 1);
    assert.fieldEquals("Market", RINGO_A, "questionId", QUESTION_ID);
    assert.fieldEquals("Market", RINGO_A, "fills", "1");
    assert.fieldEquals("Market", RINGO_A, "status", "RESOLVED");
  });

  test("two ringos stay two markets", () => {
    handleRingoCreatedAndFilled(createFill(ALICE, BOB, 1000000, 1000000));
    handleRingoCreatedAndFilled(createFillFor(RINGO_B, ALICE, CAROL, 3000000, 3000000));

    assert.entityCount("Market", 2);
    assert.fieldEquals("Market", RINGO_A, "volume", "2000000");
    assert.fieldEquals("Market", RINGO_B, "volume", "6000000");
  });

  test("a resolution credits the winner and the other side", () => {
    handleRingoCreatedAndFilled(createFill(ALICE, BOB, 1000000, 1000000));
    handleRingoResolved(createResolved(2000000, ALICE));

    assert.fieldEquals("Trader", ALICE.toLowerCase(), "wins", "1");
    assert.fieldEquals("Trader", ALICE.toLowerCase(), "losses", "0");
    assert.fieldEquals("Trader", BOB.toLowerCase(), "losses", "1");
    assert.fieldEquals("Trader", BOB.toLowerCase(), "wins", "0");
  });

  test("a winner with no indexed fill still gets the win, and nobody gets a loss", () => {
    // The fill predates the start block: the resolution names the winner, but
    // there is no Ringo row to say who was on the other side.
    handleRingoResolved(createResolved(2000000, ALICE));

    assert.fieldEquals("Trader", ALICE.toLowerCase(), "wins", "1");
    assert.entityCount("Trader", 1);
  });

  test("a fill moves volume, fills and participants", () => {
    handleQuestionCreated(createQuestionCreated(QUESTION_ID));
    handleRingoCreatedAndFilled(createFill(ALICE, BOB, 5000000, 5000000));

    assert.entityCount("Ringo", 1);
    assert.fieldEquals("Market", RINGO_A, "volume", "10000000");
    assert.fieldEquals("Market", RINGO_A, "fills", "1");
    assert.fieldEquals("Market", RINGO_A, "participants", "2");
    assert.fieldEquals("Trader", ALICE.toLowerCase(), "volume", "5000000");
  });

  test("a returning trader is not counted as a new participant", () => {
    handleRingoCreatedAndFilled(createFill(ALICE, BOB, 1000000, 1000000));
    handleRingoCreatedAndFilled(createFill(ALICE, CAROL, 2000000, 2000000));

    assert.fieldEquals("Market", RINGO_A, "participants", "3");
    assert.fieldEquals("Market", RINGO_A, "fills", "2");
    assert.fieldEquals("Trader", ALICE.toLowerCase(), "volume", "3000000");
  });

  test("a resolution with no prior creation still lands", () => {
    // Most of the history: the v1 creation event has a different signature and
    // is not decoded, but its markets keep resolving inside our window.
    handleRingoResolved(createResolved(1, RESOLVER));

    assert.entityCount("Market", 1);
    assert.entityCount("Resolution", 1);
    assert.fieldEquals("Market", RINGO_A, "status", "RESOLVED");
    assert.fieldEquals("Market", RINGO_A, "outcome", "1");
  });

  test("invalidation leaves no outcome and no resolution", () => {
    handleQuestionCreated(createQuestionCreated(QUESTION_ID));
    handleRingoInvalidated(createInvalidated(0));

    assert.fieldEquals("Market", RINGO_A, "status", "INVALID");
    assert.entityCount("Resolution", 0);
  });
});

// --- event builders ---------------------------------------------------------
// Signatures confirmed against topic0; parameter names follow the placeholder
// ABI and move with the real one.

function createQuestionCreated(questionId: string): QuestionCreated {
  let event = changetype<QuestionCreated>(newMockEvent());
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("ringoId", ethereum.Value.fromBytes(Bytes.fromHexString(RINGO_A)))
  );
  event.parameters.push(
    new ethereum.EventParam(
      "questionId",
      ethereum.Value.fromFixedBytes(Bytes.fromHexString(questionId))
    )
  );
  return event;
}

function createFill(
  userA: string,
  userB: string,
  amountA: i32,
  amountB: i32
): RingoCreatedAndFilled {
  return createFillFor(RINGO_A, userA, userB, amountA, amountB);
}

function createFillFor(
  ringoId: string,
  userA: string,
  userB: string,
  amountA: i32,
  amountB: i32
): RingoCreatedAndFilled {
  let event = changetype<RingoCreatedAndFilled>(newMockEvent());
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("ringoId", ethereum.Value.fromBytes(Bytes.fromHexString(ringoId)))
  );
  event.parameters.push(
    new ethereum.EventParam("userA", ethereum.Value.fromAddress(Address.fromString(userA)))
  );
  event.parameters.push(
    new ethereum.EventParam("userB", ethereum.Value.fromAddress(Address.fromString(userB)))
  );
  event.parameters.push(
    new ethereum.EventParam(
      "amountA",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(amountA))
    )
  );
  event.parameters.push(
    new ethereum.EventParam(
      "amountB",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(amountB))
    )
  );
  event.parameters.push(
    new ethereum.EventParam("escrow", ethereum.Value.fromAddress(Address.fromString(RESOLVER)))
  );
  event.logIndex = event.logIndex.plus(BigInt.fromI32(1));
  return event;
}

function createResolved(amount: i32, winner: string): RingoResolved {
  let event = changetype<RingoResolved>(newMockEvent());
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("ringoId", ethereum.Value.fromBytes(Bytes.fromHexString(RINGO_A)))
  );
  event.parameters.push(
    new ethereum.EventParam("winner", ethereum.Value.fromAddress(Address.fromString(winner)))
  );
  event.parameters.push(
    new ethereum.EventParam(
      "amount",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(amount))
    )
  );
  return event;
}

function createInvalidated(value: i32): RingoInvalidated {
  let event = changetype<RingoInvalidated>(newMockEvent());
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("ringoId", ethereum.Value.fromBytes(Bytes.fromHexString(RINGO_A)))
  );
  event.parameters.push(
    new ethereum.EventParam("timestamp", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(value)))
  );
  return event;
}
