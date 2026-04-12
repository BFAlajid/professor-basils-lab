//! Core types for the ARM11 (ARMv6K) interpreter.
//!
//! The decoder produces `DecodedInstruction` values; the executor consumes them.
//! Keeping decode and execute separate sets up the path for an IR-based JIT
//! (runtime WASM module compilation) in a later phase.

use core::fmt;

/// A physical register index (R0..R15). R13 = SP, R14 = LR, R15 = PC.
pub type Reg = u8;

/// ARM condition code (bits [31:28] of an ARM instruction).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum Condition {
    Eq = 0x0, // Z=1
    Ne = 0x1, // Z=0
    Cs = 0x2, // C=1 (aka HS)
    Cc = 0x3, // C=0 (aka LO)
    Mi = 0x4, // N=1
    Pl = 0x5, // N=0
    Vs = 0x6, // V=1
    Vc = 0x7, // V=0
    Hi = 0x8, // C=1 && Z=0
    Ls = 0x9, // C=0 || Z=1
    Ge = 0xA, // N==V
    Lt = 0xB, // N!=V
    Gt = 0xC, // Z=0 && N==V
    Le = 0xD, // Z=1 || N!=V
    Al = 0xE, // always
    Nv = 0xF, // never (UNPREDICTABLE on ARMv6K; kept for decode completeness)
}

impl Condition {
    pub fn from_bits(bits: u32) -> Self {
        match bits & 0xF {
            0x0 => Self::Eq,
            0x1 => Self::Ne,
            0x2 => Self::Cs,
            0x3 => Self::Cc,
            0x4 => Self::Mi,
            0x5 => Self::Pl,
            0x6 => Self::Vs,
            0x7 => Self::Vc,
            0x8 => Self::Hi,
            0x9 => Self::Ls,
            0xA => Self::Ge,
            0xB => Self::Lt,
            0xC => Self::Gt,
            0xD => Self::Le,
            0xE => Self::Al,
            _ => Self::Nv,
        }
    }
}

/// Data-processing opcodes, bits [24:21] of a data-processing instruction.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum DataOp {
    And = 0x0,
    Eor = 0x1,
    Sub = 0x2,
    Rsb = 0x3,
    Add = 0x4,
    Adc = 0x5,
    Sbc = 0x6,
    Rsc = 0x7,
    Tst = 0x8, // no writeback, S implied
    Teq = 0x9, // no writeback, S implied
    Cmp = 0xA, // no writeback, S implied
    Cmn = 0xB, // no writeback, S implied
    Orr = 0xC,
    Mov = 0xD, // Rn is ignored
    Bic = 0xE,
    Mvn = 0xF, // Rn is ignored
}

impl DataOp {
    pub fn from_bits(bits: u32) -> Self {
        match bits & 0xF {
            0x0 => Self::And,
            0x1 => Self::Eor,
            0x2 => Self::Sub,
            0x3 => Self::Rsb,
            0x4 => Self::Add,
            0x5 => Self::Adc,
            0x6 => Self::Sbc,
            0x7 => Self::Rsc,
            0x8 => Self::Tst,
            0x9 => Self::Teq,
            0xA => Self::Cmp,
            0xB => Self::Cmn,
            0xC => Self::Orr,
            0xD => Self::Mov,
            0xE => Self::Bic,
            _ => Self::Mvn,
        }
    }

    /// `TST/TEQ/CMP/CMN` write no destination but still set flags.
    pub fn is_test(self) -> bool {
        matches!(self, Self::Tst | Self::Teq | Self::Cmp | Self::Cmn)
    }

    /// `MOV/MVN` ignore Rn.
    pub fn is_mov_family(self) -> bool {
        matches!(self, Self::Mov | Self::Mvn)
    }
}

