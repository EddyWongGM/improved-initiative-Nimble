# Inventory Tracker Investigation Plan

Last reviewed: 2026-08-21

## Goal

Investigate what it would take to add an inventory tracker (items, gear,
loot) to persistent (saved) player characters, so players and the DM can
track equipment and carried items the same way they currently track gold,
hit dice, and other resources. This document scopes the investigation, not
the implementation — it collects the open questions, the relevant existing
code, and a draft approach to validate before writing code.

## Decided scope

- **Persistent characters only, mirrored on `CombatantState` — same
  pattern as gold.** Confirmed by reading `Combatant.ts`: every existing
  "current value" resource (gold, HP, mana, hit dice, wounds, notes,
  tags) is stored on *both* `CombatantState` and `PersistentCharacter`,
  edited live through a `Combatant` during an active encounter, and
  pushed to the persistent record by a subscription in
  `AttachToPersistentCharacterLibrary()`
  ([client/Combatant/Combatant.ts:146-207](client/Combatant/Combatant.ts#L146-L207)).
  There is no existing mechanism to read or edit a field that lives only
  on `PersistentCharacter` — `UpdatePersistentCharacter`
  ([client/Library/Libraries.ts:21-24](client/Library/Libraries.ts#L21-L24))
  is a fire-and-forget update by ID, not something the live combat UI
  binds to, and the Library's character editor only edits the static
  `StatBlock`, not "current" values. Inventory follows the same dual
  storage: `CombatantState.Items` + `PersistentCharacter.Items`, editable
  only while the character is in an active encounter — the same
  limitation gold already has. Monsters and NPCs without a linked
  persistent character have no inventory.
- **Items support quantities and stacking, plus non-stackable items with
  variable slot cost.** See "Slot capacity mechanic" below for the full
  `Stackable`/`Quantity`/`SlotCost` model.
- **PlayerView shows a full/not-full indicator only, not contents.**
  Unlike gold's `RevealedGold`/`CurrentGold` duplicate-value split,
  inventory doesn't need a parallel "revealed" list — the passive
  PlayerView surface is just an optional icon/flag showing whether the
  character's inventory is at or over capacity, driven directly off the
  same `MaxInventorySlots` computation the DM sees. See "PlayerView
  surfaces" below for the separate, on-demand "show full contents to the
  player" mechanism, which is a different kind of feature (a DM-triggered
  push, not continuously-synced state) and needs its own investigation.
- **Slot-based capacity, driven by Strength.** See below.

## Why this fits the app

The app already tracks per-character resources that are conceptually close
to inventory: `CurrentGold`, hit dice, wounds, mana, and other temporary
resources. Gold is the closest existing analog to "items with quantities,"
and it was added end-to-end recently, so it's the best template to copy the
shape of rather than inventing a new pattern from scratch.

## Architecture recap (from codebase research)

- **Client/server monorepo.** `client/` is a hybrid Knockout + React app
  (Knockout observables wrapped by React view models via
  `linkComponentToObservables.tsx`). `server/` is Node/Express with
  Socket.io for PlayerView sync and MongoDB for persistence. `common/`
  holds shared TypeScript interfaces compiled for both sides.
- **Data models.**
  - [common/CombatantState.ts](common/CombatantState.ts) — per-encounter
    combatant state (flat optional fields like `CurrentGold?`,
    `RevealedGold?`, `CurrentHitDice?`, `TemporaryHitDice?`).
  - [common/PersistentCharacter.ts](common/PersistentCharacter.ts) — the
    saved, cross-encounter PC record with matching fields plus an
    `Initialize(statBlock)` factory.
  - [common/StatBlock.ts](common/StatBlock.ts) — static template values
    (max HP, mana, resources).
  - [client/Combatant/Combatant.ts](client/Combatant/Combatant.ts) —
    Knockout-observable class wrapping `CombatantState`, with
    `ApplyXChange` / `ApplyTemporaryX` methods per resource,
    `processCombatantState()` to load, `GetState()` to serialize, and a
    subscription in `AttachToPersistentCharacterLibrary()`
    (`Combatant.ts:146-207`) that pushes each resource's changes out to
    the saved PC — one `.subscribe()` call per field, including the
    `Tags` list handled the same way scalars are (filter, map, then a
    single `UpdatePersistentCharacter` call), which is the concrete proof
    a list-shaped field can use this exact mechanism.
  - **Correction from initial research:** `client/PersistentCharacter/`
    contains only a test file (`PersistentCharacter.test.tsx`) — there is
    no Knockout-observable `PersistentCharacter` class mirroring
    `Combatant.ts`. A `PersistentCharacter` is plain data (the
    `common/PersistentCharacter.ts` interface) managed through the
    Library/Listing system (`client/Library/Libraries.ts`,
    `client/Library/useLibrary.ts`) and mutated only via the
    fire-and-forget `UpdatePersistentCharacter(id, updates)` function —
    never bound live into the UI on its own. This is the reason inventory
    needs the `CombatantState` mirror above: it's the only reactive
    surface available.
- **Persistence.** MongoDB via
  [server/dbconnection.ts](server/dbconnection.ts) (`getEntity`,
  `saveEntity`, `saveEntitySet`, `deleteEntity`, generic over an
  `EntityPath`), routes in
  [server/storageroutes.ts](server/storageroutes.ts). Client account sync
  in [client/Account/AccountClient.ts](client/Account/AccountClient.ts)
  (with `MockAccountClient.tsx` for offline/dev), plus a legacy
  localStorage fallback in
  [client/Utility/LegacySynchronousLocalStore.ts](client/Utility/LegacySynchronousLocalStore.ts).
- **UI patterns.** Modal-style forms live in `client/Prompts/` (Formik +
  `StandardPromptLayout`), command palette entries in
  [client/Commands/BuildCombatantCommandList.ts](client/Commands/BuildCombatantCommandList.ts),
  detail panels in
  [client/Combatant/CombatantDetails.tsx](client/Combatant/CombatantDetails.tsx)
  / `MultipleCombatantDetails.tsx`, row display in
  [client/InitiativeList/CombatantRow.tsx](client/InitiativeList/CombatantRow.tsx),
  and player-facing reveal logic in
  [client/PlayerView/components/PlayerViewCombatant.tsx](client/PlayerView/components/PlayerViewCombatant.tsx)
  (path corrected from initial research, which omitted `components/`).
- **Testing.** Jest on both sides (`client/jest.config.js`,
  `server/jest.config.js`), tests colocated as `*.test.ts(x)` next to the
  source they cover.

## The Gold feature as a template

Gold was added as a single vertical slice touching five files, in this
order: `common/CombatantState.ts` → `common/PersistentCharacter.ts` →
`client/Combatant/Combatant.ts` → a `client/Prompts/*Prompt.tsx` pair
(`ApplyGoldPrompt.tsx` / `SubtractGoldPrompt.tsx`) → wiring in
`BuildCombatantCommandList.ts` and `CombatantCommander.tsx`, then surfaced
in `CombatantDetails.tsx`, `CombatantRow.tsx`, and (via `RevealedGold`)
`PlayerViewCombatant.tsx`. Hit dice, wounds, and temporary resources follow
the same five-file shape. Inventory should very likely follow this same
path — the investigation is mainly about whether a *list of items* fits
this flat-field pattern or needs something structurally different.

## Slot capacity mechanic

Default carrying capacity is 10 slots; a Strength modifier of +2 grants 12
slots, a modifier of -1 grants 9, etc. — capacity is derived, not stored.

- **Modifier source.** `common/StatBlock.ts` stores raw ability scores
  (`Abilities.Str`, default 10), not modifiers. The modifier is computed
  via `Rules.GetModifierFromScore(abilityScore)` in
  [client/Rules/Rules.ts](client/Rules/Rules.ts) (`Math.floor((score - 10) / 2)`).
  `client/Combatant/Combatant.ts` already has this exact pattern as a
  `ko.computed`, e.g. the Dex-modifier computed at
  [client/Combatant/Combatant.ts:265-268](client/Combatant/Combatant.ts#L265-L268)
  (`this.Encounter.Rules.GetModifierFromScore(this.StatBlock().Abilities.Dex)`).
  A `MaxInventorySlots` computed on `Combatant`/`PersistentCharacter`
  should follow this same shape:
  `10 + Rules.GetModifierFromScore(StatBlock().Abilities.Str)`.
- **Not a stored field.** Because capacity is derived from Strength, it
  should be a computed property, not a persisted field like `CurrentGold`
  — otherwise it can drift out of sync if the stat block's Strength score
  changes later (leveling, a strength buff/drain effect, re-equipping a
  different stat block). This is a deviation from the flat
  `CurrentX`/`MaxX` field pattern the other resources use, since those
  (`MaxHP`, `MaxMana`, `MaxResources`) all read `Value` directly off the
  stat block rather than deriving from an ability score — worth confirming
  there's no existing "capacity derived from ability score" precedent
  elsewhere in the rules engine before writing this from scratch.
- **What consumes a slot — decided.** Two item kinds, distinguished by a
  `Stackable: boolean` on each entry:
  - **Stackable** (example: torches, rations). One inventory row per item
    type, with a `Quantity` that goes up and down persistently — the same
    delta-application idiom as `ApplyGoldChange` (e.g.
    `ApplyItemQuantityChange(item, delta)`), not a remove-and-re-add. A
    stack costs exactly **1 slot regardless of quantity**: 4 torches and
    40 torches both cost 1 slot.
  - **Non-stackable.** Each entry is a single item and can cost **more
    than 1 slot** (a `SlotCost` field per entry, DM/player-set when the
    item is added, not a fixed constant). Carrying two non-stackable items
    of the same name still means two separate rows, each consuming its
    own `SlotCost`.
  - Total slots used = sum of `SlotCost` across all rows (stackable rows
    have a fixed `SlotCost` of 1 regardless of `Quantity`; non-stackable
    rows contribute their own `SlotCost` each). This gives one consistent
    formula instead of two separate code paths.
  - Gold stays out of the slot system entirely — it's tracked separately
    via `CurrentGold` and was never part of this list.
- **Enforcement — decided: warning, not a hard block.** Adding an item
  past `MaxInventorySlots` is allowed; the DM's add-item UI just shows a
  warning (e.g. a red "11/10 slots" indicator) rather than rejecting the
  submit. Simpler to build than a block, since it only needs
  `MaxInventorySlots` read in the display component, not enforced as a
  precondition on the mutation itself.
- **Negative modifiers and capacity floor.** A very low Strength score
  (e.g. 6, modifier -2) yields 8 slots, which is fine, but confirm there's
  no expectation of a minimum floor (e.g. capacity should never go below
  some small number) before assuming the raw `10 + modifier` formula is
  final.

## PlayerView surfaces

Two distinct player-facing features, not one:

1. **Passive full/not-full indicator (decided) — design specified.** A
   sack/chest icon plus the slots-used value, colored brown, shown in
   *both* the DM's `CombatantRow` and the PlayerView, positioned between
   the Wounds and Gold columns — mirroring how Gold itself is displayed
   in each. Concrete findings from reading both column implementations:
   - **Icon.** The bundled icon set is FontAwesome 5.15.4 Free
     (`@fortawesome/fontawesome-free` in `package.json`), and it has
     **no literal "sack" or "chest" icon** — confirmed by listing
     `node_modules/@fortawesome/fontawesome-free/svgs/solid/`. Closest
     free substitutes: `fa-shopping-bag` (closest to a sack) or
     `fa-box-open` (closest to an open chest). Gold uses `fa-coins`
     the same way (`combatant__mobile-icon fas fa-coins` in
     [client/InitiativeList/CombatantRow.tsx:378](client/InitiativeList/CombatantRow.tsx#L378)),
     so `fa-shopping-bag` or `fa-box-open` should follow the identical
     `combatant__mobile-icon fas fa-<icon>` class pattern. Confirm which
     of the two reads better at small size before committing — pull a
     custom SVG only if neither is acceptable.
   - **Color.** Brown, following the exact convention Gold already uses:
     a plain inline `rgb(...)` value repeated in both places gold is
     rendered — `rgb(212,163,42)` in
     [ToPlayerViewCombatantState.ts:325](client/Combatant/ToPlayerViewCombatantState.ts#L325)
     (PlayerView) and again in
     [CombatantRow.tsx:691](client/InitiativeList/CombatantRow.tsx#L691)
     (`getGoldStyle()`, DM view). Inventory needs its own brown constant,
     e.g. `rgb(139,90,43)` (a standard "saddle brown"), defined once and
     reused in both places the same way — check for an existing shared
     color-constants module before duplicating the literal in two files
     (Gold doesn't use one, but it's worth checking so inventory doesn't
     repeat the duplication if a better pattern exists elsewhere).
   - **Placement — unambiguous on the DM side, needs a call on
     PlayerView.** In `CombatantRow.tsx`, Wounds and Gold are already
     adjacent columns (`showWoundsColumn` block ends at
     [CombatantRow.tsx:361](client/InitiativeList/CombatantRow.tsx#L361),
     `showGoldColumn` block starts at
     [CombatantRow.tsx:364](client/InitiativeList/CombatantRow.tsx#L364))
     — inventory slots in cleanly between them, no ambiguity. On
     PlayerView, Wounds and Gold are *not* adjacent — `acColumnVisible`
     sits between them in
     [PlayerViewCombatant.tsx:114-134](client/PlayerView/components/PlayerViewCombatant.tsx#L114-L134).
     Defaulting to placing inventory immediately after Wounds and before
     AC (so the column order becomes Wounds → Inventory → AC → Gold) —
     redirect this if a different position was intended.
   - **Data flow (verified, matches the Gold pattern exactly).** Five
     files: add `Items`-derived fields to
     `common/PlayerViewCombatantState.ts`; compute them in
     `client/Combatant/ToPlayerViewCombatantState.ts` (add
     `GetInventoryDisplay`/`GetInventoryColor` functions alongside the
     existing `GetGoldDisplay`/`GetGoldColor` at
     [ToPlayerViewCombatantState.ts:312-326](client/Combatant/ToPlayerViewCombatantState.ts#L312-L326),
     gated on `combatant.IsPlayerCharacter()` the same way gold is);
     render in `client/PlayerView/components/PlayerViewCombatant.tsx` and
     its header `PlayerViewCombatantHeader.tsx`; derive column visibility
     in `client/PlayerView/components/PlayerView.tsx` the same
     "does any combatant have this field defined" way gold's
     `goldColumnVisible` is derived at
     [PlayerView.tsx:78-80](client/PlayerView/components/PlayerView.tsx#L78-L80).
     No new sync mechanism needed — inventory data already flows to the
     client the same way gold/HP do. No duplicate "revealed" data
     structure required, since the indicator is a derived value, not the
     item contents themselves.
   - **Display text — decided.** `"7/10"` (slots used / `MaxInventorySlots`),
     matching the `current/max` text format `WoundsDisplay` already uses
     ([ToPlayerViewCombatantState.ts:262-291](client/Combatant/ToPlayerViewCombatantState.ts#L262-L291)),
     not an icon-only boolean.

2. **DM-triggered "show full inventory to the player" popup (new, but
   follows an existing pattern).** Confirmed via codebase research: this
   doesn't exist for inventory yet, but there's a directly reusable
   architecture already built for exactly this shape of feature —
   `CombatStatsPopup`
   ([client/PlayerView/components/CombatStatsPopup.tsx](client/PlayerView/components/CombatStatsPopup.tsx)).
   The DM calls `PlayerViewClient.DisplayCombatStats(encounterId, stats)`
   (see the call site at
   [client/Encounter/Encounter.ts:591](client/Encounter/Encounter.ts#L591)),
   which emits a one-off `"combat stats"` socket event that
   `server/sockets.ts` simply rebroadcasts to the PlayerView — it is
   **not** persisted into encounter state, it's a transient push. The
   PlayerView React tree
   ([client/PlayerView/components/PlayerView.tsx](client/PlayerView/components/PlayerView.tsx))
   reacts to it, shows the popup over a shared `modal-blur` overlay, and
   dismisses via the existing `closeAllModals` handler (click-to-dismiss;
   `PortraitModal.tsx` shows the same overlay auto-dismissing after 5s, as
   an alternate dismiss-timing precedent).
   An inventory-review popup should follow the same four pieces:
   a `PlayerViewClient.DisplayInventory(encounterId, items)` method, a new
   discrete `"display inventory"` socket event (relay-only, like
   `"combat stats"`), a new `InventoryPopup.tsx` component reusing the
   `modal-blur` overlay, and a DM-side trigger (a command in
   `BuildCombatantCommandList.ts`, matching how other combatant actions
   are exposed). This is additive and low-risk since it reuses working
   infrastructure rather than inventing a new push mechanism.
   Targeting — decided: broadcast to everyone watching the PlayerView, no
   per-player privacy needed. This matches `"combat stats"` exactly (whole
   encounter room, no per-player filtering), so no new socket plumbing is
   required beyond the relay event itself.

## Add / edit / remove item UI (designed)

`Tags` turns out to be the right template for this too, not just for the
sync mechanism — it's a per-combatant *list* with inline removal, plus a
command-triggered "add" prompt, which is exactly what inventory needs.
Verified by reading the full chain: `client/InitiativeList/Tags.tsx`
(display + remove), `client/Prompts/TagPrompt.tsx` (add form),
`client/Commands/CombatantCommander.tsx:635-654` (`AddTag`, wires the
prompt into `PromptQueue`), and the `add-tag` entry in
`BuildCombatantCommandList.ts:127-128`. Gold contributes one more piece
Tags doesn't have: a signed delta field, since inventory quantities need
to go up *and* down.

1. **Interactive display — new `client/InitiativeList/Items.tsx`,
   directly mirroring `Tags.tsx`.** A `<ul className="combatant__items">`
   of chips, rendered in `CombatantRow.tsx` next to the existing `<Tags>`
   component ([CombatantRow.tsx:417-428](client/InitiativeList/CombatantRow.tsx#L417-L428)),
   sourced from `props.combatantState.Items`. Each chip: item name, plus
   `×{Quantity}` for stackable rows (nothing for non-stackable, which are
   implicitly 1), and a remove button
   (`tag__button fa-clickable fa-times`, same class/icon `Tag()` uses in
   `Tags.tsx:52-56`) that calls a new
   `commandContext.RemoveItemFromCombatant(combatantId, item)` — deletes
   the row outright, whether it's a stackable stack or a single
   non-stackable item. If total slots used > `MaxInventorySlots`, the
   whole `combatant__items` list gets a warning style (a red border,
   matching the "11/10 slots" warning already decided under "Slot
   capacity mechanic" — reuse whatever visual treatment
   `getWoundsStyle()`/`getGoldStyle()` in `CombatantRow.tsx` use for their
   own warning states, if any exist, rather than inventing a new one).

2. **Add / adjust-quantity — new `client/Prompts/ItemPrompt.tsx`,
   directly mirroring `TagPrompt.tsx`'s structure, borrowing Gold's signed
   delta field.** One prompt handles three cases with one form:
   - **Fields:** `itemName` (text, autofocus, same
     `AutocompleteTextInput` component `TagPrompt.tsx:51-55` uses —
     autocomplete against the combatant's existing item names is a nice
     free reuse, not a requirement); `stackable` (boolean toggle, default
     `true`, using the same eye-slash-style `Field`+`Button` toggle
     pattern `TagPrompt.tsx:56-80` uses for `tagHidden`); `quantity`
     (number field, **shown only when `stackable` is true**, default `1`
     — a signed delta, exactly like Gold's `goldAmount` in
     `ApplyGoldPrompt.tsx:40`, so typing `-5` removes 5 without a separate
     "remove quantity" prompt); `slotCost` (number field, **shown only
     when `stackable` is false**, default `1` — stackable stacks are
     always a fixed 1 slot per "Slot capacity mechanic" above, so this
     field is meaningless and hidden for them).
   - **Submit logic (the one piece with no direct precedent to copy,
     since Tags never merges rows):** for each target combatant, look for
     an existing `Items` entry with the same `Name` and `Stackable: true`.
     If found, adjust its `Quantity` by the submitted delta (remove the
     row entirely if the result is ≤ 0) instead of pushing a duplicate
     row — this is what keeps "4 torches then +3 more" a single row
     instead of two. If not found, push a new row (for `stackable`, at
     `Quantity: quantity, SlotCost: 1`; for non-stackable, at
     `Quantity: 1, SlotCost: slotCost`, always as a new row even if a
     same-named non-stackable item already exists, per "Slot capacity
     mechanic" above). Mirrors `TagPrompt.tsx:177-231`'s `onSubmit`
     shape and its `combatant.Tags.push(tag)` call, but as
     `combatant.Items.push(item)` / an in-place `Quantity` mutation.
   - Same multi-target support `TagPrompt`/`ApplyGoldPrompt` already have
     (apply to every selected combatant at once) comes for free by
     following the same factory-function shape — worth keeping since it's
     free, even though "give everyone a torch" is a less common case than
     tagging or gold changes.

3. **Command wiring — one new command, no new button-rendering code.**
   Add `CombatantCommander.AddItem` (mirrors `AddTag` at
   `CombatantCommander.tsx:635-654` almost exactly: resolve target
   combatants, build `ItemPrompt(...)`, push to `this.tracker.PromptQueue`)
   and one entry in `BuildCombatantCommandList.ts` (mirrors the `add-gold`
   entry at `BuildCombatantCommandList.ts:111-117`): `id: "add-item"`,
   `description: "Add Item"`, `actionBinding: c.AddItem`,
   `fontAwesomeIcon:` whichever of `shopping-bag`/`box-open` gets picked
   for the PlayerView indicator (keep the icon consistent between the
   command button and the indicator). Renders automatically through the
   existing generic `<Commands />` / `CommandButton` machinery in
   `CombatantRow.tsx:498-543` — no new button component needed.

4. **Interactive summary in `CombatantDetails.tsx` — revised after build,
   inline-editable rather than read-only.** Initially built as a
   read-only summary mirroring the Tags block
   (`tags.length > 0 && (...)` at `CombatantDetails.tsx:187-198`), the
   same way Gold has no `CombatantDetails.tsx` presence at all (only
   `CombatantRow.tsx` and PlayerView). Revised per user request to instead
   mirror the *other* half of the Notes pattern: `CurrentNotes` supports
   inline `[5/5]`-style counters via `TextEnricher`/`Counter.tsx`
   (`client/TextEnricher/Counter.tsx`) that are directly clickable in the
   details panel with no prompt needed. `Counter`'s own contract
   (`current`/`maximum`/`onChange`) doesn't fit item quantities (no
   natural authored max), so a new `ItemDetails` component
   (`CombatantDetails.tsx`, next to `TagDetails`) was built instead of
   reusing `Counter` directly: each stackable item's quantity is a plain
   `<input type="number">` (uncontrolled, `onBlur` commits), and every row
   gets a remove (`×`) button, both calling `Combatant.ApplyItemChange` /
   `Combatant.RemoveItem` directly (no `CommandContext` indirection
   needed here, since `CombatantDetails` already holds the live
   `Combatant`, unlike `CombatantRow.tsx` which only has a serialized
   `CombatantState`). Adding a *brand-new* item type still goes through
   `ItemPrompt` (there's no existing row to click into) — this is
   additive to the row-level `Items.tsx` chips and `ItemPrompt`, not a
   replacement.

5. **`Combatant.ts` additions (ties into the "Key difference" points
   below):** an `Items: ko.ObservableArray<InventoryItem>` observable
   declared alongside `Tags`; `AddItem`/`RemoveItem` methods mutating it
   with `.push()`/`.remove()` the same way `Tags.push(tag)` is called
   directly today (no dedicated method currently wraps that call — check
   whether to add one for symmetry with `RemoveTagFromCombatant`, which
   *does* have a dedicated method, or keep pushing directly as `Tags`
   does); entries in `GetState()` and `processCombatantState()`; the
   `Items.subscribe(...)` sync block already speced under "Key
   difference" point 4.

## Key difference to investigate: gold is a scalar, inventory is a list

Every existing scalar resource (gold, hit dice, wounds, mana) is a single
number per combatant. An inventory is a *collection* of distinct item
rows. `Tags` (see "Architecture recap" above) is the closer precedent for
the list-shaped parts of this, but it's still simpler than inventory (no
per-row quantity or slot cost). These are the remaining open questions:

1. **Shape of an item — decided, first version.** `Name: string`,
   `Stackable: boolean`, `Quantity: number` (meaningful for stackable
   entries; implicitly 1 for non-stackable), and `SlotCost: number` (see
   "Slot capacity mechanic" above — fixed at 1 for a stackable stack,
   variable per entry for non-stackable items). No `description`/
   `equipped`/`attunement` in v1 — deliberately kept minimal. An item
   library with predefined slot costs is a longer-term idea (see "Future:
   item library" below), not part of this field shape now.
2. **Storage shape — decided.** An array field
   `Items?: InventoryItem[]` on *both* `CombatantState` and
   `PersistentCharacter`, exactly mirroring how `CurrentGold?` (and every
   other resource) appears on both — see "Decided scope" above. A
   separate synced entity type (a shared item library) is explicitly a
   future idea, not this v1 field — see "Future: item library" below.
3. **Mutation model.** Existing scalar resources use `ApplyXChange(amount)`
   — a single delta on a single number. `Tags` is the better template for
   inventory specifically, since it's already list-shaped: the UI mutates
   `Combatant.Tags` as a whole array (add/remove an entry), and the
   existing `Tags.subscribe(...)` in `AttachToPersistentCharacterLibrary()`
   just re-sends the whole current array on any change — no per-operation
   sync method needed. Inventory's `Combatant.ts` methods
   (`AddItem`, `RemoveItem`, `ApplyItemQuantityChange`) should each mutate
   the `Items` observable array directly, the same way `Tags` methods
   (find them in `Combatant.ts` for the exact call shape) mutate `Tags`.
4. **Sync to PersistentCharacter — resolved by the `Tags` precedent.**
   Add an `Items.subscribe(async items => { ... })` block to
   `AttachToPersistentCharacterLibrary()`, patterned directly on the
   existing `Tags.subscribe(...)` block
   ([Combatant.ts:196-206](client/Combatant/Combatant.ts#L196-L206)): the
   default `.subscribe()` (not `arrayChange`) already proves sufficient
   for a list field in this codebase, since `Tags` uses it today. No
   special array-diffing subscription is needed.
5. **PlayerView reveal semantics — decided, and simpler than gold's.**
   No `RevealedItems` duplicate list needed. See "PlayerView surfaces"
   above: the passive PlayerView shows only a derived full/not-full
   indicator, and full contents are shown only via an on-demand DM-pushed
   popup (modeled on the existing `CombatStatsPopup` mechanism) rather
   than continuously-synced revealed state.
6. **UI surface for a list vs. a scalar — designed.** See "Add / edit /
   remove item UI" above: `Tags` is the reusable list-editing precedent
   (not anything in `client/Library/Components/`), giving inventory an
   inline chip list with remove buttons plus one command-triggered add
   prompt that also handles quantity deltas, borrowing Gold's signed-delta
   field for the one thing `Tags` doesn't need.

## Proposed investigation steps

1. Read `common/CombatantState.ts` and `common/PersistentCharacter.ts` in
   full to confirm the exact optional-field convention and naming style
   (`CurrentX` / `RevealedX` / `TemporaryX`) so a new `Items?:
   InventoryItem[]` field matches on both.
2. Read the full Gold diff (commit referenced by the codebase research as
   `01e4fe23`) via `git show 01e4fe23` as the template for the five-file
   scalar-resource pattern, and read the `Tags` handling throughout
   `Combatant.ts` in full (declaration, mutation methods, `GetState()`
   entry, and the `Tags.subscribe(...)` block at
   [Combatant.ts:196-206](client/Combatant/Combatant.ts#L196-L206)) as the
   template for the list-shaped parts Gold doesn't cover. Also read
   `client/Encounter/Encounter.ts` around line 591 and
   `client/PlayerView/components/CombatStatsPopup.tsx` in full as the
   template for the DM-pushed inventory popup.
3. Search `client/` and any Nimble rules/content files for existing
   item/equipment vocabulary (`grep -ri "item\|equipment\|loot"`) to avoid
   inventing terminology that conflicts with existing rules content.
4. Read `client/InitiativeList/Tags.tsx`, `client/Prompts/TagPrompt.tsx`,
   and `CombatantCommander.tsx:635-654` (`AddTag`) in full as the direct
   templates for the new `Items.tsx`, `ItemPrompt.tsx`, and
   `CombatantCommander.AddItem` — see "Add / edit / remove item UI" above
   for the full design; this step is now "copy and adapt," not open
   research.
5. Prototype the data model change only (`CombatantState.Items?` +
   `PersistentCharacter.Items?: InventoryItem[]`) and confirm it
   round-trips through `Combatant.GetState()` /
   `processCombatantState()` and through `server/storageroutes.ts`
   save/load without server-side changes beyond the shared `common/`
   type.
6. Once the above are answered, write an implementation plan mirroring the
   five-file Gold pattern plus the `Tags`-style array mutation/sync
   methods, the `MaxInventorySlots` computed property, the passive
   full/not-full indicator (see "PlayerView surfaces" point 1 for the
   verified file list: `common/PlayerViewCombatantState.ts`,
   `ToPlayerViewCombatantState.ts`, `PlayerViewCombatant.tsx` +
   `PlayerViewCombatantHeader.tsx` + `PlayerView.tsx` for PlayerView, and
   `CombatantRow.tsx` for the matching DM-side column), the add/edit/
   remove UI (see "Add / edit / remove item UI" above for the verified
   file list: `client/InitiativeList/Items.tsx`,
   `client/Prompts/ItemPrompt.tsx`, `CombatantCommander.AddItem` +
   `BuildCombatantCommandList.ts`, and the `CombatantDetails.tsx`
   read-only summary), and the `CombatStatsPopup`-style inventory-review
   popup.
7. Render `fa-shopping-bag` and `fa-box-open` side by side at the actual
   column size used for `fa-coins` to pick the sack/chest icon before
   writing the column code — neither is a perfect match for "sack or
   chest" and it's a two-minute visual check.

## Testing approach

Follow the existing colocated-test convention: unit tests in
`client/Combatant/Combatant.test.ts` (the actual home of the new
`AddItem`/`RemoveItem`/`ApplyItemQuantityChange` methods and the
`MaxInventorySlots` computed — not `PersistentCharacter.test.tsx`, which
tests the Library/`SaveEncounterPrompt` flow, not a resource class),
covering serialization round-trip and the `AttachToPersistentCharacterLibrary`
sync (`Tags.subscribe` is the existing test to pattern-match for the list
case). No server-side test changes should be needed if the new field is a
plain part of the existing entity documents — confirm this by checking
`server/dbconnection.test.ts` for any schema validation that would need
updating. The inventory-review popup should get a test modeled on however
`CombatStatsPopup`/`"combat stats"` is currently tested (check
`server/sockets.test.ts` for a relay-event precedent to copy).

## Future: item library

Long-term idea, explicitly out of scope for v1: a predefined item library
(shared across characters, each entry carrying a canonical `SlotCost` and
possibly `Stackable` default) that the add-item UI could pick from instead
of the player typing a free-text name and slot cost every time. Worth
revisiting once v1 (free-text entries, per "Shape of an item" above) is
built and it's clear how much duplicate typing/inconsistent slot-costing
actually happens in practice — pursue it "unless too complicated," i.e.
only if a lightweight version (a flat static list, not a full CRUD library
with its own storage/sync) is enough. A full shared-library entity type
would revisit the "Storage shape" question above (point 2 under "Key
difference") and should not be assumed necessary up front.

## Status

All open product and architecture questions for a first version are now
resolved: scope (`CombatantState` + `PersistentCharacter`, mirroring
gold, editable during an active encounter), stacking/slot rules, capacity
enforcement (warning, not a block), the PlayerView indicator vs. popup
split (including its exact icon options, color, column placement, and
`"7/10"` display format), popup targeting (broadcast), first-version item
fields, and the add/edit/remove UI (a new `Items.tsx` + `ItemPrompt.tsx`
pair modeled directly on `Tags.tsx` + `TagPrompt.tsx`, with Gold's
signed-delta field borrowed for quantity changes). The `Tags` feature
turned out to be the load-bearing precedent for nearly everything list-
shaped in this plan — the sync mechanism, the interactive display, and the
add flow are all direct adaptations of existing `Tags` code, not new
patterns. The one remaining loose end is genuinely a two-minute visual
call, not a design gap: picking `fa-shopping-bag` vs. `fa-box-open` for
the icon (step 7). The plan is ready to move from investigation into the
numbered steps under "Proposed investigation steps" above.


## Feedback

- [x] **Addressed.** spacing of inventory in centercolumn and player view
  seems different than other existing columns — root cause: every sibling
  column (`combatant__wounds`, `combatant__gold`, etc.) has explicit
  `width`/`flex-basis`/`margin-left`/`grid-area` CSS; the new inventory
  columns had none. Added matching rules for `.combatant__items-slots` in
  `lesscss/components/combatants.less` (including the mobile
  `grid-template`, which lists every column name explicitly) and
  `.combatant__inventory` in `lesscss/pages/player-view.less`.
- [x] **Addressed.** in centercolumn, no need to show content of the
  inventory, right side info pane is sufficient — removed the `Items.tsx`
  chip list from `CombatantRow.tsx` entirely (deleted the file and the
  now-dead `RemoveItemFromCombatant`/`RemoveItemByState` plumbing that
  only existed to support it). The "X/10" indicator column and the "Add
  Item" command icon still remain there — those aren't "content."
- [x] **Addressed.** in right side info pane, show the inventory at the
  bottom of the pane, since inventory doesn't change often, show it after
  mythic actions or whatever is lowest, with a divider in between — moved
  to the end of `CombatantDetails.tsx`, after the Notes section, with an
  `<hr />` before it.
- [x] **Addressed.** in right side info pane, show each item on its own
  line — was using the `stat-value__item` class, which has CSS that
  injects a comma between consecutive items (the same class Tags uses for
  its inline comma-separated look); switched to a `<ul>`/`<li>` list so
  each item renders as its own block-level line.
- [x] **Addressed.** in right side info pane, quantity box is quite big,
  is smaller possible? — added
  `.c-combatant-details__item-quantity { width: 3em; }`; it was previously
  unstyled, using the browser's default (wide) `<input type="number">`
  sizing.
- [ ] **Not yet addressed.** the inventory pop up, how to make it
  disappear from DM view? / possible to show inventory also for the DM in
  DM view, like how spells info appear, with a check box to make it
  disappear? — current behavior only explained so far (the popup is
  PlayerView-only; dismissing it today means the player clicks the dimmed
  overlay, same limitation the existing "Post-Combat Breakdown" popup
  has). The actual ask now has two parts still to design: (1) a DM-side
  view of the inventory in the DM's own tracker UI, referencing however
  "spells info" is currently displayed there as the pattern to match —
  needs investigation into what that comparison points at before this can
  be scoped; (2) a checkbox-driven dismiss control. Needs a follow-up
  design pass before implementation.
- [x] **Addressed.** the show inventory icon, use the brown bag icon —
  changed the `show-inventory` command's `fontAwesomeIcon` from `"eye"` to
  `"shopping-bag"`, matching Add Item and the slots indicator.
- [x] **Addressed.** Right side info pane, between mythic actions and
  inventory section, there is now 2 dividers visible with nothing in
  between, is it needed instead of 1 divider? — confirmed by reading
  `client/Components/StatBlock.tsx`: each power-type section (Traits,
  Actions, ..., Mythic Actions) ends with its own trailing `<hr />`
  (`StatBlock.tsx:182,202`), so when the Notes section in between happens
  to be empty, my new `<hr />` before Inventory landed as a literal
  adjacent DOM sibling to that one. Fixed with CSS rather than touching
  `StatBlockComponent` (which is reused in the Library preview, PlayerView,
  etc. — safer not to change its divider logic there): added
  `hr + hr { display: none; }` to `lesscss/improved-initiative.less`,
  which hides any `<hr>` immediately following another one regardless of
  which components produced them, current or future.
- [x] **Addressed.** left command pane toggle, the shopping bag icon, can
  it be shown after the hit dice toggle? — moved the `add-item` command
  entry in `BuildCombatantCommandList.ts` from right after `add-tag` to
  right after `toggle-reveal-hit-dice`.
- [x] **Addressed.** right side info pane, inventory, the slots like
  (2/12) is being shown on the next line, can it be shown on the same
  line, which will then looks like Inventory (2/12), like Current HP
  does — root cause confirmed: `lesscss/layout/base.less:38-40` sets
  `div { display: flex; flex-direction: column; }` globally for every
  `<div>` in the app, which is why every other stat-label/stat-value pair
  (`c-combatant-details__hp`, `__resources-wounds`, `__tags`) needs an
  explicit `flex-direction: row` override — the Inventory header div never
  got one. Split "Inventory (2/12 slots)" into its own
  `c-combatant-details__items-header` div (sibling to the `<ul>`, so the
  item list still stacks below rather than also going inline) and gave
  it `flex-direction: row`.
- [x] **Answered — no chest icon exists either.** is there like an icon
  that looks like a sack instead of shopping bag, if so, that is more
  line with fantasy setting / instead of an open crate or shopping bag as
  icon, what else is possible? is there a treasure chest icon? — checked
  the bundled FontAwesome 5.15.4 Free set again specifically for
  "treasure", "pouch", "satchel", "knapsack", "duffel": none exist. Full
  available set for this shape of icon: `shopping-bag`, `box-open`, `box`,
  `briefcase`, `suitcase`, `toolbox` — none are a true sack or chest.
  Switched from `shopping-bag` to `box-open` (an open crate) as the
  better fantasy-appropriate fit among what's actually available,
  everywhere the icon appears (Add Item, Show Inventory to Players, the
  slots-indicator column in both views). A real sack/chest icon would
  need a custom SVG, not a FontAwesome swap.
- [x] **Addressed — and this is now a real reveal/hide feature, not just
  styling.** can inventory column by default be hidden, like gold? / did
  I miss how to control to show or hide inventory column like gold? —
  confirmed Gold has a genuine per-combatant `RevealedGold` flag
  (`Combatant.ts`), defaulting to hidden-from-players for newly-created
  combatants (`RevealedGold: false` in both `Encounter.ts` combatant
  constructors) until the DM explicitly reveals it via the
  `toggle-reveal-gold` command. Inventory had no equivalent — the passive
  indicator was unconditionally visible to players whenever a combatant
  is a player character. Built the same mechanism for real: a
  `RevealedItems?: boolean` field on `CombatantState`
  (`common/CombatantState.ts`), a `Combatant.RevealedItems` observable
  defaulting to hidden for new combatants (mirroring `RevealedGold`
  exactly, including the `?? true` legacy-compat fallback in
  `processCombatantState` for old saves lacking the field), a
  `CombatantViewModel.ToggleRevealedItems()` / `CombatantCommander
  .ToggleRevealedItems` pair with matching event-log lines and Metrics
  events, a `toggle-reveal-items` command (grouped with the other
  `toggle-reveal-*` commands), a "Hidden from Player View" badge on the
  DM row's slots indicator (mirroring Gold's), and
  `GetInventoryDisplay`/`GetInventoryColor` in `ToPlayerViewCombatantState.ts`
  now gate on `RevealedItems()` the same way `GetGoldDisplay` gates on
  `RevealedGold()`. This also caught and fixed a real pre-existing bug
  found while making this change: `Encounter.AddCombatantFromPersistentCharacter`
  never carried `Items` over from the saved `PersistentCharacter` into the
  new combatant's `CombatantState` (unlike `Tags`, which did) — re-adding
  a saved character to a new encounter was silently dropping their
  inventory.
- [x] **Addressed — real bug found, not just cosmetic.** the ui to add
  item, why is the check box for stackable so big? / when adding an item,
  default is stackable unchecked — both had the same root cause: `.prompt`
  (the shared wrapper every prompt form uses, in
  `lesscss/components/prompts.less`) has a blanket
  `input, select { width: 12rem; height: 2.6rem; padding: ...; }` rule.
  `type="number"` already gets narrowed to `4rem` right below it, but
  nothing narrowed `type="checkbox"` — so the stackable checkbox was being
  stretched into a 12rem × 2.6rem box, which is very likely also why it
  read as "unchecked": the native checkmark doesn't scale with a box that
  size, so it renders as a barely-visible mark lost inside a large empty
  rectangle rather than an obviously-checked box. (The underlying Formik
  binding itself was already correct — `initialValues.stackable: true`
  with `<Field type="checkbox">` is Formik's standard, documented pattern,
  confirmed against the installed Formik 2.4.5 — this was a CSS problem,
  not a logic bug.) Added an `input[type="checkbox"]` override inside
  `.prompt` sizing it to `1rem` with an explicit `accent-color`, matching
  the sizing convention already used for the "has taken a turn" checkbox
  in `CombatantRow.tsx`.
 

## Feedback outside this plan's scope

- **for Wounds, in DM View, if a player starts with 0/5 wounds, hide the
  max amount while a player has no wounds. And while 0, is there a
  lighter color, so it looks more faded?** — this is about the Wounds
  column, not Inventory. Not touched — flagging here rather than folding
  it into inventory work, since it's a different feature area. Say the
  word if you want this picked up as its own task.