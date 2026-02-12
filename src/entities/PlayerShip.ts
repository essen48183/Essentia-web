import Phaser from 'phaser';
import * as C from '../constants';
import { WeaponType } from '../types';

export class PlayerShip extends Phaser.GameObjects.Sprite {
  readonly playerIndex: number;

  lives = C.PLAYER_MAX_LIVES;
  shield = C.PLAYER_MAX_SHIELD;
  hullHits = C.HULL_MAX_HITS;
  currentWeapon = WeaponType.Single;
  weaponTimer = 0;

  isInvincible = false;
  private lastDamageTime = 0;
  private gameTime = 0;

  // Keyboard input flags
  keyUp = false;
  keyDown = false;
  keyLeft = false;
  keyRight = false;
  isFiring = false;

  // Controller input flags
  ctrlUp = false;
  ctrlDown = false;
  ctrlLeft = false;
  ctrlRight = false;
  controllerFireHeld = false;
  controllerLeftTriggerDown = false;

  get movingUp(): boolean { return this.keyUp || this.ctrlUp; }
  get movingDown(): boolean { return this.keyDown || this.ctrlDown; }
  get movingLeft(): boolean { return this.keyLeft || this.ctrlLeft; }
  get movingRight(): boolean { return this.keyRight || this.ctrlRight; }

  currentVelocityX = 0;
  currentVelocityY = 0;

  mineAmmo = 0;
  private lastFireTime = 0;

