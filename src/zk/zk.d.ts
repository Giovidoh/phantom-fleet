// Minimal ambient types for the ZK deps (neither package ships its own).
declare module "snarkjs" {
  export const groth16: {
    fullProve(
      input: Record<string, unknown>,
      wasmFile: string,
      zkeyFile: string
    ): Promise<{ proof: unknown; publicSignals: string[] }>;
    verify(vkey: unknown, publicSignals: unknown, proof: unknown): Promise<boolean>;
  };
}

declare module "circomlibjs" {
  export function buildPoseidon(): Promise<{
    (inputs: bigint[]): Uint8Array;
    F: { toObject(h: Uint8Array): bigint };
  }>;
}
