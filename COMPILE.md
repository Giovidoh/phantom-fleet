# Compile the Phantom Fleet contract (GitHub Codespaces)

The Compact compiler has **no Windows build** (macOS/Linux only). The clean
no-install workaround is a free GitHub Codespace — a Linux VM in your browser.
Budget: ~15 minutes, mostly waiting.

## 1. Open the Codespace

1. Go to the repo page on GitHub.
2. **Code → Codespaces → Create codespace on main**.
3. Wait for the VM + `postCreateCommand` to finish (it pre-installs the
   Compact toolchain installer; watch the terminal).

## 2. Install the compiler (0.31.1)

In the Codespace terminal:

```bash
# if postCreateCommand already ran the installer, this just refreshes
export PATH="$HOME/.compact/bin:$PATH"
compact --version          # devtools CLI (0.5.x)
compact update             # downloads compactc 0.31.1
compact compile --version  # should print the compiler version
```

## 3. Compile

```bash
cd /workspaces/phantom-fleet
compact compile contract/battleship.compact contract/managed/battleship
```

Expected: a `contract/managed/battleship/` tree with `contract/` (JS + d.ts),
`zkir/`, `keys/`. If the compiler reports a syntax error, fix
`contract/battleship.compact` right there in the Codespace editor and rerun —
the error messages name the line.

## 4. Commit the artifacts back

```bash
git add contract/managed
git commit -m "Add compiled battleship artifacts (compactc 0.31.1)"
git push
```

> `contract/managed/` is intentionally **not** gitignored — the deploy
> scripts (`scripts/midnight/`) and judges must be able to use the compiled
> circuits without a compiler.

## 5. Continue

Follow `scripts/midnight/README.md` (fund a preprod wallet → deploy → call).
