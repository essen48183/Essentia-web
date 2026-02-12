import Phaser from 'phaser';
import * as C from '../constants';
import { ProjectileOwner } from '../types';

export class Projectile extends Phaser.GameObjects.Sprite {
  owner: ProjectileOwner;
  vx: number;
  vy: number;
  isLaser: boolean;
  damage: number;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame: number,
              owner: ProjectileOwner, vx: number, vy: number, damage: number, isLaser = false) {
    super(scene, x, y, texture, frame);
    this.owner = owner;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.isLaser = isLaser;

    this.setDepth(C.Z_PROJECTILE);
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  updatePosition(dt: number): void {
    if (this.isLaser) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  isOffScreen(): boolean {
    return this.y > C.SCREEN_HEIGHT + 50 || this.y < -50 ||
           this.x > C.SCREEN_WIDTH + 50 || this.x < -50;
  }

  static createPlayerBolt(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number): Projectile {
    const p = new Projectile(scene, x, y, 'player-bolt-tex', 0,
      ProjectileOwner.Player, vx, vy, 25);
    p.setScale(2.5);
    p.setName('playerProjectile');
    p.setBlendMode(Phaser.BlendModes.ADD);
    const body = p.body as Phaser.Physics.Arcade.Body;
    body.setCircle(C.PLAYER_BOLT_RADIUS);
    return p;
  }

  static createPlayerLaser(scene: Phaser.Scene, x: number, spawnY: number): Projectile {
    const laserHeight = spawnY;

    // Use player-bolt-tex as a placeholder texture (we'll hide it), the visual is from a graphics rect
    const p = new Projectile(scene, x, spawnY / 2, 'player-bolt-tex', 0,
      ProjectileOwner.Player, 0, 0, 50, true);
    p.setName('playerProjectile');
    p.setVisible(false); // hide sprite, use graphics instead

    const body = p.body as Phaser.Physics.Arcade.Body;
    body.setSize(8, Math.max(1, laserHeight));
    body.setOffset(-4, -laserHeight / 2);

    // Draw laser beam as a graphics rectangle
    const gfx = scene.add.graphics();
    gfx.setDepth(C.Z_PROJECTILE);
    gfx.setBlendMode(Phaser.BlendModes.ADD);
    gfx.fillStyle(0x00ffff, 0.8);
    gfx.fillRect(x - 4, 0, 8, spawnY);
    (p as any)._laserGfx = gfx;

    // Auto-destroy after laser duration
    scene.time.delayedCall(C.LASER_DURATION * 1000, () => {
      if (p.active) {
        scene.tweens.add({
          targets: gfx,
          alpha: 0,
          duration: 50,
          onComplete: () => {
            gfx.destroy();
            p.destroy();
          },
        });
      } else {
        gfx.destroy();
      }
    });

    return p;
  }

  static createEnemyBolt(scene: Phaser.Scene, x: number, y: number, targetX: number, targetY: number, speed: number): Projectile {
    const boltSpeed = speed > 0 ? speed : C.ENEMY_PROJECTILE_SPEED;
    const dx = targetX - x;
    const dy = targetY - y;
    const length = Math.sqrt(dx * dx + dy * dy);
    let vx: number, vy: number;
    if (length > 0) {
      vx = (dx / length) * boltSpeed;
      vy = (dy / length) * boltSpeed;
    } else {
      vx = 0;
      vy = boltSpeed;
    }

    const p = new Projectile(scene, x, y, 'enemy-projectile', 0,
      ProjectileOwner.Enemy, vx, vy, 15);
    p.setScale(2.0);
    p.setName('enemyProjectile');
    p.play('enemy-projectile-anim');

    const body = p.body as Phaser.Physics.Arcade.Body;
    body.setSize(12, 12);

    // Rotate to face direction
    p.setRotation(Math.atan2(dy, dx) + Math.PI / 2);

    return p;
  }

  static createBossBolt(scene: Phaser.Scene, x: number, y: number, targetX: number, targetY: number): Projectile {
    const dx = targetX - x;
    const dy = targetY - y;
    const length = Math.sqrt(dx * dx + dy * dy);
    let vx: number, vy: number;
    if (length > 0) {
      vx = (dx / length) * C.BOSS_BOLT_SPEED;
      vy = (dy / length) * C.BOSS_BOLT_SPEED;
    } else {
      vx = 0;
      vy = C.BOSS_BOLT_SPEED;
    }

    const p = new Projectile(scene, x, y, 'boss-bolt', 0,
      ProjectileOwner.Boss, vx, vy, 25);
    p.setScale(3.0);
    p.setName('enemyProjectile');

    const body = p.body as Phaser.Physics.Arcade.Body;
    body.setSize(16, 8);

    p.setRotation(Math.atan2(dy, dx) + Math.PI / 2);

    return p;
  }
}

export class SpaceMine extends Phaser.GameObjects.Sprite {
  vx: number;
  vy: number;
  damage = C.MINE_DAMAGE;
  lifetime = C.MINE_LIFETIME;
  elapsedTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number) {
    super(scene, x, y, 'mine-tex', 0);
    this.vx = vx;
    this.vy = vy;

    this.setScale(2.5);
    this.setDepth(C.Z_PROJECTILE);
    this.setName('mine');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(C.MINE_RADIUS);

    // Blinking core tween
    scene.tweens.add({
      targets: this,
      alpha: { from: 1.0, to: 0.7 },
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
  }

  updateMine(dt: number): boolean {
    this.elapsedTime += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Drag
    this.vx *= 0.995;
    this.vy *= 0.995;

    // Blink faster near expiry
    if (this.lifetime - this.elapsedTime < 2.0) {
      this.alpha = (Math.sin(this.elapsedTime * 10) + 1) / 2 * 0.5 + 0.5;
    }

    return this.elapsedTime >= this.lifetime;
  }

  isOffScreen(): boolean {
    return this.y > C.SCREEN_HEIGHT + 50 || this.y < -50 ||
           this.x > C.SCREEN_WIDTH + 50 || this.x < -50;
  }
}
