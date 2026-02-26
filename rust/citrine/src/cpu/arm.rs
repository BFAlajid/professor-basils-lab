use crate::cpu::{Cpu, CPSR_C, CPSR_V, CPSR_T, MODE_SVC};
use crate::memory::Memory;

pub fn execute(cpu: &mut Cpu, mem: &mut Memory, instr: u32) {
    let cond = (instr >> 28) & 0xF;
    if !cpu.check_condition(cond) {
        cpu.add_cycles(1);
        return;
    }

    let bits_27_20 = (instr >> 20) & 0xFF;
    let bits_7_4 = (instr >> 4) & 0xF;

    match (bits_27_20 >> 5, bits_27_20 & 0x1F) {
        // Branch (B/BL)
        (0b101, _) => exec_branch(cpu, instr),
        // Branch exchange (BX/BLX register)
        _ if bits_27_20 == 0x12 && bits_7_4 == 0x1 => exec_bx(cpu, instr),
        _ if bits_27_20 == 0x12 && bits_7_4 == 0x3 => exec_blx_reg(cpu, instr),
        // SVC
        _ if bits_27_20 >> 4 == 0xF => exec_svc(cpu, instr),
        // Multiply
        _ if (bits_27_20 & 0xFC) == 0x00 && (bits_7_4 & 0x0F) == 0x09 => exec_multiply(cpu, instr),
        // Long multiply
        _ if (bits_27_20 & 0xF8) == 0x08 && (bits_7_4 & 0x0F) == 0x09 => exec_multiply_long(cpu, instr),
        // Single data swap (SWP)
        _ if (bits_27_20 & 0xFB) == 0x10 && bits_7_4 == 0x09 => exec_swp(cpu, mem, instr),
        // LDREX/STREX
        _ if bits_27_20 == 0x19 && bits_7_4 == 0x9 => exec_ldrex(cpu, mem, instr),
        _ if bits_27_20 == 0x18 && (instr & 0xF0) == 0x90 => exec_strex(cpu, mem, instr),
        // Halfword/signed load/store
        _ if (bits_7_4 & 0x9) == 0x9 && (bits_27_20 & 0xE0) == 0x00
            && ((bits_7_4 & 0x6) != 0) => exec_halfword_transfer(cpu, mem, instr),
        // MRS
        _ if bits_27_20 == 0x10 && (instr & 0x0FFF_0FFF) == (instr & 0x0FFF_0000) => exec_mrs(cpu, instr),
        // MSR
        _ if (bits_27_20 & 0xFB) == 0x12 && (instr & 0xF0) == 0x00 => exec_msr_reg(cpu, instr),
        _ if (bits_27_20 & 0xFB) == 0x32 => exec_msr_imm(cpu, instr),
        // CLZ
        _ if bits_27_20 == 0x16 && bits_7_4 == 0x1 => exec_clz(cpu, instr),
        // Data processing (immediate)
        _ if (bits_27_20 >> 5) == 0b001 => exec_data_processing(cpu, instr, true),
        // Data processing (register/shifted register)
        _ if (bits_27_20 >> 5) == 0b000 && (bits_7_4 & 0x1) == 0 => exec_data_processing(cpu, instr, false),
        _ if (bits_27_20 >> 5) == 0b000 && bits_7_4 == 0x0 => exec_data_processing(cpu, instr, false),
        // LDR/STR immediate offset
        _ if (bits_27_20 >> 5) == 0b010 => exec_single_transfer(cpu, mem, instr),
        // LDR/STR register offset
        _ if (bits_27_20 >> 5) == 0b011 && (bits_7_4 & 0x1) == 0 => exec_single_transfer(cpu, mem, instr),
        // LDM/STM
        _ if (bits_27_20 >> 5) == 0b100 => exec_block_transfer(cpu, mem, instr),
        // MRC/MCR (coprocessor register transfer)
        _ if (bits_27_20 >> 4) == 0xE && (bits_7_4 & 0x1) == 1 => exec_cp_reg_transfer(cpu, instr),
        // Fallback for remaining data processing
        _ if (bits_27_20 >> 5) == 0b000 => exec_data_processing(cpu, instr, false),
        _ => {
            // Unimplemented instruction
            cpu.add_cycles(1);
        }
    }
}

