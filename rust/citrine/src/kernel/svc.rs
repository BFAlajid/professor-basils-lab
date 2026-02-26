use crate::cpu::Cpu;
use crate::memory::Memory;
use crate::kernel::{Kernel, HandleEntry};
use crate::kernel::thread::{Thread, WaitReason};
use crate::kernel::sync::{self, SyncObject, MutexState, SemaphoreState, EventState, ResetType};

pub const RESULT_SUCCESS: u32 = 0;
pub const RESULT_INVALID_HANDLE: u32 = 0xD8E007F7;
pub const RESULT_TIMEOUT: u32 = 0x09401BFE;
pub const RESULT_NOT_FOUND: u32 = 0xD88007FA;
pub const RESULT_OUT_OF_RANGE: u32 = 0xD8E007FD;

pub fn dispatch(cpu: &mut Cpu, mem: &mut Memory, kernel: &mut Kernel, svc_num: u32) {
    // Restore PC from LR and return to pre-SVC mode
    cpu.regs[15] = cpu.regs[14];
    let old_cpsr = cpu.get_spsr();
    cpu.switch_mode(old_cpsr & 0x1F);
    cpu.cpsr = old_cpsr;

    match svc_num {
        0x01 => svc_control_memory(cpu, mem),
        0x02 => svc_query_memory(cpu, mem),
        0x03 => svc_exit_process(cpu, kernel),
        0x08 => svc_create_thread(cpu, kernel),
        0x09 => svc_exit_thread(cpu, kernel),
        0x0A => svc_sleep_thread(cpu, kernel),
        0x0B => svc_get_thread_priority(cpu, kernel),
        0x0C => svc_set_thread_priority(cpu, kernel),
        0x13 => svc_create_mutex(cpu, kernel),
        0x14 => svc_release_mutex(cpu, kernel),
        0x15 => svc_create_semaphore(cpu, kernel),
        0x16 => svc_release_semaphore(cpu, kernel),
        0x17 => svc_create_event(cpu, kernel),
        0x18 => svc_signal_event(cpu, kernel),
        0x19 => svc_clear_event(cpu, kernel),
        0x1E => svc_create_timer(cpu, kernel),
        0x21 => svc_create_memory_block(cpu, kernel, mem),
        0x22 => svc_map_memory_block(cpu, kernel),
        0x23 => svc_close_handle(cpu, kernel),
        0x24 => svc_wait_synchronization1(cpu, kernel),
        0x25 => svc_wait_synchronization_n(cpu, mem, kernel),
        0x27 => svc_duplicate_handle(cpu, kernel),
        0x28 => svc_get_system_tick(cpu),
        0x2D => svc_connect_to_port(cpu, mem, kernel),
        0x32 => svc_send_sync_request(cpu, kernel),
        0x35 => svc_get_process_id(cpu, kernel),
        0x37 => svc_get_thread_id(cpu, kernel),
        0x38 => svc_get_resource_limit(cpu, kernel),
        0x39 => svc_get_resource_limit_values(cpu, mem, kernel),
        0x3C => svc_output_debug_string(cpu, mem),
        0x3D => svc_break(cpu, kernel),
        _ => {
            cpu.regs[0] = RESULT_SUCCESS;
        }
    }
}
fn svc_control_memory(cpu: &mut Cpu, mem: &mut Memory) {
    // SVC 0x01: R0=op, R1=addr0, R2=addr1, R3=size, R4=perm
    let op = cpu.regs[0];
    let addr0 = cpu.regs[1];
    let size = cpu.regs[3];
    match op & 0x0000_FFFF {
        0x0001 => {
            // COMMIT — map already-allocated pages
            cpu.regs[1] = if addr0 != 0 { addr0 } else { mem.alloc_heap(size) };
        }
        0x0003 => {
            // ALLOC — allocate + commit
            cpu.regs[1] = if addr0 == 0 { mem.alloc_heap(size) } else { addr0 };
        }
        0x0004 => {
            // MAP — remap addr1 -> addr0
            cpu.regs[1] = addr0;
        }
        0x0005 => {
            // UNMAP
            cpu.regs[1] = addr0;
        }
        0x0006 => {
            // PROTECT — change permissions, no-op in HLE
            cpu.regs[1] = addr0;
        }
        _ => {
            // LINEAR_ALLOC (0x10003) or other combined ops
            if op & 0x3 != 0 {
                cpu.regs[1] = if addr0 == 0 { mem.alloc_heap(size) } else { addr0 };
            } else {
                cpu.regs[1] = addr0;
            }
        }
    }
    cpu.regs[0] = RESULT_SUCCESS;
}

