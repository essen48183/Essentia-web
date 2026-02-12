// 1:1 port of Constants.swift — all numeric constants

export const SCREEN_WIDTH = 1024;
export const SCREEN_HEIGHT = 768;

export const PLAYER_SPEED = 300;
export const PLAYER_SCALE = 3.0;
export const PLAYER_MAX_LIVES = 3;
export const PLAYER_MAX_SHIELD = 100;
export const SHIELD_REGEN_RATE = 20;        // per second
export const HULL_MAX_HITS = 3;             // hits after shield before losing a life
export const SHIELD_REGEN_DELAY = 2.0;      // seconds after last hit
export const INVINCIBILITY_DURATION = 2.0;

export const PLAYER_BOLT_SPEED = 500;
export const PLAYER_BOLT_RADIUS = 5;        // round bullet radius
export const NORMAL_FIRE_RATE = 0.25;
export const DOUBLE_FIRE_RATE = 0.22;
export const TRIPLE_FIRE_RATE = 0.28;
export const TRIPLE_ANGLE = 12;             // degrees for outer shots
export const LASER_DURATION = 0.15;

export const MINE_MAX_AMMO = 5;
export const MINE_DAMAGE = 80;
export const MINE_RADIUS = 10;
export const MINE_EXPLOSION_RADIUS = 100;
export const MINE_LIFETIME = 8.0;

export const ENEMY_BASE_SPEED = 100;
export const ENEMY_FIRE_RATE = 1.5;
export const ENEMY_PROJECTILE_SPEED = 250;

export const BOSS_SPEED = 60;
export const BOSS_HEALTH_BASE = 350;
export const BOSS_BOLT_SPEED = 300;

export const ASTEROID_SPEED = 80;
export const ASTEROID_ROTATION_SPEED = 1.5;

export const POWER_UP_SPEED = 60;
export const POWER_UP_DROP_CHANCE = 0.20;
export const POWER_UP_DURATION = 10.0;

export const BACKGROUND_SCROLL_SPEED = 30;
export const STARS_SCROLL_SPEED = 60;
export const PROPS_SCROLL_SPEED = 90;

export const COMBO_WINDOW = 1.5;
export const MAX_COMBO_MULTIPLIER = 8;

export const Z_BACKGROUND = -100;
export const Z_STARS = -90;
export const Z_PROPS = -80;
export const Z_ASTEROID = 10;
export const Z_ENEMY = 20;
export const Z_POWER_UP = 25;
export const Z_PLAYER = 30;
export const Z_PROJECTILE = 40;
export const Z_EXPLOSION = 50;
export const Z_HUD = 100;

// Virtual joystick / touch controls
export const JOYSTICK_BASE_RADIUS = 60;
export const JOYSTICK_THUMB_RADIUS = 25;
export const JOYSTICK_MAX_DISTANCE = 55;
export const JOYSTICK_DEAD_ZONE = 0.15;
export const TOUCH_BUTTON_RADIUS = 40;
