import Phaser from 'phaser';
import * as C from '../constants';

const ASTEROID_TEXTURES = ['asteroid-01', 'asteroid-02', 'asteroid-03', 'asteroid-04', 'asteroid-05'];

export class Asteroid extends Phaser.GameObjects.Sprite {
  hp: number;
  isLarge: boolean;
  vx: number;
  vy: number;
  rotationSpeed: number;
  scoreValue: number;

  constructor(scene: Phaser.Scene, x: number, y: number, large = true) {
    const texName = ASTEROID_TEXTURES[Phaser.Math.Between(0, ASTEROID_TEXTURES.length - 1)];
    super(scene, x, y, texName);

    this.isLarge = large;
    const scale = large ? 2.5 : 1.5;
    this.setScale(scale);
    this.setDepth(C.Z_ASTEROID);
    this.setName('asteroid');

    this.hp = large ? 3 : 1;
    this.scoreValue = large ? 50 : 20;

    this.vx = Phaser.Math.FloatBetween(-30, 30);
    this.vy = C.ASTEROID_SPEED; // downward in Phaser
    this.rotationSpeed = Phaser.Math.FloatBetween(-C.ASTEROID_ROTATION_SPEED, C.ASTEROID_ROTATION_SPEED);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const radius = Math.max(this.width, this.height) * 0.4;
    body.setCircle(radius, (this.width - radius * 2) / 2, (this.height - radius * 2) / 2);
  }

  updateAsteroid(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotationSpeed * dt;
  }

  takeDamage(): boolean {
    this.hp--;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.clearTint();
    });
    return this.hp <= 0;
  }

  spawnSmallAsteroids(): { x: number; y: number; vx: number; vy: number }[] {
    if (!this.isLarge) return [];
    const results: { x: number; y: number; vx: number; vy: number }[] = [];
    for (let i = 0; i < 2; i++) {
      results.push({
        x: this.x + Phaser.Math.Between(-20, 20),
        y: this.y + Phaser.Math.Between(-20, 20),
        vx: Phaser.Math.FloatBetween(-60, 60),
        vy: C.ASTEROID_SPEED * Phaser.Math.FloatBetween(0.8, 1.2),
      });
    }
    return results;
  }

  isOffScreen(): boolean {
    return this.y > C.SCREEN_HEIGHT + 100;
  }
}
