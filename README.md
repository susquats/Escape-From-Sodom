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

## Milestone 4: Sodomites & halos

- **Sodomites** stand still until they come on screen, then walk toward Lot (hopping over walls). Stomp them from above; any other contact kills Lot. Touching a family member turns them to salt. The destruction wall and fireballs burn them.
- **Halos** summon two angels for a few seconds: Lot runs faster, is protected from hazards and enemies (enemies get bonked; pits and the destruction wall still kill), salted family are rescued and everyone is briefly invulnerable. Grabbing another halo mid-boost extends it.
- Debug (`?debug`): `5` triggers an angel boost; the debug line shows enemy count and boost timer.
- Tuning: `SODOMITE` and `ANGEL` in `src/config.js`.

## Milestone 5 — Leaving Sodom + Act II

- Act I now ends at a fire chasm: crossing the gate (tx 141) starts the angel pickup. Family members still salted are lost; the rest are carried away.
- Act II (`FlightScene`): flap with Space/Up/W or tap anywhere. Obstacles are scripted (`SCRIPT` in `src/scenes/FlightScene.js`). Crashing or falling restarts Act II, losses kept. The top of the screen is a soft ceiling.
- After the landing the scene fades into the wilderness (Milestone 6).
- Debug: `?scene=flight` starts in Act II; add `&debug` for hitbox, `I` toggles invincibility.
- Tuning lives in `FLIGHT` in `src/config.js`.

## Milestone 6 — Wilderness + Act III

- **Wilderness** (`WildernessScene`): quiet ~15 s walk right with the family, no hazards. Salt stomp works and the wife may still look back. Anyone still salted when Lot walks off the right edge is lost. R restarts the scene (losses persist).
- **Act III** (`MountainScene`): Doodle-Jump climb. Lot bounces automatically; you only steer (← → / A D, or the split touch buttons: left bottom-left, right bottom-right). Jump does nothing. The camera only scrolls up; falling below the screen shows "AAAAH!" and restarts Act III with the identical layout (seeded). Moving platforms sweep sideways; crumbling platforms break when bounced on and return after 2.5 s. Reaching the top platform walks Lot into the cave, then a temporary "TO BE CONTINUED" card (R = fresh run).
- Debug: `?scene=wilderness` / `?scene=mountain` (add `&debug`). In Act III `I` toggles invincibility (Lot is thrown back up when falling), `T` teleports near the top. Wilderness debug keys match Act I (`1`/`2`/`3` salt, `4` wife look-back).
- Tuning: `MOUNTAIN` in `src/config.js`.
