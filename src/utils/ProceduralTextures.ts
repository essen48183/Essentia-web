import Phaser from 'phaser';
import * as C from '../constants';

/**
 * Generate procedural textures for player bolt and space mine.
 * Call once during BootScene.create().
 */
export function generateProceduralTextures(scene: Phaser.Scene): void {
  generatePlayerBoltTexture(scene);
  generateMineTexture(scene);
}

function generatePlayerBoltTexture(scene: Phaser.Scene): void {
  const r = C.PLAYER_BOLT_RADIUS;
  const size = r * 2 + 8; // extra for glow
  const g = scene.add.graphics({ x: 0, y: 0 });
  const cx = size / 2;
  const cy = size / 2;

  // Outer glow circle
  g.fillStyle(0x4dccff, 0.6);
  g.fillCircle(cx, cy, r + 2);

  // Main circle (cyan)
  g.fillStyle(0x4dccff, 1.0);
  g.fillCircle(cx, cy, r);

  // Inner bright core (white)
  g.fillStyle(0xffffff, 1.0);
  g.fillCircle(cx, cy, r * 0.45);

  g.generateTexture('player-bolt-tex', size, size);
  g.destroy();
}

function generateMineTexture(scene: Phaser.Scene): void {
  const r = C.MINE_RADIUS;
  const size = (r + 6) * 2;
  const g = scene.add.graphics({ x: 0, y: 0 });
  const cx = size / 2;
  const cy = size / 2;

  // Outer ring
  g.fillStyle(0xff4d1a, 0.8);
  g.fillCircle(cx, cy, r);
  g.lineStyle(2, 0xff0000, 1.0);
  g.strokeCircle(cx, cy, r);

  // Inner core (yellow)
  g.fillStyle(0xffff00, 1.0);
  g.fillCircle(cx, cy, r * 0.35);

  // Spikes
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    const sx = cx + Math.cos(angle) * (r + 3);
    const sy = cy + Math.sin(angle) * (r + 3);
    g.fillStyle(0xff0000, 1.0);
    g.fillCircle(sx, sy, 2.5);
  }

  g.generateTexture('mine-tex', size, size);
  g.destroy();
}
