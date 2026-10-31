# Fault Line

An electrical tower defense game. You're the protection engineer for a building's power system. Faults travel down the feeders toward the main switchgear, and you build protective devices to stop them before the site blacks out.

## Play

No build step. Open `index.html` in a browser, or serve the folder locally:

```bash
npx serve .
# or
python3 -m http.server 8000
```

It's designed for phones first and works on desktop too.

## How it works

- **Campaign:** five sites (Strip Center, Hospital, Data Center, High-Rise, Solar Farm), each with 10 waves and a boss on wave 10. Beat a level to unlock the next. Progress is saved in the browser.
- **Power:** towers only fire inside a supply ring. The switchgear and every generator project one. Voltage drops toward the edge of a ring.
- **Bus load:** every tower draws kW. Generators add capacity.
- **Selective coordination:** a Fuse placed upstream of a Breaker gives both +25% damage.
- **Placement:** drag a tower onto a pad, or tap it, tap a pad, and confirm. Drag a placed tower to move it.

### Towers

| Tower | Role | Top upgrade |
|---|---|---|
| Circuit Breaker | Fast single-target, hits the fault nearest the main | Insulated Case: pierces armor |
| Fuse | Heavy hit on the highest-health enemy, burns out after N shots | Expulsion: splash damage |
| Tesla Coil | Chain lightning across groups | Faraday Cage: shields nearby towers |
| Surge Arrester | Area pulse, 2.5x vs surges, diverts lightning | Lightning Mast: periodic strike |
| Ground Fault Relay | Reveals invisible ground faults | Resistance Grounding: slows enemies |
| Harmonic Filter | 3x vs harmonics | K-Rated Isolation: stops splitting |
| Capacitor Bank | Boosts fire rate of nearby towers | Static VAR Comp.: slows enemies |
| Generator | Supply ring, kW capacity, income | Microgrid: biggest ring |

### Enemies

Surges, harmonics (split into ripples), invisible ground faults, and squirrels that ignore the feeder and short out towers.

**Bosses:** Squirrel Colony, Harmonic Hydra (during a utility outage), Arc Flash, Ground Fault Wraith (during a lightning storm), and a combined Total System Fault on the final level.

## Project layout

```
index.html      markup: HUD, map canvas, tray, overlays, help guide
css/style.css   all styles and theme tokens
js/game.js      game data, simulation, rendering, UI and tutorial
```

The game is plain JavaScript drawn on a single `<canvas>`, with no dependencies. Fonts load from Google Fonts with system fallbacks.

## Roadmap ideas

- Package as iOS and Android apps with Capacitor
- Sound effects and music
- Endless mode and leaderboards
- More maps and towers
