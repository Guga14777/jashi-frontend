# Single-Vehicle Quote Price Audit

Read-only audit of the customer-facing quote pricing path. Source code was
not modified. Outputs are this file and `single-vehicle-prices.csv`.

## 1. Files involved in pricing

| Role | File | Notes |
|---|---|---|
| Customer-facing quote widget (dashboard + "Ship My Vehicle" modal) | `src/components/quote-widget/quote-widget.customer.jsx` | Single-vehicle UI. **All pricing logic is INLINED inside the React component (lines 57–301).** Imported by `src/app.jsx:109` and `src/pages/customer-dashboard/customer-dashboard.jsx:16`. |
| Homepage quote widget | `src/components/quote-widget/quote-widget.jsx` | Multi-vehicle-shaped container that today is hard-capped to 1 vehicle (see `calculateVehicleCountFromVehicles`, line 104). Pricing logic **also inlined** (lines 56–331). Imported by `src/pages/home/sections/quote-section.jsx` and `src/pages/home/mobile-home.jsx`. |
| Standalone pricing engine module | `src/lib/price-engine.js` | Exports `priceBreakdown`, `computeVehicleBasePrice`, `calibrateMarketAvg`, etc. **Not imported anywhere in `src/` or `server/`.** Effectively dead code (see Anomalies §5). |
| Backend "pricing" service | `server/services/quotes/quotes.pricing.service.cjs` | Computes platform fee only (`offer × 0.06`). Does not compute the mileage-based quote. |
| Backend constants | `server/services/quotes/quotes.constants.cjs` | `PLATFORM_FEE_RATE = 0.06`. No mileage rates. |
| Admin quote view | `src/pages/admin/orders-admin.jsx` | Reads `quote.marketAvg` / `quote.offer` from API; does not recompute. |
| Shipper portal offer review | `src/pages/shipper-portal/sections/offer-review.jsx` | Reads `quote.marketAvg`; does not recompute. |

**Single source of truth for the customer flow:** `quote-widget.customer.jsx`.
**No backend mileage pricing exists** — the server stores whatever values the
client posts to `/api/quotes` (see `quote-widget.customer.jsx:380–397`).

## 2. Rate constants (extracted from code, with citations)

All citations refer to `src/components/quote-widget/quote-widget.customer.jsx`
(the customer-facing widget). Where applicable, `src/lib/price-engine.js`
values are identical and noted in parentheses.

| Component | Value in code | File + line |
|---|---|---|
| Flat fee 0–50 mi | `$150` | `quote-widget.customer.jsx:59` (also `price-engine.js:21`) |
| Flat fee 51–100 mi (cumulative) | `$350` | `quote-widget.customer.jsx:61` (also `price-engine.js:23`) |
| Per-mile rate, 100–200 mi | `$1.80` | `quote-widget.customer.jsx:205` (also `price-engine.js:32, 92`) |
| Per-mile rate, 200–500 mi | `$1.70` | `quote-widget.customer.jsx:211` (also `price-engine.js:33, 98`) |
| Per-mile rate, 500–1000 mi | `$1.20` | `quote-widget.customer.jsx:218` (also `price-engine.js:34, 105`) |
| Per-mile rate, 1000+ mi | `$1.00` | `quote-widget.customer.jsx:224` (also `price-engine.js:35, 111`) |
| Sedan multiplier | `1.00×` (Sedan is not in `PICKUP_FAMILY`, so the per-mile-only `× 1.05` is skipped) | `quote-widget.customer.jsx:68, 229` (also `price-engine.js:42, 116`) |
| Pickup multiplier | `1.05×` (per-mile only) | `quote-widget.customer.jsx:68, 229–231` (also `price-engine.js:42, 116–118`) |
| SUV multiplier | `1.05×` (per-mile only) | `quote-widget.customer.jsx:68, 229–231` (also `price-engine.js:42, 116–118`) |
| Van multiplier | `1.05×` (per-mile only) | `quote-widget.customer.jsx:68, 229–231` (also `price-engine.js:42, 116–118`) |
| Minivan multiplier | `1.05×` (per-mile only) | `quote-widget.customer.jsx:68, 229–231` (also `price-engine.js:42, 116–118`) |
| Motorcycle multiplier | `1.00×` (Motorcycle is not in `PICKUP_FAMILY`) | `quote-widget.customer.jsx:68` (also `price-engine.js:42`) |
| Market uplift % | `+8%` (`× 1.08`) | `quote-widget.customer.jsx:64, 324` (also `price-engine.js:50, 275`) |
| Enclosed surcharge % | `+30%` (`× 1.30`, applied last) | `quote-widget.customer.jsx:65, 333` (also `price-engine.js:51, 284`) |
| Calibration factor 0–100 mi | `1.00` (minimum-trip floor) | `quote-widget.customer.jsx:280–283` (also `price-engine.js:218–221`) |
| Calibration factor 101–200 mi | `0.95` | `quote-widget.customer.jsx:285–288` (also `price-engine.js:223–226`) |
| Calibration factor 201–350 mi | `0.85` | `quote-widget.customer.jsx:290–293` (also `price-engine.js:228–231`) |
| Calibration factor 351–500 mi | `0.73` | `quote-widget.customer.jsx:295–298` (also `price-engine.js:233–236`) |
| Calibration factor 501–700 mi | `0.66` | `quote-widget.customer.jsx:300–303` (also `price-engine.js:238–241`) |
| Calibration factor 701+ mi | `0.60` | `quote-widget.customer.jsx:306` (also `price-engine.js:244`) |

