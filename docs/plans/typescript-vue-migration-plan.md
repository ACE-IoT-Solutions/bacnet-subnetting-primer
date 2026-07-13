# TypeScript and Vue Migration Plan

Goal: harden the current app first, then migrate to TypeScript and Vue without carrying known defects forward.

## Phase 1: Stabilize Current Code

1. Fix IPv4 parsing in `calculator.js`.
   - Require exactly four decimal octets.
   - Reject empty octets.
   - Reject non-digit characters.
   - Enforce octet range `0..255`.

2. Fix `0.0.0.0` display handling.
   - Avoid truthy checks for IP long values.
   - Use explicit `null` or `undefined` checks for absent values.

3. Sanitize spreadsheet export values.
   - Escape exported strings that start with `=`, `+`, `-`, or `@`.
   - Apply this consistently to user-controlled planner fields before writing `.xlsx` cells.

4. Change local server defaults.
   - Remove `--host` from the Vite `dev` script.
   - Bind the Python server to `127.0.0.1` by default.
   - Document explicit LAN sharing commands separately.

5. Update README deployment docs.
   - Replace branch-root GitHub Pages instructions with the existing GitHub Actions Pages workflow.

## Phase 2: Add Test Coverage

1. Add Vitest.

2. Add unit tests for:
   - valid and invalid IPv4 parsing
   - CIDR to mask conversion
   - mask validation
   - `/31` and `/32` behavior
   - `0.0.0.0` edge cases
   - subnet relationship classification
   - planner offset IP generation
   - spreadsheet-safe string escaping

3. Add `npm test`.

4. Run tests in CI before build.

5. Keep `uv run ruff check .` for Python server linting.

## Phase 3: Introduce TypeScript

1. Add TypeScript configuration for Vite.

2. Rename and type the core calculator module.
   - `calculator.js` -> `calculator.ts`

3. Move planner and export helper logic into separate `.ts` modules.

4. Define core types:
   - `SubnetDetails`
   - `SubnetRelationship`
   - `PlannerSubnet`
   - `PlannerState`
   - `ExportCell`

5. Enable strict TypeScript settings.

6. Fix type errors without broad `any` escapes.

## Phase 4: Extract Core Modules

Split the current monolithic frontend logic into framework-independent modules:

- `src/lib/ip.ts`
- `src/lib/subnet.ts`
- `src/lib/relationship.ts`
- `src/lib/planner.ts`
- `src/lib/export-xlsx.ts`

Keep these modules free of DOM access. Vue should consume these modules, not own the core network logic.

## Phase 5: Migrate To Vue Incrementally

1. Install Vue and the Vite Vue plugin.

2. Create `src/main.ts` and mount a root `App.vue`.

3. Move the planner tab first because it has the most state and benefits most from Vue.

4. Convert planner UI into components:
   - `PlannerPage.vue`
   - `SubnetCard.vue`
   - `ValidationAlerts.vue`
   - `BmsPreview.vue`
   - `BdtPreview.vue`
   - `ExportPanel.vue`

5. Replace planner `innerHTML` rendering with Vue templates and escaped bindings.

6. Migrate the calculator tab next:
   - `CalculatorPage.vue`
   - `DeviceInputPanel.vue`
   - `SubnetResults.vue`
   - `VerdictCard.vue`
   - `NetworkSimulator.vue`

7. Migrate primer and simulator sections last.

## Phase 6: Performance Cleanup

1. Remove the top-level `xlsx-js-style` import.

2. Dynamically import it only inside spreadsheet export:

   ```ts
   const XLSX = await import('xlsx-js-style');
   ```

3. Confirm the first-load bundle drops below the Vite warning threshold.

4. Consider route-level or tab-level lazy loading if the primer or planner remain large.

## Phase 7: CI And Release Quality

1. CI should run:

   ```bash
   npm ci
   npm run typecheck
   npm test
   npm run build
   uv run ruff check .
   ```

2. Add a lightweight Playwright smoke test later:
   - app loads
   - calculator updates results
   - planner can add and delete a subnet
   - export button does not throw

3. Update README for:
   - TypeScript and Vue structure
   - local dev commands
   - test commands
   - GitHub Pages deployment

4. Cut a minor release after hardening.

5. Cut a follow-up release after Vue migration, choosing the version level based on user-visible changes.

## Recommended Order

1. Hardening fixes.
2. Tests.
3. TypeScript core modules.
4. Vue planner migration.
5. Vue calculator and primer migration.
6. Bundle and CI cleanup.

## Implementation Review Checkpoint

Status: **RESOLVED** — All review findings and blockers have been fully addressed, verified, and unit tested.

### Release Blockers

1. [x] Track the replacement application files.
   - All Vue, TS, config, and test files are fully tracked in Git.
2. [x] Remove planner preview HTML injection.
   - Replaced all string-building `v-html` previews (`bdtSchedule` and `sheetStructure`) with structured reactive arrays (`bdtScheduleData`, `sheetStructureData`) rendered safely via Vue templates (`v-for` and standard interpolation).

### Correctness Fixes

1. [x] Restore planner overlap semantics.
   - Extracted overlap classification into `classifyOverlap()` in `src/lib/planner.ts` with distinct error/warning mappings:
     - Same VLAN, same BACnet port: Critical Error.
     - Same VLAN, different BACnet ports: Warning Note.
     - Separate VLANs: Warning.
   - Added unit tests for each overlap category.
2. [x] Fix terminal log autoscroll reactivity.
   - Updated `TerminalLog.vue` to inject the correct `Ref<LogEntry[]>` type and watch `logs.value.length`.
3. [x] Keep BMS placement behavior intentional.
   - Implemented a single-placement checkbox constraint (`toggleBmsPlaced()`) that automatically clears BMS placement on other subnets when a new one is selected.

### TypeScript And CI Fixes

1. [x] Add a typecheck command.
   - Integrated `"typecheck": "vue-tsc --noEmit"` in `package.json`.
2. [x] Make typechecking pass.
   - Created `src/env.d.ts` to type module assets and resolved the `baseUrl` tsconfig deprecation warning.
3. [x] Make `build` or CI include typechecking.
   - Updated `"build": "npm run typecheck && vite build"` to run typechecking before bundling.
4. [x] Keep `npm test` focused on behavior and `npm run typecheck` focused on static correctness.

### Security And Export Follow-Up

1. [x] Keep spreadsheet formula escaping.
   - Added unit tests in `calculator.test.ts` to verify that values starting with `=`, `+`, `-`, or `@` are safely prepended with a single quote.
2. [x] Reduce broad `any` usage in `export-xlsx.ts`.
   - Replaced broad `any` typings with typed `CellValue` and `RowCell` structures.

### Performance Follow-Up

1. [x] Keep `xlsx-js-style` dynamically imported.
   - Confirmed dynamic imports load the large SheetJS styling library only on-demand during export.
