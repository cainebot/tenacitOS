/** Module-level flag: true when Space/middle-click temporary hand is active.
 *  Written by BuilderScene, read by BuilderInputHandler. */
export let isTempHandActive = false
export function setTempHand(v: boolean) { isTempHandActive = v }
