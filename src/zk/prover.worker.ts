// Web Worker: runs Groth16 proving off the main thread so the UI stays alive.
import { groth16 } from "snarkjs";

const ctx: any = self;

ctx.onmessage = async (e: MessageEvent) => {
  const { id, input, wasmUrl, zkeyUrl } = e.data;
  try {
    const t0 = performance.now();
    const { proof, publicSignals } = await groth16.fullProve(input, wasmUrl, zkeyUrl);
    const proveMs = Math.round(performance.now() - t0);
    ctx.postMessage({ id, ok: true, proof, publicSignals, proveMs });
  } catch (err) {
    ctx.postMessage({ id, ok: false, error: String((err as Error)?.message ?? err) });
  }
};
