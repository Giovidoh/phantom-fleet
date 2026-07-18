// Main-thread ZK plumbing: proving is delegated to a Web Worker
// (src/zk/prover.worker.ts), verification happens right here.
import { groth16 } from "snarkjs";

export interface ProveResult {
  proof: unknown;
  publicSignals: string[];
  proveMs: number;
}

interface Pending {
  resolve: (r: ProveResult) => void;
  reject: (e: Error) => void;
}

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./prover.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent) => {
      const { id, ok, proof, publicSignals, proveMs, error } = e.data;
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (ok) p.resolve({ proof, publicSignals, proveMs });
      else p.reject(new Error(error ?? "proving failed"));
    };
    worker.onerror = (e) => {
      const err = new Error(e.message ?? "worker error");
      pending.forEach((p) => p.reject(err));
      pending.clear();
    };
  }
  return worker;
}

export function proveHitMiss(input: Record<string, unknown>): Promise<ProveResult> {
  const w = getWorker();
  const id = ++seq;
  return new Promise<ProveResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, input, wasmUrl: "/zk/hitmiss.wasm", zkeyUrl: "/zk/hitmiss.zkey" });
  });
}

let vkeyPromise: Promise<unknown> | null = null;
function getVkey(): Promise<unknown> {
  if (!vkeyPromise) vkeyPromise = fetch("/zk/verification_key.json").then((r) => r.json());
  return vkeyPromise;
}

export async function verifyProof(
  publicSignals: string[],
  proof: unknown
): Promise<{ ok: boolean; verifyMs: number }> {
  const vkey = await getVkey();
  const t0 = performance.now();
  const ok = await groth16.verify(vkey, publicSignals, proof);
  return { ok, verifyMs: Math.round(performance.now() - t0) };
}
