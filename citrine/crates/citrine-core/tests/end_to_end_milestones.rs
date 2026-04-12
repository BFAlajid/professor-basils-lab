//! End-to-end integration tests proving Milestones A, B, C work together.
//!
//! These are NOT unit tests — they exercise the real pipeline across every
//! crate we've built so far. If any of these fail, the promise that "you
//! can actually run a homebrew and see pixels" is broken.

use citrine_core::{
    load_3dsx, run_with_hle, scan_out_to_rgba8, step_with_hle, LoadedProgram, ThreeDsBus,
};
use citrine_cpu::{Bus, Cpu};
use citrine_gpu::{FramebufferConfig, Screen, TOP_HEIGHT, TOP_WIDTH};
use citrine_jit::JittedCpu;
use citrine_kernel::{DefaultSvcDispatcher, Kernel};

// ─────────────────────────────────────────────────────────────────────
// Instruction encoders (hand-written to avoid an assembler dep)
// ─────────────────────────────────────────────────────────────────────

const AL: u32 = 0xE;

/// `MOV Rd, #imm8` (no rotate, no flags)
fn mov_imm(rd: u32, imm: u32) -> u32 {
    (AL << 28) | (1 << 25) | (0xD << 21) | (rd << 12) | (imm & 0xFF)
}

/// `SVC #imm24`
fn svc(imm24: u32) -> u32 {
    (AL << 28) | (0xF << 24) | (imm24 & 0x00FF_FFFF)
}

/// `B .` — branch to self (infinite spin)
fn b_self() -> u32 {
    0xEAFF_FFFEu32
}

// ─────────────────────────────────────────────────────────────────────
// Smoke test — prove the basic write→cpu.step→register write round-trips
// ─────────────────────────────────────────────────────────────────────

#[test]
fn smoke_write_fcram_round_trip() {
    let mut bus = ThreeDsBus::new();
    let bytes: [u8; 4] = [0x42, 0x00, 0xA0, 0xE3]; // mov_imm(0, 0x42) little-endian
    let n = bus.write_fcram(ThreeDsBus::FCRAM_BASE, &bytes);
    assert_eq!(n, 4, "write_fcram should have written 4 bytes");
    let word = bus.read32(ThreeDsBus::FCRAM_BASE);
    assert_eq!(
        word,
        0xE3A0_0042,
        "write_fcram + read32 round-trip broken; got {:#010x}",
        word
    );
}

#[test]
fn smoke_run_with_hle_executes_single_mov() {
    // Same setup as smoke_bus_write32 but using run_with_hle to drive.
    let mut cpu = Cpu::new();
    let mut bus = ThreeDsBus::new();
    let mut kernel = Kernel::new();
    let mut dispatcher = DefaultSvcDispatcher::new();
    let entry = ThreeDsBus::FCRAM_BASE;
    // Two instructions: MOV r0, #0x42 ; B . (spin)
    bus.write32(entry, mov_imm(0, 0x42));
    bus.write32(entry + 4, b_self());
    cpu.reset(entry);
    let steps = run_with_hle(&mut cpu, &mut bus, &mut kernel, &mut dispatcher, 10);
    assert!(steps >= 1, "run_with_hle should have stepped at least once");
    assert_eq!(
        cpu.regs.read(0),
        0x42,
        "run_with_hle should have executed MOV; r0 = {:#x}",
        cpu.regs.read(0)
    );
}

#[test]
fn smoke_bus_write32_then_cpu_step_executes_mov() {
    let mut cpu = Cpu::new();
    let mut bus = ThreeDsBus::new();
    let entry = ThreeDsBus::FCRAM_BASE;
    let encoded = mov_imm(0, 0x42);

    // Write the MOV to FCRAM and verify the raw bytes round-trip.
    bus.write32(entry, encoded);
    assert_eq!(
        bus.read32(entry),
        encoded,
        "bus round-trip broken: wrote {:#010x}, read {:#010x}",
        encoded,
        bus.read32(entry)
    );

    // Step the CPU once and verify r0 = 0x42.
    cpu.reset(entry);
    cpu.step(&mut bus);
    assert_eq!(
        cpu.regs.read(0),
        0x42,
        "MOV r0,#0x42 should have set r0 to 0x42 but r0 = {:#x}",
        cpu.regs.read(0)
    );
}

