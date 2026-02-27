use crate::memory::Memory;
use crate::kernel::ipc::IpcCommand;
use super::ServiceManager;

const TOP_FB_WIDTH: u32 = 400;
const TOP_FB_HEIGHT: u32 = 240;
const BOT_FB_WIDTH: u32 = 320;
const BOT_FB_HEIGHT: u32 = 240;
const BYTES_PER_PIXEL: u32 = 4;
const TOP_FB_SIZE: u32 = TOP_FB_WIDTH * TOP_FB_HEIGHT * BYTES_PER_PIXEL;

pub fn handle(cmd: &IpcCommand, mem: &mut Memory, svc: &mut ServiceManager) {
    match cmd.command_id {
        0x0001 => {
            // WriteHWRegs
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x0002 => {
            // WriteHWRegsWithMask
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x0004 => {
            // ReadHWRegs
            IpcCommand::write_response(mem, cmd.header, 0, &[0]);
        }
        0x0005 => {
            // SetBufferSwap — capture framebuffer addresses
            // params: [0]=screen, [1]=active_fb, [2]=fb0_vaddr, [3]=fb1_vaddr,
            //         [4]=fb0_right, [5]=fb1_right, [6]=stride, [7]=format
            let screen_id = cmd.param(0);
            let active_fb = cmd.param(1);
            let fb0 = cmd.param(2);
            let fb1 = cmd.param(3);
            let addr = if active_fb == 0 { fb0 } else { fb1 };
            let addr = if addr != 0 { addr } else if fb0 != 0 { fb0 } else { fb1 };
            if addr != 0 {
                if screen_id == 0 {
                    svc.top_fb_addr = addr;
                } else {
                    svc.bot_fb_addr = addr;
                }
            }
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x000B => {
            // FlushDataCache
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x0013 => {
            // RegisterInterruptRelayQueue
            // params: [0]=flags, [1]=translate_desc(0), [2]=event_handle
            // response: cmdbuf[2]=threadID, cmdbuf[4]=shm_handle
            let event_handle = cmd.param(2);
            if event_handle != 0 {
                svc.gsp_interrupt_handle = Some(event_handle);
            }
            let shm = svc.gsp_shared_mem_handle.unwrap_or(0);
            IpcCommand::write_response(mem, cmd.header, 0, &[0, 0, shm]);
        }
        0x0014 => {
            // RestoreVramSysArea
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x0015 => {
            // ResetGpuCore
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x0016 => {
            // AcquireRight
            svc.gsp_rights_acquired = true;
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x0017 => {
            // ReleaseRight
            svc.gsp_rights_acquired = false;
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x0019 => {
            // RegisterInterruptRelayQueue (alt cmd ID)
            let event_handle = cmd.param(2);
            if event_handle != 0 {
                svc.gsp_interrupt_handle = Some(event_handle);
            }
            let shm = svc.gsp_shared_mem_handle.unwrap_or(0);
            IpcCommand::write_response(mem, cmd.header, 0, &[0, 0, shm]);
        }
        _ => {
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
    }
}

pub fn top_fb_offset() -> u32 { 0 }
pub fn bot_fb_offset() -> u32 { TOP_FB_SIZE }
pub fn top_fb_size() -> u32 { TOP_FB_SIZE }
pub fn bot_fb_size() -> u32 { BOT_FB_WIDTH * BOT_FB_HEIGHT * BYTES_PER_PIXEL }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::kernel::ipc::{make_header, IPC_BUFFER_ADDR};

    #[test]
    fn acquire_release_rights() {
        let mut mem = Memory::new();
        let mut svc = ServiceManager::new();
        let header = make_header(0x0016, 1, 0);
        mem.write32(IPC_BUFFER_ADDR, header);
        mem.write32(IPC_BUFFER_ADDR + 4, 0);
        let cmd = IpcCommand::parse(&mem);
        handle(&cmd, &mut mem, &mut svc);
        assert!(svc.gsp_rights_acquired);

        let header = make_header(0x0017, 0, 0);
        mem.write32(IPC_BUFFER_ADDR, header);
        let cmd = IpcCommand::parse(&mem);
        handle(&cmd, &mut mem, &mut svc);
        assert!(!svc.gsp_rights_acquired);
    }

    #[test]
    fn set_buffer_swap_captures_fb_addr() {
        let mut mem = Memory::new();
        let mut svc = ServiceManager::new();
        // SetBufferSwap: 8 normal params, 0 translate
        let header = make_header(0x0005, 8, 0);
        mem.write32(IPC_BUFFER_ADDR, header);
        mem.write32(IPC_BUFFER_ADDR + 4, 0);           // screen=0 (top)
        mem.write32(IPC_BUFFER_ADDR + 8, 0);            // active_fb=0
        mem.write32(IPC_BUFFER_ADDR + 12, 0x1800_0000); // fb0_vaddr
        mem.write32(IPC_BUFFER_ADDR + 16, 0x1804_0000); // fb1_vaddr
        let cmd = IpcCommand::parse(&mem);
        handle(&cmd, &mut mem, &mut svc);
        assert_eq!(svc.top_fb_addr, 0x1800_0000); // should pick fb0 since active=0
    }

    #[test]
    fn framebuffer_offsets() {
        assert_eq!(top_fb_offset(), 0);
        assert_eq!(top_fb_size(), 400 * 240 * 4);
        assert_eq!(bot_fb_offset(), 400 * 240 * 4);
        assert_eq!(bot_fb_size(), 320 * 240 * 4);
    }
}
