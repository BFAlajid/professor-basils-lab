# Citrine — Phase 0

Clean-room Nintendo 3DS emulator in Rust/WASM. This is Phase 0: a standalone
ARM11 (ARMv6K) interpreter that runs in a browser tab, loads a flat ARM
binary, executes instructions, and displays register state.

No Citra code. No Panda3DS code. No code from any existing 3DS emulator.

## Structure

```
citrine/
├── Cargo.toml                    workspace root
└── crates/
    ├── citrine-cpu/              ARM11 interpreter (core crate)
    │   ├── src/
    │   │   ├── lib.rs            Cpu struct, step/run driver, re-exports
    │   │   ├── types.rs          DecodedInstruction enum, addressing modes
    │   │   ├── registers.rs      RegisterFile, banked registers, CPSR/SPSR
    │   │   ├── barrel_shifter.rs LSL/LSR/ASR/ROR/RRX
    │   │   ├── conditions.rs     15 condition codes
    │   │   ├── decoder.rs        ARM bitfield decoder → DecodedInstruction
    │   │   ├── executor.rs       Execute + flag updates + cycle counting
    │   │   └── bus.rs            Memory bus trait
    │   └── tests/
    │       ├── common/mod.rs     Shared TestBus + instruction encoders
    │       ├── arm_data_processing.rs
    │       ├── arm_multiply.rs
    │       ├── arm_branch.rs
    │       ├── arm_load_store.rs
    │       ├── arm_block_transfer.rs
    │       ├── arm_flags.rs
    │       └── arm_conditions.rs
    ├── citrine-core/             System wiring (CPU + flat memory)
    │   └── src/
    │       ├── lib.rs
    │       ├── bus.rs            FlatMemory + MMIO log
    │       └── system.rs         System struct (CPU + bus)
    └── citrine-web/              wasm-bindgen frontend
        ├── src/lib.rs            Emulator struct exposed to JS
        └── www/
            ├── index.html        Frontend page
            └── index.js          UI wiring
```

## What's implemented

ARM mode only (Thumb is Phase 1). Everything below runs through a
decode-then-dispatch pipeline (`DecodedInstruction` enum) so a later IR-based
JIT (runtime `WebAssembly.compile()`) can reuse the same decoder.

### Instruction coverage

- **Data processing** (all 16 opcodes): AND, EOR, SUB, RSB, ADD, ADC, SBC,
  RSC, TST, TEQ, CMP, CMN, ORR, MOV, BIC, MVN
- **Multiply**: MUL, MLA, UMULL, UMLAL, SMULL, SMLAL
- **Branch**: B, BL, BX, BLX (register form)
- **Single data transfer**: LDR, STR, LDRB, STRB
- **Halfword data transfer**: LDRH, STRH, LDRSB, LDRSH
- **Block transfer**: LDM, STM with all four addressing modes (IA/IB/DA/DB)
- **Barrel shifter**: LSL, LSR, ASR, ROR, RRX — both immediate and
  register-specified shift amounts
- **Condition codes**: all 15 (EQ, NE, CS, CC, MI, PL, VS, VC, HI, LS, GE,
  LT, GT, LE, AL) plus NV treated as "never"
- **Addressing modes**: immediate offset, register offset, shifted register
  offset, pre-indexed, post-indexed, writeback
- **Register file**: R0..R15 with FIQ-banked R8..R12, per-mode banked
  R13/R14, per-mode SPSR, 7 processor modes (User, FIQ, IRQ, Supervisor,
  Abort, Undefined, System)
- **CPSR flags**: N, Z, C, V (plus I/F/T/mode bits) with correct arithmetic
  and logical update semantics, including the shifter carry-out for logical
  operations
- **R15 pipeline quirk**: R15 reads as `pc + 8` (or `pc + 12` when used as
  Rm with a register-specified shift)

### What's not yet implemented (Phase 1+)

- Thumb instruction set
- Coprocessor instructions (MRC/MCR, CP15 TLB/cache control)
- MSR/MRS (Move to/from Status Register)
- SWI (software interrupt / SVC)
- Exceptions / interrupt handling
- Saturated arithmetic (QADD, QSUB)
- Media instructions (UADD8, SSUB16, …)
- MMU / virtual addressing
- VFPv2 floating-point

## Building

Prerequisites:

- Rust stable (1.75+ recommended)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/) for the web frontend

### Run the tests

```bash
cd citrine
cargo test --workspace
```

Expected: **142 tests passing, 0 failing.**

Breakdown:
- 44 unit tests inside `citrine-cpu` (decoder, barrel shifter, conditions,
  register banks, flag arithmetic)
- 5 unit tests inside `citrine-core` (bus + system)
- 27 integration tests for data processing
- 18 integration tests for condition codes
- 14 integration tests for load/store
- 10 integration tests for flag arithmetic
- 9 integration tests for multiply/multiply-long
- 8 integration tests for LDM/STM
- 7 integration tests for branches

