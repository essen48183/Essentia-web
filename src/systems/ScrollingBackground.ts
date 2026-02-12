import Phaser from 'phaser';
import * as C from '../constants';
import { BackgroundSet } from '../types';

interface BgLayer {
  tileSprite: Phaser.GameObjects.TileSprite;
  speed: number;
}

export class ScrollingBackground {
  private layers: BgLayer[] = [];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setup(bgSet: BackgroundSet): void {
    this.destroy();

    switch (bgSet) {
      case BackgroundSet.BlueSpace:
        this.addLayer('bg-blue-back', C.BACKGROUND_SCROLL_SPEED, C.Z_BACKGROUND);
        this.addLayer('bg-blue-stars', C.STARS_SCROLL_SPEED, C.Z_STARS);
        break;
      case BackgroundSet.Nebula:
        this.addLayer('bg-stage-back', C.BACKGROUND_SCROLL_SPEED, C.Z_BACKGROUND);
        this.addLayer('bg-blue-stars', C.STARS_SCROLL_SPEED, C.Z_STARS);
        break;
      case BackgroundSet.SpaceShooter:
        this.addLayer('ss-bg-back', C.BACKGROUND_SCROLL_SPEED, C.Z_BACKGROUND);
        this.addLayer('ss-bg-stars', C.STARS_SCROLL_SPEED, C.Z_STARS);
        break;
    }
  }

  private addLayer(textureKey: string, speed: number, depth: number): void {
    const ts = this.scene.add.tileSprite(
      C.SCREEN_WIDTH / 2, C.SCREEN_HEIGHT / 2,
      C.SCREEN_WIDTH, C.SCREEN_HEIGHT,
      textureKey
    );
    ts.setDepth(depth);
    this.layers.push({ tileSprite: ts, speed });
  }

  update(dt: number): void {
    for (const layer of this.layers) {
      layer.tileSprite.tilePositionY -= layer.speed * dt;
    }
  }

  destroy(): void {
    for (const layer of this.layers) {
      layer.tileSprite.destroy();
    }
    this.layers = [];
  }
}
