import { buildPoseidon } from "circomlibjs";

type Poseidon = Awaited<ReturnType<typeof buildPoseidon>>;

let cached: Promise<Poseidon> | null = null;

export function getPoseidon(): Promise<Poseidon> {
  if (!cached) cached = buildPoseidon();
  return cached;
}

// commitment = Poseidon(packedBoard, salt) — identical to the circuit's public input
export async function commitmentOf(packed: bigint, salt: string): Promise<string> {
  const poseidon = await getPoseidon();
  return poseidon.F.toObject(poseidon([packed, BigInt(salt)])).toString();
}