### Build the WASM module

From the repo root:

```bash
cd citrine/crates/citrine-web
wasm-pack build --target web --out-dir pkg
```

This produces `pkg/citrine_web.js`, `pkg/citrine_web_bg.wasm`, and type
definitions. `wasm-opt` is disabled because the version bundled with
`wasm-pack 0.14.0` does not support bulk-memory operations; the unoptimised
output is still small (tens of KB) for Phase 0.

### Serve the frontend

From `citrine/crates/citrine-web/www`:

```bash
python -m http.server 8000
# or
npx serve .
```

Then open <http://localhost:8000/index.html> in Chrome / Firefox / Safari.

You should see:

- A file picker for flat ARM binaries (`.bin` / `.arm` / `.raw`)
- A base-address field (default `0x00000000`)
- **Step** / **Run** / **Reset** buttons
- A live register dump (R0..R15) with changed values highlighted
- A CPSR flag line (N Z C V plus mode bits)
- An execution log that pretty-prints each executed instruction
- A hex memory viewer with configurable base and length

### Generating a test binary

The fastest way to see it working is to assemble a tiny ARM program. For
example with `arm-none-eabi-as`:

```bash
cat > hello.s <<'EOF'
    .arm
    mov r0, #1
    mov r1, #2
    add r2, r0, r1
    mov r3, #0x42
    b   .            @ spin forever
EOF
arm-none-eabi-as -mcpu=arm11 hello.s -o hello.o
arm-none-eabi-objcopy -O binary hello.o hello.bin
```

Load `hello.bin` in the frontend, click **Run** with max-steps = 10, and
you should see `r0=1`, `r1=2`, `r2=3`, `r3=0x42` in the register panel.

## Architecture notes

### Decode → dispatch → execute

The interpreter is split into two stages:

1. **Decode** (`decoder::decode`): a pure function from `u32` to
   `DecodedInstruction`. Every instruction encoding becomes an enum variant
   with all operand fields already resolved (register indices, immediates,
   shift amounts, addressing flags).

2. **Execute** (`executor::execute`): a match over `DecodedInstruction`
   that calls the appropriate handler. Each handler returns an
   `ExecResult { cycles, branched }` so the driver knows whether to
   auto-advance PC.

This separation means the decoder can be reused verbatim by a later
tiered-JIT tier. The eventual runtime WASM module generator will walk a
basic block of `DecodedInstruction`s and emit translated WASM bytecode;
the hot-path interpreter becomes the profiling baseline.

### Threaded dispatch and WASM tail calls

The current dispatch is a `match` inside `execute()`. When the Rust
toolchain exposes stable `return_call` (WASM tail-calls) — already shipped
in Chrome 112+, Firefox 121+, Safari 18+ — the match becomes an array of
function pointers, each ending in a tail call to the next handler. This is
a single-point change; the `DecodedInstruction` enum and handler
signatures stay the same.

### Memory bus

`citrine_cpu::bus::Bus` is a trait with six methods: `read8/16/32` and
`write8/16/32`. `citrine-core` provides `FlatMemory` (a single `Vec<u8>`)
plus an `mmio_log` for recording accesses to unmapped addresses. Later
phases will add an MMU-aware bus and the 3DS kernel HLE layer — neither
touches the CPU crate.

### Cycle approximation

Each handler reports an approximate cycle cost. The multiply family honours
ARM's early-termination behaviour (2 cycles for 8-bit multipliers,
3/4/5 cycles for 16/24/32-bit respectively). This isn't exact 3DS timing,
but it's enough for timing-sensitive homebrew that polls a cycle counter.

### Unsafe code

Zero `unsafe` blocks across the entire Phase 0 codebase. Mode banking
switching is implemented with an explicit `swap_banks` function and
per-mode register arrays, not pointer math.

## Phase 1 roadmap

1. **Thumb decoder** (~40 instructions) — reuses the same
   `DecodedInstruction` enum where possible.
2. **MSR/MRS + SWI/SVC handling** — enables basic homebrew syscall entry.
3. **CP15 stubs** — cache/TLB operations as no-ops for homebrew that
   bypass the MMU.
4. **Exception vectors** — jump table at `0x00000000` for reset, UND, SVC,
   prefetch abort, data abort, IRQ, FIQ.
5. **Tiered JIT tier 1** — runtime `WebAssembly.compile()` of hot basic
   blocks. Profile counter lives inside the interpreter; hot blocks get
   translated to a new WASM module and registered in a function table.
6. **Basic HLE kernel** — thread scheduler, SVC table, minimal service
   port registration (srv, gsp, hid).
7. **First pixel via WebGPU** — PICA200 framebuffer scanout only; no
   combiners or lighting yet.

## License

MIT or Apache 2.0 at the contributor's choice.
