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
            let screen_id = cmd.param(0);
            let fb_addr = cmd.param(1);
            if fb_addr != 0 {
                if screen_id == 0 {
                    svc.top_fb_addr = fb_addr;
                } else {
                    svc.bot_fb_addr = fb_addr;
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
            // ctrulib reads: cmdbuf[2]=threadID, cmdbuf[4]=shm handle
            let event_handle = cmd.param(0);
            svc.gsp_interrupt_handle = Some(event_handle);
            let shm = svc.gsp_shared_mem_handle.unwrap_or(0);
            // [threadID=0, descriptor=0, shm_handle]
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
            let event_handle = cmd.param(0);
            svc.gsp_interrupt_handle = Some(event_handle);
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
    fn framebuffer_offsets() {
        assert_eq!(top_fb_offset(), 0);
        assert_eq!(top_fb_size(), 400 * 240 * 4);
        assert_eq!(bot_fb_offset(), 400 * 240 * 4);
        assert_eq!(bot_fb_size(), 320 * 240 * 4);
    }
}