/// The barrel-shifter shift type, bits [6:5] of a shifted-register operand.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum ShiftType {
    Lsl = 0b00,
    Lsr = 0b01,
    Asr = 0b10,
    /// `ROR` with a nonzero amount — or `RRX` when `shift_amount == 0` in an
    /// immediate-shift encoding. The decoder disambiguates by producing
    /// `ShiftedRegister::Rrx` in that case.
    Ror = 0b11,
}

impl ShiftType {
    pub fn from_bits(bits: u32) -> Self {
        match bits & 0b11 {
            0b00 => Self::Lsl,
            0b01 => Self::Lsr,
            0b10 => Self::Asr,
            _ => Self::Ror,
        }
    }
}

/// Shifter operand for data-processing instructions (bits [11:0]).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShifterOperand {
    /// `#imm` — 8-bit immediate rotated right by `rotate * 2`.
    Immediate { imm8: u32, rotate: u32 },
    /// `Rm` with an immediate shift amount (including `LSR #32`, `ASR #32`, `RRX`).
    ImmediateShift { rm: Reg, shift: ShiftType, amount: u8 },
    /// `Rm, LSL Rs` etc. Register-specified shift — only the low 8 bits of Rs matter.
    RegisterShift { rm: Reg, shift: ShiftType, rs: Reg },
    /// `Rm, RRX` — rotate-right-with-extend by one bit. Distinguished at decode.
    Rrx { rm: Reg },
}

/// How a load/store computes its effective address.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AddressingMode {
    /// `[Rn, #+/-imm12]` (or with `!`), or `[Rn], #+/-imm12`.
    Immediate { imm12: u32 },
    /// `[Rn, +/-Rm, shift]` (or with `!`), or post-indexed form.
    Register { rm: Reg, shift: ShiftType, amount: u8 },
}

/// Pre/post indexing + writeback + up/down direction for load/store.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LoadStoreFlags {
    /// P=1: pre-indexed, P=0: post-indexed (in which case writeback is implied).
    pub pre: bool,
    /// U=1: add offset, U=0: subtract offset.
    pub up: bool,
    /// W=1: writeback the computed address back to Rn.
    /// For post-indexed forms this is also true.
    pub writeback: bool,
}

/// Operand size for load/store single-data-transfer variants.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TransferSize {
    Byte,
    Halfword,
    Word,
    SignedByte,
    SignedHalfword,
}

impl TransferSize {
    pub fn bytes(self) -> u32 {
        match self {
            Self::Byte | Self::SignedByte => 1,
            Self::Halfword | Self::SignedHalfword => 2,
            Self::Word => 4,
        }
    }
    pub fn is_signed(self) -> bool {
        matches!(self, Self::SignedByte | Self::SignedHalfword)
    }
}

/// Block transfer (LDM/STM) addressing mode.
///
/// The four classic modes are:
/// ```text
/// IA  Increment After   (P=0,U=1)  — aliases: FD load, EA store
/// IB  Increment Before  (P=1,U=1)  — aliases: ED load, FA store
/// DA  Decrement After   (P=0,U=0)  — aliases: FA load, ED store
/// DB  Decrement Before  (P=1,U=0)  — aliases: EA load, FD store
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BlockMode {
    IncrementAfter,
    IncrementBefore,
    DecrementAfter,
    DecrementBefore,
}

/// Saturated arithmetic opcodes (ARMv5E+ Q-prefixed instructions).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SaturatedOp {
    Qadd,
    Qsub,
    Qdadd,
    Qdsub,
}

impl BlockMode {
    pub fn from_pu(pre: bool, up: bool) -> Self {
        match (pre, up) {
            (false, true) => Self::IncrementAfter,
            (true, true) => Self::IncrementBefore,
            (false, false) => Self::DecrementAfter,
            (true, false) => Self::DecrementBefore,
        }
    }
}