fn svc_query_memory(cpu: &mut Cpu, _mem: &mut Memory) {
    // ctrulib wrapper: R0=info_ptr, R1=out_ptr, R2=addr
    // Returns: R1=base, R2=size, R3=perm, R4=state, R5=page_flags
    let addr = cpu.regs[2];
    cpu.regs[1] = addr;
    cpu.regs[2] = 0x1000;
    cpu.regs[3] = 0x3;  // RW
    cpu.regs[4] = 0x3;  // Committed
    cpu.regs[5] = 0;    // page_flags
    cpu.regs[0] = RESULT_SUCCESS;
}

fn svc_create_thread(cpu: &mut Cpu, kernel: &mut Kernel) {
    // Cap thread count
    if kernel.threads.len() >= crate::kernel::MAX_THREADS {
        cpu.regs[0] = RESULT_OUT_OF_RANGE;
        return;
    }

    // ctrulib wrapper: R0=handle_ptr(ignore), R1=entry, R2=arg, R3=stack_top, R4=priority
    let entrypoint = cpu.regs[1];
    let arg = cpu.regs[2];
    let stack_top = cpu.regs[3];
    let priority = (cpu.regs[4] as i32).clamp(0, 63);

    let id = kernel.next_thread_id;
    kernel.next_thread_id += 1;

    let mut thread = Thread::new(id, 1, entrypoint, stack_top, priority);
    thread.saved.regs[0] = arg;
    // New threads run in SYS mode (same as main thread in HLE)
    thread.saved.cpsr = (thread.saved.cpsr & !0x1F) | 0x1F;
    kernel.threads.push(thread);

    let handle = kernel.allocate_handle(HandleEntry::Thread(id));
    cpu.regs[1] = handle;
    cpu.regs[0] = RESULT_SUCCESS;
    // New thread is Ready; may need to preempt if higher priority
    kernel.needs_reschedule = true;
}

fn svc_exit_thread(cpu: &mut Cpu, kernel: &mut Kernel) {
    if kernel.current_thread < kernel.threads.len() {
        kernel.threads[kernel.current_thread].kill();
    }
    cpu.regs[0] = RESULT_SUCCESS;
    kernel.needs_reschedule = true;
}

fn svc_sleep_thread(cpu: &mut Cpu, kernel: &mut Kernel) {
    let ns_lo = cpu.regs[0];
    let ns_hi = cpu.regs[1];
    let ns = (ns_hi as u64) << 32 | ns_lo as u64;

    if ns == 0 {
        // Yield: give other same-priority threads a chance
        cpu.regs[0] = RESULT_SUCCESS;
        kernel.needs_reschedule = true;
        return;
    }

    if kernel.current_thread < kernel.threads.len() {
        kernel.threads[kernel.current_thread].suspend_timed(WaitReason::Sleep(ns), ns);
    }
    cpu.regs[0] = RESULT_SUCCESS;
    kernel.needs_reschedule = true;
}

fn svc_get_thread_priority(cpu: &mut Cpu, kernel: &mut Kernel) {
    let handle = cpu.regs[1];
    // Pseudo-handle 0xFFFF8000 = current thread
    if handle == 0xFFFF8000 {
        if kernel.current_thread < kernel.threads.len() {
            cpu.regs[1] = kernel.threads[kernel.current_thread].priority as u32;
            cpu.regs[0] = RESULT_SUCCESS;
        } else {
            cpu.regs[0] = RESULT_INVALID_HANDLE;
        }
        return;
    }
    match kernel.get_handle(handle) {
        Some(HandleEntry::Thread(tid)) => {
            let tid = *tid;
            if let Some(t) = kernel.threads.iter().find(|t| t.id == tid) {
                cpu.regs[1] = t.priority as u32;
                cpu.regs[0] = RESULT_SUCCESS;
            } else {
                cpu.regs[0] = RESULT_INVALID_HANDLE;
            }
        }
        _ => {
            cpu.regs[0] = RESULT_INVALID_HANDLE;
        }
    }
}

