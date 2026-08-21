to do

Inventory

## Mana — implementation log (done)

Implemented across two commits: `75203eeb` ("Convert to Nimble system: hide
D&D-only fields, add Mana resource") and `94012dd3` ("Update combatant mana
display and settings for improved clarity"). Mana was built as a full parallel
resource to HP, following the HP wiring at every layer.

1. **Data model** — added `Mana?: ValueAndNotes` to `StatBlock`
   ([common/StatBlock.ts](common/StatBlock.ts)), `CurrentMana?: number` to
   `CombatantState` ([common/CombatantState.ts](common/CombatantState.ts)) and
   `PersistentCharacter` ([common/PersistentCharacter.ts](common/PersistentCharacter.ts)),
   and `ManaDisplay?`/`ManaColor?` to `PlayerViewCombatantState`
   ([common/PlayerViewCombatantState.ts](common/PlayerViewCombatantState.ts)).
   Made optional throughout so creatures without mana simply omit it.
2. **Stat block editor/display** — added a `Mana` `ValueAndNotesField` next to
   HP/Defense in [StatBlockEditor.tsx](client/StatBlockEditor/StatBlockEditor.tsx),
   numeric coercion in
   [ConvertStringsToNumbersWhereNeeded.tsx](client/StatBlockEditor/ConvertStringsToNumbersWhereNeeded.tsx),
   and a conditional Mana row in
   [StatBlock.tsx](client/Components/StatBlock.tsx) /
   [CombatantDetails.tsx](client/Combatant/CombatantDetails.tsx) (only rendered
   when `statBlock.Mana` is set).
3. **Per-combatant tracking** — `Combatant.ts` gained a `CurrentMana`
   Knockout observable (seeded from state or `MaxMana`), a `MaxMana` computed
   derived live from the stat block (mirrors `MaxHP`), an `ApplyManaChange`
   method clamped to `0..MaxMana` (mirrors `ApplyDamage`), persistence to
   `PersistentCharacter` via subscription, and serialization in `GetState()`.
   `CombatantViewModel.ts` added `Mana`/`ManaPercentage` computeds and an
   `ApplyManaChange` wrapper for the React bridge.
4. **Spend/restore UI** — new prompts
   [ApplyManaPrompt.tsx](client/Prompts/ApplyManaPrompt.tsx) (spend or restore
   via signed number) and
   [RestoreManaPrompt.tsx](client/Prompts/RestoreManaPrompt.tsx), wired into
   `CombatantCommander.tsx` as `SpendMana`/`SpendManaTargeted`/`RestoreMana`,
   registered as toolbar/context-menu commands ("Spend Mana", "Restore Mana")
   in [BuildCombatantCommandList.ts](client/Commands/BuildCombatantCommandList.ts),
   and logged via a new `EventLog.LogManaChange`
   ([EventLog.ts](client/Widgets/EventLog.ts)).
5. **Initiative list** — added a conditional Mana column (only shown when any
   combatant in the encounter has `StatBlock.Mana`) in
   [CombatantRow.tsx](client/InitiativeList/CombatantRow.tsx) and
   [InitiativeListHeader.tsx](client/InitiativeList/InitiativeListHeader.tsx),
   click-to-spend wired through `CommandContext` →
   [InitiativeListHost.tsx](client/InitiativeList/InitiativeListHost.tsx) →
   `ApplyManaToCombatant` → `SpendManaTargeted`. Colored bar/text like the HP
   cell (later simplified from a red/green gradient to a flat blue in
   `94012dd3`, to visually distinguish mana from HP).
6. **Player View** — `ToPlayerViewCombatantState.ts` computes `ManaDisplay`/
   `ManaColor` reusing the existing HP verbosity settings
   (`MonsterHPVerbosity`/`PlayerHPVerbosity`), so mana respects the same
   "Actual HP" / "Colored Label" / "Damage Taken" / "Hide All" options as HP.
   `PlayerView.tsx`, `PlayerViewCombatantHeader.tsx`, and
   `PlayerViewCombatant.tsx` add a conditional Mana column, shown only when at
   least one combatant has a mana value.
7. **Persistence across remove/re-add** — `Encounter.ts`
   (`AddCombatantFromPersistentCharacter` and the re-add path) carries
   `CurrentMana` from `PersistentCharacter` onto the new `CombatantState`, so a
   player character's mana total survives being removed and re-added to an
   encounter, the same way `CurrentHP` does.
8. **Settings copy** — `94012dd3` relabeled the HP-bar and HP-verbosity
   settings in [OptionsSettings.tsx](client/Settings/components/OptionsSettings.tsx)
   to "HP/Mana" since they now govern both resources.

Not built (would be later phases if picked back up): a "temporary mana"
equivalent to `TemporaryHP`, and a dedicated mana-only verbosity setting
(mana currently piggybacks on the HP verbosity settings rather than having
its own).

## Wounds — implementation log (done)

Built by mirroring the Mana stack exactly (same layers, same file list), with
one deliberate difference: **Wounds is player-character-only**. Unlike Mana
(optional on any stat block), Wounds is gated behind `StatBlock.Player ==
"player"` / `Combatant.IsPlayerCharacter()` at every layer that touches it, so
monster/NPC stat blocks never get a Wounds field, column, or display — even if
stray `Wounds` data exists on a stat block, `Combatant.MaxWounds` returns
`undefined` for non-PCs. Also, unlike Mana/HP where a higher current value is
"healthier," Wounds is inverted: 0 is healthy, max is defeated (closer to a
"damage taken" counter than a resource pool), so color gradients and verbosity
labels ("Healthy" → "Hurt" → "Wounded" → "Defeated") run in the opposite
direction from the HP/Mana ones.

1. **Data model** — added `Wounds?: ValueAndNotes` to `StatBlock`, `CurrentWounds?: number`
   to `CombatantState` and `PersistentCharacter`, and `WoundsDisplay?`/`WoundsColor?`
   to `PlayerViewCombatantState` — same four files as the Mana fields.
2. **Stat block editor/display** — added a `Wounds` `ValueAndNotesField` in
   [StatBlockEditor.tsx](client/StatBlockEditor/StatBlockEditor.tsx), but wrapped in
   `this.props.statBlock.Player == "player" &&` so it only appears when editing a
   player character. Numeric coercion added to
   [ConvertStringsToNumbersWhereNeeded.tsx](client/StatBlockEditor/ConvertStringsToNumbersWhereNeeded.tsx).
   A conditional Wounds row was added to
   [CombatantDetails.tsx](client/Combatant/CombatantDetails.tsx) (not to the generic
   `StatBlock.tsx` display component, since that file doesn't show HP/Mana either —
   both only render in the combatant-details panel).
3. **Per-combatant tracking** — `Combatant.ts` gained `CurrentWounds` (Knockout
   observable), `MaxWounds` (computed, returns `undefined` unless
   `IsPlayerCharacter()`), `ApplyWoundsChange` (clamped `0..MaxWounds`), persistence
   to `PersistentCharacter`, and serialization in `GetState()`.
   `CombatantViewModel.ts` added `Wounds`/`WoundsPercentage` computeds and an
   `ApplyWoundsChange` wrapper.
4. **Add/heal UI** — new prompts
   [ApplyWoundsPrompt.tsx](client/Prompts/ApplyWoundsPrompt.tsx) and
   [RestoreWoundsPrompt.tsx](client/Prompts/RestoreWoundsPrompt.tsx), wired into
   `CombatantCommander.tsx` as `SpendWounds`/`SpendWoundsTargeted`/`RestoreWounds`,
   registered as commands ("Add Wounds" / "Heal Wounds", icons `skull-crossbones` /
   `band-aid`) in
   [BuildCombatantCommandList.ts](client/Commands/BuildCombatantCommandList.ts), and
   logged via a new `EventLog.LogWoundsChange`.
5. **Initiative list** — conditional Wounds column in
   [CombatantRow.tsx](client/InitiativeList/CombatantRow.tsx) and
   [InitiativeListHeader.tsx](client/InitiativeList/InitiativeListHeader.tsx), shown
   only when a combatant has `StatBlock.Wounds` (which in practice means only when
   a PC with Wounds is in the encounter). Click-to-add wired through
   `CommandContext.ApplyWoundsToCombatant` →
   [InitiativeListHost.tsx](client/InitiativeList/InitiativeListHost.tsx) →
   `SpendWoundsTargeted`. Color gradient is red-at-max/green-at-zero (inverted from
   HP/Mana's green-at-max).
6. **Player View** — `ToPlayerViewCombatantState.ts` computes `WoundsDisplay`/
   `WoundsColor`, reusing `PlayerView.PlayerHPVerbosity` only (no monster-verbosity
   branch, since Wounds never applies to monsters). `PlayerView.tsx`,
   `PlayerViewCombatantHeader.tsx`, and `PlayerViewCombatant.tsx` add a conditional
   Wounds column.
7. **Persistence across remove/re-add** — `Encounter.ts` carries `CurrentWounds`
   from `PersistentCharacter` onto new/re-added `CombatantState`, same as HP/Mana.
8. **Settings copy** — [OptionsSettings.tsx](client/Settings/components/OptionsSettings.tsx)
   labels updated to "HP/Mana/Wounds" (the HP-bar toggle) and "HP/Mana/Wounds
   Verbosity" (the *player-character* verbosity dropdown only — the monster/NPC
   verbosity dropdown was left as "HP/Mana" since Wounds doesn't apply there).
9. **Styles** — mirrored `.combatant__mana` rules for `.combatant__wounds` in
   [combatants.less](lesscss/components/combatants.less) (grid area, hover bar,
   mobile grid-template column) and
   [player-view.less](lesscss/pages/player-view.less), plus `.stat-label.Wounds`
   spacing in [statblock.less](lesscss/components/statblock.less).

Verified with `npx tsc --noEmit -p client/tsconfig.json` — no new type errors
(the 7 pre-existing errors are unrelated dependency-typing issues in
`node_modules`, present before this change too).

### Follow-up refinements (rules clarification)

Nimble's actual rule: PCs start at 0 current wounds with a max of 5 (variable
by feats/traits), the DM should always be able to see wounds taken, but
players shouldn't see a wound track at all until their character has taken a
first wound. Adjusted:

- **Default Max Wounds = 5** — `StatBlock.Default()` now seeds
  `Wounds: { Value: 5, Notes: "" }` ([common/StatBlock.ts](common/StatBlock.ts)),
  so newly created stat blocks already have a sane Max Wounds once toggled to
  Player Character, instead of requiring the DM to type "5" every time. Harmless
  for monster stat blocks since `MaxWounds()`/the editor field both stay gated
  behind `IsPlayerCharacter`.
- **Current Wounds always starts at 0** — unlike HP/Mana (which start "full," at
  their max), a fresh PC has taken no wounds. Fixed
  `PersistentCharacter.Initialize` ([common/PersistentCharacter.ts](common/PersistentCharacter.ts))
  to set `CurrentWounds: 0` instead of defaulting to the stat block's max, and
  removed the `?? MaxWounds()` fallback from `Combatant.ts`'s constructor,
  `processCombatantState`, and `Encounter.ts`'s re-add path — all three now
  default missing `CurrentWounds` to `0`, never to max.
- **Hidden in Player View until first wound** — `GetWoundsDisplay`/
  `GetWoundsColor` in
  [ToPlayerViewCombatantState.ts](client/Combatant/ToPlayerViewCombatantState.ts)
  now return `undefined` whenever `CurrentWounds() <= 0`, regardless of the
  verbosity setting, so an untouched PC's Wounds cell stays blank (and the
  Wounds column itself only appears once someone in the encounter has taken a
  wound). The DM-facing initiative list is intentionally unaffected — it always
  shows `0/5` so the DM can track wounds before a player ever takes one.
