import * as React from "react";
import {
  ToggleFullscreen,
  FullscreenSupported
} from "../../Commands/ToggleFullscreen";

export const PlayerViewCombatantHeader = (props: {
  portraitColumnVisible: boolean;
  acColumnVisible: boolean;
  manaColumnVisible: boolean;
  resourcesColumnVisible: boolean;
  hitDiceColumnVisible: boolean;
  woundsColumnVisible: boolean;
  goldColumnVisible: boolean;
}) => (
  <div className="combatant--header">
    {props.portraitColumnVisible && <div className="combatant__portrait" />}
    <div className="combatant__name">Name</div>
    <div className="combatant__hp">
      <span className="fas fa-heart" style={{ color: "rgb(200,30,30)" }} />
    </div>
    {props.manaColumnVisible && (
      <div className="combatant__mana">
        <span className="fas fa-tint" style={{ color: "rgb(0,120,220)" }} />
      </div>
    )}
    {props.resourcesColumnVisible && (
      <div className="combatant__resources">
        <span className="fas fa-bolt" style={{ color: "rgb(30,150,60)" }} />
      </div>
    )}
    {props.hitDiceColumnVisible && (
      <div className="combatant__hitdice">
        <span className="fas fa-dice-d6" style={{ color: "rgb(230,120,20)" }} />
      </div>
    )}
    {props.woundsColumnVisible && (
      <div className="combatant__wounds">
        <span
          className="fas fa-skull-crossbones"
          style={{ color: "rgb(200,30,180)" }}
        />
      </div>
    )}
    {props.acColumnVisible && (
      <div className="combatant__ac">
        <span className="fas fa-shield-alt" />
      </div>
    )}
    {props.goldColumnVisible && (
      <div className="combatant__gold">
        <span className="fas fa-coins" style={{ color: "rgb(212,163,42)" }} />
      </div>
    )}
    <div className="combatant__tags">
      <span className="fas fa-tag" />
      {FullscreenSupported() && (
        <span
          className="fas fa-expand fa-clickable"
          title="Toggle Full Screen"
          onClick={ToggleFullscreen}
        />
      )}
    </div>
  </div>
);
