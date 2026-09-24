export const ROWS = 23;
export const TILE_CHARS = { '#': 0, B: 1, T: 2, P: 3, '=': 4, W: 5, b: 6, w: 7 };
export const ENTITY_CHARS = new Set(['L', 'E', 'V', 'H', 'C', 'G', 'A']);
export const SOLID = [0, 1, 2, 3, 5];
export const ONE_WAY = 4;

export function parseLevel(sections) {
  // Validate and join sections
  const joined = Array.from({ length: ROWS }, () => '');
  for (const sec of sections) {
    if (sec.rows.length !== ROWS)
      throw new Error(`Section "${sec.name}": expected ${ROWS} rows, got ${sec.rows.length}`);
    const w = sec.rows[0].length;
    for (let r = 0; r < ROWS; r++) {
      if (sec.rows[r].length !== w)
        throw new Error(`Section "${sec.name}" row ${r}: length ${sec.rows[r].length} != ${w}`);
      joined[r] += sec.rows[r];
    }
  }

  const cols = joined[0].length;
  const data = [];
  const entities = [];
  let lotCount = 0, gateCount = 0;

  for (let r = 0; r < ROWS; r++) {
    data[r] = [];
    for (let c = 0; c < cols; c++) {
      const ch = joined[r][c];
      if (ch in TILE_CHARS) {
        data[r][c] = TILE_CHARS[ch];
      } else if (ENTITY_CHARS.has(ch)) {
        data[r][c] = -1;
        const type = { L: 'lot', E: 'sodomite', V: 'vent', H: 'halo', C: 'checkpoint', G: 'gate', A: 'intro' }[ch];
        entities.push({ type, col: c, row: r });
        if (type === 'lot') lotCount++;
        if (type === 'gate') gateCount++;
      } else if (ch === '.') {
        data[r][c] = -1;
      } else {
        throw new Error(`Unknown char '${ch}' at row ${r} col ${c}`);
      }
    }
  }

  if (lotCount !== 1) throw new Error(`Expected exactly 1 'L', found ${lotCount}`);
  if (gateCount !== 1) throw new Error(`Expected exactly 1 'G', found ${gateCount}`);

  return { cols, rows: ROWS, data, entities };
}
