import Phaser from 'phaser';
import * as C from '../constants';
import { WeaponType } from '../types';

const FONT = '"Courier New", monospace';

export class HUD {
  private scene: Phaser.Scene;
  private playerCount: number;

  // Shared
  private scoreLabel!: Phaser.GameObjects.Text;
  private stageLabel!: Phaser.GameObjects.Text;
  private comboLabel!: Phaser.GameObjects.Text;

  // Boss health bar
  private bossHealthBg!: Phaser.GameObjects.Rectangle;
  private bossHealthFill!: Phaser.GameObjects.Rectangle;
  private bossHealthLabel!: Phaser.GameObjects.Text;
  private bossContainer!: Phaser.GameObjects.Container;

  // Per-player
  private livesContainers: Phaser.GameObjects.Container[] = [];
  private shieldBarBgs: Phaser.GameObjects.Rectangle[] = [];
  private shieldBarFills: Phaser.GameObjects.Rectangle[] = [];
  private weaponLabels: Phaser.GameObjects.Text[] = [];
  private mineAmmoLabels: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, playerCount: number) {
    this.scene = scene;
    this.playerCount = playerCount;

    this.setupScoreLabel();
    this.setupStageLabel();
    this.setupBossHealthBar();
    this.setupComboLabel();

    if (playerCount === 1) {
      this.setupSinglePlayerHUD();
    } else {
      this.setupTwoPlayerHUD();
    }
  }

  // ---- Shared ----

  private setupScoreLabel(): void {
    this.scoreLabel = this.scene.add.text(20, 15, 'SCORE: 0', {
      fontFamily: FONT, fontSize: '18px', color: '#ffffff',
    }).setOrigin(0, 0).setDepth(C.Z_HUD);
  }

  private setupStageLabel(): void {
    this.stageLabel = this.scene.add.text(C.SCREEN_WIDTH - 20, 15, 'STAGE 1', {
      fontFamily: FONT, fontSize: '16px', color: '#ffff00',
    }).setOrigin(1, 0).setDepth(C.Z_HUD);
  }

  private setupBossHealthBar(): void {
    const barW = 400, barH = 14;
    this.bossContainer = this.scene.add.container(0, 0).setDepth(C.Z_HUD).setAlpha(0);

    this.bossHealthBg = this.scene.add.rectangle(
      C.SCREEN_WIDTH / 2 - barW / 2, 45, barW, barH, 0x333333, 0.8
    ).setOrigin(0, 0.5);
    this.bossContainer.add(this.bossHealthBg);

    this.bossHealthFill = this.scene.add.rectangle(
      C.SCREEN_WIDTH / 2 - barW / 2, 45, barW, barH, 0xff0000
    ).setOrigin(0, 0.5);
    this.bossContainer.add(this.bossHealthFill);

    this.bossHealthLabel = this.scene.add.text(C.SCREEN_WIDTH / 2, 45, 'BOSS', {
      fontFamily: FONT, fontSize: '10px', color: '#ffffff',
    }).setOrigin(0.5, 0.5).setDepth(1);
    this.bossContainer.add(this.bossHealthLabel);
  }

  private setupComboLabel(): void {
    this.comboLabel = this.scene.add.text(C.SCREEN_WIDTH / 2, 70, '', {
      fontFamily: FONT, fontSize: '20px', color: '#ff8800',
    }).setOrigin(0.5, 0.5).setDepth(C.Z_HUD).setAlpha(0);
  }

  // ---- 1P ----

  private setupSinglePlayerHUD(): void {
    // Lives - bottom left
    const lc = this.scene.add.container(20, C.SCREEN_HEIGHT - 30).setDepth(C.Z_HUD);
    this.livesContainers.push(lc);
    this.updateLives(C.PLAYER_MAX_LIVES, 0);

    // Shield bar - bottom center
    const barW = 200, barH = 12;
    const bgX = C.SCREEN_WIDTH / 2 - barW / 2;
    const bgY = C.SCREEN_HEIGHT - 25;

    const bg = this.scene.add.rectangle(bgX, bgY, barW, barH, 0x333333, 0.8).setOrigin(0, 0.5).setDepth(C.Z_HUD);
    this.shieldBarBgs.push(bg);

    const fill = this.scene.add.rectangle(bgX, bgY, barW, barH, 0x00ffff).setOrigin(0, 0.5).setDepth(C.Z_HUD);
    this.shieldBarFills.push(fill);

    this.scene.add.text(C.SCREEN_WIDTH / 2, bgY, 'SHIELD', {
      fontFamily: FONT, fontSize: '10px', color: '#ffffff',
    }).setOrigin(0.5, 0.5).setDepth(C.Z_HUD + 1);

    // Weapon - bottom right
    const wLabel = this.scene.add.text(C.SCREEN_WIDTH - 20, C.SCREEN_HEIGHT - 20, 'SINGLE', {
      fontFamily: FONT, fontSize: '12px', color: '#00ff00',
    }).setOrigin(1, 1).setDepth(C.Z_HUD);
    this.weaponLabels.push(wLabel);

    // Mine ammo
    const mLabel = this.scene.add.text(C.SCREEN_WIDTH - 20, C.SCREEN_HEIGHT - 38, 'MINES: 0', {
      fontFamily: FONT, fontSize: '12px', color: '#ff0000',
    }).setOrigin(1, 1).setDepth(C.Z_HUD);
    this.mineAmmoLabels.push(mLabel);
  }

  // ---- 2P ----

  private setupTwoPlayerHUD(): void {
    const barW = 140, barH = 10;

    for (let pi = 0; pi < 2; pi++) {
      const isLeft = pi === 0;
      const baseX = isLeft ? 20 : C.SCREEN_WIDTH - 20;
      const alignX = isLeft ? 0 : 1;

      // Player label
      this.scene.add.text(baseX, C.SCREEN_HEIGHT - 62, `P${pi + 1}`, {
        fontFamily: FONT, fontSize: '14px', color: pi === 0 ? '#00ffff' : '#00ff00',
      }).setOrigin(alignX, 1).setDepth(C.Z_HUD);

      // Lives
      const lcX = isLeft ? 50 : C.SCREEN_WIDTH - 50;
      const lc = this.scene.add.container(lcX, C.SCREEN_HEIGHT - 66).setDepth(C.Z_HUD);
      this.livesContainers.push(lc);

      // Shield bar
      const bgX = isLeft ? baseX : C.SCREEN_WIDTH - 20 - barW;
      const bgY = C.SCREEN_HEIGHT - 48;
      const bg = this.scene.add.rectangle(bgX, bgY, barW, barH, 0x333333, 0.8).setOrigin(0, 0.5).setDepth(C.Z_HUD);
      this.shieldBarBgs.push(bg);

      const fill = this.scene.add.rectangle(bgX, bgY, barW, barH, 0x00ffff).setOrigin(0, 0.5).setDepth(C.Z_HUD);
      this.shieldBarFills.push(fill);

      this.scene.add.text(bgX + barW / 2, bgY, 'SHIELD', {
        fontFamily: FONT, fontSize: '8px', color: '#ffffff',
      }).setOrigin(0.5, 0.5).setDepth(C.Z_HUD + 1);

      // Weapon
      const wLabel = this.scene.add.text(baseX, C.SCREEN_HEIGHT - 20, 'SINGLE', {
        fontFamily: FONT, fontSize: '11px', color: '#00ff00',
      }).setOrigin(alignX, 1).setDepth(C.Z_HUD);
      this.weaponLabels.push(wLabel);

      // Mine ammo
      const mLabel = this.scene.add.text(baseX, C.SCREEN_HEIGHT - 34, 'MINES: 0', {
        fontFamily: FONT, fontSize: '11px', color: '#ff0000',
      }).setOrigin(alignX, 1).setDepth(C.Z_HUD);
      this.mineAmmoLabels.push(mLabel);
    }

    this.updateLives(C.PLAYER_MAX_LIVES, 0);
    this.updateLives(C.PLAYER_MAX_LIVES, 1);
  }

  // ---- Updates ----

  updateScore(score: number): void {
    this.scoreLabel.setText(`SCORE: ${score}`);
  }

  updateStage(stage: number, wave: number): void {
    this.stageLabel.setText(`STAGE ${stage} - WAVE ${wave}`);
  }

  updateLives(lives: number, playerIndex: number): void {
    if (playerIndex >= this.livesContainers.length) return;
    const lc = this.livesContainers[playerIndex];
    lc.removeAll(true);

    const isLeft = this.playerCount === 1 || playerIndex === 0;
    for (let i = 0; i < lives; i++) {
      const icon = this.scene.add.rectangle(
        isLeft ? i * 20 : -i * 20, 0, 12, 16, 0x00ff00
      );
      lc.add(icon);
    }
  }

  updateShield(shield: number, max: number, playerIndex: number): void {
    if (playerIndex >= this.shieldBarFills.length) return;
    const fill = this.shieldBarFills[playerIndex];
    const bg = this.shieldBarBgs[playerIndex];
    const ratio = shield / max;
    fill.setDisplaySize(bg.displayWidth * ratio, bg.displayHeight);

    if (ratio > 0.6) fill.setFillStyle(0x00ffff);
    else if (ratio > 0.3) fill.setFillStyle(0xffff00);
    else fill.setFillStyle(0xff0000);
  }

  showBossHealth(show: boolean): void {
    this.scene.tweens.add({
      targets: this.bossContainer,
      alpha: show ? 1 : 0,
      duration: 300,
    });
  }

  updateBossHealth(hp: number, maxHP: number): void {
    const ratio = hp / maxHP;
    this.bossHealthFill.setDisplaySize(this.bossHealthBg.displayWidth * ratio, this.bossHealthBg.displayHeight);
  }

  showCombo(multiplier: number): void {
    if (multiplier > 1) {
      this.comboLabel.setText(`x${multiplier} COMBO!`);
      this.comboLabel.setAlpha(1);
      this.scene.tweens.add({
        targets: this.comboLabel,
        alpha: 0,
        delay: 800,
        duration: 300,
      });
    }
  }

  updateWeapon(weapon: WeaponType, playerIndex: number): void {
    if (playerIndex >= this.weaponLabels.length) return;
    const label = this.weaponLabels[playerIndex];
    switch (weapon) {
      case WeaponType.Single: label.setText('SINGLE').setColor('#ffffff'); break;
      case WeaponType.Double: label.setText('DOUBLE').setColor('#ff8800'); break;
      case WeaponType.Triple: label.setText('TRIPLE').setColor('#ffff00'); break;
      case WeaponType.Laser: label.setText('LASER').setColor('#00ffff'); break;
    }
  }

  updateMineAmmo(count: number, playerIndex: number): void {
    if (playerIndex >= this.mineAmmoLabels.length) return;
    const label = this.mineAmmoLabels[playerIndex];
    label.setText(`MINES: ${count}`);
    label.setColor(count > 0 ? '#ff0000' : '#666666');
  }

  showStageTitle(stage: number): void {
    const title = this.scene.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 - 20, `STAGE ${stage}`, {
      fontFamily: FONT, fontSize: '48px', color: '#ffffff',
    }).setOrigin(0.5, 0.5).setDepth(C.Z_HUD + 5).setAlpha(0);

    const subtitle = this.scene.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 + 30, 'GET READY!', {
      fontFamily: FONT, fontSize: '24px', color: '#ffff00',
    }).setOrigin(0.5, 0.5).setDepth(C.Z_HUD + 5).setAlpha(0);

    for (const t of [title, subtitle]) {
      this.scene.tweens.add({
        targets: t,
        alpha: { from: 0, to: 1 },
        duration: 300,
        hold: 2000,
        yoyo: true,
        onComplete: () => t.destroy(),
      });
    }
  }

  showStageClear(bonus: number): void {
    const title = this.scene.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 - 20, 'STAGE CLEAR!', {
      fontFamily: FONT, fontSize: '40px', color: '#00ff00',
    }).setOrigin(0.5, 0.5).setDepth(C.Z_HUD + 5).setAlpha(0);

    const bonusLabel = this.scene.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 + 30, `BONUS: +${bonus}`, {
      fontFamily: FONT, fontSize: '24px', color: '#ffff00',
    }).setOrigin(0.5, 0.5).setDepth(C.Z_HUD + 5).setAlpha(0);

    for (const t of [title, bonusLabel]) {
      this.scene.tweens.add({
        targets: t,
        alpha: { from: 0, to: 1 },
        duration: 300,
        hold: 2500,
        yoyo: true,
        onComplete: () => t.destroy(),
      });
    }
  }
}