fn svc_set_thread_priority(cpu: &mut Cpu, kernel: &mut Kernel) {
    let handle = cpu.regs[0];
    let priority = cpu.regs[1] as i32;
    // Pseudo-handle 0xFFFF8000 = current thread
    if handle == 0xFFFF8000 {
        if kernel.current_thread < kernel.threads.len() {
            kernel.threads[kernel.current_thread].priority = priority;
            cpu.regs[0] = RESULT_SUCCESS;
        } else {
            cpu.regs[0] = RESULT_INVALID_HANDLE;
        }
        return;
    }
    match kernel.get_handle(handle) {
        Some(HandleEntry::Thread(tid)) => {
            let tid = *tid;
            if let Some(t) = kernel.threads.iter_mut().find(|t| t.id == tid) {
                t.priority = priority;
                cpu.regs[0] = RESULT_SUCCESS;
            } else {
                cpu.regs[0] = RESULT_INVALID_HANDLE;
            }
        }
        _ => {
            cpu.regs[0] = RESULT_INVALID_HANDLE;
        }
    }
}
fn svc_create_mutex(cpu: &mut Cpu, kernel: &mut Kernel) {
    let initially_locked = cpu.regs[1] != 0;
    let id = kernel.next_thread_id;
    kernel.next_thread_id += 1;
    let mut state = MutexState::new();
    if initially_locked && kernel.current_thread < kernel.threads.len() {
        state.owner_thread = Some(kernel.threads[kernel.current_thread].id);
        state.lock_count = 1;
    }
    kernel.sync_objects.insert(id, SyncObject::Mutex(state));
    let handle = kernel.allocate_handle(HandleEntry::Mutex(id));
    cpu.regs[1] = handle;
    cpu.regs[0] = RESULT_SUCCESS;
}

fn svc_release_mutex(cpu: &mut Cpu, kernel: &mut Kernel) {
    let handle = cpu.regs[0];
    match kernel.get_handle(handle) {
        Some(HandleEntry::Mutex(sync_id)) => {
            let sync_id = *sync_id;
            let thread_id = if kernel.current_thread < kernel.threads.len() {
                kernel.threads[kernel.current_thread].id
            } else { 0 };
            if let Some(obj) = kernel.sync_objects.get_mut(&sync_id) {
                let woken = sync::release(obj, thread_id);
                for tid in woken {
                    if let Some(t) = kernel.threads.iter_mut().find(|t| t.id == tid) {
                        t.wake();
                    }
                }
            }
            cpu.regs[0] = RESULT_SUCCESS;
        }
        _ => { cpu.regs[0] = RESULT_INVALID_HANDLE; }
    }
}

fn svc_create_semaphore(cpu: &mut Cpu, kernel: &mut Kernel) {
    let initial = cpu.regs[1] as i32;
    let max = cpu.regs[2] as i32;
    let id = kernel.next_thread_id;
    kernel.next_thread_id += 1;
    kernel.sync_objects.insert(id, SyncObject::Semaphore(SemaphoreState::new(initial, max)));
    let handle = kernel.allocate_handle(HandleEntry::Semaphore(id));
    cpu.regs[1] = handle;
    cpu.regs[0] = RESULT_SUCCESS;
}

