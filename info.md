# Muscadine setup guide

Fork of Morpho’s Vault v2 reallocation bot. Upstream config, strategies, and multi-chain examples stay intact — use this file to wire **Muscadine’s four Base vaults** without fighting upstream.

## Muscadine vaults (Base, chainId `8453`)

| Vault | Category | Address | Bot strategy (in `config.ts`) |
| --- | --- | --- | --- |
| Muscadine USDC Prime | Prime | `0x89712980Cb434eF5aE4AB29349419eb976B0b496` | `equilizeUtilizations` |
| Muscadine WETH Prime | Prime | `0xD6DCAd2f7Da91FBb27BdA471540d9770c97a5a43` | `equilizeUtilizations` |
| Muscadine cbBTC Prime | Prime | `0x99dcd0D75822BA398F13B2A8852B07c7e137EC70` | `equilizeUtilizations` |
| Muscadine USDC Frontier | Frontier | `0x314fD07319ef645bA7D548915CCd91F4788A1839` | `apyRange` |
| Muscadine cbBTC Test | Test | `0xB15a51F46a53CF7dBB378A459A552F342bC54815` | `equilizeUtilizations` |
| Muscadine USDC Test | Test | `0x7D09D53637c8A3511de0eF1509b8dC5C2108a0AD` | `equilizeUtilizations` |

Source of truth: Muscadine-Labs/curator → `lib/config/vaults.ts` (also mirrored in the product app).

---

## Quick start

1. **Install**
   ```bash
   pnpm install
   ```
2. **Secrets** — copy `.env.example` → `.env` and fill Base (required for Muscadine):
   ```bash
   cp .env.example .env
   ```
   You need at least:
   - `RPC_URL_8453`
   - `REALLOCATOR_PRIVATE_KEY_8453`
