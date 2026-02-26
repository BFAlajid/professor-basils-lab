use crate::memory::Memory;
use crate::kernel::ipc::IpcCommand;
use super::ServiceManager;

pub const BUTTON_A: u32 = 1 << 0;
pub const BUTTON_B: u32 = 1 << 1;
pub const BUTTON_SELECT: u32 = 1 << 2;
pub const BUTTON_START: u32 = 1 << 3;
pub const BUTTON_DRIGHT: u32 = 1 << 4;
pub const BUTTON_DLEFT: u32 = 1 << 5;
pub const BUTTON_DUP: u32 = 1 << 6;
pub const BUTTON_DDOWN: u32 = 1 << 7;
pub const BUTTON_R: u32 = 1 << 8;
pub const BUTTON_L: u32 = 1 << 9;
pub const BUTTON_X: u32 = 1 << 10;
pub const BUTTON_Y: u32 = 1 << 11;

pub const SHARED_MEM_SIZE: u32 = 0x2B0;
const PAD_STATE_OFFSET: u32 = 0x1C;

pub fn handle(cmd: &IpcCommand, mem: &mut Memory, svc: &mut ServiceManager) {
    match cmd.command_id {
        0x000A => {
            // GetIPCHandles — ctrulib reads: shm=cmdbuf[3], events=cmdbuf[4..8]
            let shm = svc.hid_shm_handle;
            let pad_ev = svc.hid_pad_event;
            // [descriptor, shm, pad, touch, accel, gyro, debug_pad]
            IpcCommand::write_response(mem, cmd.header, 0, &[0, shm, pad_ev, pad_ev, pad_ev, pad_ev, pad_ev]);
        }
        0x0001 => {
            // GetPadState (custom extension)
            IpcCommand::write_response(mem, cmd.header, 0, &[svc.buttons]);
        }
        _ => {
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
    }
}

pub fn update_shared_memory(mem: &mut Memory, base_addr: u32, buttons: u32) {
    let inverted = !buttons;
    mem.write32(base_addr + PAD_STATE_OFFSET, inverted);
    mem.write32(base_addr + PAD_STATE_OFFSET + 4, inverted);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn button_constants() {
        assert_eq!(BUTTON_A, 1);
        assert_eq!(BUTTON_B, 2);
        assert_eq!(BUTTON_START, 8);
        assert_eq!(BUTTON_X, 1 << 10);
        assert_eq!(BUTTON_Y, 1 << 11);
    }

    #[test]
    fn update_shared_mem_writes_inverted() {
        let mut mem = Memory::new();
        let base = crate::memory::VADDR_HEAP_BASE;
        update_shared_memory(&mut mem, base, BUTTON_A | BUTTON_B);
        let val = mem.read32(base + PAD_STATE_OFFSET);
        assert_eq!(val, !(BUTTON_A | BUTTON_B));
    }

    #[test]
    fn shared_mem_size() {
        assert_eq!(SHARED_MEM_SIZE, 0x2B0);
    }
}
