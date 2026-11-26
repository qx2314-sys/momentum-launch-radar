# momentum-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/qx2314-sys/momentum-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/qx2314-sys/momentum-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Momentum Launch Radar. It reads a sealed snapshot of every protocol and writes a dark, momentum-first dashboard that ranks the protocols with no token yet by what their launch would be worth, each with the steps to farm it.

The board covers the snapshot's whole 40-protocol watchlist plus 138 early protocols below the $50M floor — every one of them genuinely still waiting on a launch: pre-token, and not a wrapped, staked or bridged product of a token that already trades. The value model (radar-momentum) prices each protocol from the market's leaders, not from a house constant: the multiple is the median market-cap-to-TVL of the top 5 live-token protocols by TVL in the same category, times the full seven-day TVL move (weight 1.0 — a protocol up 300% in a week scores four times its base), times a maturity curve that peaks at 365 days with no token recorded and fades to 0.50 by 1,200 days, times a bonus for chain breadth. Each protocol gets an eight-step farm plan led by a momentum read — fast movers get started this week, cold ones get watched first — with what it costs and how long it takes, derived from its own category, chains, size, age and seven-day move. The dashboard is a dark sidebar layout with a heat-colored momentum column, a detail view led by the momentum breakdown and the top-5 leaders that set each multiple, a live-token view of the comparables, and a model view naming every category's leaders.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input path/to/snapshot.json
```

Node 22.18 or later, standard library only, no network, no install. The program reads the snapshot, writes `out/board.json` (178 rows), `out/data.js`, copies `dashboard/` and `screenshots/` to `out/`, and writes `out/dossier.json`. Two runs write the same bytes. The three screenshots were taken from this dashboard in a headless browser.

---

<sub>Entered on [make.fun](https://make.fun/?ref=fgckatac&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
