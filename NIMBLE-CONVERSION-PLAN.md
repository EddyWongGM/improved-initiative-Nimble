to do

Resources
Gold
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

