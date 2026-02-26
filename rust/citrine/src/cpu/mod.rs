pub mod arm;
pub mod thumb;
pub mod cp15;

pub const MODE_USER: u32 = 0x10;
pub const MODE_FIQ: u32 = 0x11;
pub const MODE_IRQ: u32 = 0x12;
pub const MODE_SVC: u32 = 0x13;
pub const MODE_ABT: u32 = 0x17;
pub const MODE_UND: u32 = 0x1B;
pub const MODE_SYS: u32 = 0x1F;

pub const CPSR_N: u32 = 1 << 31;
pub const CPSR_Z: u32 = 1 << 30;
pub const CPSR_C: u32 = 1 << 29;
pub const CPSR_V: u32 = 1 << 28;
pub const CPSR_T: u32 = 1 << 5;
pub const CPSR_I: u32 = 1 << 7;
pub const CPSR_F: u32 = 1 << 6;

pub struct Cpu {
    pub regs: [u32; 16],
    pub cpsr: u32,
    pub spsr: [u32; 6],
    banked_regs: BankedRegs,
    pub cycles: u64,
    pub halted: bool,
    pub svc_pending: Option<u32>,
    pub cp15: cp15::Cp15,
}

struct BankedRegs {
    sp: [u32; 6],
    lr: [u32; 6],
    fiq_r8_r12: [u32; 5],
    usr_r8_r12: [u32; 5],
}

impl Cpu {
    pub fn new() -> Self {
        let mut cpu = Self {
            regs: [0; 16],
            cpsr: MODE_SVC | CPSR_I | CPSR_F,
            spsr: [0; 6],
            banked_regs: BankedRegs {
                sp: [0; 6],
                lr: [0; 6],
                fiq_r8_r12: [0; 5],
                usr_r8_r12: [0; 5],
            },
            cycles: 0,
            halted: false,
            svc_pending: None,
            cp15: cp15::Cp15::new(),
        };
        cpu.regs[15] = 0x0010_0000;
        cpu
    }

    pub fn pc(&self) -> u32 {
        self.regs[15]
    }

    pub fn set_pc(&mut self, addr: u32) {
        self.regs[15] = addr;
    }

    pub fn in_thumb_mode(&self) -> bool {
        self.cpsr & CPSR_T != 0
    }

    pub fn mode(&self) -> u32 {
        self.cpsr & 0x1F
    }

    fn mode_index(mode: u32) -> usize {
        match mode {
            MODE_USER | MODE_SYS => 0,
            MODE_FIQ => 1,
            MODE_IRQ => 2,
            MODE_SVC => 3,
            MODE_ABT => 4,
            MODE_UND => 5,
            _ => 0,
        }
    }

    pub fn switch_mode(&mut self, new_mode: u32) {
        let old_mode = self.mode();
        if old_mode == new_mode {
            return;
        }

        let old_idx = Self::mode_index(old_mode);
        self.banked_regs.sp[old_idx] = self.regs[13];
        self.banked_regs.lr[old_idx] = self.regs[14];

        if old_mode == MODE_FIQ {
            self.banked_regs.fiq_r8_r12.copy_from_slice(&self.regs[8..13]);
            self.regs[8..13].copy_from_slice(&self.banked_regs.usr_r8_r12);
        }

        let new_idx = Self::mode_index(new_mode);
        self.regs[13] = self.banked_regs.sp[new_idx];
        self.regs[14] = self.banked_regs.lr[new_idx];

        if new_mode == MODE_FIQ {
            self.banked_regs.usr_r8_r12.copy_from_slice(&self.regs[8..13]);
            self.regs[8..13].copy_from_slice(&self.banked_regs.fiq_r8_r12);
        }

        self.cpsr = (self.cpsr & !0x1F) | (new_mode & 0x1F);
    }

    pub fn get_spsr(&self) -> u32 {
        let idx = Self::mode_index(self.mode());
        self.spsr[idx]
    }

    pub fn set_spsr(&mut self, value: u32) {
        let idx = Self::mode_index(self.mode());
        self.spsr[idx] = value;
    }

    pub fn set_nz(&mut self, result: u32) {
        self.cpsr &= !(CPSR_N | CPSR_Z);
        if result == 0 {
            self.cpsr |= CPSR_Z;
        }
        if result & 0x8000_0000 != 0 {
            self.cpsr |= CPSR_N;
        }
    }

    pub fn flag_n(&self) -> bool { self.cpsr & CPSR_N != 0 }
    pub fn flag_z(&self) -> bool { self.cpsr & CPSR_Z != 0 }
    pub fn flag_c(&self) -> bool { self.cpsr & CPSR_C != 0 }
    pub fn flag_v(&self) -> bool { self.cpsr & CPSR_V != 0 }

    pub fn check_condition(&self, cond: u32) -> bool {
        match cond {
            0x0 => self.flag_z(),
            0x1 => !self.flag_z(),
            0x2 => self.flag_c(),
            0x3 => !self.flag_c(),
            0x4 => self.flag_n(),
            0x5 => !self.flag_n(),
            0x6 => self.flag_v(),
            0x7 => !self.flag_v(),
            0x8 => self.flag_c() && !self.flag_z(),
            0x9 => !self.flag_c() || self.flag_z(),
            0xA => self.flag_n() == self.flag_v(),
            0xB => self.flag_n() != self.flag_v(),
            0xC => !self.flag_z() && (self.flag_n() == self.flag_v()),
            0xD => self.flag_z() || (self.flag_n() != self.flag_v()),
            0xE => true,
            _ => true,
        }
    }

    pub fn add_cycles(&mut self, n: u64) {
        self.cycles += n;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initial_state() {
        let cpu = Cpu::new();
        assert_eq!(cpu.mode(), MODE_SVC);
        assert_eq!(cpu.pc(), 0x0010_0000);
        assert!(!cpu.in_thumb_mode());
    }

    #[test]
    fn mode_switch_preserves_banked() {
        let mut cpu = Cpu::new();
        cpu.regs[13] = 0x1000;
        cpu.regs[14] = 0x2000;
        cpu.switch_mode(MODE_IRQ);
        assert_eq!(cpu.mode(), MODE_IRQ);
        cpu.regs[13] = 0x3000;
        cpu.switch_mode(MODE_SVC);
        assert_eq!(cpu.regs[13], 0x1000);
    }

    #[test]
    fn condition_codes() {
        let mut cpu = Cpu::new();
        cpu.cpsr |= CPSR_Z;
        assert!(cpu.check_condition(0x0));
        assert!(!cpu.check_condition(0x1));
    }

    #[test]
    fn set_nz_flags() {
        let mut cpu = Cpu::new();
        cpu.set_nz(0);
        assert!(cpu.flag_z());
        assert!(!cpu.flag_n());
        cpu.set_nz(0x8000_0000);
        assert!(!cpu.flag_z());
        assert!(cpu.flag_n());
    }
}