fn svc_release_semaphore(cpu: &mut Cpu, kernel: &mut Kernel) {
    let handle = cpu.regs[1];
    let count = cpu.regs[2] as i32;
    match kernel.get_handle(handle) {
        Some(HandleEntry::Semaphore(sync_id)) => {
            let sync_id = *sync_id;
            let thread_id = if kernel.current_thread < kernel.threads.len() {
                kernel.threads[kernel.current_thread].id
            } else { 0 };
            let mut prev = 0i32;
            if let Some(SyncObject::Semaphore(s)) = kernel.sync_objects.get(&sync_id) {
                prev = s.count;
            }
            for _ in 0..count {
                if let Some(obj) = kernel.sync_objects.get_mut(&sync_id) {
                    let woken = sync::release(obj, thread_id);
                    for tid in woken {
                        if let Some(t) = kernel.threads.iter_mut().find(|t| t.id == tid) {
                            t.wake();
                        }
                    }
                }
            }
            cpu.regs[1] = prev as u32;
            cpu.regs[0] = RESULT_SUCCESS;
        }
        _ => { cpu.regs[0] = RESULT_INVALID_HANDLE; }
    }
}

fn svc_create_event(cpu: &mut Cpu, kernel: &mut Kernel) {
    let reset_type = match cpu.regs[1] {
        0 => ResetType::OneShot,
        1 => ResetType::Sticky,
        _ => ResetType::Pulse,
    };
    let id = kernel.next_thread_id;
    kernel.next_thread_id += 1;
    kernel.sync_objects.insert(id, SyncObject::Event(EventState::new(reset_type)));
    let handle = kernel.allocate_handle(HandleEntry::Event(id));
    cpu.regs[1] = handle;
    cpu.regs[0] = RESULT_SUCCESS;
}

fn svc_signal_event(cpu: &mut Cpu, kernel: &mut Kernel) {
    let handle = cpu.regs[0];
    match kernel.get_handle(handle) {
        Some(HandleEntry::Event(sync_id)) => {
            let sync_id = *sync_id;
            if let Some(obj) = kernel.sync_objects.get_mut(&sync_id) {
                let woken = sync::release(obj, 0);
                for tid in woken {
                    if let Some(t) = kernel.threads.iter_mut().find(|t| t.id == tid) {
                        t.wake();
                    }
                }
            }
            cpu.regs[0] = RESULT_SUCCESS;
        }
        _ => { cpu.regs[0] = RESULT_INVALID_HANDLE; }
    }
}

fn svc_clear_event(cpu: &mut Cpu, kernel: &mut Kernel) {
    let handle = cpu.regs[0];
    match kernel.get_handle(handle) {
        Some(HandleEntry::Event(sync_id)) => {
            let sync_id = *sync_id;
            if let Some(obj) = kernel.sync_objects.get_mut(&sync_id) {
                sync::clear_event(obj);
            }
            cpu.regs[0] = RESULT_SUCCESS;
        }
        _ => { cpu.regs[0] = RESULT_INVALID_HANDLE; }
    }
}
fn svc_create_timer(cpu: &mut Cpu, kernel: &mut Kernel) {
    let handle = kernel.allocate_handle(HandleEntry::Timer);
    cpu.regs[1] = handle;
    cpu.regs[0] = RESULT_SUCCESS;
}

fn svc_create_memory_block(cpu: &mut Cpu, kernel: &mut Kernel, mem: &mut Memory) {
    // ctrulib wrapper: R0=handle_ptr(ignore), R1=addr, R2=size, R3=my_perm, R4=other_perm
    let addr = cpu.regs[1];
    let size = cpu.regs[2];
    let base = if addr == 0 { mem.alloc_heap(size.max(0x1000)) } else { addr };
    let handle = kernel.allocate_handle(HandleEntry::SharedMemory(base, size));
    cpu.regs[1] = handle;
    cpu.regs[0] = RESULT_SUCCESS;
}

fn svc_map_memory_block(cpu: &mut Cpu, _kernel: &mut Kernel) {
    let _handle = cpu.regs[0];
    let _addr = cpu.regs[1];
    cpu.regs[0] = RESULT_SUCCESS;
}

fn svc_close_handle(cpu: &mut Cpu, kernel: &mut Kernel) {
    let handle = cpu.regs[0];
    // Always succeed — closing an already-closed handle is harmless in HLE
    kernel.close_handle(handle);
    cpu.regs[0] = RESULT_SUCCESS;
}

