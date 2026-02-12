import Phaser from 'phaser';
import * as C from '../constants';

/**
 * Touch controls: virtual joystick (lower-left) + Fire/Mine buttons (lower-right).
 * Multi-touch aware — each element tracks its own pointer ID.
 */
export class TouchControls {
  private scene: Phaser.Scene;

  // --- Joystick state ---
  private joystickBaseGfx: Phaser.GameObjects.Graphics;
  private joystickThumbGfx: Phaser.GameObjects.Graphics;
  private joystickPointerId: number | null = null;
  private baseX = 0;
  private baseY = 0;

  // --- Buttons ---
  private fireGfx: Phaser.GameObjects.Graphics;
  private fireLabel: Phaser.GameObjects.Text;
  private firePointerId: number | null = null;
  private readonly fireBtnX: number;
  private readonly fireBtnY: number;

  private mineGfx: Phaser.GameObjects.Graphics;
  private mineLabel: Phaser.GameObjects.Text;
  private minePointerId: number | null = null;
  private readonly mineBtnX: number;
  private readonly mineBtnY: number;

  // --- Public API ---
  dx = 0;
  dy = 0;
  isTouching = false;
  fireDown = false;
  minePressed = false;
  enabled = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Button positions
    this.fireBtnX = C.SCREEN_WIDTH - 80;
    this.fireBtnY = C.SCREEN_HEIGHT - 80;
    this.mineBtnX = C.SCREEN_WIDTH - 80;
    this.mineBtnY = C.SCREEN_HEIGHT - 180;

    // --- Create joystick graphics (hidden until touched) ---
    this.joystickBaseGfx = scene.add.graphics().setDepth(C.Z_HUD + 5).setVisible(false);
    this.joystickThumbGfx = scene.add.graphics().setDepth(C.Z_HUD + 6).setVisible(false);

