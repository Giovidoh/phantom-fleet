// Fleet model + packing, shared by the UI, the bot and the ZK inputs.
//
// Board index convention (must match circuits/hitmiss.circom):
//   idx = x*10 + y   where x = row (0..9, shown as A..J), y = column (0..9, shown as 1..10)

export const FIELD_P = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export interface ShipDef {
  name: string;
  size: number;
}

export const SHIP_DEFS: ShipDef[] = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 },
];

export const TOTAL_SHIP_CELLS = SHIP_DEFS.reduce((n, s) => n + s.size, 0); // 17

export interface Ship {
  name: string;
  size: number;
  cells: number[];
  hits: number;
}

export interface Fleet {
  board: number[]; // 100 cells, 0 = water, 1 = ship
  ships: Ship[];
}

export const emptyFleet = (): Fleet => ({ board: new Array(100).fill(0), ships: [] });

export const toIdx = (x: number, y: number) => x * 10 + y;
export const coordName = (idx: number) =>
  `${"ABCDEFGHIJ"[Math.floor(idx / 10)]}${(idx % 10) + 1}`;

export function shipCells(x: number, y: number, size: number, horiz: boolean): number[] {
  return Array.from({ length: size }, (_, i) => toIdx(x + (horiz ? 0 : i), y + (horiz ? i : 0)));
}

export function inBounds(x: number, y: number, size: number, horiz: boolean): boolean {
  return horiz ? y + size <= 10 : x + size <= 10;
}

export function canPlace(board: number[], x: number, y: number, size: number, horiz: boolean): boolean {
  if (!inBounds(x, y, size, horiz)) return false;
  return shipCells(x, y, size, horiz).every((c) => board[c] === 0);
}

export function placeShip(fleet: Fleet, def: ShipDef, x: number, y: number, horiz: boolean): Fleet {
  const cells = shipCells(x, y, def.size, horiz);
  const board = fleet.board.slice();
  cells.forEach((c) => (board[c] = 1));
  return { board, ships: [...fleet.ships, { name: def.name, size: def.size, cells, hits: 0 }] };
}

export function randomFleet(): Fleet {
  let fleet = emptyFleet();
  for (const def of SHIP_DEFS) {
    for (;;) {
      const horiz = Math.random() < 0.5;
      const x = Math.floor(Math.random() * (horiz ? 10 : 10 - def.size + 1));
      const y = Math.floor(Math.random() * (horiz ? 10 - def.size + 1 : 10));
      if (canPlace(fleet.board, x, y, def.size, horiz)) {
        fleet = placeShip(fleet, def, x, y, horiz);
        break;
      }
    }
  }
  return fleet;
}

// packed = Σ board[i]·2^i  — exactly what the circuit reconstructs from the private board
export function packBoard(board: number[]): bigint {
  let packed = 0n;
  for (let i = 0; i < 100; i++) if (board[i]) packed |= 1n << BigInt(i);
  return packed;
}

// 248-bit random salt, reduced into the bn128 scalar field
export function randomSalt(): string {
  const bytes = new Uint8Array(31);
  crypto.getRandomValues(bytes);
  let hex = "0x";
  bytes.forEach((b) => (hex += b.toString(16).padStart(2, "0")));
  return (BigInt(hex) % FIELD_P).toString();
}