fn svc_wait_synchronization1(cpu: &mut Cpu, kernel: &mut Kernel) {
    let handle = cpu.regs[0];
    let _ns_lo = cpu.regs[2];
    let _ns_hi = cpu.regs[3];

    // Session/Timer/Thread handles: return immediately (HLE — already synchronous)
    match kernel.get_handle(handle) {
        Some(HandleEntry::Session(_)) | Some(HandleEntry::Timer) => {
            cpu.regs[0] = RESULT_SUCCESS;
            return;
        }
        Some(HandleEntry::Thread(tid)) => {
            let tid = *tid;
            // If thread is dead, signal immediately; otherwise succeed (don't block)
            let _dead = kernel.threads.iter().any(|t| t.id == tid && !t.is_alive());
            cpu.regs[0] = RESULT_SUCCESS;
            return;
        }
        _ => {}
    }

    let sync_id = match kernel.get_handle(handle) {
        Some(HandleEntry::Mutex(id)) | Some(HandleEntry::Semaphore(id)) | Some(HandleEntry::Event(id)) => *id,
        Some(HandleEntry::SharedMemory(_, _)) | Some(HandleEntry::Port(_)) | Some(HandleEntry::Process(_)) => {
            // Not truly waitable but don't crash — return success
            cpu.regs[0] = RESULT_SUCCESS;
            return;
        }
        None => {
            // Handle not in table — return success in HLE mode
            // (the handle may have been a valid object that was already closed/consumed)
            cpu.regs[0] = RESULT_SUCCESS;
            return;
        }
        _ => {
            cpu.regs[0] = RESULT_SUCCESS;
            return;
        }
    };

    let thread_id = if kernel.current_thread < kernel.threads.len() {
        kernel.threads[kernel.current_thread].id
    } else {
        cpu.regs[0] = RESULT_SUCCESS;
        return;
    };

    if let Some(obj) = kernel.sync_objects.get_mut(&sync_id) {
        match sync::acquire(obj, thread_id) {
            sync::AcquireResult::Success => {
                cpu.regs[0] = RESULT_SUCCESS;
            }
            sync::AcquireResult::WouldBlock => {
                let reason = match kernel.get_handle(handle) {
                    Some(HandleEntry::Mutex(_)) => WaitReason::Mutex(handle),
                    Some(HandleEntry::Semaphore(_)) => WaitReason::Semaphore(handle),
                    Some(HandleEntry::Event(_)) => WaitReason::Event(handle),
                    _ => WaitReason::None,
                };
                kernel.threads[kernel.current_thread].suspend(reason);
                cpu.regs[0] = RESULT_SUCCESS;
                kernel.needs_reschedule = true;
            }
            sync::AcquireResult::InvalidObject => {
                cpu.regs[0] = RESULT_INVALID_HANDLE;
            }
        }
    } else {
        cpu.regs[0] = RESULT_INVALID_HANDLE;
    }
}

fn svc_wait_synchronization_n(cpu: &mut Cpu, mem: &mut Memory, kernel: &mut Kernel) {
    let handles_ptr = cpu.regs[1];
    let count = cpu.regs[2];
    let _wait_all = cpu.regs[3] != 0;

    for i in 0..count {
        let handle = mem.read32(handles_ptr + i * 4);

        // Session/Timer/Thread: immediately signaled in HLE
        match kernel.get_handle(handle) {
            Some(HandleEntry::Session(_)) | Some(HandleEntry::Timer) | Some(HandleEntry::Thread(_)) => {
                cpu.regs[1] = i;
                cpu.regs[0] = RESULT_SUCCESS;
                return;
            }
            _ => {}
        }

        let sync_id = match kernel.get_handle(handle) {
            Some(HandleEntry::Mutex(id)) | Some(HandleEntry::Semaphore(id)) | Some(HandleEntry::Event(id)) => *id,
            _ => continue,
        };
        let thread_id = if kernel.current_thread < kernel.threads.len() {
            kernel.threads[kernel.current_thread].id
        } else { continue };
        if let Some(obj) = kernel.sync_objects.get_mut(&sync_id) {
            if sync::acquire(obj, thread_id) == sync::AcquireResult::Success {
                cpu.regs[1] = i;
                cpu.regs[0] = RESULT_SUCCESS;
                return;
            }
        }
    }

    if kernel.current_thread < kernel.threads.len() {
        kernel.threads[kernel.current_thread].suspend(WaitReason::SyncMultiple);
        kernel.needs_reschedule = true;
    }
    cpu.regs[1] = 0;
    cpu.regs[0] = RESULT_SUCCESS;
}
fn svc_duplicate_handle(cpu: &mut Cpu, kernel: &mut Kernel) {
    let handle = cpu.regs[1];
    match kernel.get_handle(handle) {
        Some(entry) => {
            let cloned = entry.clone();
            let new_handle = kernel.allocate_handle(cloned);
            cpu.regs[1] = new_handle;
            cpu.regs[0] = RESULT_SUCCESS;
        }
        None => {
            cpu.regs[0] = RESULT_INVALID_HANDLE;
        }
    }
}