    // --- Create fire button ---
    this.fireGfx = scene.add.graphics().setDepth(C.Z_HUD + 5);
    this.drawButton(this.fireGfx, this.fireBtnX, this.fireBtnY, false);
    this.fireLabel = scene.add.text(this.fireBtnX, this.fireBtnY, 'FIRE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#00ffff',
      align: 'center',
    }).setOrigin(0.5, 0.5).setDepth(C.Z_HUD + 6).setAlpha(0.6);

    // --- Create mine button ---
    this.mineGfx = scene.add.graphics().setDepth(C.Z_HUD + 5);
    this.drawButton(this.mineGfx, this.mineBtnX, this.mineBtnY, false);
    this.mineLabel = scene.add.text(this.mineBtnX, this.mineBtnY, 'MINE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#00ffff',
      align: 'center',
    }).setOrigin(0.5, 0.5).setDepth(C.Z_HUD + 6).setAlpha(0.6);

    // --- Input listeners ---
    scene.input.on('pointerdown', this.onPointerDown, this);
    scene.input.on('pointermove', this.onPointerMove, this);
    scene.input.on('pointerup', this.onPointerUp, this);

    // Enable multi-touch
    scene.input.addPointer(2); // up to 3 total (default 1 + 2)
  }

  // --- Drawing helpers ---

  private drawJoystickBase(x: number, y: number): void {
    this.joystickBaseGfx.clear();
    this.joystickBaseGfx.fillStyle(0xffffff, 0.15);
    this.joystickBaseGfx.fillCircle(x, y, C.JOYSTICK_BASE_RADIUS);
    this.joystickBaseGfx.lineStyle(2, 0x00ffff, 0.3);
    this.joystickBaseGfx.strokeCircle(x, y, C.JOYSTICK_BASE_RADIUS);
  }

  private drawJoystickThumb(x: number, y: number): void {
    this.joystickThumbGfx.clear();
    this.joystickThumbGfx.fillStyle(0xffffff, 0.4);
    this.joystickThumbGfx.fillCircle(x, y, C.JOYSTICK_THUMB_RADIUS);
    this.joystickThumbGfx.lineStyle(2, 0x00ffff, 0.6);
    this.joystickThumbGfx.strokeCircle(x, y, C.JOYSTICK_THUMB_RADIUS);
  }

  private drawButton(gfx: Phaser.GameObjects.Graphics, x: number, y: number, pressed: boolean): void {
    gfx.clear();
    gfx.fillStyle(0xffffff, pressed ? 0.25 : 0.1);
    gfx.fillCircle(x, y, C.TOUCH_BUTTON_RADIUS);
    gfx.lineStyle(2, 0x00ffff, pressed ? 0.7 : 0.3);
    gfx.strokeCircle(x, y, C.TOUCH_BUTTON_RADIUS);
  }

  // --- Pointer event handlers ---

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) return;

    const px = pointer.x;
    const py = pointer.y;

    // Check fire button first
    if (this.firePointerId === null && this.hitButton(px, py, this.fireBtnX, this.fireBtnY)) {
      this.firePointerId = pointer.id;
      this.fireDown = true;
      this.drawButton(this.fireGfx, this.fireBtnX, this.fireBtnY, true);
      return;
    }

    // Check mine button
    if (this.minePointerId === null && this.hitButton(px, py, this.mineBtnX, this.mineBtnY)) {
      this.minePointerId = pointer.id;
      this.minePressed = true;
      this.drawButton(this.mineGfx, this.mineBtnX, this.mineBtnY, true);
      return;
    }

    // Check joystick zone (bottom-left quadrant)
    if (this.joystickPointerId === null && px < C.SCREEN_WIDTH / 2 && py > C.SCREEN_HEIGHT / 2) {
      this.joystickPointerId = pointer.id;
      this.baseX = px;
      this.baseY = py;
      this.isTouching = true;

      this.drawJoystickBase(this.baseX, this.baseY);
      this.drawJoystickThumb(this.baseX, this.baseY);
      this.joystickBaseGfx.setVisible(true);
      this.joystickThumbGfx.setVisible(true);

      this.dx = 0;
      this.dy = 0;
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) return;

    if (pointer.id === this.joystickPointerId) {
      const deltaX = pointer.x - this.baseX;
      const deltaY = pointer.y - this.baseY;
      const dist = Math.hypot(deltaX, deltaY);

      let clampedX = deltaX;
      let clampedY = deltaY;
      if (dist > C.JOYSTICK_MAX_DISTANCE) {
        clampedX = (deltaX / dist) * C.JOYSTICK_MAX_DISTANCE;
        clampedY = (deltaY / dist) * C.JOYSTICK_MAX_DISTANCE;
      }

      this.drawJoystickThumb(this.baseX + clampedX, this.baseY + clampedY);

      // Normalize to -1..+1
      const norm = Math.min(dist, C.JOYSTICK_MAX_DISTANCE) / C.JOYSTICK_MAX_DISTANCE;
      if (norm < C.JOYSTICK_DEAD_ZONE) {
        this.dx = 0;
        this.dy = 0;
      } else {
        const angle = Math.atan2(deltaY, deltaX);
        const scaled = (norm - C.JOYSTICK_DEAD_ZONE) / (1 - C.JOYSTICK_DEAD_ZONE);
        this.dx = Math.cos(angle) * scaled;
        this.dy = Math.sin(angle) * scaled;
      }
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.joystickPointerId) {
      this.joystickPointerId = null;
      this.isTouching = false;
      this.dx = 0;
      this.dy = 0;
      this.joystickBaseGfx.setVisible(false);
      this.joystickThumbGfx.setVisible(false);
    }

    if (pointer.id === this.firePointerId) {
      this.firePointerId = null;
      this.fireDown = false;
      this.drawButton(this.fireGfx, this.fireBtnX, this.fireBtnY, false);
    }

    if (pointer.id === this.minePointerId) {
      this.minePointerId = null;
      this.drawButton(this.mineGfx, this.mineBtnX, this.mineBtnY, false);
    }
  }

  // --- Helpers ---

  private hitButton(px: number, py: number, bx: number, by: number): boolean {
    return Math.hypot(px - bx, py - by) <= C.TOUCH_BUTTON_RADIUS * 1.3; // slightly generous hit area
  }

  /** Returns true if this pointer ID is being tracked by touch controls. */
  isTrackingPointer(pointerId: number): boolean {
    return pointerId === this.joystickPointerId
        || pointerId === this.firePointerId
        || pointerId === this.minePointerId;
  }

  /** Call each frame — guards against lost pointers. */
  update(): void {
    // Safety: if a tracked pointer is no longer active, release it
    if (this.joystickPointerId !== null) {
      const ptr = this.findPointer(this.joystickPointerId);
      if (!ptr || !ptr.isDown) {
        this.joystickPointerId = null;
        this.isTouching = false;
        this.dx = 0;
        this.dy = 0;
        this.joystickBaseGfx.setVisible(false);
        this.joystickThumbGfx.setVisible(false);
      }
    }
    if (this.firePointerId !== null) {
      const ptr = this.findPointer(this.firePointerId);
      if (!ptr || !ptr.isDown) {
        this.firePointerId = null;
        this.fireDown = false;
        this.drawButton(this.fireGfx, this.fireBtnX, this.fireBtnY, false);
      }
    }
    if (this.minePointerId !== null) {
      const ptr = this.findPointer(this.minePointerId);
      if (!ptr || !ptr.isDown) {
        this.minePointerId = null;
        this.drawButton(this.mineGfx, this.mineBtnX, this.mineBtnY, false);
      }
    }
  }

  private findPointer(id: number): Phaser.Input.Pointer | null {
    const mgr = this.scene.input;
    if (mgr.pointer1?.id === id) return mgr.pointer1;
    if (mgr.pointer2?.id === id) return mgr.pointer2;
    if (mgr.pointer3?.id === id) return mgr.pointer3;
    if (mgr.mousePointer?.id === id) return mgr.mousePointer;
    return null;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onPointerDown, this);
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.joystickBaseGfx.destroy();
    this.joystickThumbGfx.destroy();
    this.fireGfx.destroy();
    this.fireLabel.destroy();
    this.mineGfx.destroy();
    this.mineLabel.destroy();
  }
}
