import { EventEmitter } from 'events';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PLATFORM = os.platform();

function parseWindows(output) {
  const rssiMatch = output.match(/RSSI\s*:\s*(-?\d+)/i);
  if (rssiMatch) {
    return Number(rssiMatch[1]);
  }
  const signalMatch = output.match(/Signal\s*:\s*(\d+)%/i);
  if (signalMatch) {
    const percent = Number(signalMatch[1]);
    // Rough conversion percent -> dBm (common heuristic)
    return Math.round(percent / 2 - 100);
  }
  return null;
}

function parseMac(output) {
  const match = output.match(/agrCtlRSSI:\s*(-?\d+)/i) || output.match(/RSSI:\s*(-?\d+)/i);
  return match ? Number(match[1]) : null;
}

function parseLinux(output) {
  const match = output.match(/Signal level=\s*(-?\d+)\s*dBm/i);
  if (match) return Number(match[1]);
  const alt = output.match(/Signal level=\s*(-?\d+)/i);
  return alt ? Number(alt[1]) : null;
}

function getCommand() {
  if (PLATFORM === 'win32') {
    return { cmd: 'netsh wlan show interfaces', parser: parseWindows };
  }
  if (PLATFORM === 'darwin') {
    return {
      cmd: '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I',
      parser: parseMac,
    };
  }
  if (PLATFORM === 'linux') {
    return { cmd: 'iwconfig 2>/dev/null', parser: parseLinux };
  }
  return null;
}

export class WifiMonitor extends EventEmitter {
  constructor({ interval = 500 } = {}) {
    super();
    this.interval = interval;
    this.timer = null;
    this.command = getCommand();
    this.running = false;
  }

  async poll() {
    if (!this.command) {
      this.emit('error', new Error(`Unsupported platform: ${PLATFORM}`));
      this.stop();
      return;
    }
    try {
      const { stdout } = await execAsync(this.command.cmd, { timeout: this.interval });
      const value = this.command.parser(stdout);
      if (typeof value === 'number' && Number.isFinite(value)) {
        this.emit('data', { rssi: value, timestamp: Date.now() });
      } else {
        throw new Error('Unable to parse RSSI');
      }
    } catch (err) {
      this.emit('error', err);
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.poll();
    this.timer = setInterval(() => this.poll(), this.interval);
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
