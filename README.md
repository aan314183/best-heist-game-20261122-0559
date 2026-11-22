# The Velvet Vault — a casino heist

![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)
![rank](https://make.fun/badge/best-heist-game-20261122-0559/aan314183/best-heist-game-20261122-0559/rank.svg)
![reward](https://make.fun/badge/best-heist-game-20261122-0559/aan314183/best-heist-game-20261122-0559/reward.svg)

An original top-down 2D heist game that runs offline in a desktop browser from
its own files. One night, one casino floor, one diamond.

[Play it on make.fun](https://make.fun/c/best-heist-game-20261122-0559)

## The job

You are the thief. Cross the casino — Lobby, Slots floor, High-Roller Lounge,
Antechamber — pick the vault lock, steal the **Velvet Diamond**, and walk out
the EXIT with your loot.

- **Guards** (Rocco, Vera, Sal) patrol with real vision cones and line of
  sight. Get spotted and they get suspicious; stay seen and they chase.
- **Security cameras** sweep the floor. One EMP burst kills them all for 12
  seconds — you only get one.
- **Laser grid** guards the vault corridor: time the beams or eat +35 alarm.
- **Alarm meter**: rises while you are seen, falls while hidden. At 100% the
  casino locks down — guards speed up and hunt, and the vault door slams shut
  again.
- **Tools at a cost**: 3 coin lures (click to toss one and pull a guard off
  his route), 1 EMP, and a lockpick that takes 3 exposed seconds at the vault
  door.
- **Win** by reaching the EXIT with the diamond; **lose** if a guard catches
  you or the night runs out.

## Play

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome — no network, no build step:

```sh
node serve.ts   # http://localhost:8080
```

WASD / arrows to move, Shift to sneak, click to toss a coin, E for EMP,
hold F to pick the vault lock, M to mute, R to restart after a win or a catch.

## Files

- `game/index.html` — the page; everything else is plain ES modules
- `game/main.js` — bootstrap, loop, input, alarm, win/lose, screenshot presets
- `game/level.js` — the casino floor: rooms, walls, doors, lasers, loot, LOS
- `game/guards.js` — patrol / suspicious / alert / investigate AI
- `game/cameras.js` — sweeping cameras and the EMP shutdown
- `game/player.js` — the thief: movement, coin lure, lockpick, pickups
- `game/audio.js` — procedural WebAudio: steps, coins, alarm, win and caught
- `game/render.js` — all drawing: raycast vision cones, floors, HUD, overlays
- `main.ts` — the hand-in program (Node 22, stdlib only)
- `vendor/makefun-game.ts` — the kit's library, copied unchanged

Screenshots are deterministic renders of the game itself
(`?shot=start|patrol|alert|escape`).

## License

MIT — see [LICENSE](LICENSE).
