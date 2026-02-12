import Phaser from 'phaser';
import * as C from '../constants';
import { HighScoreManager } from '../utils/HighScoreManager';
import { GamepadManager } from '../utils/GamepadManager';

const FONT = '"Courier New", monospace';

export class GameOverScene extends Phaser.Scene {
  private finalScore = 0;
  private stageReached = 1;
  private playerCount = 1;

  private isEnteringName = false;
  private enteredName = '';
  private maxNameLength = 8;
  private nameLabel!: Phaser.GameObjects.Text;
  private cursorLabel!: Phaser.GameObjects.Text;

  private gamepadManager = new GamepadManager();
  private prevGpA = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { finalScore?: number; stageReached?: number; playerCount?: number }): void {
    this.finalScore = data.finalScore ?? 0;
    this.stageReached = data.stageReached ?? 1;
    this.playerCount = data.playerCount ?? 1;
    this.isEnteringName = false;
    this.enteredName = '';
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0d0000);
    this.cameras.main.fadeIn(500);

    if (HighScoreManager.isHighScore(this.finalScore)) {
      this.isEnteringName = true;
      this.setupHighScoreEntry();
    } else {
      this.setupDisplay();
    }

    this.setupKeyboard();
  }

  // ---- High Score Entry ----

  private setupHighScoreEntry(): void {
    this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 - 180, 'GAME OVER', {
      fontFamily: FONT, fontSize: '52px', color: '#ff0000',
    }).setOrigin(0.5, 0.5);

    this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 - 120, `SCORE: ${this.finalScore}`, {
      fontFamily: FONT, fontSize: '28px', color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    const newHigh = this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 - 60, 'NEW HIGH SCORE!', {
      fontFamily: FONT, fontSize: '28px', color: '#ffff00',
    }).setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: newHigh,
      alpha: { from: 0.3, to: 1.0 },
      duration: 400,
      yoyo: true,
      repeat: -1,
    });

    this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 + 10, 'ENTER YOUR NAME:', {
      fontFamily: FONT, fontSize: '20px', color: '#b3b3b3',
    }).setOrigin(0.5, 0.5);

    this.nameLabel = this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 + 60, '________', {
      fontFamily: FONT, fontSize: '36px', color: '#00ffff',
    }).setOrigin(0.5, 0.5);

    this.cursorLabel = this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 + 60, '_', {
      fontFamily: FONT, fontSize: '36px', color: '#ffffff',
    }).setOrigin(0, 0.5);

    this.tweens.add({
      targets: this.cursorLabel,
      alpha: { from: 0, to: 1 },
      duration: 300,
      yoyo: true,
      repeat: -1,
    });

    this.updateNameDisplay();

    this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 + 130, 'TYPE NAME (8 MAX) | ENTER TO CONFIRM | DELETE TO ERASE', {
      fontFamily: FONT, fontSize: '14px', color: '#666666',
    }).setOrigin(0.5, 0.5);
  }

  private updateNameDisplay(): void {
    const padded = this.enteredName.padEnd(this.maxNameLength, '_');
    this.nameLabel.setText(padded);

    // Position cursor
    const charWidth = 21.6;
    const textWidth = charWidth * this.maxNameLength;
    const startX = C.SCREEN_WIDTH / 2 - textWidth / 2;
    const cursorX = startX + charWidth * this.enteredName.length;
    this.cursorLabel.setPosition(cursorX, C.SCREEN_HEIGHT / 2 + 60);
    this.cursorLabel.setVisible(this.enteredName.length < this.maxNameLength);
  }

  private confirmName(): void {
    if (!this.isEnteringName) return;
    this.isEnteringName = false;
    const name = this.enteredName || 'AAA';
    HighScoreManager.addScore(name, this.finalScore);
    this.goToMenu();
  }

  // ---- Normal Display ----

  private setupDisplay(): void {
    this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 - 100, 'GAME OVER', {
      fontFamily: FONT, fontSize: '52px', color: '#ff0000',
    }).setOrigin(0.5, 0.5);

    this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 - 30, `FINAL SCORE: ${this.finalScore}`, {
      fontFamily: FONT, fontSize: '28px', color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 + 10, `STAGE REACHED: ${this.stageReached}`, {
      fontFamily: FONT, fontSize: '20px', color: '#ffff00',
    }).setOrigin(0.5, 0.5);

    const restart = this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 + 80, '[ PLAY AGAIN ]', {
      fontFamily: FONT, fontSize: '24px', color: '#00ff00',
    }).setOrigin(0.5, 0.5).setInteractive();
    restart.on('pointerdown', () => this.restartGame());

    this.tweens.add({
      targets: restart,
      alpha: { from: 0.5, to: 1.0 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    const menu = this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 + 130, '[ MENU ]', {
      fontFamily: FONT, fontSize: '20px', color: '#999999',
    }).setOrigin(0.5, 0.5).setInteractive();
    menu.on('pointerdown', () => this.goToMenu());
  }

  // ---- Input ----

  private setupKeyboard(): void {
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (this.isEnteringName) {
        this.handleNameInput(event);
        return;
      }

      if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.ENTER ||
          event.keyCode === Phaser.Input.Keyboard.KeyCodes.SPACE) {
        this.restartGame();
      } else if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.ESC) {
        this.goToMenu();
      }
    });
  }

  private handleNameInput(event: KeyboardEvent): void {
    if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.ENTER) {
      this.confirmName();
      return;
    }

    if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.BACKSPACE) {
      if (this.enteredName.length > 0) {
        this.enteredName = this.enteredName.slice(0, -1);
        this.updateNameDisplay();
      }
      return;
    }

    if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.ESC) {
      this.confirmName();
      return;
    }

    // Character input
    const key = event.key.toUpperCase();
    if (key.length === 1 && /[A-Z0-9]/.test(key) && this.enteredName.length < this.maxNameLength) {
      this.enteredName += key;
      this.updateNameDisplay();
    }
  }

  // ---- Navigation ----

  private restartGame(): void {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { playerCount: this.playerCount });
    });
  }

  private goToMenu(): void {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MenuScene');
    });
  }

  // ---- Update ----

  update(): void {
    const [gp] = this.gamepadManager.poll();
    if (gp) {
      if (gp.fire && !this.prevGpA) {
        if (this.isEnteringName) {
          this.confirmName();
        } else {
          this.restartGame();
        }
      }
      this.prevGpA = gp.fire;
    }
  }
}