// ─────────────────────────────────────────────────────────────────────
// Milestone A — HLE bridge routes SVC to the kernel dispatcher
// ─────────────────────────────────────────────────────────────────────

#[test]
fn milestone_a_svc_routes_to_kernel_dispatcher() {
    let mut cpu = Cpu::new();
    let mut bus = ThreeDsBus::new();
    let mut kernel = Kernel::new();
    let mut dispatcher = DefaultSvcDispatcher::new();

    // Load a program into FCRAM:
    //   MOV r0, #0x42       ; sets r0 to something recognisable
    //   SVC #0x3D           ; OutputDebugString — dispatcher logs it
    //   B .                 ; spin forever
    let entry = ThreeDsBus::FCRAM_BASE;
    let program = [mov_imm(0, 0x42), svc(0x3D), b_self()];
    for (i, word) in program.iter().enumerate() {
        bus.write32(entry + (i as u32) * 4, *word);
    }

    // Sanity: verify the bytes round-trip back through the bus.
    assert_eq!(bus.read32(entry), mov_imm(0, 0x42), "MOV not stored in FCRAM");
    assert_eq!(bus.read32(entry + 4), svc(0x3D), "SVC not stored in FCRAM");
    assert_eq!(bus.read32(entry + 8), b_self(), "B_self not stored in FCRAM");

    cpu.reset(entry);
    assert_eq!(cpu.regs.pc(), entry, "reset should set PC to entry");

    let steps = run_with_hle(&mut cpu, &mut bus, &mut kernel, &mut dispatcher, 50);

    // At least 3 steps ran (MOV, SVC, spin).
    assert!(steps >= 3, "expected at least 3 bridged steps, got {}", steps);
    // Kernel debug log has the OutputDebugString entry.
    // NOTE: we do NOT assert r0 here — SVC dispatchers overwrite r0 with
    // their return value (0 for OutputDebugString). r0 holding 0x42 is
    // only guaranteed immediately after the MOV, before the SVC runs.
    assert!(
        !dispatcher.log.is_empty(),
        "kernel dispatcher log should have at least one entry"
    );
    assert!(
        dispatcher.log.iter().any(|s| s.contains("debug str")),
        "log entry should mention OutputDebugString, got: {:?}",
        dispatcher.log
    );
}

#[test]
fn milestone_a_step_with_hle_does_not_enter_arm_exception() {
    // Verify that a bridged SVC does NOT bank LR_svc or switch to vector 0x08.
    let mut cpu = Cpu::new();
    let mut bus = ThreeDsBus::new();
    let mut kernel = Kernel::new();
    let mut dispatcher = DefaultSvcDispatcher::new();

    let entry = ThreeDsBus::FCRAM_BASE;
    bus.write32(entry, svc(0x3D));
    cpu.reset(entry);

    let starting_mode = cpu.regs.mode();
    let starting_lr = cpu.regs.lr();

    let step = step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut dispatcher);

    assert!(step.was_svc, "bridge should have flagged was_svc=true");
    assert_eq!(step.svc_number, 0x3D);
    // PC advanced past the SVC instruction, not jumped to vector 0x08.
    assert_eq!(cpu.regs.pc(), entry + 4);
    // Mode and LR are untouched (HLE, not real exception entry).
    assert_eq!(cpu.regs.mode(), starting_mode);
    assert_eq!(cpu.regs.lr(), starting_lr);
}

// ─────────────────────────────────────────────────────────────────────
// Milestone A+B — .3dsx loader writes bytes that we can read back
// ─────────────────────────────────────────────────────────────────────

