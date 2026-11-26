// Momentum Launch Radar — the value model (radar-momentum).
//
// The board ranks pre-token protocols by what a launch would be worth if the
// protocol's record stayed as it is, and it ranks them by MOMENTUM: the leaders
// of a category set the price, and a protocol whose TVL is moving fast counts
// for far more than one standing still.
//
//   leaders multiple = the median market-cap-to-TVL of the TOP 5 live-token
//                        protocols BY TVL in the same category (the leaders set
//                        the price, not the median of every protocol in it).
//                        A category with fewer than 3 live-token protocols
//                        falls back to the global top-5 median. Clamped to
//                        [0.10, 1.50] so a thin category cannot set a wild price.
//   growth            = clamp(change_7d, -50, +300) per cent; the growth
//                        multiplier is 1 + growth / 100, weight 1.0: the full
//                        seven-day move counts. A protocol up 300% in a week
//                        scores four times its base; one down 50% scores half.
//   maturity          = how long the protocol has run with no token recorded.
//                        It climbs from 0.70 at launch to 1.00 at 365 days,
//                        then fades to 0.50 by 1200 days: a protocol a year in
//                        with no token is at peak launch shape; one that has
//                        run three years with none is cooling off. Age unknown:
//                        365 days.
//   chain breadth     = 1 + 0.05 x min(chains - 1, 3): a protocol live on more
//                        chains reaches more users, capped at three extra chains.
//   implied           = max(1, round(tvl_usd x leaders multiple x growth
//                        x maturity x chains))
//
// No protocol name is ever special-cased: the same function scores every row.
// Say "records no token", never "has no token": the record is not proof.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  /** The smallest and largest leaders multiple the market may set. */
  multiple_floor: number;
  multiple_cap: number;
  /** How many live-token protocols a category needs before its own top-5 median is used. */
  category_min_comps: number;
  /** How many leaders set a category's multiple. */
  leaders_count: number;
  /** How much of the seven-day TVL change counts (1.0 = the full move). */
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  /** The maturity curve: floor at launch, peak at peak_days, fading to late by late_days. */
  maturity_floor: number;
  maturity_peak_days: number;
  maturity_late: number;
  maturity_late_days: number;
  unknown_age_days: number;
  /** The per-extra-chain bonus, capped at chain_bonus_cap chains. */
  chain_bonus: number;
  chain_bonus_cap: number;
}

export const MODEL: ModelConstants = {
  multiple_floor: 0.1,
  multiple_cap: 1.5,
  category_min_comps: 3,
  leaders_count: 5,
  growth_weight: 1.0,
  growth_floor: -50,
  growth_cap: 300,
  maturity_floor: 0.7,
  maturity_peak_days: 365,
  maturity_late: 0.5,
  maturity_late_days: 1200,
  unknown_age_days: 365,
  chain_bonus: 0.05,
  chain_bonus_cap: 3,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-momentum';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  watchlist: boolean;
  age_days: number | null;
  implied_value_usd: number;
  model: {
    leaders_multiple: number;
    leaders_count: number;
    leaders_used: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** One of the leaders that set a category's multiple. */
export interface LeaderComp {
  slug: string;
  name: string;
  tvl_usd: number;
  mcap_usd: number;
  multiple: number;
}

/** A category's leaders multiple, for the dashboard's Model view. */
export interface CategoryLeaders {
  category: string;
  comps: number;
  leaders: LeaderComp[];
  median_multiple: number;
  used_multiple: number;
  fallback: boolean;
}

/** The dashboard's compact view of one row, with its farm plan and momentum parts. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  watchlist: boolean;
  age_days: number | null;
  implied_value_usd: number;
  leaders_multiple: number;
  leaders_count: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  /** Its own market-cap-to-TVL ratio, the multiple the model learns from. */
  multiple: number | null;
}

/** Everything the dashboard needs: the board, the live set, the model and its leaders. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  global_multiple: number;
  categories: CategoryLeaders[];
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a non-empty list of numbers. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** Categories that are a wrapped, staked or bridged product of another protocol's token. */
const WRAPPED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
/** A name carrying one of these whole words is a wrapped or staked product, not a launch of its own. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
/** A name beginning with an exchange's name is that exchange's product. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token, and not a wrapped, staked or bridged
 *  product of a token that already trades, not an exchange, not a versioned pool. */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && WRAPPED_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  if (EXCHANGE_PREFIX.test(p.name)) return false;
  return true;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** A live-token protocol's market-cap-to-TVL ratio, or null when it has no usable figures. */
function liveMultiple(p: SnapshotProtocol): number | null {
  if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0) return null;
  return p.mcap_usd / p.tvl_usd;
}