fn svc_get_system_tick(cpu: &mut Cpu) {
    let ticks = cpu.cycles;
    cpu.regs[0] = ticks as u32;
    cpu.regs[1] = (ticks >> 32) as u32;
}

fn svc_connect_to_port(cpu: &mut Cpu, mem: &mut Memory, kernel: &mut Kernel) {
    let name_ptr = cpu.regs[1];
    let mut name_bytes = Vec::new();
    for i in 0..12u32 {
        let b = mem.read8(name_ptr + i);
        if b == 0 { break; }
        name_bytes.push(b);
    }
    let name = String::from_utf8_lossy(&name_bytes).to_string();

    match kernel.connect_to_port(&name) {
        Some(session_handle) => {
            cpu.regs[1] = session_handle;
            cpu.regs[0] = RESULT_SUCCESS;
        }
        None => {
            kernel.last_connect_fail = format!("{}@{:08X}", name, name_ptr);
            cpu.regs[0] = RESULT_NOT_FOUND;
        }
    }
}

fn svc_send_sync_request(cpu: &mut Cpu, _kernel: &mut Kernel) {
    let _handle = cpu.regs[0];
    cpu.regs[0] = RESULT_SUCCESS;
}

fn svc_get_process_id(cpu: &mut Cpu, kernel: &mut Kernel) {
    let handle = cpu.regs[1];
    // Pseudo-handle 0xFFFF8001 = current process
    if handle == 0xFFFF8001 {
        if kernel.current_thread < kernel.threads.len() {
            cpu.regs[1] = kernel.threads[kernel.current_thread].process_id;
        } else {
            cpu.regs[1] = 1;
        }
        cpu.regs[0] = RESULT_SUCCESS;
        return;
    }
    match kernel.get_handle(handle) {
        Some(HandleEntry::Process(pid)) => {
            cpu.regs[1] = *pid;
            cpu.regs[0] = RESULT_SUCCESS;
        }
        _ => {
            if kernel.current_thread < kernel.threads.len() {
                cpu.regs[1] = kernel.threads[kernel.current_thread].process_id;
                cpu.regs[0] = RESULT_SUCCESS;
            } else {
                cpu.regs[0] = RESULT_INVALID_HANDLE;
            }
        }
    }
}

fn svc_get_thread_id(cpu: &mut Cpu, kernel: &mut Kernel) {
    let handle = cpu.regs[1];
    // Pseudo-handle 0xFFFF8000 = current thread
    if handle == 0xFFFF8000 {
        if kernel.current_thread < kernel.threads.len() {
            cpu.regs[1] = kernel.threads[kernel.current_thread].id;
        } else {
            cpu.regs[1] = 0;
        }
        cpu.regs[0] = RESULT_SUCCESS;
        return;
    }
    match kernel.get_handle(handle) {
        Some(HandleEntry::Thread(tid)) => {
            cpu.regs[1] = *tid;
            cpu.regs[0] = RESULT_SUCCESS;
        }
        _ => {
            if kernel.current_thread < kernel.threads.len() {
                cpu.regs[1] = kernel.threads[kernel.current_thread].id;
                cpu.regs[0] = RESULT_SUCCESS;
            } else {
                cpu.regs[0] = RESULT_INVALID_HANDLE;
            }
        }
    }
}

