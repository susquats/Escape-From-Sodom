# SODOM

Short comedic retro Phaser 3 platformer. This is **Milestone 1: movement prototype**.

```bash
npm install
npm run dev       # also prints a LAN URL to open on a phone
npm run build     # outputs dist/
npm run preview   # serve the production build
```

- Controls: ←/→ or A/D move, Space/↑/W jump, R restart. On touch devices, on-screen buttons appear.
- Add `?debug` to the URL for physics bodies and a vx/vy readout.
- Movement tuning lives in `src/config.js` (`MOVE`).
- Deploy: push to `main`; set **Settings → Pages → Source = GitHub Actions** once.

## Milestone 2: family, salt & rescue

- Lot's family (wife, two daughters) follows him along his exact path.
- Fire vents cycle warn → on → off. A hot vent kills Lot (scene restarts) and turns family members into salt.
- Jump on a salt shaker from above to rescue that member. Salt that falls into the pit is lost until restart.
- `?debug` also shows family states; keys `1`/`2`/`3` salt the wife / first / second daughter.
- Tuning: `FAMILY`, `VENT` and `MOVE.stompBounce` in `src/config.js`.

## Milestone 3: pressure

- **Destruction**: a fire wall enters from the left after a short delay and creeps right. It kills Lot on contact and permanently loses any family member (following or salted) it reaches. It never lags more than `maxLag` px behind the camera; a red pulse on the left edge warns when it is just off-screen.
- **Sulfur**: warning marker at the top of the screen, then a fireball falls straight down. Kills Lot, salts family, leaves a short-lived ground flame. Drops get more frequent toward the city gate.
- **Lot's wife** occasionally stops, says "!", looks back and turns to salt. Jump on her to rescue her (again and again).
- **Retry** (death or `R`) restarts the level but lost family members stay lost. Reload the page for a fresh run. Reaching the city gate ends the test (`SAFE!`); `R` there starts a fresh run.
- **HUD** (top-left): family icons — normal / salt shaker / dim with red X.
- Debug (`?debug`): `0` reset run, `4` force the wife's look-back, `1`/`2`/`3` salt wife/daughters.
- Tuning: `DESTRUCTION`, `SULFUR`, `WIFE` in `src/config.js`.
