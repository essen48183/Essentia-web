import Phaser from 'phaser';
import { GameScene } from '../scenes/GameScene';

/**
 * Sets up all physics.add.overlap() calls for the GameScene.
 * Callbacks delegate to GameScene methods.
 */
export function setupCollisions(scene: GameScene): void {
  const physics = scene.physics;

  // Player projectile ↔ Enemy
  physics.add.overlap(
    scene.playerProjectileGroup, scene.enemyGroup,
    (projObj, enemyObj) => {
      const proj = projObj as Phaser.GameObjects.Sprite;
      const enemy = enemyObj as Phaser.GameObjects.Sprite;
      if (!proj.active || !enemy.active) return;
      scene.handleProjectileHitEnemy(proj, enemy);
    }
  );

  // Player projectile ↔ Boss
  physics.add.overlap(
    scene.playerProjectileGroup, scene.bossGroup,
    (projObj, bossObj) => {
      const proj = projObj as Phaser.GameObjects.Sprite;
      const boss = bossObj as Phaser.GameObjects.Sprite;
      if (!proj.active || !boss.active) return;
      scene.handleProjectileHitBoss(proj);
    }
  );

  // Player projectile ↔ Asteroid
  physics.add.overlap(
    scene.playerProjectileGroup, scene.asteroidGroup,
    (projObj, asteroidObj) => {
      const proj = projObj as Phaser.GameObjects.Sprite;
      const asteroid = asteroidObj as Phaser.GameObjects.Sprite;
      if (!proj.active || !asteroid.active) return;
      scene.handleProjectileHitAsteroid(proj, asteroid);
    }
  );

  // Enemy projectile ↔ Player
  physics.add.overlap(
    scene.enemyProjectileGroup, scene.playerGroup,
    (projObj, playerObj) => {
      const proj = projObj as Phaser.GameObjects.Sprite;
      const player = playerObj as Phaser.GameObjects.Sprite;
      if (!proj.active || !player.active) return;
      scene.handleEnemyProjHitPlayer(proj, player);
    }
  );

  // Enemy ↔ Player
  physics.add.overlap(
    scene.enemyGroup, scene.playerGroup,
    (enemyObj, playerObj) => {
      const player = playerObj as Phaser.GameObjects.Sprite;
      if (!player.active) return;
      scene.handleEnemyHitPlayer(player);
    }
  );

  // Boss ↔ Player
  physics.add.overlap(
    scene.bossGroup, scene.playerGroup,
    (_bossObj, playerObj) => {
      const player = playerObj as Phaser.GameObjects.Sprite;
      if (!player.active) return;
      scene.handleBossHitPlayer(player);
    }
  );

  // Asteroid ↔ Player
  physics.add.overlap(
    scene.asteroidGroup, scene.playerGroup,
    (_asteroidObj, playerObj) => {
      const player = playerObj as Phaser.GameObjects.Sprite;
      if (!player.active) return;
      scene.handleAsteroidHitPlayer(player);
    }
  );

  // PowerUp ↔ Player
  physics.add.overlap(
    scene.powerUpGroup, scene.playerGroup,
    (puObj, playerObj) => {
      const pu = puObj as Phaser.GameObjects.Sprite;
      const player = playerObj as Phaser.GameObjects.Sprite;
      if (!pu.active || !player.active) return;
      scene.handlePowerUpCollect(pu, player);
    }
  );

  // Mine ↔ Enemy
  physics.add.overlap(
    scene.mineGroup, scene.enemyGroup,
    (mineObj, enemyObj) => {
      const mine = mineObj as Phaser.GameObjects.Sprite;
      const enemy = enemyObj as Phaser.GameObjects.Sprite;
      if (!mine.active || !enemy.active) return;
      scene.handleMineHitEnemy(mine, enemy);
    }
  );

  // Mine ↔ Boss
  physics.add.overlap(
    scene.mineGroup, scene.bossGroup,
    (mineObj, _bossObj) => {
      const mine = mineObj as Phaser.GameObjects.Sprite;
      if (!mine.active) return;
      scene.handleMineHitBoss(mine);
    }
  );

  // Mine ↔ Asteroid
  physics.add.overlap(
    scene.mineGroup, scene.asteroidGroup,
    (mineObj, asteroidObj) => {
      const mine = mineObj as Phaser.GameObjects.Sprite;
      const asteroid = asteroidObj as Phaser.GameObjects.Sprite;
      if (!mine.active || !asteroid.active) return;
      scene.handleMineHitAsteroid(mine, asteroid);
    }
  );
}