fn exec_branch(cpu: &mut Cpu, instr: u32) {
    let link = (instr >> 24) & 1 != 0;
    let offset = ((instr & 0x00FF_FFFF) as i32) << 8 >> 6;
    if link {
        cpu.regs[14] = cpu.pc().wrapping_sub(4);
    }
    let target = (cpu.pc() as i32).wrapping_add(offset) as u32;
    cpu.set_pc(target);
    cpu.add_cycles(3);
}

fn exec_bx(cpu: &mut Cpu, instr: u32) {
    let rm = (instr & 0xF) as usize;
    let addr = cpu.regs[rm];
    if addr & 1 != 0 {
        cpu.cpsr |= CPSR_T;
        cpu.set_pc(addr & !1);
    } else {
        cpu.cpsr &= !CPSR_T;
        cpu.set_pc(addr & !3);
    }
    cpu.add_cycles(3);
}

fn exec_blx_reg(cpu: &mut Cpu, instr: u32) {
    let rm = (instr & 0xF) as usize;
    cpu.regs[14] = cpu.pc().wrapping_sub(4);
    let addr = cpu.regs[rm];
    if addr & 1 != 0 {
        cpu.cpsr |= CPSR_T;
        cpu.set_pc(addr & !1);
    } else {
        cpu.cpsr &= !CPSR_T;
        cpu.set_pc(addr & !3);
    }
    cpu.add_cycles(3);
}

fn exec_svc(cpu: &mut Cpu, instr: u32) {
    let comment = instr & 0x00FF_FFFF;
    // Return address = next instruction = PC - 4 (ARM pipeline: PC = instr_addr + 8)
    let return_addr = cpu.pc().wrapping_sub(4);
    let old_cpsr = cpu.cpsr;
    cpu.switch_mode(MODE_SVC);
    cpu.set_spsr(old_cpsr);
    cpu.regs[14] = return_addr;
    cpu.cpsr |= crate::cpu::CPSR_I;
    cpu.svc_pending = Some(comment);
    cpu.add_cycles(3);
}

fn barrel_shifter(cpu: &Cpu, instr: u32, is_imm: bool) -> (u32, bool) {
    let carry = cpu.flag_c();

    if is_imm {
        let imm = instr & 0xFF;
        let rot = ((instr >> 8) & 0xF) * 2;
        if rot == 0 {
            return (imm, carry);
        }
        let result = imm.rotate_right(rot);
        let c = result >> 31 != 0;
        return (result, c);
    }

    let rm = (instr & 0xF) as usize;
    let val = if rm == 15 { cpu.pc() } else { cpu.regs[rm] };
    let shift_type = (instr >> 5) & 0x3;
    let shift_by_reg = (instr >> 4) & 1 != 0;

    let amount = if shift_by_reg {
        let rs = ((instr >> 8) & 0xF) as usize;
        cpu.regs[rs] & 0xFF
    } else {
        (instr >> 7) & 0x1F
    };

    if amount == 0 && !shift_by_reg {
        match shift_type {
            0 => (val, carry), // LSL #0
            1 => (0, val >> 31 != 0), // LSR #32
            2 => { // ASR #32
                let bit31 = val >> 31 != 0;
                (if bit31 { 0xFFFF_FFFF } else { 0 }, bit31)
            }
            3 => { // RRX
                let result = (if carry { 1u32 << 31 } else { 0 }) | (val >> 1);
                (result, val & 1 != 0)
            }
            _ => unreachable!(),
        }
    } else if amount == 0 {
        (val, carry)
    } else {
        match shift_type {
            0 => { // LSL
                if amount >= 32 {
                    (0, if amount == 32 { val & 1 != 0 } else { false })
                } else {
                    (val << amount, (val >> (32 - amount)) & 1 != 0)
                }
            }
            1 => { // LSR
                if amount >= 32 {
                    (0, if amount == 32 { val >> 31 != 0 } else { false })
                } else {
                    (val >> amount, (val >> (amount - 1)) & 1 != 0)
                }
            }
            2 => { // ASR
                if amount >= 32 {
                    let bit31 = val >> 31 != 0;
                    (if bit31 { 0xFFFF_FFFF } else { 0 }, bit31)
                } else {
                    ((val as i32 >> amount) as u32, (val >> (amount - 1)) & 1 != 0)
                }
            }
            3 => { // ROR
                let effective = amount & 31;
                if effective == 0 {
                    (val, val >> 31 != 0)
                } else {
                    (val.rotate_right(effective), (val >> (effective - 1)) & 1 != 0)
                }
            }
            _ => unreachable!(),
        }
    }
}