3. **Whitelist vaults** in `apps/config/src/config.ts` (see [Recommended Muscadine config](#recommended-muscadine-config) below). Leave upstream mainnet/Base example entries if you want cleaner merges from Morpho; disable them by removing those array entries when you only want Muscadine live.
4. **Grant allocator** — the EOA for `REALLOCATOR_PRIVATE_KEY_8453` must have the **allocator** role on every vault you whitelist, and enough ETH on Base for gas.
5. **Run**
   ```bash
   pnpm reallocate
   ```

Vault assumptions from upstream still apply (v0): one MorphoMarketV1AdapterV2 per vault; meaningful caps at market V1 level.

---

## Environment variables

Keys are per chain ID. Muscadine is Base only (`8453`). Upstream also documents mainnet (`1`) — keep those vars if you still run example/mainnet entries.

| Variable | Purpose |
| --- | --- |
| `RPC_URL_<chainId>` | HTTPS RPC used by the bot |
| `REALLOCATOR_PRIVATE_KEY_<chainId>` | EOA private key that submits reallocations |

See `.env.example` for a commented template.

Never commit `.env`. Rotate the key if it was ever shared or pushed.

---

## Where config lives

| What | File |
| --- | --- |
| Chains, strategy name, vault whitelist, run interval | `apps/config/src/config.ts` |
| Equalize-utilization thresholds | `apps/config/src/strategies/equilizeUtilizations.ts` |
| APY-range bands / idle behavior | `apps/config/src/strategies/apyRange.ts` |
| Strategy name type | `apps/config/src/types.ts` |

After editing config, rebuild before run if needed (`pnpm reallocate` already builds config).

You can have **multiple `chains` entries for the same network** (e.g. two Base entries with different strategies / vault lists). `script.ts` launches one bot loop per entry.

---

## Strategies — which to use for Muscadine

### `equilizeUtilizations` (wired for **Prime + test**)

What it does:

1. Computes a **target utilization** across the vault’s Morpho Blue markets (including idle in the denominator).
2. Pulls liquidity from under-utilized markets and pushes into over-utilized ones so utilizations converge.
3. Only sends a tx if at least one market’s utilization gap exceeds the min delta (default **250 bips = 2.5%**).

When to use: balanced capital across listed markets — Prime/test default here.

Tune in `equilizeUtilizations.ts` (all 6 Muscadine vaults are pre-listed at 200 bips so any vault can switch onto this strategy later):

- `DEFAULT_MIN_UTILIZATION_DELTA_BIPS` — global floor before a rebalance.
- `vaultsMinUtilizationDeltaBips[8453][vault]` — per-vault override.
  - **Lower** (e.g. `150–200`) → tighter tracking, more txs / gas.
  - **Higher** (e.g. `300–400`) → fewer txs, more drift between runs.

`executionInterval` for Muscadine entries is **512** minutes (~8.5h).

### `apyRange` (wired for **Frontier**)

What it does:

1. For each market, resolves a borrow-APY **[min, max]** band (market override → vault default → global `DEFAULT_APY_RANGE`).
2. If utilization implies APY above `max`, allocates into that market; if below `min`, withdraws.
3. Skips tiny moves via `DEFAULT_MIN_APY_DELTA_BIPS` (default **25 bips = 0.25%**).
4. With `ALLOW_IDLE_REALLOCATION = true`, can park excess in idle when needed to pull APYs into range.

When to use: keep markets inside an APY band — Frontier default here.

Tune in `apyRange.ts` (all 6 Muscadine vaults are pre-listed so any vault can switch onto this strategy later):

- Frontier: `{ min: 4, max: 12 }` — tune against live Morpho borrow APYs.
- Prime/test standby bands: `{ min: 3, max: 8 }`.
- `marketsApyRanges` — optional per–market-id overrides.
- `ALLOW_IDLE_REALLOCATION` — keep `true` so excess can move toward idle when markets are too hot.

### Strategy comparison (short)

| | `equilizeUtilizations` | `apyRange` |
| --- | --- | --- |
| Goal | Same utilization across markets | Borrow APY inside a band |
| Muscadine fit (current) | USDC / cbBTC / WETH **Prime** + **test** | USDC **Frontier** |
| Main knobs | utilization delta (bips), interval | APY min/max, min APY delta, idle flag |

---

## Muscadine config (already wired)

Each Muscadine vault is its **own** `chains` entry in `apps/config/src/config.ts` (alongside upstream examples), so you can change `strategy` / `executionInterval` per vault without touching the others.

Defaults today:

- **Prime + test** → `equilizeUtilizations`, interval 512m  
- **USDC Frontier** → `apyRange`, interval 512m, band `{ min: 4, max: 12 }`

Both `equilizeUtilizations.ts` and `apyRange.ts` list **all 6** Muscadine vaults, so flipping a vault’s `strategy` in `config.ts` already has thresholds/bands ready.

If you only want Muscadine live, remove or comment out the upstream mainnet + Steakhouse Base entries (and drop `RPC_URL_1` / `REALLOCATOR_PRIVATE_KEY_1` from `.env`). Keep them if you prefer easier Morpho merges.
### How to optimize over the first weeks

1. **Start conservative** — default 2.5% utilization delta / 0.25% APY delta; widen intervals if gas or noise is high.
2. **Watch Morpho** — compare target vs live utilization / borrow APY per market after each run.
3. **Prime/test (equalize)** — if markets stay unbalanced, lower utilization delta; if the bot churns, raise it.
4. **Frontier (apyRange)** — set `min`/`max` from observed borrow APYs. Too-narrow bands → constant reallocations; too-wide → strategy never fires. If all markets are below `min`, the bot does nothing.
5. **Caps** — confirm market V1 caps are the binding ones; adapter/collateral caps should be maxed so the bot’s assumptions hold.
6. **Dry run mentally** — first deploy with a funded allocator but monitor logs (`Reallocated on …` / `Failed to reallocate …`) before relying on it unattended.

---

## Checklist before production

- [ ] `.env` has `RPC_URL_8453` + `REALLOCATOR_PRIVATE_KEY_8453` (and mainnet keys only if those chain entries stay enabled)
- [ ] Allocator role set on all Muscadine vaults you whitelist (Prime, Frontier, and Test if enabled) for that EOA
- [ ] EOA has Base ETH for gas
- [ ] `vaultWhitelist` lists only vaults you intend to manage
- [ ] Strategy + thresholds match Prime vs Frontier intent above
- [ ] Vault still matches upstream v0 assumptions (single Market V1 adapter, market-level caps)

---

## Upstream vs this fork

- Prefer **additive** changes (extra vault addresses, extra `chains` entries, docs like this file) so Morpho upstream merges stay easy.
- Core bot logic lives under `apps/client`; config under `apps/config`.
- Upstream README / Morpho disclaimer still apply — use at your own risk.
