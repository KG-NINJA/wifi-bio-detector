import chalk from 'chalk';

const cyan = chalk.hex('#4de6c8');
const purple = chalk.hex('#9e6dff');
const white = chalk.hex('#fefefe');

export class Visualizer {
  constructor() {
    this.phase = 0;
    this.active = false;
  }

  init() {
    if (this.active) return;
    this.active = true;
    process.stdout.write('\u001b[?25l'); // hide cursor
    process.stdout.write('\u001b[2J');
  }

  render(payload) {
    if (!this.active) this.init();
    this.phase += 0.12 + payload.intensity * 0.15 + (payload.breeziness || 0) * 0.1;
    const frame = this.buildFrame(payload.intensity, payload.breeziness || 0);
    const infoLines = this.buildInfo(payload);
    process.stdout.write('\u001b[H');
    process.stdout.write(`${frame}\n${infoLines}`);
  }

  buildFrame(intensity, breeziness) {
    const width = 46;
    const height = 18;
    const lines = [];
    for (let y = 0; y < height; y++) {
      let row = '';
      for (let x = 0; x < width; x++) {
        const nx = x - width / 2;
        const ny = y - height / 2;
        const dist = Math.sqrt((nx * 0.7) ** 2 + ny ** 2);
        let char = ' ';
        const radii = [4, 7, 10, 13];
        const surge = Math.max(0, (intensity - 0.7) * 2);
        const flutter = breeziness * 0.8;
        for (const radius of radii) {
          const thickness = 0.7 + intensity * 1.4 + surge * 0.6 + flutter * 0.5;
          if (Math.abs(dist - radius) < thickness) {
            char = intensity > 0.6 ? '█' : intensity > 0.35 ? '◆' : '░';
          }
        }
        const chord = Math.sin(nx * 0.3 + this.phase + ny * 0.2 + flutter);
        if (Math.abs(chord) < 0.1 + intensity * 0.4 + flutter * 0.2) {
          char = intensity > 0.6 ? '◆' : '∙';
        }
        if (char === '█' || char === '◆') {
          row += purple(char);
        } else if (char === '░' || char === '∙') {
          row += cyan(char);
        } else {
          row += ' ';
        }
      }
      lines.push(row);
    }
    return lines.join('\n');
  }

  buildInfo({ rssi, jitterSmoothed, intensity, status, stats, breeziness, breezinessPhrase }) {
    const barLength = 20;
    const filled = Math.round(intensity * barLength);
    const bar = `${'■'.repeat(filled)}${'·'.repeat(barLength - filled)}`;
    const label = `${status}`;
    const min = stats.min == null ? '—' : stats.min.toFixed(1);
    const max = stats.max == null ? '—' : stats.max.toFixed(1);
    const avg = stats.avg == null ? '—' : stats.avg.toFixed(1);
    const motionLine = `${white('Motion')}: ${cyan(breezinessPhrase || '静寂')} ${white('(~')} ${purple((breeziness || 0).toFixed(2))}${white(')')}`;
    const info = [
      `${white('RSSI')}: ${cyan(`${rssi} dBm`)}  ${white('Jitter')}: ${purple(jitterSmoothed.toFixed(2))}`,
      `${white('Intensity')}: ${purple(intensity.toFixed(2))} ${white('Status')}: ${label}`,
      motionLine,
      `${white('Bar')}: ${cyan(bar)}`,
      `${white('Stats')} min:${min} max:${max} avg:${avg} peakJ:${stats.peakJitter.toFixed(2)}`,
      white('CTRL+C to exit / monitoring RSSI fluctuations only'),
    ];
    return info.join('\n');
  }

  dispose() {
    if (!this.active) return;
    process.stdout.write('\u001b[0m');
    process.stdout.write('\u001b[?25h');
    this.active = false;
  }
}