fn exec_data_processing(cpu: &mut Cpu, instr: u32, is_imm: bool) {
    let opcode = (instr >> 21) & 0xF;
    let set_flags = (instr >> 20) & 1 != 0;
    let rn = ((instr >> 16) & 0xF) as usize;
    let rd = ((instr >> 12) & 0xF) as usize;

    let op1 = if rn == 15 { cpu.pc() } else { cpu.regs[rn] };
    let (op2, shifter_carry) = barrel_shifter(cpu, instr, is_imm);

    let (result, write_rd) = match opcode {
        0x0 => (op1 & op2, true),                           // AND
        0x1 => (op1 ^ op2, true),                           // EOR
        0x2 => (op1.wrapping_sub(op2), true),                // SUB
        0x3 => (op2.wrapping_sub(op1), true),                // RSB
        0x4 => (op1.wrapping_add(op2), true),                // ADD
        0x5 => {                                              // ADC
            let c = if cpu.flag_c() { 1u32 } else { 0 };
            (op1.wrapping_add(op2).wrapping_add(c), true)
        }
        0x6 => {                                              // SBC
            let c = if cpu.flag_c() { 1u32 } else { 0 };
            (op1.wrapping_sub(op2).wrapping_sub(1 - c), true)
        }
        0x7 => {                                              // RSC
            let c = if cpu.flag_c() { 1u32 } else { 0 };
            (op2.wrapping_sub(op1).wrapping_sub(1 - c), true)
        }
        0x8 => (op1 & op2, false),                           // TST
        0x9 => (op1 ^ op2, false),                           // TEQ
        0xA => (op1.wrapping_sub(op2), false),               // CMP
        0xB => (op1.wrapping_add(op2), false),               // CMN
        0xC => (op1 | op2, true),                            // ORR
        0xD => (op2, true),                                  // MOV
        0xE => (op1 & !op2, true),                           // BIC
        0xF => (!op2, true),                                 // MVN
        _ => unreachable!(),
    };

    if write_rd {
        cpu.regs[rd] = result;
        if rd == 15 {
            if set_flags {
                let spsr = cpu.get_spsr();
                cpu.cpsr = spsr;
            }
            if cpu.in_thumb_mode() {
                cpu.set_pc(result & !1);
            } else {
                cpu.set_pc(result & !3);
            }
            cpu.add_cycles(3);
            return;
        }
    }

    if set_flags {
        cpu.set_nz(result);
        match opcode {
            0x2 | 0x3 | 0xA => { // SUB, RSB, CMP
                let (a, b) = if opcode == 0x3 { (op2, op1) } else { (op1, op2) };
                if a >= b { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
                let sv = ((a ^ b) & (a ^ result)) >> 31 != 0;
                if sv { cpu.cpsr |= CPSR_V; } else { cpu.cpsr &= !CPSR_V; }
            }
            0x4 | 0x5 | 0xB => { // ADD, ADC, CMN
                let carry_out = (result < op1) || (opcode == 0x5 && cpu.flag_c() && result == op1);
                if carry_out { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
                let sv = (!(op1 ^ op2) & (op1 ^ result)) >> 31 != 0;
                if sv { cpu.cpsr |= CPSR_V; } else { cpu.cpsr &= !CPSR_V; }
            }
            0x6 | 0x7 => {} // SBC/RSC overflow: simplified
            _ => {
                if shifter_carry { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
            }
        }
    }

    cpu.add_cycles(1);
}

fn exec_single_transfer(cpu: &mut Cpu, mem: &mut Memory, instr: u32) {
    let is_reg = (instr >> 25) & 1 != 0;
    let pre = (instr >> 24) & 1 != 0;
    let up = (instr >> 23) & 1 != 0;
    let byte = (instr >> 22) & 1 != 0;
    let writeback = (instr >> 21) & 1 != 0;
    let load = (instr >> 20) & 1 != 0;
    let rn = ((instr >> 16) & 0xF) as usize;
    let rd = ((instr >> 12) & 0xF) as usize;

    let base = if rn == 15 { cpu.pc() } else { cpu.regs[rn] };

    let offset = if is_reg {
        let rm = (instr & 0xF) as usize;
        let shift_type = (instr >> 5) & 0x3;
        let shift_amount = (instr >> 7) & 0x1F;
        let rm_val = cpu.regs[rm];
        match shift_type {
            0 => rm_val << shift_amount,
            1 => if shift_amount == 0 { 0 } else { rm_val >> shift_amount },
            2 => if shift_amount == 0 { ((rm_val as i32) >> 31) as u32 } else { ((rm_val as i32) >> shift_amount) as u32 },
            3 => if shift_amount == 0 {
                let c = if cpu.flag_c() { 1u32 << 31 } else { 0 };
                c | (rm_val >> 1)
            } else {
                rm_val.rotate_right(shift_amount)
            },
            _ => unreachable!(),
        }
    } else {
        instr & 0xFFF
    };

    let addr = if pre {
        if up { base.wrapping_add(offset) } else { base.wrapping_sub(offset) }
    } else {
        base
    };

    if load {
        let val = if byte { mem.read8(addr) as u32 } else { mem.read32(addr & !3) };
        cpu.regs[rd] = if !byte && (addr & 3) != 0 {
            val.rotate_right((addr & 3) * 8)
        } else {
            val
        };
        if rd == 15 {
            cpu.set_pc(cpu.regs[15] & !3);
        }
    } else {
        let val = if rd == 15 { cpu.pc().wrapping_add(4) } else { cpu.regs[rd] };
        if byte { mem.write8(addr, val as u8); } else { mem.write32(addr & !3, val); }
    }

    if !pre {
        let final_addr = if up { base.wrapping_add(offset) } else { base.wrapping_sub(offset) };
        cpu.regs[rn] = final_addr;
    } else if writeback {
        cpu.regs[rn] = addr;
    }

    cpu.add_cycles(if load { 3 } else { 2 });
}

fn exec_block_transfer(cpu: &mut Cpu, mem: &mut Memory, instr: u32) {
    let pre = (instr >> 24) & 1 != 0;
    let up = (instr >> 23) & 1 != 0;
    let writeback = (instr >> 21) & 1 != 0;
    let load = (instr >> 20) & 1 != 0;
    let rn = ((instr >> 16) & 0xF) as usize;
    let reg_list = instr & 0xFFFF;

    let count = reg_list.count_ones();
    let base = cpu.regs[rn];

    let start_addr = if up {
        if pre { base.wrapping_add(4) } else { base }
    } else {
        if pre { base.wrapping_sub(count * 4) } else { base.wrapping_sub(count * 4).wrapping_add(4) }
    };

    let mut addr = start_addr;
    for i in 0..16u32 {
        if reg_list & (1 << i) == 0 { continue; }
        if load {
            cpu.regs[i as usize] = mem.read32(addr);
        } else {
            let val = cpu.regs[i as usize];
            mem.write32(addr, val);
        }
        addr = addr.wrapping_add(4);
    }

    if writeback {
        cpu.regs[rn] = if up { base.wrapping_add(count * 4) } else { base.wrapping_sub(count * 4) };
    }

    if load && (reg_list & (1 << 15)) != 0 {
        let new_pc = cpu.regs[15];
        if new_pc & 1 != 0 {
            cpu.cpsr |= CPSR_T;
            cpu.set_pc(new_pc & !1);
        } else {
            cpu.set_pc(new_pc & !3);
        }
    }

    cpu.add_cycles(count as u64 + if load { 2 } else { 1 });
}

fn exec_halfword_transfer(cpu: &mut Cpu, mem: &mut Memory, instr: u32) {
    let pre = (instr >> 24) & 1 != 0;
    let up = (instr >> 23) & 1 != 0;
    let imm_offset = (instr >> 22) & 1 != 0;
    let writeback = (instr >> 21) & 1 != 0;
    let load = (instr >> 20) & 1 != 0;
    let rn = ((instr >> 16) & 0xF) as usize;
    let rd = ((instr >> 12) & 0xF) as usize;
    let sh = (instr >> 5) & 0x3;

    let base = cpu.regs[rn];
    let offset = if imm_offset {
        ((instr >> 4) & 0xF0) | (instr & 0xF)
    } else {
        cpu.regs[(instr & 0xF) as usize]
    };

    let addr = if pre {
        if up { base.wrapping_add(offset) } else { base.wrapping_sub(offset) }
    } else {
        base
    };

    if load {
        cpu.regs[rd] = match sh {
            1 => mem.read16(addr & !1) as u32,           // LDRH
            2 => mem.read8(addr) as i8 as i32 as u32,    // LDRSB
            3 => mem.read16(addr & !1) as i16 as i32 as u32, // LDRSH
            _ => 0,
        };
    } else {
        match sh {
            1 => mem.write16(addr & !1, cpu.regs[rd] as u16), // STRH
            _ => {}
        }
    }

    if !pre {
        let final_addr = if up { base.wrapping_add(offset) } else { base.wrapping_sub(offset) };
        cpu.regs[rn] = final_addr;
    } else if writeback {
        cpu.regs[rn] = addr;
    }

    cpu.add_cycles(if load { 3 } else { 2 });
}

fn exec_multiply(cpu: &mut Cpu, instr: u32) {
    let accumulate = (instr >> 21) & 1 != 0;
    let set_flags = (instr >> 20) & 1 != 0;
    let rd = ((instr >> 16) & 0xF) as usize;
    let rn = ((instr >> 12) & 0xF) as usize;
    let rs = ((instr >> 8) & 0xF) as usize;
    let rm = (instr & 0xF) as usize;

    let result = cpu.regs[rm].wrapping_mul(cpu.regs[rs]);
    let result = if accumulate { result.wrapping_add(cpu.regs[rn]) } else { result };
    cpu.regs[rd] = result;

    if set_flags { cpu.set_nz(result); }
    cpu.add_cycles(4);
}

fn exec_multiply_long(cpu: &mut Cpu, instr: u32) {
    let is_signed = (instr >> 22) & 1 != 0;
    let accumulate = (instr >> 21) & 1 != 0;
    let set_flags = (instr >> 20) & 1 != 0;
    let rdhi = ((instr >> 16) & 0xF) as usize;
    let rdlo = ((instr >> 12) & 0xF) as usize;
    let rs = ((instr >> 8) & 0xF) as usize;
    let rm = (instr & 0xF) as usize;

    let result: u64 = if is_signed {
        (cpu.regs[rm] as i32 as i64).wrapping_mul(cpu.regs[rs] as i32 as i64) as u64
    } else {
        (cpu.regs[rm] as u64).wrapping_mul(cpu.regs[rs] as u64)
    };

    let result = if accumulate {
        let acc = ((cpu.regs[rdhi] as u64) << 32) | (cpu.regs[rdlo] as u64);
        result.wrapping_add(acc)
    } else {
        result
    };

    cpu.regs[rdlo] = result as u32;
    cpu.regs[rdhi] = (result >> 32) as u32;

    if set_flags {
        cpu.set_nz(cpu.regs[rdhi]);
        if result == 0 { cpu.cpsr |= crate::cpu::CPSR_Z; }
    }
    cpu.add_cycles(5);
}

fn exec_mrs(cpu: &mut Cpu, instr: u32) {
    let rd = ((instr >> 12) & 0xF) as usize;
    let use_spsr = (instr >> 22) & 1 != 0;
    cpu.regs[rd] = if use_spsr { cpu.get_spsr() } else { cpu.cpsr };
    cpu.add_cycles(1);
}

fn exec_msr_reg(cpu: &mut Cpu, instr: u32) {
    let use_spsr = (instr >> 22) & 1 != 0;
    let rm = (instr & 0xF) as usize;
    let val = cpu.regs[rm];
    let mask = msr_field_mask(instr);
    if use_spsr {
        let old = cpu.get_spsr();
        cpu.set_spsr((old & !mask) | (val & mask));
    } else {
        cpu.cpsr = (cpu.cpsr & !mask) | (val & mask);
    }
    cpu.add_cycles(1);
}

fn exec_msr_imm(cpu: &mut Cpu, instr: u32) {
    let use_spsr = (instr >> 22) & 1 != 0;
    let imm = instr & 0xFF;
    let rot = ((instr >> 8) & 0xF) * 2;
    let val = imm.rotate_right(rot);
    let mask = msr_field_mask(instr);
    if use_spsr {
        let old = cpu.get_spsr();
        cpu.set_spsr((old & !mask) | (val & mask));
    } else {
        cpu.cpsr = (cpu.cpsr & !mask) | (val & mask);
    }
    cpu.add_cycles(1);
}

fn msr_field_mask(instr: u32) -> u32 {
    let mut mask = 0u32;
    if instr & (1 << 19) != 0 { mask |= 0xFF00_0000; } // flags
    if instr & (1 << 18) != 0 { mask |= 0x00FF_0000; } // status
    if instr & (1 << 17) != 0 { mask |= 0x0000_FF00; } // extension
    if instr & (1 << 16) != 0 { mask |= 0x0000_00FF; } // control
    mask
}

fn exec_clz(cpu: &mut Cpu, instr: u32) {
    let rd = ((instr >> 12) & 0xF) as usize;
    let rm = (instr & 0xF) as usize;
    cpu.regs[rd] = if cpu.regs[rm] == 0 { 32 } else { cpu.regs[rm].leading_zeros() };
    cpu.add_cycles(1);
}

fn exec_cp_reg_transfer(cpu: &mut Cpu, instr: u32) {
    let cp_num = (instr >> 8) & 0xF;
    if cp_num != 15 {
        cpu.add_cycles(1);
        return;
    }
    let is_mrc = (instr >> 20) & 1 != 0;
    let opc1 = (instr >> 21) & 0x7;
    let crn = (instr >> 16) & 0xF;
    let rd = ((instr >> 12) & 0xF) as usize;
    let opc2 = (instr >> 5) & 0x7;
    let crm = instr & 0xF;

    if is_mrc {
        cpu.regs[rd] = cpu.cp15.read(crn, opc1, crm, opc2);
    } else {
        let val = cpu.regs[rd];
        cpu.cp15.write(crn, opc1, crm, opc2, val);
    }
    cpu.add_cycles(1);
}

fn exec_swp(cpu: &mut Cpu, mem: &mut Memory, instr: u32) {
    let byte = (instr >> 22) & 1 != 0;
    let rn = ((instr >> 16) & 0xF) as usize;
    let rd = ((instr >> 12) & 0xF) as usize;
    let rm = (instr & 0xF) as usize;
    let addr = cpu.regs[rn];

    if byte {
        let old = mem.read8(addr) as u32;
        mem.write8(addr, cpu.regs[rm] as u8);
        cpu.regs[rd] = old;
    } else {
        let old = mem.read32(addr & !3);
        mem.write32(addr & !3, cpu.regs[rm]);
        cpu.regs[rd] = old;
    }
    cpu.add_cycles(4);
}

fn exec_ldrex(cpu: &mut Cpu, mem: &mut Memory, instr: u32) {
    let rn = ((instr >> 16) & 0xF) as usize;
    let rd = ((instr >> 12) & 0xF) as usize;
    let addr = cpu.regs[rn];
    cpu.regs[rd] = mem.read32(addr & !3);
    cpu.add_cycles(3);
}

fn exec_strex(cpu: &mut Cpu, mem: &mut Memory, instr: u32) {
    let rn = ((instr >> 16) & 0xF) as usize;
    let rd = ((instr >> 12) & 0xF) as usize;
    let rm = (instr & 0xF) as usize;
    let addr = cpu.regs[rn];
    mem.write32(addr & !3, cpu.regs[rm]);
    cpu.regs[rd] = 0; // Always succeed in HLE
    cpu.add_cycles(2);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cpu::Cpu;
    use crate::memory::Memory;

    fn run_instr(cpu: &mut Cpu, mem: &mut Memory, instr: u32) {
        cpu.set_pc(cpu.pc().wrapping_add(8));
        execute(cpu, mem, instr);
    }

    #[test]
    fn mov_imm() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        // MOV R0, #42 (cond=AL, opcode=MOV, S=0, Rd=R0, imm=42)
        run_instr(&mut cpu, &mut mem, 0xE3A0_002A);
        assert_eq!(cpu.regs[0], 42);
    }

    #[test]
    fn add_regs() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        cpu.regs[1] = 10;
        cpu.regs[2] = 20;
        // ADD R0, R1, R2
        run_instr(&mut cpu, &mut mem, 0xE081_0002);
        assert_eq!(cpu.regs[0], 30);
    }

    #[test]
    fn sub_sets_flags() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        cpu.regs[1] = 5;
        // SUBS R0, R1, #5 (result=0 → Z flag)
        run_instr(&mut cpu, &mut mem, 0xE251_0005);
        assert_eq!(cpu.regs[0], 0);
        assert!(cpu.flag_z());
    }

    #[test]
    fn ldr_str_roundtrip() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        cpu.regs[1] = 0x0800_0000; // heap base
        cpu.regs[0] = 0xDEAD_BEEF;
        // STR R0, [R1]
        run_instr(&mut cpu, &mut mem, 0xE581_0000);
        cpu.regs[0] = 0;
        // LDR R0, [R1]
        run_instr(&mut cpu, &mut mem, 0xE591_0000);
        assert_eq!(cpu.regs[0], 0xDEAD_BEEF);
    }

    #[test]
    fn branch_forward() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        cpu.set_pc(0x0010_0000);
        // B +16 (offset = 4 words = 0x000004)
        run_instr(&mut cpu, &mut mem, 0xEA00_0004);
        assert_eq!(cpu.pc(), 0x0010_0000 + 8 + 16);
    }

    #[test]
    fn cmp_sets_carry() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        cpu.regs[0] = 10;
        // CMP R0, #5
        run_instr(&mut cpu, &mut mem, 0xE350_0005);
        assert!(cpu.flag_c()); // 10 >= 5
        assert!(!cpu.flag_z());
    }

    #[test]
    fn ldm_stm() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        cpu.regs[13] = 0x0800_1000;
        cpu.regs[0] = 0xAA;
        cpu.regs[1] = 0xBB;
        // STMDB R13!, {R0, R1}
        run_instr(&mut cpu, &mut mem, 0xE92D_0003);
        assert_eq!(cpu.regs[13], 0x0800_1000 - 8);
        cpu.regs[0] = 0;
        cpu.regs[1] = 0;
        // LDMIA R13!, {R0, R1}
        run_instr(&mut cpu, &mut mem, 0xE8BD_0003);
        assert_eq!(cpu.regs[0], 0xAA);
        assert_eq!(cpu.regs[1], 0xBB);
    }

    #[test]
    fn clz() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        cpu.regs[1] = 0x0000_0100; // bit 8 set → 23 leading zeros
        // CLZ R0, R1
        run_instr(&mut cpu, &mut mem, 0xE16F_0F11);
        assert_eq!(cpu.regs[0], 23);
    }

    #[test]
    fn mul() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        cpu.regs[1] = 7;
        cpu.regs[2] = 6;
        // MUL R0, R1, R2
        run_instr(&mut cpu, &mut mem, 0xE000_0291);
        assert_eq!(cpu.regs[0], 42);
    }

    #[test]
    fn condition_ne_skips() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        cpu.cpsr |= crate::cpu::CPSR_Z; // Z=1, so NE fails
        cpu.regs[0] = 99;
        // MOVNE R0, #0 (cond=NE=0x1)
        run_instr(&mut cpu, &mut mem, 0x13A0_0000);
        assert_eq!(cpu.regs[0], 99); // Not executed
    }
}