**Note (2026-04-27):** Short-haul calibration was updated from a flat `0.83` for 0–200 mi to a two-band ladder: `1.00` for 0–100 mi (so the minimum-trip flat fee is no longer discounted) and `0.95` for 101–200 mi. Bands at 201+ mi are unchanged. Sample Sedan/Open prices after the change: 50 mi → $162.00, 100 mi → $378.00, 150 mi → $451.44, 200 mi → $543.78, 300 mi → $642.60.

## 3. Customer widget vs backend consistency check

- **Backend mileage pricing**: does not exist. The server has no per-mile, flat-fee, multiplier, market-uplift, calibration, or enclosed-surcharge constant anywhere. `server/services/quotes/quotes.pricing.service.cjs` only computes `offer × PLATFORM_FEE_RATE` (6%). Whatever `marketAvg`, `recommendedMin`, `recommendedMax`, and `likelihood` the client posts at `quote-widget.customer.jsx:380–397` is what gets persisted — there is no server-side recomputation or validation.
- **Frontend hardcodes the rates**: yes. The customer widget (`quote-widget.customer.jsx:57–75, 197–301`) and the homepage widget (`quote-widget.jsx:56–74, 208–331`) each declare their own private copies of `FLAT_FEES`, `MARKET_UPLIFT`, `ENCLOSED_UPLIFT`, `PICKUP_FAMILY`, the per-mile tiers, and the calibration ladder.
- **Do all three frontend implementations match?** Yes — identical values across `quote-widget.customer.jsx`, `quote-widget.jsx`, and `src/lib/price-engine.js`. The audit script imports `priceBreakdown` from `price-engine.js` and runs it against the verbatim customer-widget formula across all 108 inputs; **0 mismatches** were observed.
- **Drift risk**: high. The same constants are duplicated three times. Each file even carries a comment "MUST MATCH pricing-engine.js" — but nothing enforces it. A future edit to one file will silently desync the others. See Anomalies §1.

## 4. Single-vehicle code path notes (quantity = 1)

When the customer widget runs (it always uses quantity = 1 — `vehicleCount: 1` is hard-coded at `quote-widget.customer.jsx:377, 384`), the pricing pipeline is:

1. `computeOpenBasePrice(distanceMiles, vehicleType)` — `quote-widget.customer.jsx:242`
   - `miles ≤ 50` → `$150` flat (no multiplier).
   - `miles ≤ 100` → `$350` flat (no multiplier). At exactly 100 miles, this branch is taken because the comparison is `<=`.
   - `miles > 100` → `$350` + `calculatePerMileCost(type, miles − 100)`.
2. `calculatePerMileCost(type, milesAbove100)` — `quote-widget.customer.jsx:197`
   - Tiers (relative to total distance): 100–200 = $1.80/mi, 200–500 = $1.70/mi, 500–1000 = $1.20/mi, 1000+ = $1.00/mi.
   - Sums all tiers, **then** multiplies the entire per-mile sum by `1.05` if `type ∈ {Pickup, SUV, Van, Minivan}`. Sedan and Motorcycle keep `1.00×`.
3. Raw market = `base × 1.08`.
4. Calibration on the OPEN price using the distance-banded factor.
5. If transport = enclosed, multiply the calibrated OPEN price by `1.30` last.
6. Round the final number to 2 decimals (`Math.round(... × 100) / 100`).

