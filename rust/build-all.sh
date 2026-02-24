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
)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PUBLIC_WASM="$SCRIPT_DIR/../public/wasm"
mkdir -p "$PUBLIC_WASM"

for crate in "${CRATES[@]}"; do
  echo "Building $crate..."
  cd "$SCRIPT_DIR/$crate"
  wasm-pack build --target web --release --out-dir pkg
  snake=$(echo "$crate" | tr '-' '_')
  cp "pkg/${snake}_bg.wasm" "$PUBLIC_WASM/"
  echo "  -> deployed ${snake}_bg.wasm"
done

echo ""
echo "All crates built. WASM files in public/wasm/:"
ls -lh "$PUBLIC_WASM"/*.wasm
