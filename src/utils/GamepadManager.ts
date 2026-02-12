/**
 * 2-player gamepad abstraction.
 * Polls browser Gamepad API each frame; up to 2 pads in player slots.
 */

export interface GamepadState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;        // A / right trigger
  mineEdge: boolean;    // B / left trigger (rising edge only)
  pause: boolean;       // Start / Y (rising edge only)
}

const DEADZONE = 0.15;

export class GamepadManager {
  // Maps pad index → player slot (0 or 1). -1 = unassigned.
  private padSlots: Map<number, number> = new Map();
  // Previous button state for edge detection
  private prevMine: [boolean, boolean] = [false, false];
  private prevPause: [boolean, boolean] = [false, false];

  /** Call once per frame to poll all gamepads. Returns state per player slot. */
  poll(): [GamepadState | null, GamepadState | null] {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const result: [GamepadState | null, GamepadState | null] = [null, null];

    // Auto-assign pads to slots
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      if (!this.padSlots.has(pad.index)) {
        // Assign to first free slot
        const used = new Set(this.padSlots.values());
        if (!used.has(0)) this.padSlots.set(pad.index, 0);
        else if (!used.has(1)) this.padSlots.set(pad.index, 1);
      }
    }

    // Remove disconnected
    for (const [idx] of this.padSlots) {
      const pad = pads[idx];
      if (!pad || !pad.connected) {
        this.padSlots.delete(idx);
      }
    }

    for (const [idx, slot] of this.padSlots) {
      const pad = pads[idx];
      if (!pad) continue;

      const stickX = pad.axes[0] ?? 0;
      const stickY = pad.axes[1] ?? 0;

      // D-pad buttons (standard mapping): 12=up, 13=down, 14=left, 15=right
      const dpadUp = pad.buttons[12]?.pressed ?? false;
      const dpadDown = pad.buttons[13]?.pressed ?? false;
      const dpadLeft = pad.buttons[14]?.pressed ?? false;
      const dpadRight = pad.buttons[15]?.pressed ?? false;

      const up = stickY < -DEADZONE || dpadUp;
      const down = stickY > DEADZONE || dpadDown;
      const left = stickX < -DEADZONE || dpadLeft;
      const right = stickX > DEADZONE || dpadRight;

      // Fire: A button (0) or right trigger (7)
      const fire = (pad.buttons[0]?.pressed ?? false) ||
                   (pad.buttons[7]?.value ?? 0) > 0.1;

      // Mine: B button (1) or left trigger (6) — edge triggered
      const mineRaw = (pad.buttons[1]?.pressed ?? false) ||
                      (pad.buttons[6]?.value ?? 0) > 0.1;
      const mineEdge = mineRaw && !this.prevMine[slot];
      this.prevMine[slot] = mineRaw;

      // Pause: Start button (9) or Y button (3) — edge triggered
      const pauseRaw = (pad.buttons[9]?.pressed ?? false) ||
                       (pad.buttons[3]?.pressed ?? false);
      const pause = pauseRaw && !this.prevPause[slot];
      this.prevPause[slot] = pauseRaw;

      result[slot] = { up, down, left, right, fire, mineEdge, pause };
    }

    return result;
  }
}
