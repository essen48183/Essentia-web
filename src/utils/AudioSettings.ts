const MUSIC_KEY = 'essentia_music_volume';
const SFX_KEY = 'essentia_sfx_volume';

class AudioSettingsManager {
  private _musicVolume: number;
  private _sfxVolume: number;

  constructor() {
    const stored_music = localStorage.getItem(MUSIC_KEY);
    const stored_sfx = localStorage.getItem(SFX_KEY);
    this._musicVolume = stored_music !== null ? parseFloat(stored_music) : 0.5;
    this._sfxVolume = stored_sfx !== null ? parseFloat(stored_sfx) : 1.0;
  }

  get musicVolume(): number { return this._musicVolume; }
  set musicVolume(v: number) {
    this._musicVolume = Math.min(1.0, Math.max(0.0, v));
    localStorage.setItem(MUSIC_KEY, String(this._musicVolume));
  }

  get sfxVolume(): number { return this._sfxVolume; }
  set sfxVolume(v: number) {
    this._sfxVolume = Math.min(1.0, Math.max(0.0, v));
    localStorage.setItem(SFX_KEY, String(this._sfxVolume));
  }

  volumeBar(volume: number): string {
    const steps = Math.round(volume * 4);
    const filled = '\u25A0'.repeat(steps);
    const empty = '\u25A1'.repeat(4 - steps);
    return `[${filled}${empty}]`;
  }
}

export const AudioSettings = new AudioSettingsManager();
