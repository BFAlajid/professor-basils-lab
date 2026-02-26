use crate::cpu::{Cpu, CPSR_C, CPSR_V, CPSR_T, MODE_SVC};
use crate::memory::Memory;

pub fn execute(cpu: &mut Cpu, mem: &mut Memory, instr: u16) {
    let bits_15_8 = instr >> 8;

    match bits_15_8 {
        // Format 1: Move shifted register (LSL/LSR/ASR)
        0x00..=0x07 => exec_shift_imm(cpu, instr),
        0x08..=0x0F => exec_shift_imm(cpu, instr),
        0x10..=0x17 => exec_shift_imm(cpu, instr),

        // Format 2: Add/subtract
        0x18..=0x19 => exec_add_sub_reg(cpu, instr),
        0x1A..=0x1B => exec_add_sub_reg(cpu, instr),
        0x1C..=0x1D => exec_add_sub_imm(cpu, instr),
        0x1E..=0x1F => exec_add_sub_imm(cpu, instr),

        // Format 3: Move/compare/add/subtract immediate
        0x20..=0x27 => exec_mov_imm(cpu, instr),
        0x28..=0x2F => exec_cmp_imm(cpu, instr),
        0x30..=0x37 => exec_add_imm(cpu, instr),
        0x38..=0x3F => exec_sub_imm(cpu, instr),

        // Format 4: ALU operations
        0x40..=0x43 => exec_alu(cpu, instr),

        // Format 5: Hi register operations / BX
        0x44..=0x47 => exec_hi_reg(cpu, instr),

        // Format 6: PC-relative load
        0x48..=0x4F => exec_ldr_pc(cpu, mem, instr),

        // Format 7-8: Load/store with register offset
        0x50..=0x5F => exec_load_store_reg(cpu, mem, instr),

        // Format 9: Load/store with immediate offset
        0x60..=0x7F => exec_load_store_imm(cpu, mem, instr),

        // Format 10: Load/store halfword
        0x80..=0x8F => exec_load_store_half(cpu, mem, instr),

        // Format 11: SP-relative load/store
        0x90..=0x9F => exec_load_store_sp(cpu, mem, instr),

        // Format 12: Load address (PC/SP + imm)
        0xA0..=0xAF => exec_load_addr(cpu, instr),

        // Format 13: Add offset to SP
        0xB0 => exec_add_sp(cpu, instr),

        // Format 14: Push/pop registers
        0xB4..=0xB5 => exec_push(cpu, mem, instr),
        0xBC..=0xBD => exec_pop(cpu, mem, instr),

        // Format 15: Multiple load/store
        0xC0..=0xCF => exec_ldm_stm(cpu, mem, instr),

        // Format 16: Conditional branch
        0xD0..=0xDD => exec_cond_branch(cpu, instr),

        // Format 17: SVC
        0xDF => exec_svc(cpu, instr),

        // Format 18: Unconditional branch
        0xE0..=0xE7 => exec_branch(cpu, instr),

        // Format 19: Long branch with link (BL prefix)
        0xF0..=0xF7 => exec_bl_prefix(cpu, instr),
        0xF8..=0xFF => exec_bl_suffix(cpu, instr),

        _ => { cpu.add_cycles(1); }
    }
}