/// The fully decoded ARM instruction form.
///
/// Every non-handled or malformed encoding becomes `Undefined`. The executor
/// treats `Undefined` as a trap (would raise the Undefined Instruction
/// exception on real hardware; in Phase 0 we just return an error).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DecodedInstruction {
    /// `<op>{cond}{S} Rd, Rn, <shifter_operand>`
    DataProcessing {
        cond: Condition,
        op: DataOp,
        set_flags: bool,
        rn: Reg,
        rd: Reg,
        operand: ShifterOperand,
    },
    /// `MUL{S} Rd, Rm, Rs` / `MLA{S} Rd, Rm, Rs, Rn`
    Multiply {
        cond: Condition,
        accumulate: bool,
        set_flags: bool,
        rd: Reg,
        rn: Reg,
        rs: Reg,
        rm: Reg,
    },
    /// `UMULL{S}/UMLAL{S}/SMULL{S}/SMLAL{S} RdLo, RdHi, Rm, Rs`
    MultiplyLong {
        cond: Condition,
        signed: bool,
        accumulate: bool,
        set_flags: bool,
        rd_lo: Reg,
        rd_hi: Reg,
        rm: Reg,
        rs: Reg,
    },
    /// `B{L} target`
    Branch {
        cond: Condition,
        link: bool,
        /// Signed byte offset already sign-extended and shifted left by 2.
        offset: i32,
    },
    /// `BX Rm` / `BLX Rm` (register form)
    BranchExchange {
        cond: Condition,
        link: bool,
        rm: Reg,
    },
    /// `LDR{B}/STR{B} Rd, [Rn, ...]` — word or unsigned byte.
    SingleDataTransfer {
        cond: Condition,
        load: bool,
        size: TransferSize, // Byte or Word
        flags: LoadStoreFlags,
        rn: Reg,
        rd: Reg,
        address: AddressingMode,
    },
    /// `LDRH/STRH/LDRSB/LDRSH Rd, [Rn, ...]` — halfword and signed variants
    /// (these use a different, halfword-specific immediate encoding).
    HalfwordDataTransfer {
        cond: Condition,
        load: bool,
        size: TransferSize, // Halfword, SignedByte, SignedHalfword
        flags: LoadStoreFlags,
        rn: Reg,
        rd: Reg,
        address: AddressingMode, // Immediate.imm12 carries the 8-bit imm
    },
    /// `LDM/STM Rn{!}, {register_list}`
    BlockTransfer {
        cond: Condition,
        load: bool,
        mode: BlockMode,
        writeback: bool,
        s_bit: bool, // user-mode register bank / PSR transfer
        rn: Reg,
        reg_list: u16, // bit N = include Rn
    },
    /// `MRS Rd, CPSR/SPSR` (read) or `MSR CPSR/SPSR_<f>, Rm/#imm` (write).
    PsrTransfer {
        cond: Condition,
        /// True = MRS (read from PSR), false = MSR (write to PSR)
        is_read: bool,
        /// True = SPSR, false = CPSR
        use_spsr: bool,
        /// MRS: Rd to write the PSR into. MSR: Rd is unused, set to 0.
        rd: Reg,
        /// MSR: 4-bit field-mask. MRS: unused.
        field_mask: u8,
        /// MSR operand — either an immediate or a register. Unused for MRS.
        operand: ShifterOperand,
    },
    /// `SWI imm24` / `SVC imm24`
    SoftwareInterrupt {
        cond: Condition,
        imm24: u32,
    },
    /// `MRC`/`MCR`: register transfer between an ARM register and a coprocessor.
    CoprocessorRegisterTransfer {
        cond: Condition,
        /// MRC (read coprocessor → Rt) when true; MCR (write Rt → coprocessor) when false.
        is_read: bool,
        cp_num: u8,
        opc1: u8,
        opc2: u8,
        crn: u8,
        crm: u8,
        rt: Reg,
    },
    /// `QADD`/`QSUB`/`QDADD`/`QDSUB Rd, Rm, Rn` — saturated arithmetic.
    SaturatedArith {
        cond: Condition,
        op: SaturatedOp,
        rn: Reg,
        rd: Reg,
        rm: Reg,
    },
    /// Anything we chose not to decode in Phase 0 (SWI, coprocessor, MSR/MRS, ...).
    Undefined { raw: u32 },
}