#[test]
fn milestone_a_3dsx_loader_round_trips_into_fcram() {
    // Build a minimal valid 3DSX with a 16-byte code segment containing
    // four distinct words, then load it into FCRAM and read back via the bus.
    let code_words: [u32; 4] = [
        mov_imm(0, 0x11),
        mov_imm(1, 0x22),
        mov_imm(2, 0x33),
        b_self(),
    ];
    let mut code_bytes = Vec::new();
    for w in &code_words {
        code_bytes.extend_from_slice(&w.to_le_bytes());
    }

    // Build the 3DSX header (32 bytes) + 3 relocation sub-headers (24 bytes)
    // + code segment bytes.
    let mut file = Vec::new();
    file.extend_from_slice(b"3DSX");            // magic
    file.extend_from_slice(&32u16.to_le_bytes()); // header size
    file.extend_from_slice(&8u16.to_le_bytes());  // reloc_hdr_size
    file.extend_from_slice(&0u32.to_le_bytes());  // format version
    file.extend_from_slice(&0u32.to_le_bytes());  // flags
    file.extend_from_slice(&(code_bytes.len() as u32).to_le_bytes()); // code_seg_size
    file.extend_from_slice(&0u32.to_le_bytes());  // rodata_seg_size
    file.extend_from_slice(&0u32.to_le_bytes());  // data_seg_size
    file.extend_from_slice(&0u32.to_le_bytes());  // bss_size
    // 3 reloc sub-headers, all zero counts
    for _ in 0..3 {
        file.extend_from_slice(&0u32.to_le_bytes()); // abs_count
        file.extend_from_slice(&0u32.to_le_bytes()); // rel_count
    }
    file.extend_from_slice(&code_bytes);

    let base = ThreeDsBus::FCRAM_BASE;
    let prog: LoadedProgram = load_3dsx(&file, base).expect("3DSX must parse");
    assert_eq!(prog.entry_point, base);
    assert_eq!(prog.code.len(), 16);

    // Sanity: prog.code should contain the raw encoded words.
    let code_first = u32::from_le_bytes([prog.code[0], prog.code[1], prog.code[2], prog.code[3]]);
    assert_eq!(
        code_first,
        mov_imm(0, 0x11),
        "prog.code[0..4] should be the first MOV encoding, got {:#010x}",
        code_first
    );

    // Copy into a host image, then push into FCRAM via the bus.
    let mut image = vec![0u8; prog.total_size as usize];
    let bytes_written = prog.copy_into(&mut image);
    assert!(
        bytes_written >= 16,
        "copy_into should have placed at least 16 bytes (code), wrote {}",
        bytes_written
    );
    let image_first = u32::from_le_bytes([image[0], image[1], image[2], image[3]]);
    assert_eq!(
        image_first,
        mov_imm(0, 0x11),
        "image[0..4] should contain the first MOV after copy_into, got {:#010x}",
        image_first
    );

    let mut bus = ThreeDsBus::new();
    bus.write_fcram(base, &image);

    // Read back the four words through the bus API and verify.
    assert_eq!(bus.read32(base), mov_imm(0, 0x11));
    assert_eq!(bus.read32(base + 4), mov_imm(1, 0x22));
    assert_eq!(bus.read32(base + 8), mov_imm(2, 0x33));
    assert_eq!(bus.read32(base + 12), b_self());
}

// ─────────────────────────────────────────────────────────────────────
// Milestone B — scanout pipeline decodes VRAM pixels to RGBA8
// ─────────────────────────────────────────────────────────────────────

#[test]
fn milestone_b_scanout_decodes_single_red_pixel_rgb565() {
    let mut bus = ThreeDsBus::new();

    // Write a single RGB565 pixel = 0xF800 (pure red) at VRAM base.
    // Little-endian: low byte 0x00, high byte 0xF8.
    let vram_base = ThreeDsBus::VRAM_BASE;
    bus.write8(vram_base, 0x00);
    bus.write8(vram_base + 1, 0xF8);

    let config = FramebufferConfig {
        address_left: vram_base,
        address_right: 0,
        stride: TOP_HEIGHT * 2, // column-major RGB565 stride
        format_raw: 2,          // RGB565
    };

    let rgba = scan_out_to_rgba8(&mut bus, &config, Screen::Top);

    assert_eq!(rgba.len(), (TOP_WIDTH * TOP_HEIGHT * 4) as usize);
    // The single written pixel landed at column 0, row 0 → output (0, 0).
    assert_eq!(rgba[0], 0xFF, "R channel should be 0xFF");
    assert_eq!(rgba[1], 0x00, "G channel should be 0x00");
    assert_eq!(rgba[2], 0x00, "B channel should be 0x00");
    assert_eq!(rgba[3], 0xFF, "A channel should be 0xFF");
}

