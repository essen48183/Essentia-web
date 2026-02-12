import Phaser from 'phaser';
import * as C from '../constants';
import { GameState, WeaponType, PowerUpType, StageEventType, SpawnRequestType } from '../types';
import { PlayerShip } from '../entities/PlayerShip';
import { EnemyShip } from '../entities/EnemyShip';
import { BossShip } from '../entities/BossShip';
import { Projectile, SpaceMine } from '../entities/Projectile';
import { PowerUp } from '../entities/PowerUp';
import { Asteroid } from '../entities/Asteroid';
import { StageManager } from '../systems/StageManager';
import { ScrollingBackground } from '../systems/ScrollingBackground';
import { HUD } from '../systems/HUD';
import { setupCollisions } from '../systems/CollisionManager';
import { ControlSettings } from '../utils/ControlSettings';
import { AudioSettings } from '../utils/AudioSettings';
import { HighScoreManager } from '../utils/HighScoreManager';
import { GamepadManager } from '../utils/GamepadManager';
import { TouchControls } from '../utils/VirtualJoystick';

const FONT = '"Courier New", monospace';

export class GameScene extends Phaser.Scene {
  // Core state
  gameState = GameState.Playing;
  score = 0;
  private lastUpdateTime = 0;

  // Combo
  private comboCount = 0;
  private comboMultiplier = 1;
  private lastKillTime = 0;

  // Players
  playerCount = 1;
  players: PlayerShip[] = [];

  // Entities
  enemies: EnemyShip[] = [];
  projectiles: Projectile[] = [];
  asteroids: Asteroid[] = [];
  powerUps: PowerUp[] = [];
  boss: BossShip | null = null;
  mines: SpaceMine[] = [];

  // Systems
  private background!: ScrollingBackground;
  private hud!: HUD;
  private stageManager!: StageManager;
  private gamepadManager = new GamepadManager();
  private touchControls: TouchControls | null = null;

  // Physics groups
  playerGroup!: Phaser.Physics.Arcade.Group;
  enemyGroup!: Phaser.Physics.Arcade.Group;
  playerProjectileGroup!: Phaser.Physics.Arcade.Group;
  enemyProjectileGroup!: Phaser.Physics.Arcade.Group;
  asteroidGroup!: Phaser.Physics.Arcade.Group;
  powerUpGroup!: Phaser.Physics.Arcade.Group;
  mineGroup!: Phaser.Physics.Arcade.Group;
  bossGroup!: Phaser.Physics.Arcade.Group;

  // Pause
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private stateBeforePause = GameState.Playing;
  private pauseMenuIndex = 0;
  private pauseMenuLabels: Phaser.GameObjects.Text[] = [];
  private pauseMenuValues: Phaser.GameObjects.Text[] = [];
  private pauseCursor: Phaser.GameObjects.Text | null = null;
  private prevPauseGp = false;

  // Audio
  private bgMusic: Phaser.Sound.BaseSound | null = null;

  // Laser cooldown per enemy (prevent multi-hit per frame)
  private laserHitCooldowns = new Map<EnemyShip | BossShip | Asteroid, number>();

