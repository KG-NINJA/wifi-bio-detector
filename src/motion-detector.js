// MotionDetector translates gentle RSSI oscillations into a poetic "breeze" reading.
// It never claims to identify people—only the vibe of air shifting around the antenna.
export class MotionDetector {
  constructor({ sensitivity = 1.0 } = {}) {
    this.sensitivity = sensitivity;
    this.history = [];
    this.baselineRssi = null;
    this.baselineWindow = 15; // ~3 seconds to learn quiet baseline at 500 ms interval
    this.motionConfidence = 0;
    this.motionDecay = 0.85; // confidence naturally fades when no breeze signature appears
  }

  setSensitivity(value) {
    this.sensitivity = value;
  }

  addSample(rssi) {
    if (this.baselineRssi === null) {
      this.history.push(rssi);
      if (this.history.length >= this.baselineWindow) {
        const avg = this.history.reduce((a, b) => a + b, 0) / this.history.length;
        this.baselineRssi = avg;
        this.history = [];
      }
      return { motionConfidence: 0, breeziness: 0, deviation: 0, avgDeviation: 0, isBreeze: false };
    }

    this.history.push(rssi);
    if (this.history.length > 20) {
      this.history.shift();
    }

    const deviation = Math.abs(rssi - this.baselineRssi);
    const recentDevs = this.history.map((sample) => Math.abs(sample - this.baselineRssi));
    const avgDeviation = recentDevs.reduce((a, b) => a + b, 0) / (recentDevs.length || 1);
    const devVariance = recentDevs.reduce((acc, dev) => acc + (dev - avgDeviation) ** 2, 0) /
      (recentDevs.length || 1);
    const devStdDev = Math.sqrt(devVariance);

    const isBreeze = deviation > 2 && deviation < 12 && devStdDev > 1 && devStdDev < 8;

    if (isBreeze) {
      this.motionConfidence = Math.min(1, this.motionConfidence + 0.15 / this.sensitivity);
    } else {
      this.motionConfidence *= this.motionDecay;
    }

    const breeziness = this.motionConfidence * (1 - Math.abs(deviation - 5) / 12);

    return {
      motionConfidence: this.motionConfidence,
      breeziness: Math.max(0, breeziness),
      deviation,
      avgDeviation,
      isBreeze,
    };
  }

  reset() {
    this.history = [];
    this.baselineRssi = null;
    this.motionConfidence = 0;
  }
}

export function breezinessToPhrase(breeziness) {
  if (breeziness > 0.6) return '……そよ風';
  if (breeziness > 0.35) return '……薄い揺らぎ';
  if (breeziness > 0.15) return '……気配';
  return '静寂';
}