#[test]
fn milestone_b_scanout_un_rotates_column_major_to_row_major() {
    // Write a 2×2 block of RGB565 pixels at VRAM base using column-major layout:
    //   column 0: row 0 = red,   row 1 = green
    //   column 1: row 0 = blue,  row 1 = white
    // After un-rotation the row-major output should be:
    //   output (0,0) = red,  (1,0) = blue
    //   output (0,1) = green, (1,1) = white
    let mut bus = ThreeDsBus::new();
    let base = ThreeDsBus::VRAM_BASE;

    let stride = TOP_HEIGHT * 2; // 480 bytes between columns

    // Column 0, row 0 — red (0xF800)
    bus.write16(base, 0xF800);
    // Column 0, row 1 — green (0x07E0)
    bus.write16(base + 2, 0x07E0);
    // Column 1, row 0 — blue (0x001F)
    bus.write16(base + stride, 0x001F);
    // Column 1, row 1 — white (0xFFFF)
    bus.write16(base + stride + 2, 0xFFFF);

    let config = FramebufferConfig {
        address_left: base,
        address_right: 0,
        stride,
        format_raw: 2,
    };
    let rgba = scan_out_to_rgba8(&mut bus, &config, Screen::Top);

    let width = TOP_WIDTH as usize;
    // (0,0) red
    let p = 0;
    assert_eq!(rgba[p], 0xFF); assert_eq!(rgba[p + 1], 0x00); assert_eq!(rgba[p + 2], 0x00);
    // (1,0) blue
    let p = 4;
    assert_eq!(rgba[p], 0x00); assert_eq!(rgba[p + 1], 0x00); assert_eq!(rgba[p + 2], 0xFF);
    // (0,1) green — row 1 starts at offset width*4
    let p = width * 4;
    assert_eq!(rgba[p], 0x00); assert_eq!(rgba[p + 1], 0xFF); assert_eq!(rgba[p + 2], 0x00);
    // (1,1) white
    let p = width * 4 + 4;
    assert_eq!(rgba[p], 0xFF); assert_eq!(rgba[p + 1], 0xFF); assert_eq!(rgba[p + 2], 0xFF);
}

#[test]
fn milestone_b_scanout_handles_null_address_as_black() {
    let mut bus = ThreeDsBus::new();
    let config = FramebufferConfig {
        address_left: 0,
        address_right: 0,
        stride: 0,
        format_raw: 2,
    };
    let rgba = scan_out_to_rgba8(&mut bus, &config, Screen::Top);
    assert_eq!(rgba.len(), (TOP_WIDTH * TOP_HEIGHT * 4) as usize);
    // With a null address, every pixel must read zeros from VRAM and decode
    // to RGB565(0) = black with alpha 255 (or possibly alpha 0, depending on
    // how the scanout implementation treats the null case). We only assert
    // RGB is black.
    for chunk in rgba.chunks_exact(4) {
        assert_eq!(chunk[0], 0);
        assert_eq!(chunk[1], 0);
        assert_eq!(chunk[2], 0);
    }
}

// ─────────────────────────────────────────────────────────────────────
// Milestone C — JittedCpu profiles, discovers, compiles, and caches a hot block
// ─────────────────────────────────────────────────────────────────────

#[test]
fn milestone_c_jitted_cpu_promotes_and_compiles_hot_pc() {
    let threshold = 3;
    let mut jcpu = JittedCpu::new(threshold);
    let mut bus = ThreeDsBus::new();

    // Put a MOV r0, #1 at FCRAM base so the interpreter has something real to run.
    let pc = ThreeDsBus::FCRAM_BASE;
    bus.write32(pc, mov_imm(0, 1));

    // Manually revisit the same PC `threshold` times. Each step runs the MOV
    // and advances the interpreter's PC by 4; we reset it before the next step.
    for _ in 0..threshold {
        jcpu.cpu.regs.set_pc(pc);
        jcpu.step(&mut bus);
    }

    let stats = jcpu.stats();
    assert!(
        stats.hot_blocks >= 1,
        "at least one PC should have been promoted, got {:?}",
        stats
    );
    assert!(
        stats.blocks_compiled >= 1,
        "at least one block should have been compiled, got {:?}",
        stats
    );
    assert_eq!(stats.steps, threshold, "step counter should equal loop iterations");

    // The cache must contain the compiled block at our PC.
    let compiled = jcpu.cache().get(pc).expect("block should be cached");
    assert_eq!(compiled.start_pc, pc);
    // The emitted WASM starts with the magic `\0asm\x01\0\0\0`.
    assert!(compiled.wasm_bytes.len() >= 8);
    assert_eq!(
        &compiled.wasm_bytes[0..4],
        b"\0asm",
        "emitted bytes must begin with the WASM magic"
    );
    assert_eq!(
        &compiled.wasm_bytes[4..8],
        &[0x01, 0x00, 0x00, 0x00],
        "WASM version 1"
    );
}

