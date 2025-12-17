import { MotionDetector, breezinessToPhrase } from './motion-detector.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class Analytics {
  constructor({ windowSize = 20, emaAlpha = 0.2, sensitivity = 1 } = {}) {
    this.windowSize = windowSize;
    this.emaAlpha = emaAlpha;
    this.samples = [];
    this.mean = null;
    this.jitterEma = 0;
    this.stats = {
      min: null,
      max: null,
      avg: null,
      peakJitter: 0,
    };
    this.sensitivity = sensitivity;
    this.motionDetector = new MotionDetector({ sensitivity });
  }

  setSensitivity(value) {
    this.sensitivity = value;
    this.motionDetector.setSensitivity(value);
  }

  addSample(rssi) {
    this.samples.push(rssi);
    if (this.samples.length > this.windowSize) {
      this.samples.shift();
    }

    this.stats.min = this.stats.min === null ? rssi : Math.min(this.stats.min, rssi);
    this.stats.max = this.stats.max === null ? rssi : Math.max(this.stats.max, rssi);

    const sum = this.samples.reduce((acc, val) => acc + val, 0);
    this.mean = sum / this.samples.length;
    this.stats.avg = this.mean;

    const variance = this.samples.reduce((acc, val) => {
      const diff = val - this.mean;
      return acc + diff * diff;
    }, 0) / this.samples.length;

    const stdDev = Math.sqrt(variance);
    this.jitterEma = this.jitterEma === 0 ? stdDev : this.jitterEma + this.emaAlpha * (stdDev - this.jitterEma);
    this.stats.peakJitter = Math.max(this.stats.peakJitter, this.jitterEma);

    const base = 8 / this.sensitivity;
    const intensity = clamp(this.jitterEma / base, 0, 1);

    const motionMetrics = this.motionDetector.addSample(rssi);
    const breezinessPhrase = breezinessToPhrase(motionMetrics.breeziness);

    return {
      rssi,
      avg: this.mean,
      jitter: stdDev,
      jitterSmoothed: this.jitterEma,
      intensity,
      breeziness: motionMetrics.breeziness,
      breezinessPhrase,
      motion: motionMetrics,
      stats: { ...this.stats },
    };
  }
}

export function mapIntensityToStatus(intensity) {
  if (intensity > 0.7) return '干渉';
  if (intensity > 0.35) return '……気配';
  return '静寂';
}
