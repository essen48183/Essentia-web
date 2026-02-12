import Phaser from 'phaser';
import * as C from '../constants';
import { ControlAction, ALL_CONTROL_ACTIONS, CONTROL_ACTION_LABELS } from '../types';
import { ControlSettings, keyCodeName } from '../utils/ControlSettings';
import { HighScoreManager } from '../utils/HighScoreManager';
import { GamepadManager, GamepadState } from '../utils/GamepadManager';

const MENU_ITEMS = ['START 1 PLAYER', 'START 2 PLAYER', 'CONTROLS', 'FULLSCREEN'];
const FONT = '"Courier New", monospace';

export class MenuScene extends Phaser.Scene {
  private starfield: Phaser.GameObjects.Rectangle[] = [];
  private menuIndex = 0;
  private menuLabels: Phaser.GameObjects.Text[] = [];
  private cursorLabel!: Phaser.GameObjects.Text;

  // Controls overlay
  private showingControls = false;
  private controlsContainer: Phaser.GameObjects.Container | null = null;
  private controlsPlayerIndex = 0;
  private controlsActionIndex = 0;
  private controlsKeyLabels: Phaser.GameObjects.Text[][] = [[], []];
  private waitingForKey = false;
  private controlsCursor: Phaser.GameObjects.Text | null = null;

