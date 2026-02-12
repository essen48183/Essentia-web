import Phaser from 'phaser';
import { PlayerControls, ControlAction, ALL_CONTROL_ACTIONS } from '../types';

const STORAGE_KEY_P1 = 'essentia_controls_p1';
const STORAGE_KEY_P2 = 'essentia_controls_p2';

// Default controls use Phaser KeyCodes
const DEFAULT_P1: PlayerControls = {
  upKey: Phaser.Input.Keyboard.KeyCodes.W,
  downKey: Phaser.Input.Keyboard.KeyCodes.S,
  leftKey: Phaser.Input.Keyboard.KeyCodes.A,
  rightKey: Phaser.Input.Keyboard.KeyCodes.D,
  fireKey: Phaser.Input.Keyboard.KeyCodes.TWO,
  mineKey: Phaser.Input.Keyboard.KeyCodes.ONE,
};

const DEFAULT_P2: PlayerControls = {
  upKey: Phaser.Input.Keyboard.KeyCodes.UP,
  downKey: Phaser.Input.Keyboard.KeyCodes.DOWN,
  leftKey: Phaser.Input.Keyboard.KeyCodes.LEFT,
  rightKey: Phaser.Input.Keyboard.KeyCodes.RIGHT,
  fireKey: Phaser.Input.Keyboard.KeyCodes.COMMA,
  mineKey: Phaser.Input.Keyboard.KeyCodes.M,
};

function loadControls(key: string, fallback: PlayerControls): PlayerControls {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as PlayerControls;
  } catch { /* ignore */ }
  return { ...fallback };
}

function saveControls(key: string, controls: PlayerControls): void {
  localStorage.setItem(key, JSON.stringify(controls));
}

class ControlSettingsManager {
  p1: PlayerControls;
  p2: PlayerControls;

  constructor() {
    this.p1 = loadControls(STORAGE_KEY_P1, DEFAULT_P1);
    this.p2 = loadControls(STORAGE_KEY_P2, DEFAULT_P2);
  }

  controls(playerIndex: number): PlayerControls {
    return playerIndex === 0 ? this.p1 : this.p2;
  }

  setKey(keyCode: number, playerIndex: number, action: ControlAction): void {
    this.unbindConflict(keyCode, playerIndex, action);
    const c = playerIndex === 0 ? this.p1 : this.p2;
    switch (action) {
      case ControlAction.Up: c.upKey = keyCode; break;
      case ControlAction.Down: c.downKey = keyCode; break;
      case ControlAction.Left: c.leftKey = keyCode; break;
      case ControlAction.Right: c.rightKey = keyCode; break;
      case ControlAction.Fire: c.fireKey = keyCode; break;
      case ControlAction.Mine: c.mineKey = keyCode; break;
    }
    this.save();
  }

  private unbindConflict(keyCode: number, excludePlayer: number, excludeAction: ControlAction): void {
    for (const pi of [0, 1]) {
      for (const action of ALL_CONTROL_ACTIONS) {
        if (pi === excludePlayer && action === excludeAction) continue;
        if (this.keyForAction(action, pi) === keyCode) {
          this.setKeyDirect(pi, action, 0);
        }
      }
    }
  }

  private keyForAction(action: ControlAction, player: number): number {
    const c = player === 0 ? this.p1 : this.p2;
    switch (action) {
      case ControlAction.Up: return c.upKey;
      case ControlAction.Down: return c.downKey;
      case ControlAction.Left: return c.leftKey;
      case ControlAction.Right: return c.rightKey;
      case ControlAction.Fire: return c.fireKey;
      case ControlAction.Mine: return c.mineKey;
    }
  }

  private setKeyDirect(player: number, action: ControlAction, keyCode: number): void {
    const c = player === 0 ? this.p1 : this.p2;
    switch (action) {
      case ControlAction.Up: c.upKey = keyCode; break;
      case ControlAction.Down: c.downKey = keyCode; break;
      case ControlAction.Left: c.leftKey = keyCode; break;
      case ControlAction.Right: c.rightKey = keyCode; break;
      case ControlAction.Fire: c.fireKey = keyCode; break;
      case ControlAction.Mine: c.mineKey = keyCode; break;
    }
  }

  resetToDefaults(): void {
    this.p1 = { ...DEFAULT_P1 };
    this.p2 = { ...DEFAULT_P2 };
    this.save();
  }

  save(): void {
    saveControls(STORAGE_KEY_P1, this.p1);
    saveControls(STORAGE_KEY_P2, this.p2);
  }
}

export const ControlSettings = new ControlSettingsManager();

/** Map a Phaser keyCode to a human-readable name */
export function keyCodeName(keyCode: number): string {
  // Phaser KeyCodes are browser keyCodes
  const map: Record<number, string> = {
    65: 'A', 66: 'B', 67: 'C', 68: 'D', 69: 'E', 70: 'F', 71: 'G',
    72: 'H', 73: 'I', 74: 'J', 75: 'K', 76: 'L', 77: 'M', 78: 'N',
    79: 'O', 80: 'P', 81: 'Q', 82: 'R', 83: 'S', 84: 'T', 85: 'U',
    86: 'V', 87: 'W', 88: 'X', 89: 'Y', 90: 'Z',
    48: '0', 49: '1', 50: '2', 51: '3', 52: '4', 53: '5',
    54: '6', 55: '7', 56: '8', 57: '9',
    37: 'LEFT', 38: 'UP', 39: 'RIGHT', 40: 'DOWN',
    13: 'ENTER', 32: 'SPACE', 8: 'BACKSPACE', 9: 'TAB', 27: 'ESC',
    16: 'SHIFT', 17: 'CTRL', 18: 'ALT',
    186: ';', 187: '=', 188: ',', 189: '-', 190: '.', 191: '/',
    219: '[', 220: '\\', 221: ']', 222: "'",
    0: '---',
  };
  return map[keyCode] ?? `KEY${keyCode}`;
}