- **Proportional green→red gradient in Player View** — `GetWoundsColor` no
  longer returns a flat red; it now computes the same kind of gradient
  `getWoundsStyle` in [CombatantRow.tsx](client/InitiativeList/CombatantRow.tsx)
  already used for the DM view: `green = (max-current)/max * 170`, `red =
  current/max * 170`. A first wound (e.g. 1/5) reads mostly green with a hint of
  red; max wounds reads pure red.

Re-verified with `npx tsc --noEmit -p client/tsconfig.json` (same 7 pre-existing
unrelated errors, no new ones) and `npx jest --config client/jest.config.js`
(128/128 runnable tests pass; the 8 suites that fail to parse do so identically
with and without these changes — a pre-existing `remark-breaks` ESM/Jest-transform
issue unrelated to Wounds).

### Bug fix: Add Wounds prompt didn't add wounds

`Combatant.ApplyWoundsChange` was copy-pasted from `ApplyManaChange`, which
computes `CurrentMana() - amount` because for Mana a positive prompt input
means "spend" (decrease current). Wounds has the opposite sign convention — a
positive input on the "Add Wounds" prompt should *increase* current wounds —
so the subtraction meant clicking the Wounds cell, typing `1`, and submitting
actually clamped 0 - 1 back down to 0, leaving `0/5` unchanged instead of
becoming `1/5`. Fixed by changing the math to `CurrentWounds() + amount`
([Combatant.ts](client/Combatant/Combatant.ts)). `RestoreWoundsPrompt` already
negates its input before calling `ApplyWoundsChange` (`"-" + restoreAmount`),
so healing still correctly decreases current wounds with the corrected sign.

