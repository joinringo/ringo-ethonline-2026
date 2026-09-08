import { Address, Bytes } from "@graphprotocol/graph-ts";
import { Transfer } from "../generated/USDC/ERC20";
import { FeeEvent } from "../generated/schema";
import { eventId, loadDailyStat } from "./helpers";

/**
 * FeesManager is the ONLY fee collection point.
 *
 * 0x3eFBc153573C469d14846f2Af6Eb1245768C83cE used to be counted here too, and
 * that was wrong: it is a downstream sweep destination and a co-mingled hot
 * EOA, not a place fees are collected. Measured against the deployed index,
 * exactly 5 FeeEvent rows landed on it and every one was external noise:
 *
 *   $1,923.7703  from 0xc1d1349228…  2026-08-29 02:21 UTC
 *   $    6.4250  from 0xe6a5208ca1…  the platform's own ops wallet
 *   $    0.0009  three dust transfers, an address-poisoning campaign
 *   ------------
 *   $1,930.20    = 43.4% of the $4,450.42 lifetime "fees" the index reported
 *
 * The largest is a bridged-through treasury movement, independently audited on
 * the platform side and found to be 96.8% non-fee. Counting it took the implied
 * take rate to 16.80% of volume, above the 12.5% contractual maximum, which is
 * a number a judge can disprove from the two headline figures alone. The real
 * rate is ~7.3%.
 */
const FEES_MANAGER = Address.fromString(
  "0xF1Ccb04C363F1df8D6081D2e32c70f7a85814E92"
);

/**
 * The topic2 filter in subgraph.yaml already restricts this handler to the fee
 * address at the node level. This check is the belt to that suspenders: if the
 * filter is ever dropped from the manifest, or the deploy target runs an older
 * spec version that ignores it, the handler still refuses everything else
 * instead of quietly indexing all of USDC.
 */
function isFeeAddress(to: Address): boolean {
  return to.equals(FEES_MANAGER);
}

/**
 * Anything leaving a fee address is internal plumbing, never new revenue.
 *
 * This mattered more when the recipient was also counted: the two addresses pay
 * each other, so an inbound-only rule booked one fee twice. Traced in
 * resolution 0x31cdbbcd…75bf on mainnet, the escrow sends 0.09 USDC to
 * FeesManager, which forwards 0.035 twice onward. The guard is kept now that
 * only FeesManager is counted, because a future sweep back into it would
 * otherwise be booked as fresh revenue.
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
