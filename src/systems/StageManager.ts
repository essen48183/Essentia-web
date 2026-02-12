import {
  StageDefinition, WaveDefinition, BackgroundSet,
  StageEvent, StageEventType, SpawnRequest, SpawnRequestType,
} from '../types';

export class StageManager {
  currentStage = 1;
  currentWave = 0;
  waveTimer = 0;
  spawnTimer = 0;
  enemiesSpawnedInWave = 0;
  enemiesAlive = 0;
  isBossPhase = false;
  isStageTransition = false;
  stageTransitionTimer = 0;
  isWaveActive = false;
  waveDelay = 2.0;

  private stages: StageDefinition[] = [];

  constructor() {
    this.setupStages();
  }

  private setupStages(): void {
    // Stage 1: Blue space, basic enemies
    const stage1Waves: WaveDefinition[] = [
      { enemyTypes: [0], enemyCount: 4, spawnInterval: 1.2, includeAsteroids: true, asteroidCount: 2 },
      { enemyTypes: [0, 1], enemyCount: 6, spawnInterval: 1.0, includeAsteroids: true, asteroidCount: 3 },
      { enemyTypes: [0, 1, 2], enemyCount: 8, spawnInterval: 0.9, includeAsteroids: false, asteroidCount: 0 },
      { enemyTypes: [1, 2], enemyCount: 6, spawnInterval: 0.8, includeAsteroids: true, asteroidCount: 4 },
    ];
    this.stages.push({ stageNumber: 1, backgroundSet: BackgroundSet.BlueSpace, waves: stage1Waves, difficultyMultiplier: 1.0, bossStage: 1 });

    // Stage 2: Nebula
    const stage2Waves: WaveDefinition[] = [
      { enemyTypes: [0, 3, 4], enemyCount: 6, spawnInterval: 1.0, includeAsteroids: true, asteroidCount: 3 },
      { enemyTypes: [1, 2, 5], enemyCount: 8, spawnInterval: 0.9, includeAsteroids: false, asteroidCount: 0 },
      { enemyTypes: [3, 4, 5, 6], enemyCount: 10, spawnInterval: 0.8, includeAsteroids: true, asteroidCount: 4 },
      { enemyTypes: [2, 5, 6, 7], enemyCount: 8, spawnInterval: 0.7, includeAsteroids: true, asteroidCount: 5 },
      { enemyTypes: [0, 1, 2, 3], enemyCount: 12, spawnInterval: 0.7, includeAsteroids: false, asteroidCount: 0 },
    ];
    this.stages.push({ stageNumber: 2, backgroundSet: BackgroundSet.Nebula, waves: stage2Waves, difficultyMultiplier: 1.3, bossStage: 2 });

    // Stage 3: SpaceShooter BG
    const stage3Waves: WaveDefinition[] = [
      { enemyTypes: [0, 1, 2, 3, 4, 5, 6, 7], enemyCount: 8, spawnInterval: 0.9, includeAsteroids: true, asteroidCount: 4 },
      { enemyTypes: [5, 6, 7], enemyCount: 10, spawnInterval: 0.7, includeAsteroids: true, asteroidCount: 5 },
      { enemyTypes: [2, 4, 6, 7], enemyCount: 12, spawnInterval: 0.6, includeAsteroids: false, asteroidCount: 0 },
      { enemyTypes: [0, 1, 2, 3, 4, 5, 6, 7], enemyCount: 14, spawnInterval: 0.6, includeAsteroids: true, asteroidCount: 6 },
      { enemyTypes: [5, 6, 7], enemyCount: 10, spawnInterval: 0.5, includeAsteroids: true, asteroidCount: 4 },
      { enemyTypes: [3, 4, 5, 6, 7], enemyCount: 16, spawnInterval: 0.5, includeAsteroids: false, asteroidCount: 0 },
    ];
    this.stages.push({ stageNumber: 3, backgroundSet: BackgroundSet.SpaceShooter, waves: stage3Waves, difficultyMultiplier: 1.6, bossStage: 3 });
  }

  get currentStageDef(): StageDefinition {
    const idx = (this.currentStage - 1) % this.stages.length;
    return this.stages[idx];
  }

  get currentWaveDef(): WaveDefinition | null {
    const stage = this.currentStageDef;
    if (this.currentWave >= stage.waves.length) return null;
    return stage.waves[this.currentWave];
  }

  update(dt: number): StageEvent | null {
    if (this.isStageTransition) {
      this.stageTransitionTimer -= dt;
      if (this.stageTransitionTimer <= 0) {
        this.isStageTransition = false;
        this.currentWave = 0;
        this.enemiesSpawnedInWave = 0;
        this.waveTimer = 0;
        this.spawnTimer = 0;
        return { type: StageEventType.StageStart, value: this.currentStage };
      }
      return null;
    }

    if (this.isBossPhase) return null;

    if (!this.isWaveActive) {
      this.waveTimer += dt;
      if (this.waveTimer >= this.waveDelay) {
        this.isWaveActive = true;
        this.waveTimer = 0;
        this.spawnTimer = 0;
        this.enemiesSpawnedInWave = 0;
        return { type: StageEventType.WaveStart, value: this.currentWave + 1 };
      }
      return null;
    }

    const waveDef = this.currentWaveDef;
    if (!waveDef) {
      this.isBossPhase = true;
      return { type: StageEventType.BossStart, value: this.currentStageDef.bossStage };
    }

    this.spawnTimer += dt;
    if (this.spawnTimer >= waveDef.spawnInterval && this.enemiesSpawnedInWave < waveDef.enemyCount) {
      this.spawnTimer = 0;
      this.enemiesSpawnedInWave++;
      const typeIndex = waveDef.enemyTypes[Math.floor(Math.random() * waveDef.enemyTypes.length)];

      const spawns: SpawnRequest[] = [];
      spawns.push({ type: SpawnRequestType.Enemy, typeIndex, difficulty: this.currentStageDef.difficultyMultiplier });

      if (waveDef.includeAsteroids && this.enemiesSpawnedInWave % 3 === 0) {
        spawns.push({ type: SpawnRequestType.Asteroid });
      }

      return { type: StageEventType.Spawn, spawns };
    }

    // Check wave complete
    if (this.enemiesSpawnedInWave >= waveDef.enemyCount && this.enemiesAlive <= 0) {
      this.isWaveActive = false;
      this.currentWave++;
      this.waveTimer = 0;

      if (this.currentWave >= this.currentStageDef.waves.length) {
        this.isBossPhase = true;
        return { type: StageEventType.BossStart, value: this.currentStageDef.bossStage };
      }
    }

    return null;
  }

  bossDefeated(): void {
    this.isBossPhase = false;
    this.isStageTransition = true;
    this.stageTransitionTimer = 4.0;
    this.currentStage++;
  }

  reset(): void {
    this.currentStage = 1;
    this.currentWave = 0;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.enemiesSpawnedInWave = 0;
    this.enemiesAlive = 0;
    this.isBossPhase = false;
    this.isStageTransition = false;
    this.isWaveActive = false;
  }
}