  private gamepadManager = new GamepadManager();
  private prevGpUp = false;
  private prevGpDown = false;
  private prevGpA = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x050514);
    this.starfield = [];
    this.menuLabels = [];
    this.showingControls = false;
    this.controlsContainer = null;
    this.menuIndex = 0;

    this.setupStarfield();
    this.setupTitle();
    this.setupHighScores();
    this.setupMenu();
    this.setupKeyboard();
  }

  // ---- Starfield ----
  private setupStarfield(): void {
    for (let i = 0; i < 80; i++) {
      const star = this.add.rectangle(
        Phaser.Math.Between(0, C.SCREEN_WIDTH),
        Phaser.Math.Between(0, C.SCREEN_HEIGHT),
        2, 2, 0xffffff
      );
      star.setAlpha(Phaser.Math.FloatBetween(0.3, 1.0));
      star.setDepth(-10);
      this.starfield.push(star);

      this.tweens.add({
        targets: star,
        alpha: { from: Phaser.Math.FloatBetween(0.2, 0.5), to: Phaser.Math.FloatBetween(0.7, 1.0) },
        duration: Phaser.Math.Between(500, 2000),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  // ---- Title ----
  private setupTitle(): void {
    const title = this.add.text(C.SCREEN_WIDTH / 2, 80, 'ESSENTIA', {
      fontFamily: FONT, fontSize: '56px', color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: title,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      onUpdate: (_tween, target) => {
        const t = (_tween.progress < 0.5) ? _tween.progress * 2 : (1 - _tween.progress) * 2;
        const r = Math.round(255 * (1 - t * 0.7));
        const g = Math.round(255 * (1 - t * 0.2));
        const b = 255;
        target.setColor(`rgb(${r},${g},${b})`);
      },
    });

    this.add.text(C.SCREEN_WIDTH / 2, 110, 'A Classic Arcade Space Shooter Experience', {
      fontFamily: FONT, fontSize: '16px', color: '#b3b3b3',
    }).setOrigin(0.5, 0.5);
  }

  // ---- High Scores ----
  private setupHighScores(): void {
    const scores = HighScoreManager.highScores();
    const headerY = 170;
    this.add.text(C.SCREEN_WIDTH / 2, headerY, '- HIGH SCORES -', {
      fontFamily: FONT, fontSize: '22px', color: '#ffff00',
    }).setOrigin(0.5, 0.5);

    const startY = headerY + 35;
    const spacing = 30;

    if (scores.length === 0) {
      this.add.text(C.SCREEN_WIDTH / 2, startY + spacing, 'NO SCORES YET', {
        fontFamily: FONT, fontSize: '16px', color: '#666666',
      }).setOrigin(0.5, 0.5);
    } else {
      for (let i = 0; i < scores.length; i++) {
        const y = startY + i * spacing;
        const entry = scores[i];
        const color = i === 0 ? '#ffff00' : '#ffffff';

        this.add.text(C.SCREEN_WIDTH / 2 - 130, y, `${i + 1}.`, {
          fontFamily: FONT, fontSize: '18px', color,
        }).setOrigin(1, 0.5);

        this.add.text(C.SCREEN_WIDTH / 2 - 110, y, entry.name, {
          fontFamily: FONT, fontSize: '18px', color: i === 0 ? '#ffff00' : '#00ffff',
        }).setOrigin(0, 0.5);

        this.add.text(C.SCREEN_WIDTH / 2 + 150, y, String(entry.score).padStart(8, '0'), {
          fontFamily: FONT, fontSize: '18px', color: i === 0 ? '#ffff00' : '#00ff00',
        }).setOrigin(1, 0.5);
      }
    }
  }

  // ---- Menu ----
  private setupMenu(): void {
    const startY = C.SCREEN_HEIGHT - 180;
    const spacing = 36;

    this.menuLabels = [];
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const label = this.add.text(C.SCREEN_WIDTH / 2, startY + i * spacing, MENU_ITEMS[i], {
        fontFamily: FONT, fontSize: '24px', color: i === 0 ? '#00ff00' : '#ffffff',
      }).setOrigin(0.5, 0.5).setInteractive();
      label.on('pointerdown', () => { this.menuIndex = i; this.updateMenuCursor(); this.menuSelect(); });
      this.menuLabels.push(label);
    }

    this.cursorLabel = this.add.text(C.SCREEN_WIDTH / 2 - 130, startY, '\u25B8', {
      fontFamily: FONT, fontSize: '24px', color: '#00ff00',
    }).setOrigin(1, 0.5);

    this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT - 20, 'Arrows/D-pad: navigate | Enter/A: select | Gamepad supported', {
      fontFamily: FONT, fontSize: '13px', color: '#666666',
    }).setOrigin(0.5, 0.5);

    this.updateMenuCursor();
  }

  private updateMenuCursor(): void {
    const target = this.menuLabels[this.menuIndex];
    this.cursorLabel.setPosition(target.x - 130, target.y);
    for (let i = 0; i < this.menuLabels.length; i++) {
      this.menuLabels[i].setColor(i === this.menuIndex ? '#00ff00' : '#ffffff');
    }
  }

  private menuNavigate(dir: number): void {
    this.menuIndex = (this.menuIndex + dir + MENU_ITEMS.length) % MENU_ITEMS.length;
    this.updateMenuCursor();
  }

  private menuSelect(): void {
    switch (this.menuIndex) {
      case 0: this.startGame(1); break;
      case 1: this.startGame(2); break;
      case 2: this.showControlsOverlay(); break;
      case 3: this.toggleFullscreen(); break;
    }
  }

  private startGame(playerCount: number): void {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { playerCount });
    });
  }

  private toggleFullscreen(): void {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    } else {
      this.scale.startFullscreen();
    }
  }

  // ---- Controls Overlay ----
  private showControlsOverlay(): void {
    this.showingControls = true;
    this.controlsPlayerIndex = 0;
    this.controlsActionIndex = 0;
    this.waitingForKey = false;

    this.controlsContainer = this.add.container(0, 0).setDepth(200);

    // Dim background
    const dim = this.add.rectangle(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2,
      C.SCREEN_WIDTH, C.SCREEN_HEIGHT, 0x000000, 0.85);
    this.controlsContainer.add(dim);

    const title = this.add.text(C.SCREEN_WIDTH / 2, 60, 'CONTROLS', {
      fontFamily: FONT, fontSize: '36px', color: '#ffffff',
    }).setOrigin(0.5, 0.5);
    this.controlsContainer.add(title);

    // Column headers
    const colX = [C.SCREEN_WIDTH / 2 - 180, C.SCREEN_WIDTH / 2 + 120];
    const headers = ['P1', 'P2'];
    const hColors = ['#00ffff', '#00ff00'];
    for (let i = 0; i < 2; i++) {
      const h = this.add.text(colX[i], 110, headers[i], {
        fontFamily: FONT, fontSize: '22px', color: hColors[i],
      }).setOrigin(0.5, 0.5);
      this.controlsContainer.add(h);
    }

    // Action rows
    const actionX = C.SCREEN_WIDTH / 2 - 340;
    const startY = 160;
    const rowSpacing = 36;

    this.controlsKeyLabels = [[], []];

    for (let ai = 0; ai < ALL_CONTROL_ACTIONS.length; ai++) {
      const action = ALL_CONTROL_ACTIONS[ai];
      const y = startY + ai * rowSpacing;

      const actionLabel = this.add.text(actionX, y, CONTROL_ACTION_LABELS[action], {
        fontFamily: FONT, fontSize: '18px', color: '#999999',
      }).setOrigin(0, 0.5);
      this.controlsContainer.add(actionLabel);

      for (let pi = 0; pi < 2; pi++) {
        const controls = ControlSettings.controls(pi);
        const keys = [controls.upKey, controls.downKey, controls.leftKey, controls.rightKey, controls.fireKey, controls.mineKey];
        const keyLabel = this.add.text(colX[pi], y, keyCodeName(keys[ai]), {
          fontFamily: FONT, fontSize: '18px', color: '#ffffff',
        }).setOrigin(0.5, 0.5);
        this.controlsContainer.add(keyLabel);
        this.controlsKeyLabels[pi].push(keyLabel);
      }
    }

    // Cursor
    this.controlsCursor = this.add.text(0, 0, '[', {
      fontFamily: FONT, fontSize: '18px', color: '#ffff00',
    }).setOrigin(1, 0.5);
    this.controlsContainer.add(this.controlsCursor);

    // Reset defaults
    const resetY = startY + ALL_CONTROL_ACTIONS.length * rowSpacing + 20;
    const resetLabel = this.add.text(C.SCREEN_WIDTH / 2, resetY, '[ RESET DEFAULTS ]', {
      fontFamily: FONT, fontSize: '18px', color: '#ff0000',
    }).setOrigin(0.5, 0.5);
    this.controlsContainer.add(resetLabel);

    // Hint
    const hint = this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT - 30,
      'Arrows: navigate | Enter: rebind | R: reset | ESC: back', {
      fontFamily: FONT, fontSize: '13px', color: '#666666',
    }).setOrigin(0.5, 0.5);
    this.controlsContainer.add(hint);

    this.updateControlsCursor();
  }

  private updateControlsCursor(): void {
    if (!this.controlsCursor) return;
    const targetLabel = this.controlsKeyLabels[this.controlsPlayerIndex]?.[this.controlsActionIndex];
    if (!targetLabel) return;
    this.controlsCursor.setPosition(targetLabel.x - 50, targetLabel.y);

    for (let pi = 0; pi < 2; pi++) {
      for (let ai = 0; ai < this.controlsKeyLabels[pi].length; ai++) {
        const label = this.controlsKeyLabels[pi][ai];
        if (pi === this.controlsPlayerIndex && ai === this.controlsActionIndex) {
          label.setColor(this.waitingForKey ? '#ff0000' : '#ffff00');
        } else {
          label.setColor('#ffffff');
        }
      }
    }
  }

  private refreshControlsLabels(): void {
    for (let pi = 0; pi < 2; pi++) {
      const controls = ControlSettings.controls(pi);
      const keys = [controls.upKey, controls.downKey, controls.leftKey, controls.rightKey, controls.fireKey, controls.mineKey];
      for (let ai = 0; ai < keys.length; ai++) {
        if (this.controlsKeyLabels[pi][ai]) {
          this.controlsKeyLabels[pi][ai].setText(keyCodeName(keys[ai]));
        }
      }
    }
  }

  private closeControlsOverlay(): void {
    this.showingControls = false;
    this.waitingForKey = false;
    this.controlsContainer?.destroy();
    this.controlsContainer = null;
    this.controlsKeyLabels = [[], []];
    this.controlsCursor = null;
  }

  // ---- Keyboard ----
  private setupKeyboard(): void {
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (this.showingControls) {
        this.handleControlsKeyDown(event);
        return;
      }
      switch (event.keyCode) {
        case Phaser.Input.Keyboard.KeyCodes.UP: this.menuNavigate(-1); break;
        case Phaser.Input.Keyboard.KeyCodes.DOWN: this.menuNavigate(1); break;
        case Phaser.Input.Keyboard.KeyCodes.ENTER:
        case Phaser.Input.Keyboard.KeyCodes.SPACE:
          this.menuSelect(); break;
      }
    });
  }

  private handleControlsKeyDown(event: KeyboardEvent): void {
    if (this.waitingForKey) {
      if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.ESC) {
        this.waitingForKey = false;
        this.refreshControlsLabels();
        this.updateControlsCursor();
        return;
      }
      const action = ALL_CONTROL_ACTIONS[this.controlsActionIndex];
      ControlSettings.setKey(event.keyCode, this.controlsPlayerIndex, action);
      this.waitingForKey = false;
      this.refreshControlsLabels();
      this.updateControlsCursor();
      return;
    }

    switch (event.keyCode) {
      case Phaser.Input.Keyboard.KeyCodes.ESC:
        this.closeControlsOverlay(); break;
      case Phaser.Input.Keyboard.KeyCodes.UP:
        this.controlsActionIndex = (this.controlsActionIndex - 1 + ALL_CONTROL_ACTIONS.length) % ALL_CONTROL_ACTIONS.length;
        this.updateControlsCursor(); break;
      case Phaser.Input.Keyboard.KeyCodes.DOWN:
        this.controlsActionIndex = (this.controlsActionIndex + 1) % ALL_CONTROL_ACTIONS.length;
        this.updateControlsCursor(); break;
      case Phaser.Input.Keyboard.KeyCodes.LEFT:
        this.controlsPlayerIndex = 0;
        this.updateControlsCursor(); break;
      case Phaser.Input.Keyboard.KeyCodes.RIGHT:
        this.controlsPlayerIndex = 1;
        this.updateControlsCursor(); break;
      case Phaser.Input.Keyboard.KeyCodes.ENTER:
        this.waitingForKey = true;
        this.controlsKeyLabels[this.controlsPlayerIndex][this.controlsActionIndex].setText('PRESS KEY...');
        this.updateControlsCursor(); break;
      case Phaser.Input.Keyboard.KeyCodes.R:
        ControlSettings.resetToDefaults();
        this.refreshControlsLabels();
        this.updateControlsCursor(); break;
    }
  }

  // ---- Update ----
  update(): void {
    // Scroll starfield
    for (const star of this.starfield) {
      star.y += 0.3;
      if (star.y > C.SCREEN_HEIGHT + 5) {
        star.y = -5;
        star.x = Phaser.Math.Between(0, C.SCREEN_WIDTH);
      }
    }

    // Gamepad polling
    if (!this.showingControls) {
      const [gp] = this.gamepadManager.poll();
      if (gp) {
        if (gp.up && !this.prevGpUp) this.menuNavigate(-1);
        if (gp.down && !this.prevGpDown) this.menuNavigate(1);
        if (gp.fire && !this.prevGpA) this.menuSelect();
        this.prevGpUp = gp.up;
        this.prevGpDown = gp.down;
        this.prevGpA = gp.fire;
      }
    }
  }
}
