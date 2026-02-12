import Phaser from 'phaser';
import * as C from '../constants';
import { BossPhase } from '../types';

export interface BossSpawnResult {
  bolts: { x: number; y: number; targetX: number; targetY: number }[];
  minions: { typeIndex: number; x: number; y: number; difficulty: number }[];
}

export class BossShip extends Phaser.GameObjects.Sprite {
  hp: number;
  maxHP: number;
  currentPhase = BossPhase.BoltVolley;
  phaseTimer = 0;
  phaseDuration = 5.0;
  lastFireTime = 0;
  elapsedTime = 0;
  isDefeated = false;
  stageNumber: number;

  private minionSpawnCount = 0;
  private maxMinionsPerPhase = 3;
  private lastMinionSpawnTime = 0;

  constructor(scene: Phaser.Scene, stageNumber: number) {
    super(scene, 0, 0, 'boss', 0);
    this.stageNumber = stageNumber;

    this.setScale(2.5);
    this.setDepth(C.Z_ENEMY + 5);
    this.setName('boss');

    const hpMultiplier = 1.0 + (stageNumber - 1) * 0.5;
    this.hp = C.BOSS_HEALTH_BASE * hpMultiplier;
    this.maxHP = this.hp;

    this.play('boss-anim');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(192 * 0.8, 144 * 0.6);
  }

  updateBoss(dt: number, playerX: number, playerY: number): BossSpawnResult {
    this.elapsedTime += dt;
    this.phaseTimer += dt;

    // Horizontal drift
    const driftX = Math.sin(this.elapsedTime * 0.5) * C.BOSS_SPEED * dt * 2;
    this.x += driftX;
    this.x = Phaser.Math.Clamp(this.x, this.displayWidth / 2, C.SCREEN_WIDTH - this.displayWidth / 2);

    // Phase cycling
    if (this.phaseTimer >= this.phaseDuration) {
      this.phaseTimer = 0;
      this.minionSpawnCount = 0;
      switch (this.currentPhase) {
        case BossPhase.BoltVolley: this.currentPhase = BossPhase.RaySweep; break;
        case BossPhase.RaySweep: this.currentPhase = BossPhase.MinionSpawn; break;
        case BossPhase.MinionSpawn: this.currentPhase = BossPhase.BoltVolley; break;
      }
    }

    const result: BossSpawnResult = { bolts: [], minions: [] };
    const fireY = this.y + this.displayHeight / 2; // below boss in Phaser

    switch (this.currentPhase) {
      case BossPhase.BoltVolley: {
        const interval = 0.65;
        if (this.elapsedTime - this.lastFireTime >= interval) {
          this.lastFireTime = this.elapsedTime;
          const spread = [-60, -30, 0, 30, 60];
          for (const offsetX of spread) {
            result.bolts.push({
              x: this.x, y: fireY,
              targetX: playerX + offsetX, targetY: playerY,
            });
          }
        }
        break;
      }

      case BossPhase.RaySweep: {
        const interval = 0.25;
        if (this.elapsedTime - this.lastFireTime >= interval) {
          this.lastFireTime = this.elapsedTime;
          const sweepX = this.x + Math.sin(this.phaseTimer * 4) * 200;
          result.bolts.push({
            x: this.x, y: fireY,
            targetX: sweepX, targetY: C.SCREEN_HEIGHT,
          });
        }
        break;
      }

      case BossPhase.MinionSpawn: {
        const spawnInterval = 1.5;
        if (this.elapsedTime - this.lastMinionSpawnTime >= spawnInterval && this.minionSpawnCount < this.maxMinionsPerPhase) {
          this.lastMinionSpawnTime = this.elapsedTime;
          this.minionSpawnCount++;
          result.minions.push({
            typeIndex: Phaser.Math.Between(0, 2),
            x: this.x + Phaser.Math.Between(-100, 100),
            y: this.y + 50,
            difficulty: 0.7,
          });
        }
        // Also fire occasionally
        const fireInterval = 1.2;
        if (this.elapsedTime - this.lastFireTime >= fireInterval) {
          this.lastFireTime = this.elapsedTime;
          result.bolts.push({
            x: this.x, y: fireY,
            targetX: playerX, targetY: playerY,
          });
        }
        break;
      }
    }

    return result;
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    this.setTintFill(0xff0000);
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.clearTint();
    });
    return this.hp <= 0;
  }
}
