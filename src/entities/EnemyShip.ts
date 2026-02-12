import Phaser from 'phaser';
import * as C from '../constants';
import { EnemyDefinition, EnemyMovementPattern } from '../types';

export const ENEMY_DEFINITIONS: EnemyDefinition[] = [
  // Types 0-2: spritesheet enemies
  { textureName: 'enemy-01', frameWidth: 48, frameHeight: 48, frameCount: 5, isSpriteSheet: true,
    hp: 30, speed: 100, fireRate: 2.0, pattern: EnemyMovementPattern.Straight, scoreValue: 100, scale: 3.0, projectileSpeed: 0 },
  { textureName: 'enemy-02', frameWidth: 48, frameHeight: 48, frameCount: 4, isSpriteSheet: true,
    hp: 40, speed: 80, fireRate: 1.5, pattern: EnemyMovementPattern.Zigzag, scoreValue: 150, scale: 3.0, projectileSpeed: 0 },
  { textureName: 'enemy-03', frameWidth: 48, frameHeight: 48, frameCount: 4, isSpriteSheet: true,
    hp: 50, speed: 90, fireRate: 1.8, pattern: EnemyMovementPattern.SineWave, scoreValue: 200, scale: 3.0, projectileSpeed: 0 },
  // Types 3-7: individual sprite enemies
  { textureName: 'ss-enemy1', frameWidth: 0, frameHeight: 0, frameCount: 1, isSpriteSheet: false,
    hp: 25, speed: 120, fireRate: 3.25, pattern: EnemyMovementPattern.Straight, scoreValue: 80, scale: 2.5, projectileSpeed: 200 },
  { textureName: 'ss-enemy2', frameWidth: 0, frameHeight: 0, frameCount: 1, isSpriteSheet: false,
    hp: 35, speed: 90, fireRate: 2.35, pattern: EnemyMovementPattern.DiveBomb, scoreValue: 120, scale: 2.5, projectileSpeed: 200 },
  { textureName: 'ss-enemy3', frameWidth: 0, frameHeight: 0, frameCount: 1, isSpriteSheet: false,
    hp: 45, speed: 70, fireRate: 1.95, pattern: EnemyMovementPattern.Strafe, scoreValue: 180, scale: 2.5, projectileSpeed: 200 },
  { textureName: 'ss-enemy4', frameWidth: 0, frameHeight: 0, frameCount: 1, isSpriteSheet: false,
    hp: 55, speed: 110, fireRate: 1.55, pattern: EnemyMovementPattern.Zigzag, scoreValue: 200, scale: 2.5, projectileSpeed: 200 },
  { textureName: 'ss-enemy5', frameWidth: 0, frameHeight: 0, frameCount: 1, isSpriteSheet: false,
    hp: 60, speed: 100, fireRate: 1.3, pattern: EnemyMovementPattern.SineWave, scoreValue: 250, scale: 2.5, projectileSpeed: 200 },
];

export class EnemyShip extends Phaser.GameObjects.Sprite {
  hp: number;
  maxHP: number;
  moveSpeed: number;
  fireRate: number;
  pattern: EnemyMovementPattern;
  scoreValue: number;
  lastFireTime = 0;
  elapsedTime = 0;
  startX = 0;
  difficultyMultiplier: number;
  projectileSpeed: number;

  constructor(scene: Phaser.Scene, typeIndex: number, difficultyMultiplier = 1.0) {
    const def = ENEMY_DEFINITIONS[typeIndex % ENEMY_DEFINITIONS.length];
    super(scene, 0, 0, def.textureName, 0);

    this.difficultyMultiplier = difficultyMultiplier;
    this.setScale(def.scale);
    this.setDepth(C.Z_ENEMY);
    this.setName('enemy');

    // Rotate 180 so enemies face downward — use flipY for Phaser
    this.setFlipY(true);

    this.hp = def.hp * difficultyMultiplier;
    this.maxHP = this.hp;
    this.moveSpeed = def.speed * difficultyMultiplier;
    this.fireRate = def.fireRate / difficultyMultiplier;
    this.pattern = def.pattern;
    this.scoreValue = Math.round(def.scoreValue * difficultyMultiplier);
    this.projectileSpeed = def.projectileSpeed > 0 ? def.projectileSpeed : C.ENEMY_PROJECTILE_SPEED;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const bw = (def.isSpriteSheet ? def.frameWidth : this.width) * 0.7;
    const bh = (def.isSpriteSheet ? def.frameHeight : this.height) * 0.7;
    body.setSize(bw, bh);

    // Play animation if spritesheet type
    if (def.isSpriteSheet) {
      this.play(`${def.textureName}-anim`);
    }
  }

  updateEnemy(dt: number): void {
    this.elapsedTime += dt;

    switch (this.pattern) {
      case EnemyMovementPattern.Straight:
        this.y += this.moveSpeed * dt;
        break;

      case EnemyMovementPattern.Zigzag:
        this.y += this.moveSpeed * dt;
        this.x = this.startX + Math.sin(this.elapsedTime * 2.0) * 100;
        break;

      case EnemyMovementPattern.SineWave:
        this.y += this.moveSpeed * dt;
        this.x = this.startX + Math.sin(this.elapsedTime * 3.0) * 60;
        break;

      case EnemyMovementPattern.DiveBomb:
        this.y += this.moveSpeed * dt * (1.0 + this.elapsedTime * 0.5);
        break;

      case EnemyMovementPattern.Strafe:
        this.y += this.moveSpeed * dt * 0.3;
        this.x = this.startX + Math.sin(this.elapsedTime * 1.5) * 150;
        break;
    }
  }

  tryFire(currentTime: number, playerX: number, playerY: number): { x: number; y: number; targetX: number; targetY: number; speed: number } | null {
    if (currentTime - this.lastFireTime < this.fireRate) return null;
    this.lastFireTime = currentTime;
    return {
      x: this.x,
      y: this.y,
      targetX: playerX + Phaser.Math.Between(-30, 30),
      targetY: playerY,
      speed: this.projectileSpeed,
    };
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.active) this.clearTint();
    });
    return this.hp <= 0;
  }

  isOffScreen(): boolean {
    return this.y > C.SCREEN_HEIGHT + 100 || this.y < -100 ||
           this.x < -100 || this.x > C.SCREEN_WIDTH + 100;
  }
}