/**
 * The leaders' multiples: for every category with at least `minComps` live-token
 * protocols, the median of the market-cap-to-TVL ratios of its TOP `leaders` by TVL;
 * every other category falls back to the global top-`leaders` median. All multiples
 * are clamped to [floor, cap]. The leaders are named, so the dashboard can show
 * exactly who set each price.
 */
export function leadersMultiples(
  snapshot: Snapshot,
  model: ModelConstants = MODEL,
): { byCategory: Map<string, number>; comps: Map<string, number>; leadersByCategory: Map<string, LeaderComp[]>; global: number; globalLeaders: LeaderComp[]; table: CategoryLeaders[] } {
  const byCat = new Map<string, SnapshotProtocol[]>();
  const all: SnapshotProtocol[] = [];
  for (const p of snapshot.protocols) {
    if (isPreToken(p)) continue;
    if (p.category !== null && WRAPPED_CATEGORIES.has(p.category)) continue;
    if (liveMultiple(p) === null) continue;
    all.push(p);
    if (p.category === null) continue;
    const list = byCat.get(p.category) ?? [];
    list.push(p);
    byCat.set(p.category, list);
  }
  const clamp = (m: number): number => Math.min(model.multiple_cap, Math.max(model.multiple_floor, m));
  const toLeader = (p: SnapshotProtocol): LeaderComp => ({
    slug: p.slug,
    name: p.name,
    tvl_usd: p.tvl_usd,
    mcap_usd: p.mcap_usd!,
    multiple: round4(liveMultiple(p)!),
  });
  const topLeaders = (list: SnapshotProtocol[]): LeaderComp[] =>
    [...list].sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : 1)).slice(0, model.leaders_count).map(toLeader);
  const globalLeaders = topLeaders(all);
  const global = globalLeaders.length > 0 ? clamp(median(globalLeaders.map((l) => l.multiple))) : 0.25;
  const byCategory = new Map<string, number>();
  const comps = new Map<string, number>();
  const leadersByCategory = new Map<string, LeaderComp[]>();
  const table: CategoryLeaders[] = [];
  for (const [category, values] of [...byCat.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const n = values.length;
    comps.set(category, n);
    if (n >= model.category_min_comps) {
      const leaders = topLeaders(values);
      const med = median(leaders.map((l) => l.multiple));
      byCategory.set(category, clamp(med));
      leadersByCategory.set(category, leaders);
      table.push({ category, comps: n, leaders, median_multiple: round4(med), used_multiple: clamp(med), fallback: false });
    } else {
      byCategory.set(category, global);
      leadersByCategory.set(category, globalLeaders);
      // The leaders shown are the global ones, so the median shown is theirs too.
      const med = median(globalLeaders.map((l) => l.multiple));
      table.push({ category, comps: n, leaders: globalLeaders, median_multiple: round4(med), used_multiple: global, fallback: true });
    }
  }
  return { byCategory, comps, leadersByCategory, global, globalLeaders, table };
}

/** The maturity multiplier: 0.70 at launch, 1.00 at the peak day, fading to `late` by `late_days`. */
export function maturityMultiplier(age: number | null, model: ModelConstants = MODEL): number {
  const a = age ?? model.unknown_age_days;
  if (a <= model.maturity_peak_days) {
    return model.maturity_floor + ((1 - model.maturity_floor) * a) / model.maturity_peak_days;
  }
  const past = Math.min(a - model.maturity_peak_days, model.maturity_late_days - model.maturity_peak_days);
  return 1 - ((1 - model.maturity_late) * past) / (model.maturity_late_days - model.maturity_peak_days);
}

