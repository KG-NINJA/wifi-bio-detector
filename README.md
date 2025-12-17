# Presence Observer Wi-Fi

Presence Observer Wi-Fi is a Node.js CLI artwork that treats local Wi-Fi RSSI (signal strength) jitter as a ritualistic presence reading. It translates fluctuations from `netsh`, `airport`, or `iwconfig` into concentric Unicode rings, chords, and quiet Japanese status phrases just like the original browser-based Presence Observer—but this time in your terminal.

> **Disclaimer**: This tool only samples public Wi-Fi signal metrics already exposed by the operating system. It does not capture packets, inspect content, or detect people/ghosts. Instability ≠ entity.

## Features
- Continuous RSSI monitoring (Windows/macOS/Linux) with 500 ms default cadence
- Rolling statistics + EMA jitter smoothing with sensitivity scaling (`--sensitivity 0.6-1.4`)
- ANSI + Unicode visualization using `chalk` + custom renderer (rings, chords, surge highlights)
- Raw JSON stream mode (`--raw`) for piping data into other tools
- Optional JSONL logging with cumulative min/max/avg RSSI and peak jitter
- Graceful shutdown, cursor restore, and helpful errors when Wi-Fi is unavailable

## Installation
```bash
npm install -g presence-observer-wifi
```
Node.js 14 or newer is required.

## Usage
```bash
presence-observer-wifi --sensitivity 1.0 --log data.json --duration 300
```

Common flags:
- `--sensitivity [0.6-1.4]` – tighten/loosen how jitter maps to intensity (default `1.0`)
- `--log path/to/file.jsonl` – append JSON readings for later analysis
- `--duration 120` – exit after N seconds (otherwise run until `Ctrl+C`)
- `--interval 250` – override RSSI polling interval (ms)
- `--raw` – emit newline-delimited JSON instead of ASCII art

### Screenshot / Concept Preview
```
████◆◆◆████            干渉 intensity 0.82
░░░░◆░░░░░░    静寂/……気配 text shifts with jitter EMA
━━━◆━━━◆━━━    Concentric pulses brighten on surge events
```
(Use in a dark terminal for best effect.)

## How It Works
1. **RSSI sampling** – Every interval the CLI runs the platform command (`netsh wlan show interfaces`, `airport -I`, or `iwconfig`) and extracts the dBm RSSI.
2. **Analytics** – Recent samples (window of 20) feed a standard deviation + EMA to derive jitter, intensity, and running min/max/avg/peak stats. Sensitivity simply scales the divisors in the intensity mapping.
3. **Visualization** – The renderer reuses the Presence Observer aesthetic: rings (`░`, `◆`, `█`) and traveling chords animate with ANSI colors (#4de6c8 cyan, #9e6dff purple). When intensity crosses 0.7, a “surge” thickens rings and brightens chords. Status text cycles between `静寂` (silence), `……気配` (faint presence), and `干渉` (interference).
4. **Optional logging** – When `--log` is set, each reading is appended as JSON with timestamp, jitter, and aggregated stats for further analytics.

## Motion Detection (Experimental)

Presence Observer Wi-Fi now attempts to sense gentle “breeze” signatures in RSSI—soft oscillations that might hint at air being disturbed near the antenna. This detector is intentionally poetic and unreliable:

- **Static baseline** – The first ~3 seconds are treated as calm air to establish a reference RSSI level.
- **Breeze signature** – A breeze is a moderate deviation (2–12 dB) with low chaos; jittery spikes do not count.
- **Natural decay** – Confidence fades automatically if the pattern stops repeating.
- **Phrases** – Output shifts from `静寂` to `……気配`, `……薄い揺らぎ`, and `……そよ風` depending on breeziness.

This is speculative sensing, not an alarm. A cat, microwave, or truck rumble can trigger the same response as your hand moving. Accuracy is intentionally ~50–60%—it is ambience, not telemetry.

### Confidence Interpretation
- `静寂` – No noticeable fluctuation.
- `……気配` – Subtle deviation sensed.
- `……薄い揺らぎ` – Gentle movement felt.
- `……そよ風` – Breeze-like oscillation detected.

### Try It
```bash
# baseline experience
presence-observer-wifi

# experiment:
# 1. stay still for ~5 seconds
# 2. wave your hand near the router/antenna
# 3. walk across the room
# 4. return to stillness and watch breeziness fade

# tweak responsiveness
presence-observer-wifi --sensitivity 0.8   # more reactive, faster to report breezes
presence-observer-wifi --sensitivity 1.3   # calmer, requires bigger oscillations
```

## Limitations
- Requires Wi-Fi interfaces and OS utilities noted above; Ethernet-only systems or disabled radios will raise errors.
- Signal metrics come from OS abstractions—no guarantee of precision, update rate, or access permissions.
- Some Linux distributions expose RSSI via `iw` instead of `iwconfig`; future contributions welcome.
- Running on battery or in virtualized environments may make readings noisy or unavailable.
- Breeze detection is speculative art: it does **not** detect people, intentions, or specific motion—treat the phrases as ambient poetry only.

## Contributing
Issues and PRs are welcome! Please:
1. Fork the repo and create a feature branch.
2. Follow the existing code style (ES modules, async/await, small modules).
3. Add tests or manual reproduction steps for analytics/visual output tweaks.
4. Confirm `npm run lint`/tests (if added) before submitting.

## License
MIT License – see [LICENSE](./LICENSE).