fn exec_shift_imm(cpu: &mut Cpu, instr: u16) {
    let op = (instr >> 11) & 0x3;
    let offset = ((instr >> 6) & 0x1F) as u32;
    let rs = ((instr >> 3) & 0x7) as usize;
    let rd = (instr & 0x7) as usize;
    let val = cpu.regs[rs];

    let (result, carry) = match op {
        0 => { // LSL
            if offset == 0 { (val, cpu.flag_c()) }
            else { (val << offset, (val >> (32 - offset)) & 1 != 0) }
        }
        1 => { // LSR
            if offset == 0 { (0, val >> 31 != 0) }
            else { (val >> offset, (val >> (offset - 1)) & 1 != 0) }
        }
        2 => { // ASR
            if offset == 0 {
                let bit = val >> 31 != 0;
                (if bit { 0xFFFF_FFFF } else { 0 }, bit)
            } else {
                ((val as i32 >> offset) as u32, (val >> (offset - 1)) & 1 != 0)
            }
        }
        _ => (val, cpu.flag_c()),
    };

    cpu.regs[rd] = result;
    cpu.set_nz(result);
    if carry { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
    cpu.add_cycles(1);
}

fn exec_add_sub_reg(cpu: &mut Cpu, instr: u16) {
    let sub = (instr >> 9) & 1 != 0;
    let rn = ((instr >> 6) & 0x7) as usize;
    let rs = ((instr >> 3) & 0x7) as usize;
    let rd = (instr & 0x7) as usize;
    let a = cpu.regs[rs];
    let b = cpu.regs[rn];

    let result = if sub { a.wrapping_sub(b) } else { a.wrapping_add(b) };
    cpu.regs[rd] = result;
    cpu.set_nz(result);

    if sub {
        if a >= b { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
        let v = ((a ^ b) & (a ^ result)) >> 31 != 0;
        if v { cpu.cpsr |= CPSR_V; } else { cpu.cpsr &= !CPSR_V; }
    } else {
        if result < a { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
        let v = (!(a ^ b) & (a ^ result)) >> 31 != 0;
        if v { cpu.cpsr |= CPSR_V; } else { cpu.cpsr &= !CPSR_V; }
    }
    cpu.add_cycles(1);
}

fn exec_add_sub_imm(cpu: &mut Cpu, instr: u16) {
    let sub = (instr >> 9) & 1 != 0;
    let imm = ((instr >> 6) & 0x7) as u32;
    let rs = ((instr >> 3) & 0x7) as usize;
    let rd = (instr & 0x7) as usize;
    let a = cpu.regs[rs];

    let result = if sub { a.wrapping_sub(imm) } else { a.wrapping_add(imm) };
    cpu.regs[rd] = result;
    cpu.set_nz(result);

    if sub {
        if a >= imm { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
        let v = ((a ^ imm) & (a ^ result)) >> 31 != 0;
        if v { cpu.cpsr |= CPSR_V; } else { cpu.cpsr &= !CPSR_V; }
    } else {
        if result < a { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
        let v = (!(a ^ imm) & (a ^ result)) >> 31 != 0;
        if v { cpu.cpsr |= CPSR_V; } else { cpu.cpsr &= !CPSR_V; }
    }
    cpu.add_cycles(1);
}

fn exec_mov_imm(cpu: &mut Cpu, instr: u16) {
    let rd = ((instr >> 8) & 0x7) as usize;
    let imm = (instr & 0xFF) as u32;
    cpu.regs[rd] = imm;
    cpu.set_nz(imm);
    cpu.add_cycles(1);
}

fn exec_cmp_imm(cpu: &mut Cpu, instr: u16) {
    let rd = ((instr >> 8) & 0x7) as usize;
    let imm = (instr & 0xFF) as u32;
    let a = cpu.regs[rd];
    let result = a.wrapping_sub(imm);
    cpu.set_nz(result);
    if a >= imm { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
    let v = ((a ^ imm) & (a ^ result)) >> 31 != 0;
    if v { cpu.cpsr |= CPSR_V; } else { cpu.cpsr &= !CPSR_V; }
    cpu.add_cycles(1);
}

fn exec_add_imm(cpu: &mut Cpu, instr: u16) {
    let rd = ((instr >> 8) & 0x7) as usize;
    let imm = (instr & 0xFF) as u32;
    let a = cpu.regs[rd];
    let result = a.wrapping_add(imm);
    cpu.regs[rd] = result;
    cpu.set_nz(result);
    if result < a { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
    let v = (!(a ^ imm) & (a ^ result)) >> 31 != 0;
    if v { cpu.cpsr |= CPSR_V; } else { cpu.cpsr &= !CPSR_V; }
    cpu.add_cycles(1);
}

fn exec_sub_imm(cpu: &mut Cpu, instr: u16) {
    let rd = ((instr >> 8) & 0x7) as usize;
    let imm = (instr & 0xFF) as u32;
    let a = cpu.regs[rd];
    let result = a.wrapping_sub(imm);
    cpu.regs[rd] = result;
    cpu.set_nz(result);
    if a >= imm { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
    let v = ((a ^ imm) & (a ^ result)) >> 31 != 0;
    if v { cpu.cpsr |= CPSR_V; } else { cpu.cpsr &= !CPSR_V; }
    cpu.add_cycles(1);
}

fn exec_alu(cpu: &mut Cpu, instr: u16) {
    let op = (instr >> 6) & 0xF;
    let rs = ((instr >> 3) & 0x7) as usize;
    let rd = (instr & 0x7) as usize;
    let a = cpu.regs[rd];
    let b = cpu.regs[rs];

    let result = match op {
        0x0 => a & b,                                          // AND
        0x1 => a ^ b,                                          // EOR
        0x2 => {                                                // LSL
            let shift = b & 0xFF;
            if shift == 0 { a }
            else if shift < 32 {
                let c = (a >> (32 - shift)) & 1 != 0;
                if c { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
                a << shift
            } else {
                if shift == 32 { if a & 1 != 0 { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; } }
                else { cpu.cpsr &= !CPSR_C; }
                0
            }
        }
        0x3 => {                                                // LSR
            let shift = b & 0xFF;
            if shift == 0 { a }
            else if shift < 32 {
                let c = (a >> (shift - 1)) & 1 != 0;
                if c { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
                a >> shift
            } else {
                if shift == 32 { if a >> 31 != 0 { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; } }
                else { cpu.cpsr &= !CPSR_C; }
                0
            }
        }
        0x4 => {                                                // ASR
            let shift = b & 0xFF;
            if shift == 0 { a }
            else if shift < 32 {
                let c = (a >> (shift - 1)) & 1 != 0;
                if c { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
                (a as i32 >> shift) as u32
            } else {
                let bit = a >> 31 != 0;
                if bit { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
                if bit { 0xFFFF_FFFF } else { 0 }
            }
        }
        0x5 => {                                                // ADC
            let c = if cpu.flag_c() { 1u32 } else { 0 };
            let r = a.wrapping_add(b).wrapping_add(c);
            let carry = (r < a) || (c == 1 && r == a);
            if carry { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
            let v = (!(a ^ b) & (a ^ r)) >> 31 != 0;
            if v { cpu.cpsr |= CPSR_V; } else { cpu.cpsr &= !CPSR_V; }
            r
        }
        0x6 => {                                                // SBC
            let c = if cpu.flag_c() { 1u32 } else { 0 };
            let r = a.wrapping_sub(b).wrapping_sub(1 - c);
            if a >= b.wrapping_add(1 - c) { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
            r
        }
        0x7 => {                                                // ROR
            let shift = b & 0xFF;
            if shift == 0 { a }
            else {
                let eff = shift & 31;
                let r = if eff == 0 { a } else { a.rotate_right(eff) };
                if r >> 31 != 0 { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
                r
            }
        }
        0x8 => { // TST
            let r = a & b;
            cpu.set_nz(r);
            cpu.add_cycles(1);
            return;
        }
        0x9 => 0u32.wrapping_sub(b),                          // NEG
        0xA => {                                                // CMP
            let r = a.wrapping_sub(b);
            cpu.set_nz(r);
            if a >= b { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
            let v = ((a ^ b) & (a ^ r)) >> 31 != 0;
            if v { cpu.cpsr |= CPSR_V; } else { cpu.cpsr &= !CPSR_V; }
            cpu.add_cycles(1);
            return;
        }
        0xB => {                                                // CMN
            let r = a.wrapping_add(b);
            cpu.set_nz(r);
            if r < a { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
            let v = (!(a ^ b) & (a ^ r)) >> 31 != 0;
            if v { cpu.cpsr |= CPSR_V; } else { cpu.cpsr &= !CPSR_V; }
            cpu.add_cycles(1);
            return;
        }
        0xC => a | b,                                          // ORR
        0xD => a.wrapping_mul(b),                              // MUL
        0xE => a & !b,                                         // BIC
        0xF => !b,                                             // MVN
        _ => a,
    };

    cpu.regs[rd] = result;
    cpu.set_nz(result);
    cpu.add_cycles(1);
}

fn exec_hi_reg(cpu: &mut Cpu, instr: u16) {
    let op = (instr >> 8) & 0x3;
    let h1 = (instr >> 7) & 1 != 0;
    let h2 = (instr >> 6) & 1 != 0;
    let rs = ((instr >> 3) & 0x7) as usize + if h2 { 8 } else { 0 };
    let rd = (instr & 0x7) as usize + if h1 { 8 } else { 0 };

    match op {
        0 => { // ADD
            cpu.regs[rd] = cpu.regs[rd].wrapping_add(cpu.regs[rs]);
            if rd == 15 { cpu.set_pc(cpu.regs[15] & !1); }
        }
        1 => { // CMP
            let a = cpu.regs[rd];
            let b = cpu.regs[rs];
            let r = a.wrapping_sub(b);
            cpu.set_nz(r);
            if a >= b { cpu.cpsr |= CPSR_C; } else { cpu.cpsr &= !CPSR_C; }
            let v = ((a ^ b) & (a ^ r)) >> 31 != 0;
            if v { cpu.cpsr |= CPSR_V; } else { cpu.cpsr &= !CPSR_V; }
        }
        2 => { // MOV
            cpu.regs[rd] = cpu.regs[rs];
            if rd == 15 { cpu.set_pc(cpu.regs[15] & !1); }
        }
        3 => { // BX/BLX
            let addr = cpu.regs[rs];
            if h1 { // BLX
                cpu.regs[14] = (cpu.pc().wrapping_sub(2)) | 1;
            }
            if addr & 1 != 0 {
                cpu.cpsr |= CPSR_T;
                cpu.set_pc(addr & !1);
            } else {
                cpu.cpsr &= !CPSR_T;
                cpu.set_pc(addr & !3);
            }
        }
        _ => {}
    }
    cpu.add_cycles(1);
}

fn exec_ldr_pc(cpu: &mut Cpu, mem: &mut Memory, instr: u16) {
    let rd = ((instr >> 8) & 0x7) as usize;
    let offset = ((instr & 0xFF) as u32) * 4;
    let addr = (cpu.pc() & !3).wrapping_add(offset);
    cpu.regs[rd] = mem.read32(addr);
    cpu.add_cycles(3);
}

fn exec_load_store_reg(cpu: &mut Cpu, mem: &mut Memory, instr: u16) {
    let op = (instr >> 9) & 0x7;
    let ro = ((instr >> 6) & 0x7) as usize;
    let rb = ((instr >> 3) & 0x7) as usize;
    let rd = (instr & 0x7) as usize;
    let addr = cpu.regs[rb].wrapping_add(cpu.regs[ro]);

    match op {
        0 => mem.write32(addr & !3, cpu.regs[rd]),          // STR
        1 => mem.write16(addr & !1, cpu.regs[rd] as u16),   // STRH
        2 => mem.write8(addr, cpu.regs[rd] as u8),          // STRB
        3 => cpu.regs[rd] = mem.read8(addr) as i8 as i32 as u32, // LDRSB
        4 => cpu.regs[rd] = mem.read32(addr & !3),          // LDR
        5 => cpu.regs[rd] = mem.read16(addr & !1) as u32,   // LDRH
        6 => cpu.regs[rd] = mem.read8(addr) as u32,         // LDRB
        7 => cpu.regs[rd] = mem.read16(addr & !1) as i16 as i32 as u32, // LDRSH
        _ => {}
    }
    cpu.add_cycles(if op >= 3 { 3 } else { 2 });
}

fn exec_load_store_imm(cpu: &mut Cpu, mem: &mut Memory, instr: u16) {
    let byte = (instr >> 12) & 1 != 0;
    let load = (instr >> 11) & 1 != 0;
    let offset = ((instr >> 6) & 0x1F) as u32;
    let rb = ((instr >> 3) & 0x7) as usize;
    let rd = (instr & 0x7) as usize;

    if byte {
        let addr = cpu.regs[rb].wrapping_add(offset);
        if load { cpu.regs[rd] = mem.read8(addr) as u32; }
        else { mem.write8(addr, cpu.regs[rd] as u8); }
    } else {
        let addr = cpu.regs[rb].wrapping_add(offset * 4);
        if load { cpu.regs[rd] = mem.read32(addr & !3); }
        else { mem.write32(addr & !3, cpu.regs[rd]); }
    }
    cpu.add_cycles(if load { 3 } else { 2 });
}

fn exec_load_store_half(cpu: &mut Cpu, mem: &mut Memory, instr: u16) {
    let load = (instr >> 11) & 1 != 0;
    let offset = (((instr >> 6) & 0x1F) as u32) * 2;
    let rb = ((instr >> 3) & 0x7) as usize;
    let rd = (instr & 0x7) as usize;
    let addr = cpu.regs[rb].wrapping_add(offset);

    if load { cpu.regs[rd] = mem.read16(addr & !1) as u32; }
    else { mem.write16(addr & !1, cpu.regs[rd] as u16); }
    cpu.add_cycles(if load { 3 } else { 2 });
}

fn exec_load_store_sp(cpu: &mut Cpu, mem: &mut Memory, instr: u16) {
    let load = (instr >> 11) & 1 != 0;
    let rd = ((instr >> 8) & 0x7) as usize;
    let offset = ((instr & 0xFF) as u32) * 4;
    let addr = cpu.regs[13].wrapping_add(offset);

    if load { cpu.regs[rd] = mem.read32(addr & !3); }
    else { mem.write32(addr & !3, cpu.regs[rd]); }
    cpu.add_cycles(if load { 3 } else { 2 });
}

fn exec_load_addr(cpu: &mut Cpu, instr: u16) {
    let sp = (instr >> 11) & 1 != 0;
    let rd = ((instr >> 8) & 0x7) as usize;
    let offset = ((instr & 0xFF) as u32) * 4;
    cpu.regs[rd] = if sp {
        cpu.regs[13].wrapping_add(offset)
    } else {
        (cpu.pc() & !3).wrapping_add(offset)
    };
    cpu.add_cycles(1);
}

fn exec_add_sp(cpu: &mut Cpu, instr: u16) {
    let neg = (instr >> 7) & 1 != 0;
    let offset = ((instr & 0x7F) as u32) * 4;
    if neg { cpu.regs[13] = cpu.regs[13].wrapping_sub(offset); }
    else { cpu.regs[13] = cpu.regs[13].wrapping_add(offset); }
    cpu.add_cycles(1);
}

fn exec_push(cpu: &mut Cpu, mem: &mut Memory, instr: u16) {
    let lr = (instr >> 8) & 1 != 0;
    let reg_list = instr & 0xFF;
    let count = reg_list.count_ones() + if lr { 1 } else { 0 };
    let mut addr = cpu.regs[13].wrapping_sub(count * 4);
    cpu.regs[13] = addr;

    for i in 0..8u16 {
        if reg_list & (1 << i) != 0 {
            mem.write32(addr, cpu.regs[i as usize]);
            addr = addr.wrapping_add(4);
        }
    }
    if lr { mem.write32(addr, cpu.regs[14]); }
    cpu.add_cycles(count as u64 + 1);
}

fn exec_pop(cpu: &mut Cpu, mem: &mut Memory, instr: u16) {
    let pc = (instr >> 8) & 1 != 0;
    let reg_list = instr & 0xFF;
    let mut addr = cpu.regs[13];

    for i in 0..8u16 {
        if reg_list & (1 << i) != 0 {
            cpu.regs[i as usize] = mem.read32(addr);
            addr = addr.wrapping_add(4);
        }
    }
    if pc {
        let val = mem.read32(addr);
        addr = addr.wrapping_add(4);
        if val & 1 != 0 {
            cpu.cpsr |= CPSR_T;
            cpu.set_pc(val & !1);
        } else {
            cpu.cpsr &= !CPSR_T;
            cpu.set_pc(val & !3);
        }
    }
    cpu.regs[13] = addr;
    let count = reg_list.count_ones() + if pc { 1 } else { 0 };
    cpu.add_cycles(count as u64 + 2);
}

fn exec_ldm_stm(cpu: &mut Cpu, mem: &mut Memory, instr: u16) {
    let load = (instr >> 11) & 1 != 0;
    let rb = ((instr >> 8) & 0x7) as usize;
    let reg_list = instr & 0xFF;
    let mut addr = cpu.regs[rb];

    for i in 0..8u16 {
        if reg_list & (1 << i) != 0 {
            if load {
                cpu.regs[i as usize] = mem.read32(addr);
            } else {
                mem.write32(addr, cpu.regs[i as usize]);
            }
            addr = addr.wrapping_add(4);
        }
    }
    if load && (reg_list & (1 << rb as u16)) == 0 {
        cpu.regs[rb] = addr;
    }
    if !load {
        cpu.regs[rb] = addr;
    }
    cpu.add_cycles(reg_list.count_ones() as u64 + if load { 2 } else { 1 });
}

fn exec_cond_branch(cpu: &mut Cpu, instr: u16) {
    let cond = ((instr >> 8) & 0xF) as u32;
    if !cpu.check_condition(cond) {
        cpu.add_cycles(1);
        return;
    }
    let offset = ((instr & 0xFF) as i8 as i32) * 2;
    let target = (cpu.pc() as i32).wrapping_add(offset) as u32;
    cpu.set_pc(target);
    cpu.add_cycles(3);
}

fn exec_svc(cpu: &mut Cpu, instr: u16) {
    let comment = (instr & 0xFF) as u32;
    let return_addr = cpu.pc().wrapping_sub(2);
    let old_cpsr = cpu.cpsr;
    cpu.switch_mode(MODE_SVC);
    cpu.set_spsr(old_cpsr);
    cpu.regs[14] = return_addr;
    cpu.cpsr |= crate::cpu::CPSR_I;
    cpu.cpsr &= !CPSR_T;
    cpu.regs[15] = comment;
    cpu.add_cycles(3);
}

fn exec_branch(cpu: &mut Cpu, instr: u16) {
    let offset = (((instr & 0x7FF) as i32) << 21) >> 20;
    let target = (cpu.pc() as i32).wrapping_add(offset) as u32;
    cpu.set_pc(target);
    cpu.add_cycles(3);
}

fn exec_bl_prefix(cpu: &mut Cpu, instr: u16) {
    let offset = (((instr & 0x7FF) as i32) << 21) >> 9;
    cpu.regs[14] = (cpu.pc() as i32).wrapping_add(offset) as u32;
    cpu.add_cycles(1);
}

fn exec_bl_suffix(cpu: &mut Cpu, instr: u16) {
    let offset = ((instr & 0x7FF) as u32) << 1;
    let target = cpu.regs[14].wrapping_add(offset);
    cpu.regs[14] = (cpu.pc().wrapping_sub(2)) | 1;
    cpu.set_pc(target);
    cpu.add_cycles(3);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cpu::Cpu;
    use crate::memory::Memory;

    fn run_thumb(cpu: &mut Cpu, mem: &mut Memory, instr: u16) {
        cpu.cpsr |= CPSR_T;
        cpu.set_pc(cpu.pc().wrapping_add(4));
        execute(cpu, mem, instr);
    }

    #[test]
    fn mov_imm_thumb() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        // MOV R3, #100
        run_thumb(&mut cpu, &mut mem, 0x2364);
        assert_eq!(cpu.regs[3], 100);
    }

    #[test]
    fn add_regs_thumb() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        cpu.regs[1] = 10;
        cpu.regs[2] = 20;
        // ADD R0, R1, R2
        run_thumb(&mut cpu, &mut mem, 0x1888);
        assert_eq!(cpu.regs[0], 30);
    }

    #[test]
    fn push_pop_thumb() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        cpu.regs[13] = 0x0800_1000;
        cpu.regs[0] = 0xAA;
        cpu.regs[1] = 0xBB;
        // PUSH {R0, R1}
        run_thumb(&mut cpu, &mut mem, 0xB403);
        assert_eq!(cpu.regs[13], 0x0800_1000 - 8);
        cpu.regs[0] = 0;
        cpu.regs[1] = 0;
        // POP {R0, R1}
        run_thumb(&mut cpu, &mut mem, 0xBC03);
        assert_eq!(cpu.regs[0], 0xAA);
        assert_eq!(cpu.regs[1], 0xBB);
    }

    #[test]
    fn lsl_imm_thumb() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        cpu.regs[1] = 1;
        // LSL R0, R1, #4
        run_thumb(&mut cpu, &mut mem, 0x0108);
        assert_eq!(cpu.regs[0], 16);
    }

    #[test]
    fn cmp_imm_thumb() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        cpu.regs[0] = 42;
        // CMP R0, #42
        run_thumb(&mut cpu, &mut mem, 0x282A);
        assert!(cpu.flag_z());
        assert!(cpu.flag_c());
    }
}