fn svc_get_resource_limit(cpu: &mut Cpu, kernel: &mut Kernel) {
    let handle = kernel.allocate_handle(HandleEntry::Process(1));
    cpu.regs[1] = handle;
    cpu.regs[0] = RESULT_SUCCESS;
}

fn svc_get_resource_limit_values(cpu: &mut Cpu, mem: &mut Memory, _kernel: &mut Kernel) {
    let values_ptr = cpu.regs[0];
    let _handle = cpu.regs[1];
    let names_ptr = cpu.regs[2];
    let count = cpu.regs[3];
    for i in 0..count {
        let _name = mem.read32(names_ptr + i * 4);
        mem.write32(values_ptr + i * 8, 0x1000);
        mem.write32(values_ptr + i * 8 + 4, 0);
    }
    cpu.regs[0] = RESULT_SUCCESS;
}

fn svc_output_debug_string(cpu: &mut Cpu, mem: &mut Memory) {
    let ptr = cpu.regs[0];
    let len = cpu.regs[1];
    let mut bytes = Vec::new();
    for i in 0..len.min(256) {
        bytes.push(mem.read8(ptr + i));
    }
    let _msg = String::from_utf8_lossy(&bytes);
    cpu.regs[0] = RESULT_SUCCESS;
}

fn svc_exit_process(cpu: &mut Cpu, kernel: &mut Kernel) {
    // Kill all threads so context_switch won't resume them
    for thread in &mut kernel.threads {
        thread.kill();
    }
    cpu.halted = true;
    cpu.regs[0] = RESULT_SUCCESS;
}

fn svc_break(cpu: &mut Cpu, kernel: &mut Kernel) {
    if kernel.current_thread < kernel.threads.len() {
        kernel.threads[kernel.current_thread].kill();
    }
    cpu.halted = true;
    cpu.regs[0] = RESULT_SUCCESS;
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dispatch_system_tick() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        let mut kernel = Kernel::new();
        cpu.cycles = 0x1_0000_ABCD;
        cpu.regs[14] = 0x0010_0004;
        dispatch(&mut cpu, &mut mem, &mut kernel, 0x28);
        assert_eq!(cpu.regs[0], 0x0000_ABCD);
        assert_eq!(cpu.regs[1], 0x1);
    }

    #[test]
    fn dispatch_create_thread() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        let mut kernel = Kernel::new();
        cpu.regs[14] = 0x0010_0004;
        cpu.regs[1] = 0x0010_0000; // entrypoint
        cpu.regs[2] = 0;           // arg
        cpu.regs[3] = 0x0800_4000; // stack_top
        cpu.regs[4] = 0x30;        // priority
        dispatch(&mut cpu, &mut mem, &mut kernel, 0x08);
        assert_eq!(cpu.regs[0], RESULT_SUCCESS);
        assert!(cpu.regs[1] >= 0x100);
        assert_eq!(kernel.threads.len(), 1);
        assert_eq!(kernel.threads[0].priority, 0x30);
    }

    #[test]
    fn dispatch_close_handle() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        let mut kernel = Kernel::new();
        let h = kernel.allocate_handle(HandleEntry::Timer);
        cpu.regs[14] = 0x0010_0004;
        cpu.regs[0] = h;
        dispatch(&mut cpu, &mut mem, &mut kernel, 0x23);
        assert_eq!(cpu.regs[0], RESULT_SUCCESS);
        assert!(kernel.get_handle(h).is_none());
    }

    #[test]
    fn dispatch_create_event() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        let mut kernel = Kernel::new();
        cpu.regs[14] = 0x0010_0004;
        cpu.regs[1] = 1;
        dispatch(&mut cpu, &mut mem, &mut kernel, 0x17);
        assert_eq!(cpu.regs[0], RESULT_SUCCESS);
        assert!(cpu.regs[1] >= 0x100);
    }

    #[test]
    fn dispatch_break_halts() {
        let mut cpu = Cpu::new();
        let mut mem = Memory::new();
        let mut kernel = Kernel::new();
        cpu.regs[14] = 0x0010_0004;
        dispatch(&mut cpu, &mut mem, &mut kernel, 0x3D);
        assert!(cpu.halted);
    }
}
