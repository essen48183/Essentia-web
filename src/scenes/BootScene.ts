import Phaser from 'phaser';
import { generateProceduralTextures } from '../utils/ProceduralTextures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // ---------- Spritesheets ----------
    this.load.spritesheet('player-ship', 'assets/images/player-ship.png', {
      frameWidth: 48, frameHeight: 48,
    });
    this.load.spritesheet('player-ship-copy', 'assets/images/player-ship-copy.png', {
      frameWidth: 48, frameHeight: 48,
    });
    this.load.spritesheet('player-thrust', 'assets/images/player-thrust.png', {
      frameWidth: 8, frameHeight: 10,
    });
    this.load.spritesheet('enemy-01', 'assets/images/enemy-01.png', {
      frameWidth: 48, frameHeight: 48,
    });
    this.load.spritesheet('enemy-02', 'assets/images/enemy-02.png', {
      frameWidth: 48, frameHeight: 48,
    });
    this.load.spritesheet('enemy-03', 'assets/images/enemy-03.png', {
      frameWidth: 48, frameHeight: 48,
    });
    this.load.spritesheet('boss', 'assets/images/boss.png', {
      frameWidth: 192, frameHeight: 144,
    });
    this.load.spritesheet('explosion', 'assets/images/explosion.png', {
      frameWidth: 112, frameHeight: 128,
    });
    this.load.spritesheet('enemy-explosion', 'assets/images/enemy-explosion.png', {
      frameWidth: 80, frameHeight: 80,
    });
    this.load.spritesheet('hit', 'assets/images/hit.png', {
      frameWidth: 31, frameHeight: 32,
    });
    this.load.spritesheet('enemy-projectile', 'assets/images/enemy-projectile.png', {
      frameWidth: 16, frameHeight: 16,
    });
    this.load.spritesheet('power-up', 'assets/images/power-up.png', {
      frameWidth: 16, frameHeight: 16,
    });

    // ---------- Single images ----------
    this.load.image('boss-bolt', 'assets/images/boss-bolt.png');
    this.load.image('ss-enemy1', 'assets/images/ss-enemy1.png');
    this.load.image('ss-enemy2', 'assets/images/ss-enemy2.png');
    this.load.image('ss-enemy3', 'assets/images/ss-enemy3.png');
    this.load.image('ss-enemy4', 'assets/images/ss-enemy4.png');
    this.load.image('ss-enemy5', 'assets/images/ss-enemy5.png');
    this.load.image('asteroid-01', 'assets/images/asteroid-01.png');
    this.load.image('asteroid-02', 'assets/images/asteroid-02.png');
    this.load.image('asteroid-03', 'assets/images/asteroid-03.png');
    this.load.image('asteroid-04', 'assets/images/asteroid-04.png');
    this.load.image('asteroid-05', 'assets/images/asteroid-05.png');
    this.load.image('player-bolt', 'assets/images/player-bolt.png');

    // ---------- Background images ----------
    this.load.image('bg-blue-back', 'assets/images/bg-blue-back.png');
    this.load.image('bg-blue-stars', 'assets/images/bg-blue-stars.png');
    this.load.image('bg-stage-back', 'assets/images/bg-stage-back.png');
    this.load.image('ss-bg-back', 'assets/images/ss-bg-back.png');
    this.load.image('ss-bg-stars', 'assets/images/ss-bg-stars.png');

    // ---------- Audio ----------
    this.load.audio('bg-music', 'assets/audio/bg-music.mp3');
    this.load.audio('sfx-shoot', 'assets/audio/sfx-shoot.wav');
    this.load.audio('sfx-laser', 'assets/audio/sfx-laser.wav');
    this.load.audio('sfx-explosion', 'assets/audio/sfx-explosion.wav');
    this.load.audio('sfx-explosion-big', 'assets/audio/sfx-explosion-big.wav');
    this.load.audio('sfx-hit', 'assets/audio/sfx-hit.wav');
    this.load.audio('sfx-mine-deploy', 'assets/audio/sfx-mine-deploy.wav');
    this.load.audio('sfx-player-death', 'assets/audio/sfx-player-death.wav');
    this.load.audio('sfx-powerup', 'assets/audio/sfx-powerup.wav');
  }

  create(): void {
    // ---------- Animations ----------

    // Player thrust
    this.anims.create({
      key: 'thrust-anim',
      frames: this.anims.generateFrameNumbers('player-thrust', { start: 0, end: 3 }),
      frameRate: 20,
      repeat: -1,
    });

    // Enemy animations (spritesheet types)
    this.anims.create({
      key: 'enemy-01-anim',
      frames: this.anims.generateFrameNumbers('enemy-01', { start: 0, end: 4 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy-02-anim',
      frames: this.anims.generateFrameNumbers('enemy-02', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy-03-anim',
      frames: this.anims.generateFrameNumbers('enemy-03', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });

    // Boss animation
    this.anims.create({
      key: 'boss-anim',
      frames: this.anims.generateFrameNumbers('boss', { start: 0, end: 4 }),
      frameRate: 7,
      repeat: -1,
    });

    // Explosion
    this.anims.create({
      key: 'explosion-anim',
      frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 8 }),
      frameRate: 16,
      repeat: 0,
    });

    // Enemy explosion
    this.anims.create({
      key: 'enemy-explosion-anim',
      frames: this.anims.generateFrameNumbers('enemy-explosion', { start: 0, end: 6 }),
      frameRate: 16,
      repeat: 0,
    });

    // Hit effect
    this.anims.create({
      key: 'hit-anim',
      frames: this.anims.generateFrameNumbers('hit', { start: 0, end: 2 }),
      frameRate: 25,
      repeat: 0,
    });

    // Enemy projectile
    this.anims.create({
      key: 'enemy-projectile-anim',
      frames: this.anims.generateFrameNumbers('enemy-projectile', { start: 0, end: 1 }),
      frameRate: 10,
      repeat: -1,
    });

    // ---------- Procedural textures ----------
    generateProceduralTextures(this);

    // ---------- Start menu ----------
    this.scene.start('MenuScene');
  }
}