Branches that change the math when quantity = 1:
- **None inside the customer widget.** It is single-vehicle by construction (`selectedVehicle` is a single string at `quote-widget.customer.jsx:36`), so multi-vehicle logic does not exist there.
- The `priceBreakdown` engine in `src/lib/price-engine.js` does have a 5%-off "two or more of the same vehicle type" discount (`computeLineItems` at `price-engine.js:158, 167`), but with `count = 1` the `discount = count >= 2 ? 0.05 : 0` short-circuits to 0. No effect on this audit.
- The homepage widget (`quote-widget.jsx`) keeps a multi-vehicle-shaped `selectedVehicles` object, but `calculateVehicleCountFromVehicles` (line 104) caps the count at 1, so multi-vehicle pricing in that file is also unreachable from the UI.

## 5. Anomalies

1. **Three duplicated copies of the pricing formula.** `quote-widget.customer.jsx`, `quote-widget.jsx`, and `src/lib/price-engine.js` each declare independent constants. The two widgets even contain the comment `// PRICING CONSTANTS - MUST MATCH pricing-engine.js`, but **neither widget imports `pricing-engine.js`**. Nothing prevents drift. **Recommendation:** have both widgets import `priceBreakdown` (or the constants) from `src/lib/price-engine.js` and delete the inline copies. Today they happen to agree — verified by the audit — but it is one careless edit away from a customer-vs-homepage price mismatch.

2. **`src/lib/price-engine.js` is unused dead code.** `grep -rln "price-engine"` over `src/` and `server/` returns zero results. The engine is fully exported and well-commented but nothing imports it. Either wire it up (see §1) or delete it.

3. **Pickup/SUV/Van/Minivan are NOT more expensive than Sedan at 50 mi or 100 mi.** The widget header at `quote-widget.customer.jsx:23` claims "Pickup/SUV/Van/Minivan must ALWAYS be more expensive than Sedan (same route)". For miles ≤ 100, however, the price is purely the flat fee — and the flat fee is intentionally not multiplied. So **Sedan @ 50 mi = Pickup @ 50 mi = SUV @ 50 mi = $134.46 (open)**, etc. The CSV confirms this on rows 1–4 of each transport type. This is a contradiction between the comment and the spec; the spec ("flat fee NEVER multiplied") wins, but the comment should be loosened to "for distances above 100 miles".

4. **No server-side validation of posted prices.** The widget computes `marketAvg`, `recommendedMin`, `recommendedMax`, and `likelihood` client-side and POSTs them straight into `/api/quotes` (`quote-widget.customer.jsx:388–392`). A modified client could submit any number. This is not a math anomaly, but it is the natural blast radius of having no backend pricer.

5. **Calibration band edges are inclusive of the upper bound.** All bands use `miles <= N`, so 100 → `1.00`, 200 → `0.95`, 350 → `0.85`, 500 → `0.73`, 700 → `0.66`, and 701+ → `0.60`. This matches the documented bands ("0–100", "101–200", …, "701+") exactly.

6. **`Motorcycle` lives in `Recreational`, not in any multiplier set, so it prices identically to a Sedan.** That matches your reference values (`Sedan/Motorcycle = 1.00×`). The CSV confirms it: every Motorcycle row equals the corresponding Sedan row.

7. **`Minivan` is in two places at once.** It appears in the `PICKUP_FAMILY` multiplier set (`quote-widget.customer.jsx:68`) **and** in the customer widget's `Recreational` "Other" panel (`quote-widget.customer.jsx:80`). Pricing-wise it is unambiguous (always 1.05×), but the UI grouping is unusual.

8. **The `BASE_PER_MILE_RATES` table in `price-engine.js:31–36` is descriptive only.** The actual per-mile loop (`calculatePerMileCost`, line 84) hardcodes the same values inline (`* 1.80`, `* 1.70`, `* 1.20`, `* 1.00`). Editing the table without editing the loop would leave the table lying.

## 6. Audit run results

- **108 rows generated** in `single-vehicle-prices.csv` (9 distances × 6 vehicles × 2 transport types), produced by `pricing-audit/run-audit.mjs`.
- **0 mismatches** between `quote-widget.customer.jsx`'s inline formula and `priceBreakdown` from `src/lib/price-engine.js` across all 108 rows.
- **Sanity checks (250-mi cases not in the CSV grid):**
  - Sedan / 250 mi / open → `$564.57` (expected `$564.57`, Δ = 0)
  - Pickup / 250 mi / open → `$576.73` (expected `$576.73`, Δ = 0)
  - SUV / 500 mi / enclosed → `$1101.28` (expected `$1101.28`, Δ = 0)

The math the customer sees today **matches your pricing documentation exactly**.