/** The chain-breadth multiplier: more for each extra chain, capped. */
export function chainMultiplier(chains: number, model: ModelConstants = MODEL): number {
  return 1 + model.chain_bonus * Math.min(Math.max(chains - 1, 0), model.chain_bonus_cap);
}

/** The multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  multiples: Map<string, number>,
  globalMultiple: number,
  model: ModelConstants = MODEL,
): {
  implied: number;
  leadersMultiple: number;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  chainMult: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const maturityMult = maturityMultiplier(age, model);
  const chainMult = chainMultiplier(protocol.chains.length, model);
  const leadersMultiple = protocol.category !== null && multiples.has(protocol.category) ? multiples.get(protocol.category)! : globalMultiple;
  const implied = Math.max(1, Math.round(protocol.tvl_usd * leadersMultiple * growthMult * maturityMult * chainMult));
  return { implied, leadersMultiple, growthPct, growthMult, maturityMult, chainMult, age };
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const { byCategory, comps, global } = leadersMultiples(snapshot, model);
  const watchlist = new Set(snapshot.watchlist);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: pre-token protocols below the watchlist floor, by TVL, that are genuinely still
  // waiting on a launch. Never a replacement for a watchlist row: a chosen protocol stays chosen.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, byCategory, global, model);
    return { p, ...v, leadersCount: p.category !== null ? (comps.get(p.category) ?? 0) : 0 };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    watchlist: watchlist.has(s.p.slug),
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      leaders_multiple: round4(s.leadersMultiple),
      leaders_count: s.leadersCount,
      leaders_used: MODEL.leaders_count,
      growth_pct: round4(s.growthPct),
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      chain_multiplier: round4(s.chainMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age, s.growthPct).map(stepText),
  }));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Keep the position open and check the protocol's own page again next week.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** A momentum-flavoured nudge for the plan, from the protocol's own seven-day move. */
function momentumNote(growthPct: number): string {
  if (growthPct >= 50) return `This one is moving fast — its TVL is up ${growthPct.toFixed(1)}% in seven days, so start this week while the momentum is hot and check the position every few days.`;
  if (growthPct >= 10) return `Its TVL is up ${growthPct.toFixed(1)}% in seven days, so the wind is behind it: start now and keep the position active through the next weekly snapshot.`;
  if (growthPct <= -20) return `Its TVL is down ${Math.abs(growthPct).toFixed(1)}% in seven days, so the momentum is against it right now: start small, watch one more week, and only add once the seven-day number turns.`;
  return `Its seven-day TVL move is near flat, so there is no rush and no penalty for waiting: set the position up, then check it once a week.`;
}

/** The category's first action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Lend $${capital} of USDC into ${name} on ${chain} and leave the supply open so it counts in every snapshot.`;
  if (c.includes('dex') || c.includes('leveraged farm')) return `Add $${capital} of liquidity to ${name}'s deepest pool on ${chain} and keep the position open.`;
  if (c.includes('yield aggregator') || c.includes('curator') || c.includes('allocator')) return `Put $${capital} into a ${name} vault on ${chain} and hold the shares.`;
  if (c.includes('yield')) return `Put $${capital} of USDC into ${name}'s biggest strategy on ${chain} and leave it compounding.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis')) return `Post $${capital} of USDC as margin on ${name} on ${chain} and open one small hedged trade.`;
  if (c.includes('prediction')) return `Fund $${capital} on ${name} on ${chain} and take one position on a market you have actually read.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} through ${name} on ${chain} and keep the receipt token in the same wallet.`;
  if (c.includes('stable')) return `Mint or hold $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of ${name}'s yield-bearing asset on ${chain} and hold it.`;
  if (c.includes('index')) return `Buy $${capital} of ${name}'s index token on ${chain} and hold it.`;
  if (c.includes('privacy')) return `Deposit $${capital} through ${name}'s private pool on ${chain} and keep the withdrawal note safe.`;
  if (c.includes('ai agent')) return `Fund $${capital} into ${name} on ${chain} and run one agent task this week.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy live.`;
  if (c.includes('bridge') || c.includes('cross chain')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds inside its app.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The category's second qualifying action: a different feature of the same protocol. */
function secondActionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Borrow a small amount, about $${Math.max(10, Math.round(capital / 5))}, against the supply and repay it within the week, so the protocol sees both sides of the position.`;
  if (c.includes('dex') || c.includes('leveraged farm')) return `Swap once through ${name}'s router on ${chain} for a token you already hold, using the pool you supplied to.`;
  if (c.includes('yield aggregator') || c.includes('curator') || c.includes('allocator') || c.includes('yield')) return `Move a quarter of the deposit into a second ${name} vault or strategy on ${chain} so the position spans two products.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis')) return `Close the first trade, then open a second one the other way with the same margin, so the account shows two settled trades.`;
  if (c.includes('prediction')) return `Settle the first market, then take a second position on a different market on ${name}.`;
  if (c.includes('staking') || c.includes('restak')) return `Claim whatever staking rewards ${name} shows on ${chain} and restake them instead of withdrawing.`;
  if (c.includes('stable')) return `Swap half the stable balance for USDC on ${chain} and back again through ${name}, so the account shows mint and swap activity.`;
  if (c.includes('rwa')) return `Open ${name}'s redemption page on ${chain} and redeem a small slice, about $${Math.max(10, Math.round(capital / 10))}, to prove the exit path works.`;
  if (c.includes('index')) return `Rebalance once: sell a tenth of the index token and buy it back through ${name} on ${chain}.`;
  if (c.includes('privacy')) return `Withdraw a small amount from the private pool and deposit it again, keeping the new note with the old one.`;
  if (c.includes('ai agent')) return `Run a second, different agent task on ${name} and save the task's receipt or transaction hash.`;
  if (c.includes('insurance')) return `Get a test quote for a second cover type on ${name} so the account shows more than one policy interaction.`;
  if (c.includes('bridge') || c.includes('cross chain')) return `Bridge a small amount, about $${Math.max(10, Math.round(capital / 5))}, back to the chain you started from through ${name}.`;
  return `Use a second feature of ${name} on ${chain}, such as its swap, vote or rewards page, so the account shows more than one kind of activity.`;
}

/**
 * A protocol's farm plan: eight steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age, seven-day momentum), never from a
 * hand-written list of names. The first step reads the momentum: fast movers get started this
 * week, cold ones get watched first.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null, growthPct: number): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const second = secondActionFor(p, capital, chain);
  const gas = capital >= 150 ? 8 : 4;
  return [
    {
      text: momentumNote(growthPct),
      cost: 'no fee to read the momentum',
      time: '5 minutes',
    },
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline on paper, never in a screenshot or a chat.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${gas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: second,
      cost: `about $${gas} of gas, on top of the $${capital} already in the position`,
      time: '10 minutes',
    },
    {
      text: `Do one qualifying action every week, such as a deposit, a borrow, a swap or a vote, and never let a full week pass with no activity — momentum fades fast when the account goes quiet.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot, and do not withdraw early for a small gain.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw anything, open the protocol's own points or rewards page from its official site or docs and check what it counts, and write down the dates it counts.`,
      cost: 'no fee to check',
      time: '10 minutes',
    },
    {
      text: `If a token launches, claim only from the link the protocol itself publishes, never from a reply, a direct message or a search ad, and never pay anyone to claim for you. Then write the wallet, the dates and every transaction hash in a farm log.`,
      cost: 'gas for the claim only, and never pay to claim',
      time: '10 minutes to claim, 5 to log',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      multiple: p.mcap_usd !== null && p.tvl_usd > 0 ? round4(p.mcap_usd / p.tvl_usd) : null,
    }));
}

/** A board row's compact form for data.js, with the farm plan and the momentum parts the page needs. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    watchlist: row.watchlist,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    leaders_multiple: row.model.leaders_multiple,
    leaders_count: row.model.leaders_count,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const { global, table } = leadersMultiples(snapshot, model);
  const early = board.filter((r) => !r.watchlist).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    global_multiple: global,
    categories: table,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
