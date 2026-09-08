import { Address, Bytes } from "@graphprotocol/graph-ts";
import { Transfer } from "../generated/USDC/ERC20";
import { FeeEvent } from "../generated/schema";
import { eventId, loadDailyStat } from "./helpers";

const FEES_MANAGER = Address.fromString(
  "0xF1Ccb04C363F1df8D6081D2e32c70f7a85814E92"
);
const FEE_RECIPIENT = Address.fromString(
  "0x3eFBc153573C469d14846f2Af6Eb1245768C83cE"
);

/**
 * The topic2 filter in subgraph.yaml already restricts this handler to the two
 * fee addresses at the node level. This check is the belt to that suspenders:
 * if the filter is ever dropped from the manifest, or the deploy target runs an
 * older spec version that ignores it, the handler still refuses everything else
 * instead of quietly indexing all of USDC.
 */
function isFeeAddress(to: Address): boolean {
  return to.equals(FEES_MANAGER) || to.equals(FEE_RECIPIENT);
}

/**
 * The two fee addresses also pay each other, and both sit in the topic2
 * filter, so an inbound-only rule counts the same fee twice.
 *
 * Traced in resolution 0x31cdbbcd…75bf on mainnet: the escrow sends 0.09 USDC
 * to FeesManager, which forwards 0.035 twice to the fee recipient. Counting
 * every inbound transfer books 0.16 for a protocol fee that was 0.09 — a 78%
 * overstatement on the one figure the demo reconciles against kpi.joinringo.xyz.
 *
 * Anything leaving a fee address is internal plumbing, never new revenue.
 */
function isInternalMove(from: Address): boolean {
  return isFeeAddress(from);
}

export function handleFeeTransfer(event: Transfer): void {
  let to = event.params.to;
  if (!isFeeAddress(to)) return;
  if (isInternalMove(event.params.from)) return;

  let fee = new FeeEvent(eventId(event));
  fee.from = event.params.from;
  fee.to = to;
  fee.amount = event.params.value;
  fee.timestamp = event.block.timestamp;
  fee.tx = event.transaction.hash;
  fee.save();

  let stat = loadDailyStat(event.block.timestamp);
  stat.fees = stat.fees.plus(event.params.value);
  stat.save();
}
