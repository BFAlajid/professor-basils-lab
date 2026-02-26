#!/bin/bash
set -e

CRATES=(
  "pkmn-type-chart"
  "pkmn-stats"
  "pkmn-catch-rate"
  "pkmn-damage"
  "pkmn-analysis"
  "pkmn-battle"
  "pkmn-breeding"
  "pkmn-showdown"
  "gen3-parser"
  "citrine"
)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PUBLIC_WASM="$SCRIPT_DIR/../public/wasm"
mkdir -p "$PUBLIC_WASM"

echo "WASM SIMD enabled via .cargo/config.toml (target-feature=+simd128)"
echo ""

for crate in "${CRATES[@]}"; do
  echo "Building $crate..."
  cd "$SCRIPT_DIR/$crate"
  wasm-pack build --target web --release --out-dir pkg
  snake=$(echo "$crate" | tr '-' '_')
  cp "pkg/${snake}_bg.wasm" "$PUBLIC_WASM/"
  echo "  -> deployed ${snake}_bg.wasm ($(wc -c < "pkg/${snake}_bg.wasm" | tr -d ' ') bytes)"
done

echo ""
echo "All crates built with SIMD. WASM files in public/wasm/:"
ls -lh "$PUBLIC_WASM"/*.wasm
