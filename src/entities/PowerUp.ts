import Phaser from 'phaser';
import * as C from '../constants';
import { PowerUpType, ALL_POWER_UP_TYPES } from '../types';

const POWER_UP_COLORS: Record<PowerUpType, number> = {
  [PowerUpType.DoubleShotUpgrade]: 0xff8800,
  [PowerUpType.TripleShotUpgrade]: 0xffff00,
  [PowerUpType.LaserBeam]: 0x00ffff,
  [PowerUpType.MineAmmo]: 0xff0000,
  [PowerUpType.ShieldRestore]: 0x0000ff,
  [PowerUpType.ExtraLife]: 0xff00ff,
  [PowerUpType.Invincibility]: 0xffffff,
};

const POWER_UP_LABELS: Record<PowerUpType, string> = {
  [PowerUpType.DoubleShotUpgrade]: '2x',
  [PowerUpType.TripleShotUpgrade]: '3x',
  [PowerUpType.LaserBeam]: 'L',
  [PowerUpType.MineAmmo]: 'M',
  [PowerUpType.ShieldRestore]: 'S',
  [PowerUpType.ExtraLife]: '1UP',
  [PowerUpType.Invincibility]: 'I',
};

// Map power-up type to spritesheet frame
function frameForType(type: PowerUpType): number {
  switch (type) {
    case PowerUpType.DoubleShotUpgrade:
    case PowerUpType.TripleShotUpgrade:
      return 0;
    case PowerUpType.LaserBeam:
    case PowerUpType.MineAmmo:
      return 1;
    case PowerUpType.ShieldRestore:
    case PowerUpType.ExtraLife:
      return 2;
    case PowerUpType.Invincibility:
      return 3;
  }
}

export class PowerUp extends Phaser.GameObjects.Sprite {
  powerUpType: PowerUpType;
  vy = C.POWER_UP_SPEED; // downward in Phaser
  label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PowerUpType) {
    super(scene, x, y, 'power-up', frameForType(type));
    this.powerUpType = type;

    this.setScale(3.0);
    this.setDepth(C.Z_POWER_UP);
    this.setName('powerUp');
    this.setTint(POWER_UP_COLORS[type]);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(20 / 3); // 20 pixels at scale 3

    // Label
    this.label = scene.add.text(x, y, POWER_UP_LABELS[type], {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px', // 6pt * scale 3
      color: '#ffffff',
    }).setOrigin(0.5, 0.5).setDepth(C.Z_POWER_UP + 1);

    // Bob tween
    scene.tweens.add({
      targets: this,
      y: y + 8,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Glow tween
    scene.tweens.add({
      targets: this,
      alpha: { from: 0.7, to: 1.0 },
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
  }

  updatePowerUp(dt: number): void {
    this.y += this.vy * dt;
    this.label.setPosition(this.x, this.y);
  }

  isOffScreen(): boolean {
    return this.y > C.SCREEN_HEIGHT + 50;
  }

  destroyPowerUp(): void {
    this.label.destroy();
    this.destroy();
  }

  static randomType(): PowerUpType {
    return ALL_POWER_UP_TYPES[Phaser.Math.Between(0, ALL_POWER_UP_TYPES.length - 1)];
  }

  static randomWeaponType(): PowerUpType {
    const types = [PowerUpType.DoubleShotUpgrade, PowerUpType.TripleShotUpgrade, PowerUpType.LaserBeam];
    return types[Phaser.Math.Between(0, types.length - 1)];
  }

  static getColor(type: PowerUpType): number {
    return POWER_UP_COLORS[type];
  }
}