#[test]
fn milestone_c_jitted_cpu_cache_hits_after_compilation() {
    let threshold = 2;
    let mut jcpu = JittedCpu::new(threshold);
    let mut bus = ThreeDsBus::new();
    let pc = ThreeDsBus::FCRAM_BASE;
    bus.write32(pc, mov_imm(0, 1));

    // Visit once — count=1, no promotion.
    jcpu.cpu.regs.set_pc(pc);
    jcpu.step(&mut bus);
    assert_eq!(jcpu.stats().cache_hits, 0);

    // Visit again — count=2, promotion, compile, cache.
    jcpu.cpu.regs.set_pc(pc);
    jcpu.step(&mut bus);
    assert_eq!(jcpu.stats().blocks_compiled, 1);

    // Third visit — cache hit.
    jcpu.cpu.regs.set_pc(pc);
    jcpu.step(&mut bus);
    assert!(
        jcpu.stats().cache_hits >= 1,
        "third visit should have been a cache hit, stats = {:?}",
        jcpu.stats()
    );
}

#[test]
fn milestone_c_jitted_cpu_reset_clears_all_state() {
    let mut jcpu = JittedCpu::new(1);
    let mut bus = ThreeDsBus::new();
    bus.write32(ThreeDsBus::FCRAM_BASE, mov_imm(0, 1));

    jcpu.cpu.regs.set_pc(ThreeDsBus::FCRAM_BASE);
    jcpu.step(&mut bus);
    assert!(jcpu.stats().blocks_compiled >= 1);

    jcpu.reset(ThreeDsBus::FCRAM_BASE);
    assert_eq!(jcpu.stats().blocks_compiled, 0);
    assert_eq!(jcpu.stats().steps, 0);
    assert!(jcpu.cache().is_empty());
}

// ─────────────────────────────────────────────────────────────────────
// Full integration — all three milestones firing in one scenario
// ─────────────────────────────────────────────────────────────────────

#[test]
fn all_milestones_running_together() {
    let mut cpu = Cpu::new();
    let mut bus = ThreeDsBus::new();
    let mut kernel = Kernel::new();
    let mut dispatcher = DefaultSvcDispatcher::new();

    // Milestone A path: put a program in FCRAM, run it through the HLE bridge.
    let entry = ThreeDsBus::FCRAM_BASE;
    bus.write32(entry, mov_imm(0, 0x77));
    bus.write32(entry + 4, svc(0x3D));
    bus.write32(entry + 8, b_self());
    cpu.reset(entry);
    // Step the MOV manually so we can observe its effect before the SVC
    // handler clobbers r0 with its own return value.
    let _ = step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut dispatcher);
    assert_eq!(cpu.regs.read(0), 0x77);
    // Now run the rest; the SVC handler will overwrite r0, which is fine.
    let steps = run_with_hle(&mut cpu, &mut bus, &mut kernel, &mut dispatcher, 20);
    assert!(steps >= 2);
    assert!(!dispatcher.log.is_empty());

    // Milestone B path: write an RGB565 green pixel to VRAM and verify scanout
    // sees it in the RGBA8 output.
    let vram = ThreeDsBus::VRAM_BASE;
    bus.write16(vram, 0x07E0); // pure green
    let config = FramebufferConfig {
        address_left: vram,
        address_right: 0,
        stride: TOP_HEIGHT * 2,
        format_raw: 2,
    };
    let rgba = scan_out_to_rgba8(&mut bus, &config, Screen::Top);
    assert_eq!(rgba[0], 0x00, "R");
    assert_eq!(rgba[1], 0xFF, "G");
    assert_eq!(rgba[2], 0x00, "B");

    // Milestone C path: same FCRAM program driven through JittedCpu, observe
    // hot-block promotion and compilation.
    let mut jcpu = JittedCpu::new(2);
    jcpu.cpu = cpu; // transplant the in-progress state
    // Revisit the MOV a couple of times to trigger compilation.
    for _ in 0..3 {
        jcpu.cpu.regs.set_pc(entry);
        jcpu.step(&mut bus);
    }
    let jit_stats = jcpu.stats();
    assert!(jit_stats.blocks_compiled >= 1);
    assert!(jit_stats.hot_blocks >= 1);
}
