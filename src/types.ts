// All enums and interfaces for the game

export enum GameState {
  Playing = 'playing',
  Paused = 'paused',
  BossFight = 'bossFight',
  StageTransition = 'stageTransition',
  GameOver = 'gameOver',
}

export enum WeaponType {
  Single = 'single',
  Double = 'double',
  Triple = 'triple',
  Laser = 'laser',
}

export enum EnemyMovementPattern {
  Straight = 'straight',
  Zigzag = 'zigzag',
  SineWave = 'sineWave',
  DiveBomb = 'diveBomb',
  Strafe = 'strafe',
}

export enum BossPhase {
  BoltVolley = 'boltVolley',
  RaySweep = 'raySweep',
  MinionSpawn = 'minionSpawn',
}

export enum PowerUpType {
  DoubleShotUpgrade = 'doubleShotUpgrade',
  TripleShotUpgrade = 'tripleShotUpgrade',
  LaserBeam = 'laserBeam',
  MineAmmo = 'mineAmmo',
  ShieldRestore = 'shieldRestore',
  ExtraLife = 'extraLife',
  Invincibility = 'invincibility',
}

export const ALL_POWER_UP_TYPES: PowerUpType[] = [
  PowerUpType.DoubleShotUpgrade,
  PowerUpType.TripleShotUpgrade,
  PowerUpType.LaserBeam,
  PowerUpType.MineAmmo,
  PowerUpType.ShieldRestore,
  PowerUpType.ExtraLife,
  PowerUpType.Invincibility,
];

export enum BackgroundSet {
  BlueSpace = 'blueSpace',
  Nebula = 'nebula',
  SpaceShooter = 'spaceShooter',
}

export enum ProjectileOwner {
  Player = 'player',
  Enemy = 'enemy',
  Boss = 'boss',
}

export enum ControlAction {
  Up = 0,
  Down = 1,
  Left = 2,
  Right = 3,
  Fire = 4,
  Mine = 5,
}

export const CONTROL_ACTION_LABELS: Record<ControlAction, string> = {
  [ControlAction.Up]: 'UP',
  [ControlAction.Down]: 'DOWN',
  [ControlAction.Left]: 'LEFT',
  [ControlAction.Right]: 'RIGHT',
  [ControlAction.Fire]: 'FIRE',
  [ControlAction.Mine]: 'MINE',
};

export const ALL_CONTROL_ACTIONS: ControlAction[] = [
  ControlAction.Up, ControlAction.Down, ControlAction.Left,
  ControlAction.Right, ControlAction.Fire, ControlAction.Mine,
];

export interface PlayerControls {
  upKey: number;
  downKey: number;
  leftKey: number;
  rightKey: number;
  fireKey: number;
  mineKey: number;
}

export interface EnemyDefinition {
  textureName: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  isSpriteSheet: boolean;
  hp: number;
  speed: number;
  fireRate: number;
  pattern: EnemyMovementPattern;
  scoreValue: number;
  scale: number;
  projectileSpeed: number;
}

export interface WaveDefinition {
  enemyTypes: number[];
  enemyCount: number;
  spawnInterval: number;
  includeAsteroids: boolean;
  asteroidCount: number;
}

export interface StageDefinition {
  stageNumber: number;
  backgroundSet: BackgroundSet;
  waves: WaveDefinition[];
  difficultyMultiplier: number;
  bossStage: number;
}

export interface HighScoreEntry {
  name: string;
  score: number;
}

export enum StageEventType {
  StageStart = 'stageStart',
  WaveStart = 'waveStart',
  Spawn = 'spawn',
  BossStart = 'bossStart',
}

export interface StageEvent {
  type: StageEventType;
  value?: number;
  spawns?: SpawnRequest[];
}

export enum SpawnRequestType {
  Enemy = 'enemy',
  Asteroid = 'asteroid',
}

export interface SpawnRequest {
  type: SpawnRequestType;
  typeIndex?: number;
  difficulty?: number;
}