impl DecodedInstruction {
    /// All decoded instructions carry their condition field; this helper centralises access.
    pub fn condition(&self) -> Condition {
        match self {
            Self::DataProcessing { cond, .. }
            | Self::Multiply { cond, .. }
            | Self::MultiplyLong { cond, .. }
            | Self::Branch { cond, .. }
            | Self::BranchExchange { cond, .. }
            | Self::SingleDataTransfer { cond, .. }
            | Self::HalfwordDataTransfer { cond, .. }
            | Self::BlockTransfer { cond, .. }
            | Self::PsrTransfer { cond, .. }
            | Self::SoftwareInterrupt { cond, .. }
            | Self::CoprocessorRegisterTransfer { cond, .. }
            | Self::SaturatedArith { cond, .. } => *cond,
            Self::Undefined { .. } => Condition::Al,
        }
    }
}

impl fmt::Display for DecodedInstruction {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::DataProcessing { op, rd, rn, .. } => {
                write!(f, "{:?} r{}, r{}, ...", op, rd, rn)
            }
            Self::Multiply { accumulate, rd, .. } => {
                write!(f, "{} r{}, ...", if *accumulate { "MLA" } else { "MUL" }, rd)
            }
            Self::MultiplyLong {
                signed,
                accumulate,
                rd_lo,
                rd_hi,
                ..
            } => write!(
                f,
                "{}{} r{}:r{}",
                if *signed { "S" } else { "U" },
                if *accumulate { "MLAL" } else { "MULL" },
                rd_hi,
                rd_lo
            ),
            Self::Branch { link, offset, .. } => {
                write!(f, "{}{:+#x}", if *link { "BL" } else { "B" }, offset)
            }
            Self::BranchExchange { link, rm, .. } => {
                write!(f, "{} r{}", if *link { "BLX" } else { "BX" }, rm)
            }
            Self::SingleDataTransfer { load, size, rd, rn, .. } => write!(
                f,
                "{}{} r{}, [r{}, ...]",
                if *load { "LDR" } else { "STR" },
                if *size == TransferSize::Byte { "B" } else { "" },
                rd,
                rn
            ),
            Self::HalfwordDataTransfer { load, size, rd, rn, .. } => write!(
                f,
                "{}{} r{}, [r{}, ...]",
                if *load { "LDR" } else { "STR" },
                match size {
                    TransferSize::Halfword => "H",
                    TransferSize::SignedByte => "SB",
                    TransferSize::SignedHalfword => "SH",
                    _ => "?",
                },
                rd,
                rn
            ),
            Self::BlockTransfer { load, rn, .. } => {
                write!(f, "{} r{}, {{...}}", if *load { "LDM" } else { "STM" }, rn)
            }
            Self::PsrTransfer {
                is_read,
                use_spsr,
                rd,
                ..
            } => {
                let psr_name = if *use_spsr { "SPSR" } else { "CPSR" };
                if *is_read {
                    write!(f, "MRS r{}, {}", rd, psr_name)
                } else {
                    write!(f, "MSR {}, ...", psr_name)
                }
            }
            Self::SoftwareInterrupt { imm24, .. } => write!(f, "SVC #{:#x}", imm24),
            Self::CoprocessorRegisterTransfer {
                is_read,
                cp_num,
                rt,
                crn,
                crm,
                ..
            } => write!(
                f,
                "{} p{}, r{}, c{}, c{}",
                if *is_read { "MRC" } else { "MCR" },
                cp_num,
                rt,
                crn,
                crm
            ),
            Self::SaturatedArith { op, rd, rm, rn, .. } => {
                write!(f, "{:?} r{}, r{}, r{}", op, rd, rm, rn)
            }
            Self::Undefined { raw } => write!(f, "UNDEFINED({:08x})", raw),
        }
    }
}
