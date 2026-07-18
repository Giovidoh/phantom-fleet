// Phantom Fleet — one-shot circuit build + Groth16 setup pipeline.
//
//   node scripts/build-circuit.mjs
//
// Steps: circom compile -> powers of tau (bn128, pot12, fixed non-interactive
// entropy — this is a demo ceremony) -> groth16 setup -> zkey contribute ->
// export verification key -> copy wasm/zkey/vkey into public/zk/.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const build = join(root, "build");
const pub = join(root, "public", "zk");
mkdirSync(build, { recursive: true });
mkdirSync(pub, { recursive: true });

const circom = join(root, "tools", process.platform === "win32" ? "circom.exe" : "circom");
const snarkjsCli = join(root, "node_modules", "snarkjs", "build", "cli.cjs");

const run = (cmd, args) => {
  console.log(`\n$ ${cmd.split(/[\\/]/).pop()} ${args.join(" ")}`);
  execFileSync(cmd, args, { cwd: root, stdio: "inherit" });
};
const snark = (...args) => run(process.execPath, [snarkjsCli, ...args]);

if (!existsSync(circom)) {
  console.error("tools/circom.exe missing — download it from https://github.com/iden3/circom/releases");
  process.exit(1);
}

// 1. compile circuit
run(circom, [
  join("circuits", "hitmiss.circom"),
  "--r1cs", "--wasm", "--sym",
  "-l", join("node_modules", "circomlib", "circuits"),
  "-o", "build",
]);

// 2. powers of tau (pot12, fixed entropy — deterministic demo ceremony, NOT for production)
snark("powersoftau", "new", "bn128", "12", join("build", "pot12_0.ptau"), "-v");
snark("powersoftau", "contribute", join("build", "pot12_0.ptau"), join("build", "pot12_1.ptau"),
  "--name=phantom-fleet", "-e=phantom-fleet-potau-fixed-entropy");
snark("powersoftau", "prepare", "phase2", join("build", "pot12_1.ptau"), join("build", "pot12_final.ptau"), "-v");

// 3. groth16 setup + second contribution + verification key
snark("groth16", "setup", join("build", "hitmiss.r1cs"), join("build", "pot12_final.ptau"), join("build", "hitmiss_0.zkey"));
snark("zkey", "contribute", join("build", "hitmiss_0.zkey"), join("build", "hitmiss_final.zkey"),
  "--name=phantom-fleet", "-e=phantom-fleet-zkey-fixed-entropy");
snark("zkey", "export", "verificationkey", join("build", "hitmiss_final.zkey"), join("build", "verification_key.json"));

// 4. publish artifacts used by the web app
copyFileSync(join(build, "hitmiss_js", "hitmiss.wasm"), join(pub, "hitmiss.wasm"));
copyFileSync(join(build, "hitmiss_final.zkey"), join(pub, "hitmiss.zkey"));
copyFileSync(join(build, "verification_key.json"), join(pub, "verification_key.json"));

console.log("\n✓ circuit built — artifacts in public/zk/ (hitmiss.wasm, hitmiss.zkey, verification_key.json)");
