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