Not built, matching what Mana also skipped: a "temporary wounds" equivalent,
and a Wounds-specific verbosity setting independent of `PlayerHPVerbosity`.

## Resources — implementation log (done)

A third resource pool, alongside HP/Mana/Wounds. Decisions confirmed before
drafting this plan:

- **Optional on any stat block, like Mana** — not gated to player characters.
  Any creature (PC or monster) can have a `Resources` field; the UI only shows
  it when that specific stat block has one set.
- **Starts full (current = max), like HP/Mana** — not the Wounds convention.
  A fresh combatant's current Resources equals its max, and there's no
  preset default number (unlike Wounds' default max of 5) — the DM sets a max
  per stat block, same as HP/AC/Mana.
- **Same up/down semantics as HP/Mana**, not Wounds — a positive "spend" input
  decreases current, a positive "restore" input increases current
  (`CurrentResources() - amount`, matching `ApplyManaChange`, *not* the
  `+ amount` fix that Wounds needed — that fix was specifically because
  Wounds is a "damage taken" counter, and Resources isn't).

- **Column order: HP, Mana, Resources, Wounds** — Resources sits between Mana
  and Wounds everywhere the three appear side-by-side (initiative list header
  and row, combatant details panel, Player View header and row), not appended
  after Wounds. Affects the JSX ordering in each file below, and the grid-area
  order in `combatants.less`'s mobile `grid-template`.

Given those three decisions, this is a near-exact clone of the Mana build —
same file list, same layering, same PC/monster-agnostic gating. Proposed
naming: field `Resources: ValueAndNotes` (label "Resources" in the editor),
`CurrentResources`/`MaxResources` on the combatant, commands "Spend
Resources"/"Restore Resources", icon `bolt` (spend) / `redo` (restore) —
distinct from Mana's `hat-wizard`/`star` and Wounds' `skull-crossbones`/
`band-aid`. Naming is a placeholder; confirm before implementing since it's
visible in the UI (stat block editor label, column header, command tooltips).

Planned file list (mirrors the "Mana — implementation log" section above 1:1,
swapping `Mana`→`Resources` throughout):

1. **Data model** — `Resources?: ValueAndNotes` on `StatBlock`
   ([common/StatBlock.ts](common/StatBlock.ts)); `CurrentResources?: number` on
   `CombatantState` ([common/CombatantState.ts](common/CombatantState.ts)) and
   `PersistentCharacter` ([common/PersistentCharacter.ts](common/PersistentCharacter.ts));
   `ResourcesDisplay?`/`ResourcesColor?` on `PlayerViewCombatantState`
   ([common/PlayerViewCombatantState.ts](common/PlayerViewCombatantState.ts)).
2. **Stat block editor/display** — `ValueAndNotesField` in
   [StatBlockEditor.tsx](client/StatBlockEditor/StatBlockEditor.tsx) (no PC gate,
   unlike Wounds), numeric coercion in
   [ConvertStringsToNumbersWhereNeeded.tsx](client/StatBlockEditor/ConvertStringsToNumbersWhereNeeded.tsx),
   conditional row in [CombatantDetails.tsx](client/Combatant/CombatantDetails.tsx).
3. **Per-combatant tracking** — `Combatant.ts`: `CurrentResources` observable
   (seeded from state or `MaxResources`, same as Mana — not `0` like Wounds),
   `MaxResources` computed (no `IsPlayerCharacter` gate), `ApplyResourcesChange`
   clamped `0..MaxResources` using the Mana-style `current - amount` math,
   persistence + `GetState()` serialization. `CombatantViewModel.ts`:
   `Resources`/`ResourcesPercentage` computeds + wrapper method.
4. **Spend/restore UI** — `ApplyResourcesPrompt.tsx` / `RestoreResourcesPrompt.tsx`
   (new files, mirror `ApplyManaPrompt.tsx`/`RestoreManaPrompt.tsx`), wired into
   `CombatantCommander.tsx` (`SpendResources`/`SpendResourcesTargeted`/
   `RestoreResources`), registered in
   [BuildCombatantCommandList.ts](client/Commands/BuildCombatantCommandList.ts),
   logged via a new `EventLog.LogResourcesChange`.
5. **Initiative list** — conditional Resources column in
   [CombatantRow.tsx](client/InitiativeList/CombatantRow.tsx) /
   [InitiativeListHeader.tsx](client/InitiativeList/InitiativeListHeader.tsx),
   shown when any combatant has `StatBlock.Resources`; click-to-spend through
   `CommandContext.ApplyResourcesToCombatant` →
   [InitiativeListHost.tsx](client/InitiativeList/InitiativeListHost.tsx).
6. **Player View** — `GetResourcesDisplay`/`GetResourcesColor` in
   [ToPlayerViewCombatantState.ts](client/Combatant/ToPlayerViewCombatantState.ts),
   reusing `MonsterHPVerbosity`/`PlayerHPVerbosity` for both PCs and monsters
   (unlike Wounds, which only used the player dropdown). Conditional column in
   `PlayerView.tsx`, `PlayerViewCombatantHeader.tsx`, `PlayerViewCombatant.tsx`.
7. **Persistence across remove/re-add** — `Encounter.ts` carries
   `CurrentResources` from `PersistentCharacter` onto new/re-added
   `CombatantState`.
8. **Settings copy** — [OptionsSettings.tsx](client/Settings/components/OptionsSettings.tsx)
   labels updated to "HP/Mana/Resources/Wounds" on the HP-bar toggle, and
   "HP/Mana/Resources" on the monster verbosity dropdown / "HP/Mana/Resources/
   Wounds" on the player verbosity dropdown, matching the confirmed column
   order (monster dropdown omits Wounds since it's still PC-only).
9. **Styles** — `.combatant__resources` rules mirroring `.combatant__mana` in
   [combatants.less](lesscss/components/combatants.less) (grid area,
   hover/bar-visibility selectors, and the mobile `grid-template` — inserted
   between the `mana` and `wounds` grid areas to match the column order) and
   [player-view.less](lesscss/pages/player-view.less), plus a
   `.stat-label.Resources` spacing rule in
   [statblock.less](lesscss/components/statblock.less).

Built exactly as planned above, with the naming/icons kept as proposed:
field/label "Resources", `bolt` (spend) / `redo` (restore) icons, and
Resources positioned between Mana and Wounds in every column/row ordering
(initiative list, combatant details, Player View, mobile grid). Verified with
`npx tsc --noEmit -p client/tsconfig.json` (same 7 pre-existing unrelated
dependency-typing errors, no new ones) and `npx jest --config
client/jest.config.js` (128/128 runnable tests pass, same 8 pre-existing
`remark-breaks` parse failures as baseline).

Not built, matching what Mana also skipped: a "temporary resources"
equivalent, and a Resources-specific verbosity setting independent of the HP
verbosity dropdowns.

## Gold — implementation log (done)

Gold is structurally different from HP/Mana/Resources/Wounds: it's currency,
not a combat resource, so it doesn't fit the "max/current pair on a stat
block" pattern at all. Decisions confirmed before drafting this plan:

- **Running total, no max** — Gold is just a number that goes up (loot, pay)
  and down (purchases). There's no `StatBlock.Gold` template field the way
  there's a `StatBlock.Mana`/`StatBlock.Wounds` — no percentage, no bar, no
  "MaxGold" concept anywhere.
- **Player characters only** — gated behind `IsPlayerCharacter()`, like
  Wounds. Monster/NPC stat blocks never show a Gold field or column.
- **Visible and editable during combat**, not just on a character sheet — so
  unlike a pure "outside combat" ledger, Gold still needs an initiative-list
  column, a combatant-details row, and spend/gain prompts, the same shape as
  Mana/Resources/Wounds, just without the max-dependent parts (no percentage
  bar, no colored gradient — a flat gold/amber color instead).

Because there's no per-stat-block max, several things route differently than
the Mana/Resources/Wounds precedent:

- **Column/field visibility** can't check `StatBlock.Gold` (it doesn't
  exist) — it has to check `IsPlayerCharacter()` directly, e.g.
  `showGoldColumn = encounterState.Combatants.some(c =>
  StatBlock.IsPlayerCharacter(c.StatBlock))`.
- **No stat block editor field** — there's nothing to configure per
  creature/template. Gold starts at 0 for a new `PersistentCharacter` and is
  only ever changed via the spend/gain prompts (in combat or out, since a
  persistent character can be edited whenever they're in the tracker).
- **Verbs are "Spend"/"Gain," not "Spend"/"Restore"** — "Restore" doesn't
  read naturally for currency. Proposed command labels: "Spend Gold" (icon
  `coins`) / "Gain Gold" (icon `hand-holding-usd`) — both available in the
  installed Font Awesome Free set, distinct from Mana's `hat-wizard`/`star`,
  Resources' `bolt`/`redo`, and Wounds' `skull-crossbones`/`band-aid`.
- **Player View visibility is a live, per-combatant toggle — not a settings-
  page checkbox.** Superseded from the earlier plan: a global
  `DisplayPlayerGold` setting buried in Options wouldn't let a DM flip gold
  on/off *during* an encounter without leaving the tracker. Instead, mirror
  the existing **`RevealedAC`/`ToggleRevealedAC` mechanic exactly** — same
  per-combatant boolean, same command-button pattern, same badge-in-the-row
  UI, just for Gold:
  - `CombatantState.RevealedGold?: boolean` (mirrors `RevealedAC`), but
    **default `true`** (opposite of AC's `false`) — gold isn't the kind of
    thing a DM builds suspense around like monster AC/HP; the ask here is
    "shown by default, with a quick way to suppress it when it's a
    distraction," not "hidden until revealed for a moment." Legacy-encounter
    migration in `UpdateLegacySavedEncounter.ts` defaults missing
    `RevealedGold` to `true` to match (the mirror-image of how missing
    `RevealedAC` defaults to `false`).
  - `Combatant.RevealedGold` observable, `CombatantViewModel.ToggleRevealedGold()`.
  - `CombatantCommander.ToggleRevealedGold` command, registered in
    `BuildCombatantCommandList.ts` as "Hide/Reveal Gold in Player View" (an
    eye-family icon, e.g. `eye-slash`), sitting in the same per-row command
    area as "Hide/Reveal AC in Player View" — this is the "left toggle menu"
    the DM clicks live during an encounter, no settings screen involved.
  - A small badge on the DM-facing Gold cell — mirrors
    `.combatant__ac--revealed-badge` — but since default is "shown," the
    badge logic is inverted: show a "hidden" indicator (e.g. `eye-slash`)
    when `RevealedGold` is `false`, rather than a "revealed" indicator when
    true.
  - `GetGoldDisplay` in `ToPlayerViewCombatantState.ts` returns the raw gold
    number when `IsPlayerCharacter()` *and* `combatant.RevealedGold()`,
    `undefined` otherwise — same shape as `AC: combatant.RevealedAC() ?
    statBlock.AC.Value : undefined`.
  - No new Settings entry, no verbosity dropdown involvement at all.
- **Column placement: after Defense (AC)** — confirmed. Gold sits at the very
  end of the stat cluster (HP, Mana, Resources, Wounds, AC, *Gold*), after
  Defense rather than immediately after Wounds, since it isn't a
  health-adjacent stat and reads more like a trailing "wallet" indicator.

Planned file list (same layering as Mana/Wounds/Resources, minus everything
that depends on a max value):

1. **Data model** — `CurrentGold?: number` **and** `RevealedGold?: boolean`
   on `CombatantState` ([common/CombatantState.ts](common/CombatantState.ts));
   `CurrentGold?: number` on `PersistentCharacter`
   ([common/PersistentCharacter.ts](common/PersistentCharacter.ts)), seeded
   to `0` in `PersistentCharacter.Initialize` (`RevealedGold` is
   per-encounter combat state, like `RevealedAC` — it doesn't belong on
   `PersistentCharacter`). `GoldDisplay?: string` (no `GoldColor` — flat
   color, doesn't need to vary) on `PlayerViewCombatantState`
   ([common/PlayerViewCombatantState.ts](common/PlayerViewCombatantState.ts)).
   No `StatBlock` changes.
2. **Per-combatant tracking** — `Combatant.ts`: `CurrentGold` observable
   (seeded from state, defaulting to `0` — never a max, same fix Wounds
   needed), `RevealedGold` observable (defaulting to `true`, mirroring
   `RevealedAC`'s field but flipped default), no `MaxGold` computed,
   `ApplyGoldChange(amount)` as `CurrentGold() - amount` clamped to a floor
   of `0` with no ceiling (mirrors `ApplyManaChange`'s sign convention:
   positive input on the "Spend" prompt decreases current), persistence +
   `GetState()` serialization for both fields. `CombatantViewModel.ts`: a
   `Gold` computed (just `` `${CurrentGold}` ``, no percentage computed),
   `ApplyGoldChange` wrapper, and `ToggleRevealedGold()` (mirrors
   `ToggleRevealedAC()`).
3. **Spend/gain UI** — `ApplyGoldPrompt.tsx` / `GainGoldPrompt.tsx` (new
   files, mirror `ApplyManaPrompt.tsx`/`RestoreManaPrompt.tsx` but relabeled),
   wired into `CombatantCommander.tsx` (`SpendGold`/`SpendGoldTargeted`/
   `GainGold`/`ToggleRevealedGold`), registered in
   [BuildCombatantCommandList.ts](client/Commands/BuildCombatantCommandList.ts)
   as "Spend Gold"/"Gain Gold"/"Hide/Reveal Gold in Player View" (mirroring
   the "Hide/Reveal AC in Player View" command right next to it), logged via
   a new `EventLog.LogGoldChange` (the reveal toggle itself isn't logged,
   matching `ToggleRevealedAC`, which doesn't log either).
4. **Initiative list** — conditional Gold column in
   [CombatantRow.tsx](client/InitiativeList/CombatantRow.tsx) /
   [InitiativeListHeader.tsx](client/InitiativeList/InitiativeListHeader.tsx),
   positioned after the Defense (AC) column, last in the row; visibility and
   per-row rendering both gated on `IsPlayerCharacter()` rather than a
   stat-block field. No bar-fill markup (nothing to show a percentage of). A
   small badge (mirrors `combatant__ac--revealed-badge`, inverted logic —
   shown when `RevealedGold` is `false`) indicates to the DM that a
   character's gold is currently hidden from players. Click-to-spend through
   `CommandContext.ApplyGoldToCombatant` →
   [InitiativeListHost.tsx](client/InitiativeList/InitiativeListHost.tsx) →
   `SpendGoldTargeted`.
5. **Player View** — `GetGoldDisplay` in
   [ToPlayerViewCombatantState.ts](client/Combatant/ToPlayerViewCombatantState.ts)
   returns the raw gold number when `IsPlayerCharacter()` *and*
   `combatant.RevealedGold()`, `undefined` otherwise — no settings-page
   toggle, no bucketed labels, no color. Conditional column in
   `PlayerView.tsx`, `PlayerViewCombatantHeader.tsx`, `PlayerViewCombatant.tsx`,
   positioned after the AC column, last in the row.
6. **Persistence across remove/re-add** — `Encounter.ts` carries
   `CurrentGold` from `PersistentCharacter` onto new/re-added
   `CombatantState`, defaulting missing values to `0` (never a max, same as
   the Wounds fix). `RevealedGold` defaults to `true` for newly-added
   combatants ([Encounter.ts](client/Encounter/Encounter.ts) — both the
   fresh-add and re-add paths — and
   [InitializeCombatantFromStatBlock.tsx](client/Reducers/InitializeCombatantFromStatBlock.tsx)).
7. **Legacy migration** — [UpdateLegacySavedEncounter.ts](client/Encounter/UpdateLegacySavedEncounter.ts)
   defaults a missing `RevealedGold` to `true` on old saved encounters, the
   mirror image of how it defaults a missing `RevealedAC` to `false`.
8. **Styles** — `.combatant__gold` rules in
   [combatants.less](lesscss/components/combatants.less) (grid area
   positioned after `ac` *and* `hp` in the mobile `grid-template` — resolved
   by putting `gold` last of all, after `hp`, matching its "last column"
   position on desktop) and
   [player-view.less](lesscss/pages/player-view.less); a flat gold/amber
   color (`rgb(212,163,42)`) instead of a computed gradient, since there's
   no max to compute a percentage against. A `.combatant__gold--hidden-badge`
   style mirroring `.combatant__ac--revealed-badge`.

Built exactly as planned: "Spend Gold" (`coins`) / "Gain Gold"
(`hand-holding-usd`) commands; a live per-combatant `RevealedGold` toggle
("Hide/Reveal Gold in Player View", `eye-slash` icon) sitting right next to
"Reveal/Hide AC in Player View" in each row's command area — defaulting to
**visible** (`true`), the mirror image of `RevealedAC`'s default `false` —
with a small hidden-badge on the DM's Gold cell when a character's gold is
currently suppressed from players; Gold positioned as the last column,
after Defense (AC). Two new `Metrics.Event` entries
(`CombatantGoldHidden`/`CombatantGoldRevealed`) were added alongside the
existing AC ones since `ToggleRevealedAC` turned out to already log/track on
toggle (the earlier note that it "doesn't log either" was a planning
mistake — corrected during implementation to match). Verified with `npx tsc
--noEmit -p client/tsconfig.json` (same 7 pre-existing unrelated errors, no
new ones) and `npx jest --config client/jest.config.js` (128/128 runnable
tests pass, same 8 pre-existing `remark-breaks` parse failures as baseline).

### Follow-up: Gold switched from Mana-style spend/gain to Wounds-style add/subtract

Originally Gold copied Mana's sign convention (`CurrentGold() - amount`,
so a positive number on the primary prompt *decreased* gold — "spend").
Changed to match Wounds' convention instead (`CurrentGold() + amount`, a
positive number *increases* gold — "add"), per request. Renamed throughout
to keep the math and the labels honest:

- `Combatant.ApplyGoldChange`: `current - amount` → `current + amount`
  (still floored at `0`, still no ceiling).
- Commands: `SpendGold`/`SpendGoldTargeted` → `AddGold`/`AddGoldTargeted`
  ("Add Gold", icon `hand-holding-usd`); `GainGold` → `SubtractGold`
  ("Subtract Gold", icon `coins`) — icons swapped so `hand-holding-usd`
  reads as "money in" and `coins` reads as "money out," matching their new
  meanings.
- Prompts: `ApplyGoldPrompt.tsx` relabeled "Add or subtract gold for X"
  (was "Spend or gain gold"); `GainGoldPrompt.tsx` deleted and replaced by
  [SubtractGoldPrompt.tsx](client/Prompts/SubtractGoldPrompt.tsx) (mirrors
  `RestoreWoundsPrompt.tsx`'s negate-before-apply pattern: passes
  `"-" + subtractAmount` to `ApplyGoldChange` so a positive field value
  still reads as "subtract this much").
- `EventLog.LogGoldChange` wording flipped to match: positive amount →
  "gold added for X," negative → "gold subtracted from X" (was "spent
  by"/"gained by").
- The row's click-to-adjust cell now opens the "Add Gold" prompt by default
  (was "Spend Gold") — clicking a PC's gold cell mid-combat now defaults to
  recording loot/reward, not an expense, matching how clicking the Wounds
  cell defaults to "Add Wounds."

Note: the "Hide/Reveal Gold in Player View" toggle (`RevealedGold`,
`ToggleRevealedGold`, the `coins`+`slash` `fa-stack` icon) is unrelated to
this change and untouched — it still lives on `combatant.RevealedGold` and
still defaults to visible.

Verified with `npx tsc --noEmit -p client/tsconfig.json` (same 7
pre-existing unrelated errors, no new ones) and `npx jest --config
client/jest.config.js` (128/128 runnable tests pass, same baseline).

## Persistent tags for player characters — implementation log (done)

Previously, `Tags` lived only in `CombatantState` (per-encounter) — a PC's
conditions/labels always reset to empty when added to a new encounter or
re-added after removal, unlike `CurrentHP`/`CurrentMana`/`CurrentResources`/
`CurrentWounds`/`CurrentGold`/`Notes`, which all sync to `PersistentCharacter`.

**Scope decision**: only *non-expiring* tags persist (`!tag.HasDuration`,
i.e. tags added without a duration set in the tag prompt). Duration tags
carry `DurationRemaining`/`DurationTiming`/`DurationCombatantId` — a round
count and a reference to a specific combatant ID from *that* encounter —
which is meaningless once carried into a different encounter (the
referenced combatant likely doesn't exist there). A tag like "Poisoned...
until start of Grokk's turn in 3 rounds" only makes sense inside the
encounter it was added in; a tag like "Cursed by the Baron" (no duration)
makes sense forever.

1. **Data model** — `PersistentCharacter.Tags?: TagState[]`
   ([common/PersistentCharacter.ts](common/PersistentCharacter.ts)), seeded
   to `[]` in `Initialize()`.
2. **Persistence** — `Combatant.ts`'s `AttachToPersistentCharacterLibrary`
   adds a `this.Tags.subscribe(...)` (alongside the existing
   `CurrentHP`/`CurrentMana`/etc. subscriptions) that filters to
   `!t.HasDuration`, serializes via each tag's `GetState()`, and calls
   `updatePersistentCharacter(id, { Tags: persistentTags })` — fires
   whenever a tag is added or removed (Knockout's `observableArray`
   subscription triggers on `push`/`remove`/`splice`, not on a nested
   observable like `DurationRemaining` ticking down each round, so this
   never fires spuriously during normal duration-tag countdown).
3. **Rehydration** — `Encounter.ts`'s `AddCombatantFromPersistentCharacter`
   seeds the new combatant's `CombatantState.Tags` from
   `persistentCharacter.Tags ?? []` (previously always `[]`). `Tag.FromTagStates`
   already reconstructs `Tag` objects from `TagState[]` correctly — a
   persisted non-duration tag round-trips with `DurationRemaining: -1`,
   which reconstructs `HasDuration: false`, so it's never added to
   `EncounterFlow`'s duration-tracking list ([Encounter.ts](client/Encounter/Encounter.ts),
   `combatant.Tags().forEach(tag => { if (tag.HasDuration) ... })`).

**Known limitation, scoped out deliberately**: the *reload-a-saved-encounter*
path (`Encounter.ts`, the `combatantsInLabelOrder.forEach` block that
re-syncs `CurrentHP`/`CurrentMana`/etc. from the canonical `PersistentCharacter`
on load) does *not* re-sync `Tags`. That path already has the encounter's own
saved `Tags` snapshot (including any non-expiring tags, since those were
already persisted when originally added). The gap: if the same PC picked up
a new non-expiring tag in a *different* encounter since this one was last
saved, reloading this encounter won't show it. Fixing that would mean
merging the encounter's own duration tags with the canonical non-expiring
tags on reload — deliberately left out to keep this change focused; flag if
that multi-encounter case turns out to matter in practice.

Verified with `npx tsc --noEmit -p client/tsconfig.json` (same 7 pre-existing
unrelated errors, no new ones) and `npx jest --config client/jest.config.js`
(128/128 runnable tests pass, same 8 pre-existing `remark-breaks` parse
failures as baseline).

## Hit Dice — implementation log (done)

Decisions confirmed:

- **Just a count, no die size** — like Resources. A max/current number shown
  as `2/2` for a level-2 PC. No die-size field, no dice rolling built in —
  spending a Hit Die just decrements the counter; the DM enters each PC's
  max by hand (no default preset), and rolls the actual heal at the table.
- **Purely manual restoration** — no "Long Rest" bulk-restore action; regain
  Hit Dice via a prompt, same as Resources/Wounds/Gold.
- **Player characters only** — gated behind `IsPlayerCharacter()`, like
  Wounds/Gold. Nimble uses the term "Hit Dice," so the field/label/commands
  keep that name throughout.
- **Column position: between Resources and Wounds** (not after HP, as
  originally proposed) — final row order is HP, Mana, Resources, **Hit
  Dice**, Wounds, AC, Gold.
- **Add/subtract like HP** — Mana's `current - amount` convention (a
  positive number on the primary "Spend" prompt decreases the count,
  matching how a positive number in HP's damage field decreases HP) — not
  Wounds/Gold's inverted "positive = add" convention, since spending a Hit
  Die (not gaining one) is the common action during play.

Built as a hybrid of two precedents: Wounds' PC-gating (`IsPlayerCharacter()`
on every layer, no `StatBlock.HitDice` for monsters) combined with Mana's
math/display shape (percentage bar, gradient color, "starts full" seeding,
`- amount` spend convention).

1. **Data model** — `HitDice?: ValueAndNotes` on `StatBlock`
   ([common/StatBlock.ts](common/StatBlock.ts)); `CurrentHitDice?: number` on
   `CombatantState` ([common/CombatantState.ts](common/CombatantState.ts)) and
   `PersistentCharacter` ([common/PersistentCharacter.ts](common/PersistentCharacter.ts));
   `HitDiceDisplay?`/`HitDiceColor?` on `PlayerViewCombatantState`
   ([common/PlayerViewCombatantState.ts](common/PlayerViewCombatantState.ts)).
2. **Stat block editor/display** — `ValueAndNotesField` in
   [StatBlockEditor.tsx](client/StatBlockEditor/StatBlockEditor.tsx), wrapped
   in the same `this.props.statBlock.Player == "player" &&` PC-gate Wounds
   uses, positioned between the Resources and Wounds fields; numeric
   coercion in
   [ConvertStringsToNumbersWhereNeeded.tsx](client/StatBlockEditor/ConvertStringsToNumbersWhereNeeded.tsx);
   conditional row in [CombatantDetails.tsx](client/Combatant/CombatantDetails.tsx),
   on the second line (with Resources/Wounds) between them.
3. **Per-combatant tracking** — `Combatant.ts`: `CurrentHitDice` observable
   (seeded from state or `MaxHitDice`, Mana-style), `MaxHitDice` computed
   gated on `IsPlayerCharacter()` (Wounds-style), `ApplyHitDiceChange`
   using `current - amount` clamped `0..max`, persistence + `GetState()`
   serialization. `CombatantViewModel.ts`: `HitDice`/`HitDicePercentage`
   computeds + wrapper method.
4. **Spend/restore UI** — [ApplyHitDicePrompt.tsx](client/Prompts/ApplyHitDicePrompt.tsx) /
   [RestoreHitDicePrompt.tsx](client/Prompts/RestoreHitDicePrompt.tsx)
   (mirror `ApplyManaPrompt.tsx`/`RestoreManaPrompt.tsx` exactly, including
   the sign convention), wired into `CombatantCommander.tsx`
   (`SpendHitDice`/`SpendHitDiceTargeted`/`RestoreHitDice`), registered in
   [BuildCombatantCommandList.ts](client/Commands/BuildCombatantCommandList.ts)
   as "Spend Hit Die" (`dice-d6`) / "Restore Hit Die" (`bed`), logged via a
   new `EventLog.LogHitDiceChange` ("X Hit Dice spent by Y" / "X Hit Dice
   restored to Y").
5. **Initiative list** — conditional Hit Dice column in
   [CombatantRow.tsx](client/InitiativeList/CombatantRow.tsx) /
   [InitiativeListHeader.tsx](client/InitiativeList/InitiativeListHeader.tsx),
   positioned between the Resources and Wounds columns; visibility/per-row
   rendering gated on `StatBlock.HitDice` presence. Colored bar/gradient
   like HP/Mana (green-at-full, red-at-empty). Click-to-spend through
   `CommandContext.ApplyHitDiceToCombatant` →
   [InitiativeListHost.tsx](client/InitiativeList/InitiativeListHost.tsx) →
   `SpendHitDiceTargeted`.
6. **Player View** — `GetHitDiceDisplay`/`GetHitDiceColor` in
   [ToPlayerViewCombatantState.ts](client/Combatant/ToPlayerViewCombatantState.ts),
   using only `PlayerHPVerbosity` (PC-only, like Wounds — no monster-verbosity
   branch). Conditional column in `PlayerView.tsx`,
   `PlayerViewCombatantHeader.tsx`, `PlayerViewCombatant.tsx`, positioned
   between Resources and Wounds.
7. **Persistence across remove/re-add** — `Encounter.ts` carries
   `CurrentHitDice` from `PersistentCharacter` onto new/re-added
   `CombatantState`, defaulting missing values to `MaxHitDice` (Mana-style
   "starts full" fallback, not `0`).
8. **Settings copy** — [OptionsSettings.tsx](client/Settings/components/OptionsSettings.tsx)
   labels updated to mention Hit Dice on the HP-bar toggle and the
   *player-character* verbosity dropdown (monster dropdown untouched,
   PC-only like Wounds).
9. **Styles** — `.combatant__hitdice` rules mirroring `.combatant__resources`
   in [combatants.less](lesscss/components/combatants.less) (grid area
   inserted between `resources` and `wounds` in both the desktop column
   order and the mobile `grid-template`) and
   [player-view.less](lesscss/pages/player-view.less); `.stat-label.HitDice`
   spacing in [statblock.less](lesscss/components/statblock.less).

Verified with `npx tsc --noEmit -p client/tsconfig.json` (same 7
pre-existing unrelated errors, no new ones) and `npx jest --config
client/jest.config.js` (128/128 runnable tests pass, same 8 pre-existing
`remark-breaks` parse failures as baseline).

### Follow-up: Hit Dice gets the same live hide/reveal toggle as Gold

Mirrors `RevealedGold`/`ToggleRevealedGold` exactly, including the
`dice-d6`+`slash` `fa-stack` icon treatment:

- `CombatantState.RevealedHitDice?: boolean`
  ([common/CombatantState.ts](common/CombatantState.ts)), `Combatant.RevealedHitDice`
  observable defaulting to `true` (visible), same default direction as Gold.
- `CombatantViewModel.ToggleRevealedHitDice()` — logs "Hit Dice hidden/revealed
  in player view," tracks new `Metrics.Event.CombatantHitDiceHidden`/
  `CombatantHitDiceRevealed` ([Metrics.ts](client/Utility/Metrics.ts)).
- `CombatantCommander.ToggleRevealedHitDice`, registered in
  [BuildCombatantCommandList.ts](client/Commands/BuildCombatantCommandList.ts)
  as "Hide/Reveal Hit Dice in Player View" (`toggle-reveal-hit-dice`), sitting
  next to "Hide/Reveal Gold in Player View" in the per-row command area.
- [CombatantRow.tsx](client/InitiativeList/CombatantRow.tsx): the command
  button renders a real `fa-stack` (`dice-d6` + `slash` layered), same
  special-case technique used for the Gold toggle (`isStackedIcon` now
  covers both). A small hidden-badge (`combatant__hitdice--hidden-badge`,
  `eye-slash`) appears in the DM's Hit Dice cell when `RevealedHitDice` is
  `false`, mirroring the Gold cell's badge.
- `GetHitDiceDisplay`/`GetHitDiceColor` in
  [ToPlayerViewCombatantState.ts](client/Combatant/ToPlayerViewCombatantState.ts)
  now also return `undefined` when `!combatant.RevealedHitDice()`, on top of
  the existing PC-only/verbosity gating.
- `RevealedHitDice: true` seeded explicitly in both `Encounter.ts` add paths
  and [InitializeCombatantFromStatBlock.tsx](client/Reducers/InitializeCombatantFromStatBlock.tsx);
  [UpdateLegacySavedEncounter.ts](client/Encounter/UpdateLegacySavedEncounter.ts)
  defaults a missing value to `true` for old saved encounters, matching
  Gold's legacy migration.
- Styles: `.combatant__hitdice--hidden-badge` mirrors
  `.combatant__gold--hidden-badge` in
  [combatants.less](lesscss/components/combatants.less).

Verified with `npx tsc --noEmit -p client/tsconfig.json` (same 7
pre-existing unrelated errors, no new ones) and `npx jest --config
client/jest.config.js` (128/128 runnable tests pass, same baseline).

### Follow-up: new PCs default to hidden Gold and Hit Dice, not visible

The `true` (visible) default was only ever meant as a *fallback* for
existing/legacy data missing the field, not as the default a DM would want
every time they add a new PC — flipped the three combatant-construction
call sites (where `RevealedGold`/`RevealedHitDice` are explicitly set, not
inferred) from `true` to `false`:
[Encounter.ts](client/Encounter/Encounter.ts) (`AddCombatantFromStatBlock`
and `AddCombatantFromPersistentCharacter`) and
[InitializeCombatantFromStatBlock.tsx](client/Reducers/InitializeCombatantFromStatBlock.tsx).

Left untouched, deliberately: the `?? true` fallback in
`Combatant.processCombatantState`, the `ko.observable(true)` class-field
default, and the `?? true` legacy migration in
[UpdateLegacySavedEncounter.ts](client/Encounter/UpdateLegacySavedEncounter.ts).
Those only apply to encounters/characters saved *before* this field existed
— since `??` doesn't override an explicitly-set `false`, this keeps
already-saved games showing Gold/Hit Dice exactly as before (no retroactive
hiding), while every newly-added PC going forward starts hidden and the DM
reveals them explicitly via the toggle commands.

Re-verified with `npx tsc --noEmit -p client/tsconfig.json` (same 7
pre-existing unrelated errors) and `npx jest --config client/jest.config.js`
(128/128 runnable tests pass, same baseline).

### Follow-up: Player View hides the max for Mana/Resources/Hit Dice/Wounds

Under the "Actual HP"-style verbosity setting, these four used to show
`current/max` in Player View, same as HP. Changed so they show only
`current` to players — the max is DM-only information now (visible on the
DM's own initiative list/combatant details as always). HP and Gold are
untouched (HP still shows `current/max` — and `current+temp/max` when
`TemporaryHP` is set — to players; Gold has no max to begin with).

[ToPlayerViewCombatantState.ts](client/Combatant/ToPlayerViewCombatantState.ts):
`GetManaDisplay`/`GetResourcesDisplay`/`GetHitDiceDisplay`/`GetWoundsDisplay`'s
`"Actual HP"` branch each changed from `` `${current}/${max}` `` to just
`` `${current}` ``. The "Damage Taken" and bucketed-label verbosity branches
were already max-free (a computed delta or a label like "Reduced"/"Full")
and are unchanged.

Verified with `npx tsc --noEmit -p client/tsconfig.json` (same 7
pre-existing unrelated errors) and `npx jest --config client/jest.config.js`
(128/128 runnable tests pass, same baseline).
