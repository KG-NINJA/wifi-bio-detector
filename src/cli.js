#!/usr/bin/env node
import fs from 'fs';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import chalk from 'chalk';
import { WifiMonitor } from './wifi-monitor.js';
import { Analytics, mapIntensityToStatus } from './analytics.js';
import { Visualizer } from './visualizer.js';

const argv = yargs(hideBin(process.argv))
  .scriptName('presence-observer-wifi')
  .option('sensitivity', {
    alias: 's',
    type: 'number',
    default: 1.0,
    describe: 'Adjust RSSI jitter sensitivity (0.6 - 1.4)',
  })
  .option('log', {
    alias: 'l',
    type: 'string',
    describe: 'Write RSSI/jitter data to JSON file',
  })
  .option('duration', {
    alias: 'd',
    type: 'number',
    describe: 'Run duration in seconds (default: infinite)',
  })
  .option('raw', {
    type: 'boolean',
    default: false,
    describe: 'Stream raw JSON instead of ASCII art',
  })
  .option('interval', {
    alias: 'i',
    type: 'number',
    default: 500,
    describe: 'Polling interval in milliseconds',
  })
  .help()
  .alias('help', 'h')
  .version()
  .argv;

if (argv.sensitivity < 0.6 || argv.sensitivity > 1.4) {
  console.error('Sensitivity must be between 0.6 and 1.4');
  process.exit(1);
}

const monitor = new WifiMonitor({ interval: argv.interval });
const analytics = new Analytics({ sensitivity: argv.sensitivity });
let visualizer = null;
if (!argv.raw) {
  visualizer = new Visualizer();
}

let logStream = null;
if (argv.log) {
  logStream = fs.createWriteStream(argv.log, { flags: 'a' });
}

let shuttingDown = false;
const cleanup = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  monitor.stop();
  visualizer?.dispose();
  if (logStream) {
    logStream.end();
    logStream = null;
  }
  process.stdout.write('\n');
  process.exit(code);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

monitor.on('error', (err) => {
  const message = `Wi-Fi monitor error: ${err.message}`;
  if (argv.raw) {
    process.stderr.write(message + '\n');
  } else {
    process.stdout.write('\n' + chalk.red(message) + '\n');
  }
  if (message.includes('Unsupported platform')) {
    cleanup(1);
  }
});

monitor.on('data', (sample) => {
  analytics.setSensitivity(argv.sensitivity);
  const metrics = analytics.addSample(sample.rssi);
  const status = mapIntensityToStatus(metrics.intensity);
  const payload = {
    timestamp: sample.timestamp,
    rssi: sample.rssi,
    avg: metrics.avg,
    jitter: metrics.jitter,
    jitterSmoothed: metrics.jitterSmoothed,
    intensity: metrics.intensity,
    status,
    breeziness: metrics.breeziness,
    breezinessPhrase: metrics.breezinessPhrase,
    motion: metrics.motion,
    stats: metrics.stats,
  };

  if (argv.raw) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  } else {
    visualizer.render(payload);
  }

  if (logStream) {
    logStream.write(JSON.stringify(payload) + '\n');
  }
});

monitor.start();

if (argv.duration) {
  setTimeout(() => {
    cleanup();
  }, argv.duration * 1000);
}

console.log(chalk.cyan('Presence Observer Wi-Fi: visualizing RSSI fluctuations. No packets captured.'));
