export function ApplyResourcePoolChange(
  current: number,
  temporary: number,
  max: number,
  amount: number,
  positiveAmountIncreasesCurrent = false
): { current: number; temporary: number } {
  const sign = positiveAmountIncreasesCurrent ? 1 : -1;
  let newCurrent = current;
  let newTemporary = temporary;

  // amount > 0 is always the "temporary pool absorbs first" case, regardless
  // of sign — for Mana/Resources/Hit Dice that's spending, for Wounds it's
  // an incoming wound (temporary wounds are protection that absorb it).
  if (amount > 0) {
    newTemporary -= amount;
    if (newTemporary < 0) {
      newCurrent += sign * -newTemporary;
      newTemporary = 0;
    }
  } else {
    newCurrent += sign * amount;
  }

  if (newCurrent < 0) {
    newCurrent = 0;
  }
  if (newCurrent > max) {
    newCurrent = max;
  }

  return { current: newCurrent, temporary: newTemporary };
}