  // Child objects
  thrustSprite: Phaser.GameObjects.Sprite | null = null;
  shieldGlow: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, playerIndex: number, textureName: string = 'player-ship') {
    super(scene, 0, 0, textureName, 0);
    this.playerIndex = playerIndex;

    this.setScale(C.PLAYER_SCALE);
    this.setDepth(C.Z_PLAYER);
    this.setName(`player${playerIndex}`);

    scene.add.existing(this);

    // Physics body
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(30, 40);
    body.setOffset((48 - 30) / 2, (48 - 40) / 2);

    this.setupThrust();
    this.setupShieldGlow();
  }

  private setupThrust(): void {
    this.thrustSprite = this.scene.add.sprite(this.x, this.y, 'player-thrust', 0);
    this.thrustSprite.setDepth(C.Z_PLAYER - 1);
    this.thrustSprite.play('thrust-anim');
    this.thrustSprite.setScale(C.PLAYER_SCALE);
  }

  private setupShieldGlow(): void {
    this.shieldGlow = this.scene.add.graphics();
    this.shieldGlow.setDepth(C.Z_PLAYER + 1);
    this.shieldGlow.setBlendMode(Phaser.BlendModes.ADD);
  }

  updateShip(dt: number): void {
    this.gameTime += dt;

    let dx = 0;
    let dy = 0;
    if (this.movingUp) dy -= 1;
    if (this.movingDown) dy += 1;
    if (this.movingLeft) dx -= 1;
    if (this.movingRight) dx += 1;

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    // Tilt ship (frames: 0=center, 1=slight-left, 2=hard-left, 3=slight-right, 4=hard-right)
    let frameIndex = 0;
    if (dx < -0.5) frameIndex = 2;
    else if (dx < 0) frameIndex = 1;
    else if (dx > 0.5) frameIndex = 4;
    else if (dx > 0) frameIndex = 3;
    this.setFrame(frameIndex);

    this.currentVelocityX = dx * C.PLAYER_SPEED;
    this.currentVelocityY = dy * C.PLAYER_SPEED;

    const newX = this.x + dx * C.PLAYER_SPEED * dt;
    const newY = this.y + dy * C.PLAYER_SPEED * dt;

    const hw = (this.displayWidth) / 2;
    const hh = (this.displayHeight) / 2;
    this.x = Phaser.Math.Clamp(newX, hw, C.SCREEN_WIDTH - hw);
    this.y = Phaser.Math.Clamp(newY, hh, C.SCREEN_HEIGHT - hh);

    // Shield regen
    if (this.gameTime - this.lastDamageTime > C.SHIELD_REGEN_DELAY && this.shield < C.PLAYER_MAX_SHIELD) {
      this.shield = Math.min(C.PLAYER_MAX_SHIELD, this.shield + C.SHIELD_REGEN_RATE * dt);
    }

    // Update thrust position (below ship in Phaser coords = +Y)
    if (this.thrustSprite) {
      this.thrustSprite.setPosition(this.x, this.y + 28 * C.PLAYER_SCALE);
      this.thrustSprite.setVisible(this.visible);
      this.thrustSprite.setAlpha(this.alpha);
    }

    // Update shield glow
    this.updateShieldVisual();
  }

  private updateShieldVisual(): void {
    if (!this.shieldGlow) return;
    this.shieldGlow.clear();
    const pct = this.shield / C.PLAYER_MAX_SHIELD;
    if (pct > 0) {
      this.shieldGlow.lineStyle(2, 0x00ffff, pct * 0.5);
      this.shieldGlow.fillStyle(0x00ffff, pct * 0.15);
      this.shieldGlow.strokeCircle(this.x, this.y, 30 * C.PLAYER_SCALE);
      this.shieldGlow.fillCircle(this.x, this.y, 30 * C.PLAYER_SCALE);
    }
  }

  tryFire(currentTime: number): { type: string; x: number; y: number; vx: number; vy: number; damage: number; isLaser: boolean }[] {
    let fireRate: number;
    switch (this.currentWeapon) {
      case WeaponType.Single: fireRate = C.NORMAL_FIRE_RATE; break;
      case WeaponType.Double: fireRate = C.DOUBLE_FIRE_RATE; break;
      case WeaponType.Triple: fireRate = C.TRIPLE_FIRE_RATE; break;
      case WeaponType.Laser: fireRate = C.LASER_DURATION + 0.1; break;
    }

    if (currentTime - this.lastFireTime < fireRate) return [];
    this.lastFireTime = currentTime;

    const results: { type: string; x: number; y: number; vx: number; vy: number; damage: number; isLaser: boolean }[] = [];
    const spawnY = this.y - this.displayHeight / 2; // above ship in Phaser

    switch (this.currentWeapon) {
      case WeaponType.Single:
        results.push({ type: 'bolt', x: this.x, y: spawnY, vx: 0, vy: -C.PLAYER_BOLT_SPEED, damage: 25, isLaser: false });
        break;

      case WeaponType.Double: {
        const offset = 12;
        results.push({ type: 'bolt', x: this.x - offset, y: spawnY, vx: 0, vy: -C.PLAYER_BOLT_SPEED, damage: 25, isLaser: false });
        results.push({ type: 'bolt', x: this.x + offset, y: spawnY, vx: 0, vy: -C.PLAYER_BOLT_SPEED, damage: 25, isLaser: false });
        break;
      }

      case WeaponType.Triple: {
        results.push({ type: 'bolt', x: this.x, y: spawnY, vx: 0, vy: -C.PLAYER_BOLT_SPEED, damage: 25, isLaser: false });
        const rad = C.TRIPLE_ANGLE * Math.PI / 180;
        results.push({ type: 'bolt', x: this.x - 10, y: spawnY,
          vx: -Math.sin(rad) * C.PLAYER_BOLT_SPEED,
          vy: -Math.cos(rad) * C.PLAYER_BOLT_SPEED, damage: 25, isLaser: false });
        results.push({ type: 'bolt', x: this.x + 10, y: spawnY,
          vx: Math.sin(rad) * C.PLAYER_BOLT_SPEED,
          vy: -Math.cos(rad) * C.PLAYER_BOLT_SPEED, damage: 25, isLaser: false });
        break;
      }

      case WeaponType.Laser:
        results.push({ type: 'laser', x: this.x, y: spawnY, vx: 0, vy: 0, damage: 50, isLaser: true });
        break;
    }

    return results;
  }

  tryDeployMine(): { x: number; y: number; vx: number; vy: number } | null {
    if (this.mineAmmo <= 0) return null;
    this.mineAmmo--;

    let mvx = 0, mvy = 0;
    const mag = Math.hypot(this.currentVelocityX, this.currentVelocityY);
    if (mag > 10) {
      const scale = 80 / mag;
      mvx = this.currentVelocityX * scale;
      mvy = this.currentVelocityY * scale;
    }

    return {
      x: this.x,
      y: this.y + this.displayHeight / 2,
      vx: mvx, vy: mvy,
    };
  }

  takeDamage(amount: number): boolean {
    if (this.isInvincible) return false;

    this.lastDamageTime = this.gameTime;

    if (this.shield > 0) {
      this.shield = Math.max(0, this.shield - amount);
      this.flashDamage();
      return false;
    } else {
      this.hullHits--;
      this.flashDamage();
      if (this.hullHits <= 0) {
        this.lives--;
        if (this.lives <= 0) return true;
        this.shield = C.PLAYER_MAX_SHIELD;
        this.hullHits = C.HULL_MAX_HITS;
        this.startInvincibility();
      }
      return false;
    }
  }

  private flashDamage(): void {
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.active) this.clearTint();
    });
  }

  startInvincibility(): void {
    this.isInvincible = true;
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.3, to: 1.0 },
      duration: 200,
      repeat: Math.floor(C.INVINCIBILITY_DURATION / 0.2) - 1,
      yoyo: false,
    });
    this.scene.time.delayedCall(C.INVINCIBILITY_DURATION * 1000, () => {
      this.isInvincible = false;
      if (this.active) this.setAlpha(1);
    });
  }

  resetWeapon(): void {
    this.currentWeapon = WeaponType.Single;
  }

  destroyShip(): void {
    this.thrustSprite?.destroy();
    this.shieldGlow?.destroy();
    this.destroy();
  }
}