  // Guard boss destruction
  private bossBeingDestroyed = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { playerCount?: number }): void {
    this.playerCount = data.playerCount ?? 1;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x050514);
    this.cameras.main.fadeIn(400);

    // Reset state
    this.gameState = GameState.Playing;
    this.score = 0;
    this.lastUpdateTime = 0;
    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.lastKillTime = 0;
    this.players = [];
    this.enemies = [];
    this.projectiles = [];
    this.asteroids = [];
    this.powerUps = [];
    this.boss = null;
    this.mines = [];
    this.pauseOverlay = null;
    this.bossBeingDestroyed = false;
    this.laserHitCooldowns.clear();

    // Physics groups
    this.playerGroup = this.physics.add.group();
    this.enemyGroup = this.physics.add.group();
    this.playerProjectileGroup = this.physics.add.group();
    this.enemyProjectileGroup = this.physics.add.group();
    this.asteroidGroup = this.physics.add.group();
    this.powerUpGroup = this.physics.add.group();
    this.mineGroup = this.physics.add.group();
    this.bossGroup = this.physics.add.group();

    // Stage manager
    this.stageManager = new StageManager();

    // Background
    this.background = new ScrollingBackground(this);
    this.background.setup(this.stageManager.currentStageDef.backgroundSet);

    // HUD
    this.hud = new HUD(this, this.playerCount);

    // Players
    const p1 = new PlayerShip(this, 0, 'player-ship');
    p1.setPosition(this.playerCount === 1 ? C.SCREEN_WIDTH / 2 : C.SCREEN_WIDTH / 3,
                   C.SCREEN_HEIGHT - 120);
    this.playerGroup.add(p1);
    this.players.push(p1);

    if (this.playerCount >= 2) {
      const p2 = new PlayerShip(this, 1, 'player-ship-copy');
      p2.setPosition(C.SCREEN_WIDTH * 2 / 3, C.SCREEN_HEIGHT - 120);
      this.playerGroup.add(p2);
      this.players.push(p2);
    }

    // Stage title
    this.hud.showStageTitle(1);

    // Collisions
    setupCollisions(this);

    // Input
    this.setupInput();

    // Touch controls (single-player only)
    if (this.playerCount === 1) {
      this.touchControls = new TouchControls(this);
    }

    // Music
    this.startBackgroundMusic();
  }

  // ---- Helpers ----

  get alivePlayers(): PlayerShip[] {
    return this.players.filter(p => p.active);
  }

  nearestAlivePlayer(x: number, y: number): PlayerShip | null {
    let nearest: PlayerShip | null = null;
    let minDist = Infinity;
    for (const p of this.alivePlayers) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < minDist) { minDist = d; nearest = p; }
    }
    return nearest;
  }

  // ---- Update Loop ----

  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 1 / 30);
    const currentTime = time / 1000;

    if (this.gameState !== GameState.Playing && this.gameState !== GameState.BossFight) {
      // Still poll gamepads for pause menu
      if (this.gameState === GameState.Paused) this.pollPauseGamepad();
      return;
    }

    // Background
    this.background.update(dt);

    // Gamepads
    this.pollGamepads(currentTime);

    // Touch controls
    if (this.touchControls && this.players[0]?.active) {
      this.touchControls.update();
      this.players[0].touchDx = this.touchControls.dx;
      this.players[0].touchDy = this.touchControls.dy;
      this.players[0].touchFiring = this.touchControls.isTouching || this.touchControls.fireDown;
      if (this.touchControls.minePressed) {
        this.deployMine(this.players[0]);
        this.touchControls.minePressed = false;
      }
    }

    // Players
    for (const player of this.alivePlayers) {
      player.updateShip(dt);

      // Weapon timer
      if (player.weaponTimer > 0) {
        player.weaponTimer -= dt;
        if (player.weaponTimer <= 0) {
          player.resetWeapon();
          this.hud.updateWeapon(player.currentWeapon, player.playerIndex);
        }
      }

      // Auto-fire
      if (player.isFiring || player.controllerFireHeld || player.touchFiring) {
        const shots = player.tryFire(currentTime);
        for (const shot of shots) {
          let proj: Projectile;
          if (shot.isLaser) {
            proj = Projectile.createPlayerLaser(this, shot.x, shot.y);
          } else {
            proj = Projectile.createPlayerBolt(this, shot.x, shot.y, shot.vx, shot.vy);
          }
          this.playerProjectileGroup.add(proj);
          this.projectiles.push(proj);
        }
        if (shots.length > 0) {
          const isLaser = shots[0].isLaser;
          this.playSFX(isLaser ? 'sfx-laser' : 'sfx-shoot');
        }
      }

      this.hud.updateShield(player.shield, C.PLAYER_MAX_SHIELD, player.playerIndex);
      this.hud.updateLives(player.lives, player.playerIndex);
      this.hud.updateMineAmmo(player.mineAmmo, player.playerIndex);
    }

    // Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) { this.projectiles.splice(i, 1); continue; }
      p.updatePosition(dt);
      if (p.isOffScreen() && !p.isLaser) {
        p.destroy();
        this.projectiles.splice(i, 1);
      }
    }

    // Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.active) { this.enemies.splice(i, 1); this.stageManager.enemiesAlive--; continue; }
      e.updateEnemy(dt);
      const target = this.nearestAlivePlayer(e.x, e.y);
      const tx = target?.x ?? C.SCREEN_WIDTH / 2;
      const ty = target?.y ?? C.SCREEN_HEIGHT - 120;
      const fireData = e.tryFire(currentTime, tx, ty);
      if (fireData) {
        const bolt = Projectile.createEnemyBolt(this, fireData.x, fireData.y, fireData.targetX, fireData.targetY, fireData.speed);
        this.enemyProjectileGroup.add(bolt);
        this.projectiles.push(bolt);
      }
      if (e.isOffScreen()) {
        e.destroy();
        this.enemies.splice(i, 1);
        this.stageManager.enemiesAlive--;
      }
    }

    // Asteroids
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      if (!a.active) { this.asteroids.splice(i, 1); continue; }
      a.updateAsteroid(dt);
      if (a.isOffScreen()) {
        a.destroy();
        this.asteroids.splice(i, 1);
      }
    }

    // Power-ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      if (!pu.active) { this.powerUps.splice(i, 1); continue; }
      pu.updatePowerUp(dt);
      if (pu.isOffScreen()) {
        pu.destroyPowerUp();
        this.powerUps.splice(i, 1);
      }
    }

    // Mines
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      if (!m.active) { this.mines.splice(i, 1); continue; }
      const expired = m.updateMine(dt);
      if (expired || m.isOffScreen()) {
        this.showExplosion(m.x, m.y, false);
        m.destroy();
        this.mines.splice(i, 1);
      }
    }

    // Boss
    if (this.boss && this.boss.active && this.gameState === GameState.BossFight) {
      const target = this.nearestAlivePlayer(this.boss.x, this.boss.y);
      const tx = target?.x ?? C.SCREEN_WIDTH / 2;
      const ty = target?.y ?? C.SCREEN_HEIGHT - 120;
      const result = this.boss.updateBoss(dt, tx, ty);

      for (const bolt of result.bolts) {
        const p = Projectile.createBossBolt(this, bolt.x, bolt.y, bolt.targetX, bolt.targetY);
        this.enemyProjectileGroup.add(p);
        this.projectiles.push(p);
      }
      for (const minion of result.minions) {
        const e = new EnemyShip(this, minion.typeIndex, minion.difficulty);
        e.setPosition(minion.x, minion.y);
        e.startX = minion.x;
        this.enemyGroup.add(e);
        this.enemies.push(e);
        this.stageManager.enemiesAlive++;
      }

      this.hud.updateBossHealth(this.boss.hp, this.boss.maxHP);
    }

    // Clear laser cooldowns
    this.laserHitCooldowns.clear();

    // Stage manager
    if (!this.stageManager.isBossPhase) {
      const event = this.stageManager.update(dt);
      if (event) this.handleStageEvent(event);
    }
  }

  // ---- Stage Events ----

  private handleStageEvent(event: { type: string; value?: number; spawns?: any[] }): void {
    switch (event.type) {
      case StageEventType.StageStart:
        this.background.setup(this.stageManager.currentStageDef.backgroundSet);
        this.hud.showStageTitle(event.value!);
        this.hud.updateStage(event.value!, 1);
        this.gameState = GameState.Playing;
        break;

      case StageEventType.WaveStart:
        this.hud.updateStage(this.stageManager.currentStage, event.value!);
        break;

      case StageEventType.Spawn:
        for (const req of event.spawns!) {
          if (req.type === SpawnRequestType.Enemy) {
            const e = new EnemyShip(this, req.typeIndex!, req.difficulty!);
            e.setPosition(Phaser.Math.Between(80, C.SCREEN_WIDTH - 80), -40);
            e.startX = e.x;
            this.enemyGroup.add(e);
            this.enemies.push(e);
            this.stageManager.enemiesAlive++;
          } else if (req.type === SpawnRequestType.Asteroid) {
            const a = new Asteroid(this, Phaser.Math.Between(60, C.SCREEN_WIDTH - 60), -40, Math.random() > 0.5);
            this.asteroidGroup.add(a);
            this.asteroids.push(a);
          }
        }
        break;

      case StageEventType.BossStart:
        this.spawnBoss(event.value!);
        break;
    }
  }

  private spawnBoss(stageNumber: number): void {
    this.gameState = GameState.BossFight;
    this.bossBeingDestroyed = false;
    this.boss = new BossShip(this, stageNumber);
    this.boss.setPosition(C.SCREEN_WIDTH / 2, -100);
    this.bossGroup.add(this.boss);

    // Entrance tween
    this.tweens.add({
      targets: this.boss,
      y: 130,
      duration: 2000,
      ease: 'Power2',
    });

    this.hud.showBossHealth(true);
  }

  // ---- Collision Handlers (called from CollisionManager) ----

  handleProjectileHitEnemy(projSprite: Phaser.GameObjects.Sprite, enemySprite: Phaser.GameObjects.Sprite): void {
    const proj = projSprite as Projectile;
    const enemy = enemySprite as EnemyShip;

    // Laser cooldown
    if (proj.isLaser) {
      if (this.laserHitCooldowns.has(enemy)) return;
      this.laserHitCooldowns.set(enemy, 1);
    }

    this.showHitEffect(proj.x, proj.y);

    if (!proj.isLaser) {
      proj.destroy();
    }

    if (enemy.takeDamage(proj.damage)) {
      this.destroyEnemy(enemy);
    }
  }

  handleProjectileHitBoss(projSprite: Phaser.GameObjects.Sprite): void {
    const proj = projSprite as Projectile;
    if (!this.boss || !this.boss.active) return;

    if (proj.isLaser) {
      if (this.laserHitCooldowns.has(this.boss)) return;
      this.laserHitCooldowns.set(this.boss, 1);
    }

    this.showHitEffect(proj.x, proj.y);

    if (!proj.isLaser) {
      proj.destroy();
    }

    if (this.boss.takeDamage(proj.damage)) {
      this.destroyBoss();
    }
  }

  handleProjectileHitAsteroid(projSprite: Phaser.GameObjects.Sprite, asteroidSprite: Phaser.GameObjects.Sprite): void {
    const proj = projSprite as Projectile;
    const asteroid = asteroidSprite as Asteroid;

    if (proj.isLaser) {
      if (this.laserHitCooldowns.has(asteroid)) return;
      this.laserHitCooldowns.set(asteroid, 1);
    }

    this.showHitEffect(proj.x, proj.y);

    if (!proj.isLaser) {
      proj.destroy();
    }

    if (asteroid.takeDamage()) {
      this.destroyAsteroid(asteroid);
    }
  }

  handleEnemyProjHitPlayer(projSprite: Phaser.GameObjects.Sprite, playerSprite: Phaser.GameObjects.Sprite): void {
    const proj = projSprite as Projectile;
    const player = playerSprite as PlayerShip;
    this.handlePlayerHit(player, proj.damage);
    proj.destroy();
  }

  handleEnemyHitPlayer(playerSprite: Phaser.GameObjects.Sprite): void {
    this.handlePlayerHit(playerSprite as PlayerShip, 30);
  }

  handleBossHitPlayer(playerSprite: Phaser.GameObjects.Sprite): void {
    this.handlePlayerHit(playerSprite as PlayerShip, 40);
  }

  handleAsteroidHitPlayer(playerSprite: Phaser.GameObjects.Sprite): void {
    this.handlePlayerHit(playerSprite as PlayerShip, 20);
  }

  handlePowerUpCollect(puSprite: Phaser.GameObjects.Sprite, playerSprite: Phaser.GameObjects.Sprite): void {
    const pu = puSprite as PowerUp;
    const player = playerSprite as PlayerShip;
    if (!pu.active) return;

    this.collectPowerUp(pu, player);
  }

  handleMineHitEnemy(mineSprite: Phaser.GameObjects.Sprite, enemySprite: Phaser.GameObjects.Sprite): void {
    const mine = mineSprite as SpaceMine;
    const enemy = enemySprite as EnemyShip;
    this.detonateMine(mine);
    if (enemy.active && enemy.takeDamage(mine.damage)) {
      this.destroyEnemy(enemy);
    }
  }

  handleMineHitBoss(mineSprite: Phaser.GameObjects.Sprite): void {
    const mine = mineSprite as SpaceMine;
    this.detonateMine(mine);
    if (this.boss && this.boss.active && this.boss.takeDamage(mine.damage)) {
      this.destroyBoss();
    }
  }

  handleMineHitAsteroid(mineSprite: Phaser.GameObjects.Sprite, asteroidSprite: Phaser.GameObjects.Sprite): void {
    const mine = mineSprite as SpaceMine;
    const asteroid = asteroidSprite as Asteroid;
    this.detonateMine(mine);
    if (asteroid.active && asteroid.takeDamage()) {
      this.destroyAsteroid(asteroid);
    }
  }

  // ---- Destruction ----

  private destroyEnemy(enemy: EnemyShip): void {
    this.showExplosion(enemy.x, enemy.y, false);
    this.addScore(enemy.scoreValue);
    this.updateCombo();

    if (Math.random() < C.POWER_UP_DROP_CHANCE) {
      const pu = new PowerUp(this, enemy.x, enemy.y, PowerUp.randomType());
      this.powerUpGroup.add(pu);
      this.powerUps.push(pu);
    }

    enemy.destroy();
    this.stageManager.enemiesAlive--;
  }

  private destroyBoss(): void {
    if (this.bossBeingDestroyed || !this.boss) return;
    this.bossBeingDestroyed = true;
    const bossRef = this.boss;
    this.boss = null;

    // Explosion sequence
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 300, () => {
        const ox = bossRef.x + Phaser.Math.Between(-80, 80);
        const oy = bossRef.y + Phaser.Math.Between(-60, 60);
        this.showExplosion(ox, oy, true);
        this.screenShake(8);
      });
    }

    this.time.delayedCall(1500, () => {
      if (bossRef.active) bossRef.destroy();

      // Power-up drop
      const pu = new PowerUp(this, bossRef.x, bossRef.y, PowerUp.randomWeaponType());
      this.powerUpGroup.add(pu);
      this.powerUps.push(pu);

      this.addScore(1000 * this.stageManager.currentStage);
      this.hud.showBossHealth(false);

      const bonus = 500 * this.stageManager.currentStage;
      this.addScore(bonus);
      this.hud.showStageClear(bonus);

      this.stageManager.bossDefeated();
      this.gameState = GameState.StageTransition;

      this.time.delayedCall(3500, () => {
        this.gameState = GameState.Playing;
      });
    });
  }

  private destroyAsteroid(asteroid: Asteroid): void {
    const smalls = asteroid.spawnSmallAsteroids();
    for (const s of smalls) {
      const a = new Asteroid(this, s.x, s.y, false);
      a.vx = s.vx;
      a.vy = s.vy;
      this.asteroidGroup.add(a);
      this.asteroids.push(a);
    }
    this.showExplosion(asteroid.x, asteroid.y, false);
    asteroid.destroy();
    this.addScore(asteroid.scoreValue);
  }

  private detonateMine(mine: SpaceMine): void {
    this.showExplosion(mine.x, mine.y, true);
    this.screenShake(6);

    // Area damage
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const dist = Math.hypot(enemy.x - mine.x, enemy.y - mine.y);
      if (dist < C.MINE_EXPLOSION_RADIUS && dist > 0) {
        const falloff = mine.damage * (1 - dist / C.MINE_EXPLOSION_RADIUS) * 0.5;
        if (enemy.takeDamage(falloff)) {
          this.destroyEnemy(enemy);
        }
      }
    }

    mine.destroy();
  }

  // ---- Player Hit / Death ----

  private handlePlayerHit(player: PlayerShip, damage: number): void {
    const dead = player.takeDamage(damage);
    this.screenShake(5);
    this.flashDamageOverlay();

    if (dead) {
      this.playerDied(player);
    }
  }

  private playerDied(player: PlayerShip): void {
    this.showExplosion(player.x, player.y, true);
    this.playSFX('sfx-player-death');
    player.destroyShip();
    this.hud.updateLives(0, player.playerIndex);

    if (this.alivePlayers.length === 0) {
      this.gameOver();
    }
  }

  // ---- Power-ups ----

  private collectPowerUp(pu: PowerUp, player: PlayerShip): void {
    switch (pu.powerUpType) {
      case PowerUpType.DoubleShotUpgrade:
        player.currentWeapon = WeaponType.Double;
        player.weaponTimer = C.POWER_UP_DURATION;
        break;
      case PowerUpType.TripleShotUpgrade:
        player.currentWeapon = WeaponType.Triple;
        player.weaponTimer = C.POWER_UP_DURATION;
        break;
      case PowerUpType.LaserBeam:
        player.currentWeapon = WeaponType.Laser;
        player.weaponTimer = C.POWER_UP_DURATION;
        break;
      case PowerUpType.MineAmmo:
        player.mineAmmo = Math.min(player.mineAmmo + 3, C.MINE_MAX_AMMO);
        break;
      case PowerUpType.ShieldRestore:
        player.shield = C.PLAYER_MAX_SHIELD;
        break;
      case PowerUpType.ExtraLife:
        player.lives = Math.min(player.lives + 1, 5);
        break;
      case PowerUpType.Invincibility:
        player.startInvincibility();
        break;
    }

    this.hud.updateWeapon(player.currentWeapon, player.playerIndex);
    this.playSFX('sfx-powerup');

    // Flash effect
    const flash = this.add.rectangle(pu.x, pu.y, 40, 40, PowerUp.getColor(pu.powerUpType));
    flash.setDepth(C.Z_EXPLOSION);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash,
      scaleX: 3, scaleY: 3, alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });

    pu.destroyPowerUp();
  }

  // ---- Mine Deployment ----

  private deployMine(player: PlayerShip): void {
    const data = player.tryDeployMine();
    if (!data) return;

    const mine = new SpaceMine(this, data.x, data.y, data.vx, data.vy);
    this.mineGroup.add(mine);
    this.mines.push(mine);
    this.hud.updateMineAmmo(player.mineAmmo, player.playerIndex);
    this.playSFX('sfx-mine-deploy');
  }

  // ---- Effects ----

  private showExplosion(x: number, y: number, large: boolean): void {
    const key = large ? 'explosion-anim' : 'enemy-explosion-anim';
    const tex = large ? 'explosion' : 'enemy-explosion';
    const explosion = this.add.sprite(x, y, tex, 0);
    explosion.setScale(large ? 2.5 : 2.0);
    explosion.setDepth(C.Z_EXPLOSION);
    explosion.play(key);
    explosion.on('animationcomplete', () => explosion.destroy());

    this.playSFX(large ? 'sfx-explosion-big' : 'sfx-explosion');
  }

  private showHitEffect(x: number, y: number): void {
    const hit = this.add.sprite(x, y, 'hit', 0);
    hit.setScale(2.0);
    hit.setDepth(C.Z_EXPLOSION);
    hit.setBlendMode(Phaser.BlendModes.ADD);
    hit.play('hit-anim');
    hit.on('animationcomplete', () => hit.destroy());

    this.playSFX('sfx-hit');
  }

  private screenShake(intensity: number): void {
    this.cameras.main.shake(80, intensity / 1000);
  }

  private flashDamageOverlay(): void {
    const overlay = this.add.rectangle(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2,
      C.SCREEN_WIDTH, C.SCREEN_HEIGHT, 0xff0000, 0.3);
    overlay.setDepth(C.Z_HUD - 1);
    overlay.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 150,
      onComplete: () => overlay.destroy(),
    });
  }

  // ---- Score / Combo ----

  private addScore(points: number): void {
    this.score += points * this.comboMultiplier;
    this.hud.updateScore(this.score);
  }

  private updateCombo(): void {
    const now = this.time.now / 1000;
    if (now - this.lastKillTime < C.COMBO_WINDOW) {
      this.comboCount++;
      this.comboMultiplier = Math.min(this.comboCount, C.MAX_COMBO_MULTIPLIER);
      this.hud.showCombo(this.comboMultiplier);
    } else {
      this.comboCount = 1;
      this.comboMultiplier = 1;
    }
    this.lastKillTime = now;
  }

  // ---- Game Over ----

  private gameOver(): void {
    this.gameState = GameState.GameOver;
    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.background.destroy();
        this.bgMusic?.stop();
        this.scene.start('GameOverScene', {
          finalScore: this.score,
          stageReached: this.stageManager.currentStage,
          playerCount: this.playerCount,
        });
      });
    });
  }

  // ---- Pause Menu ----

  private togglePause(): void {
    if (this.gameState === GameState.Paused) {
      this.resumeGame();
    } else if (this.gameState === GameState.Playing || this.gameState === GameState.BossFight) {
      this.showPauseMenu();
    }
  }

  private showPauseMenu(): void {
    this.stateBeforePause = this.gameState;
    this.gameState = GameState.Paused;
    this.physics.pause();
    if (this.touchControls) this.touchControls.enabled = false;
    if (this.bgMusic && 'setVolume' in this.bgMusic) {
      (this.bgMusic as Phaser.Sound.WebAudioSound).setVolume(AudioSettings.musicVolume * 0.3);
    }

    this.pauseMenuIndex = 0;
    this.pauseOverlay = this.add.container(0, 0).setDepth(C.Z_HUD + 10);

    const dim = this.add.rectangle(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2,
      C.SCREEN_WIDTH, C.SCREEN_HEIGHT, 0x000000, 0.7);
    this.pauseOverlay.add(dim);

    const title = this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2 - 200, 'PAUSED', {
      fontFamily: FONT, fontSize: '40px', color: '#ffffff',
    }).setOrigin(0.5, 0.5);
    this.pauseOverlay.add(title);

    const items: [string, string][] = [
      ['RESUME', ''],
      ['MUSIC', AudioSettings.volumeBar(AudioSettings.musicVolume)],
      ['SFX', AudioSettings.volumeBar(AudioSettings.sfxVolume)],
      ['HIGH SCORES', ''],
      ['QUIT TO MENU', ''],
    ];

    this.pauseMenuLabels = [];
    this.pauseMenuValues = [];
    const startY = C.SCREEN_HEIGHT / 2 - 120;
    const spacing = 40;

    for (let i = 0; i < items.length; i++) {
      const y = startY + i * spacing;
      const label = this.add.text(C.SCREEN_WIDTH / 2 - 140, y, items[i][0], {
        fontFamily: FONT, fontSize: '22px', color: '#ffffff',
      }).setOrigin(0, 0.5);
      this.pauseOverlay.add(label);
      this.pauseMenuLabels.push(label);

      const val = this.add.text(C.SCREEN_WIDTH / 2 + 160, y, items[i][1], {
        fontFamily: FONT, fontSize: '22px', color: '#00ffff',
      }).setOrigin(1, 0.5);
      this.pauseOverlay.add(val);
      this.pauseMenuValues.push(val);
    }

    this.pauseCursor = this.add.text(C.SCREEN_WIDTH / 2 - 150, startY, '\u25B8', {
      fontFamily: FONT, fontSize: '22px', color: '#00ff00',
    }).setOrigin(1, 0.5);
    this.pauseOverlay.add(this.pauseCursor);

    // High scores
    const hsY = startY + items.length * spacing + 20;
    const hsHeader = this.add.text(C.SCREEN_WIDTH / 2, hsY, '--- HIGH SCORES ---', {
      fontFamily: FONT, fontSize: '18px', color: '#ffff00',
    }).setOrigin(0.5, 0.5);
    this.pauseOverlay.add(hsHeader);

    const scores = HighScoreManager.highScores();
    if (scores.length === 0) {
      const empty = this.add.text(C.SCREEN_WIDTH / 2, hsY + 30, 'NO SCORES YET', {
        fontFamily: FONT, fontSize: '16px', color: '#666666',
      }).setOrigin(0.5, 0.5);
      this.pauseOverlay.add(empty);
    } else {
      for (let i = 0; i < scores.length; i++) {
        const line = this.add.text(C.SCREEN_WIDTH / 2, hsY + (i + 1) * 25,
          `${i + 1}. ${scores[i].name.padEnd(8)} ${String(scores[i].score).padStart(8, '0')}`, {
          fontFamily: FONT, fontSize: '16px', color: i === 0 ? '#ffff00' : '#00ffff',
        }).setOrigin(0.5, 0.5);
        this.pauseOverlay.add(line);
      }
    }

    // Hint
    const hint = this.add.text(C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT - 40,
      'ESC/Y: Resume | Up/Down: Navigate | Left/Right: Adjust | Enter/A: Select', {
      fontFamily: FONT, fontSize: '12px', color: '#666666',
    }).setOrigin(0.5, 0.5);
    this.pauseOverlay.add(hint);

    this.updatePauseCursor();
  }

  private resumeGame(): void {
    this.gameState = this.stateBeforePause;
    this.physics.resume();
    if (this.touchControls) this.touchControls.enabled = true;
    this.pauseOverlay?.destroy();
    this.pauseOverlay = null;
    this.pauseMenuLabels = [];
    this.pauseMenuValues = [];
    this.pauseCursor = null;
    if (this.bgMusic && 'setVolume' in this.bgMusic) {
      (this.bgMusic as Phaser.Sound.WebAudioSound).setVolume(AudioSettings.musicVolume);
    }
  }

  private updatePauseCursor(): void {
    if (!this.pauseCursor || this.pauseMenuIndex >= this.pauseMenuLabels.length) return;
    const target = this.pauseMenuLabels[this.pauseMenuIndex];
    this.pauseCursor.setPosition(target.x - 10, target.y);
    for (let i = 0; i < this.pauseMenuLabels.length; i++) {
      this.pauseMenuLabels[i].setColor(i === this.pauseMenuIndex ? '#00ff00' : '#ffffff');
    }
  }

  private pauseNavigate(dir: number): void {
    this.pauseMenuIndex = (this.pauseMenuIndex + dir + 5) % 5;
    this.updatePauseCursor();
  }

  private pauseAdjust(dir: number): void {
    const delta = dir * 0.25;
    switch (this.pauseMenuIndex) {
      case 1: // Music
        AudioSettings.musicVolume += delta;
        this.pauseMenuValues[1].setText(AudioSettings.volumeBar(AudioSettings.musicVolume));
        if (this.bgMusic && 'setVolume' in this.bgMusic) {
          (this.bgMusic as Phaser.Sound.WebAudioSound).setVolume(AudioSettings.musicVolume * 0.3);
        }
        break;
      case 2: // SFX
        AudioSettings.sfxVolume += delta;
        this.pauseMenuValues[2].setText(AudioSettings.volumeBar(AudioSettings.sfxVolume));
        break;
    }
  }

  private pauseSelect(): void {
    switch (this.pauseMenuIndex) {
      case 0: this.resumeGame(); break;
      case 1: this.pauseAdjust(1); break;
      case 2: this.pauseAdjust(1); break;
      case 3: break; // Scores always shown
      case 4: // Quit
        this.background.destroy();
        this.bgMusic?.stop();
        this.scene.start('MenuScene');
        break;
    }
  }

  private pollPauseGamepad(): void {
    const [gp] = this.gamepadManager.poll();
    if (!gp) return;
    if (gp.pause && !this.prevPauseGp) this.togglePause();
    this.prevPauseGp = gp.pause;
  }

  // ---- Audio ----

  private startBackgroundMusic(): void {
    try {
      this.bgMusic = this.sound.add('bg-music', {
        loop: true,
        volume: AudioSettings.musicVolume,
      });
      this.bgMusic.play();
    } catch {
      // Audio may fail before user interaction
    }
  }

  playSFX(key: string): void {
    if (AudioSettings.sfxVolume <= 0) return;
    try {
      this.sound.play(key, { volume: AudioSettings.sfxVolume });
    } catch { /* ignore */ }
  }

  // ---- Input ----

  private setupInput(): void {
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.ESC) {
        this.togglePause();
        return;
      }

      if (this.gameState === GameState.Paused) {
        switch (event.keyCode) {
          case Phaser.Input.Keyboard.KeyCodes.UP: this.pauseNavigate(-1); break;
          case Phaser.Input.Keyboard.KeyCodes.DOWN: this.pauseNavigate(1); break;
          case Phaser.Input.Keyboard.KeyCodes.LEFT: this.pauseAdjust(-1); break;
          case Phaser.Input.Keyboard.KeyCodes.RIGHT: this.pauseAdjust(1); break;
          case Phaser.Input.Keyboard.KeyCodes.ENTER: this.pauseSelect(); break;
        }
        return;
      }

      if (this.gameState !== GameState.Playing && this.gameState !== GameState.BossFight) return;

      for (const player of this.alivePlayers) {
        const c = ControlSettings.controls(player.playerIndex);
        if (event.keyCode === c.upKey) player.keyUp = true;
        if (event.keyCode === c.downKey) player.keyDown = true;
        if (event.keyCode === c.leftKey) player.keyLeft = true;
        if (event.keyCode === c.rightKey) player.keyRight = true;
        if (event.keyCode === c.fireKey) player.isFiring = true;
        if (event.keyCode === c.mineKey) this.deployMine(player);
      }
    });

    this.input.keyboard!.on('keyup', (event: KeyboardEvent) => {
      for (const player of this.players) {
        const c = ControlSettings.controls(player.playerIndex);
        if (event.keyCode === c.upKey) player.keyUp = false;
        if (event.keyCode === c.downKey) player.keyDown = false;
        if (event.keyCode === c.leftKey) player.keyLeft = false;
        if (event.keyCode === c.rightKey) player.keyRight = false;
        if (event.keyCode === c.fireKey) player.isFiring = false;
      }
    });

    // Mouse / touch (1P only) — guard against touch-control pointers
    if (this.playerCount === 1) {
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (this.touchControls?.isTrackingPointer(pointer.id)) return;
        // Ignore taps in the joystick activation zone (bottom-left quadrant)
        if (pointer.x < C.SCREEN_WIDTH / 2 && pointer.y > C.SCREEN_HEIGHT / 2) return;
        if (this.gameState === GameState.Playing || this.gameState === GameState.BossFight) {
          if (this.players[0]?.active) this.players[0].isFiring = true;
        }
      });
      this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        if (this.touchControls?.isTrackingPointer(pointer.id)) return;
        if (this.players[0]) this.players[0].isFiring = false;
      });
    }
  }

  private pollGamepads(currentTime: number): void {
    const [gp0, gp1] = this.gamepadManager.poll();
    const pads = [gp0, gp1];

    for (let slot = 0; slot < Math.min(this.playerCount, 2); slot++) {
      if (slot >= this.players.length) continue;
      const player = this.players[slot];
      const gp = pads[slot];

      if (!gp || !player.active) {
        if (player.active) {
          player.ctrlUp = false; player.ctrlDown = false;
          player.ctrlLeft = false; player.ctrlRight = false;
          player.controllerFireHeld = false;
        }
        continue;
      }

      if (this.gameState !== GameState.Playing && this.gameState !== GameState.BossFight) continue;

      player.ctrlUp = gp.up;
      player.ctrlDown = gp.down;
      player.ctrlLeft = gp.left;
      player.ctrlRight = gp.right;
      player.controllerFireHeld = gp.fire;

      if (gp.mineEdge) this.deployMine(player);
      if (gp.pause) this.togglePause();
    }
  }
}

