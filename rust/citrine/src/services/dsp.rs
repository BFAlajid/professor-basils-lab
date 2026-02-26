use crate::memory::Memory;
use crate::kernel::ipc::IpcCommand;
use super::ServiceManager;

pub fn handle(cmd: &IpcCommand, mem: &mut Memory, _svc: &mut ServiceManager) {
    match cmd.command_id {
        0x0001 => {
            // RecvData
            IpcCommand::write_response(mem, cmd.header, 0, &[1, 0]);
        }
        0x0002 => {
            // RecvDataIsReady
            IpcCommand::write_response(mem, cmd.header, 0, &[1]);
        }
        0x000C => {
            // ConvertProcessAddressFromDspDram
            let addr = cmd.param(0);
            IpcCommand::write_response(mem, cmd.header, 0, &[addr]);
        }
        0x000D => {
            // WriteProcessPipe
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x000F => {
            // GetSemaphoreEventHandle
            IpcCommand::write_response(mem, cmd.header, 0, &[0]);
        }
        0x0010 => {
            // GetPipeEventHandle
            IpcCommand::write_response(mem, cmd.header, 0, &[0]);
        }
        0x0011 => {
            // LoadComponent
            IpcCommand::write_response(mem, cmd.header, 0, &[1, 0]);
        }
        0x0012 => {
            // UnloadComponent
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x0015 => {
            // RegisterInterruptEvents
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        _ => {
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::kernel::ipc::{make_header, IPC_BUFFER_ADDR};

    #[test]
    fn dsp_recv_data_ready() {
        let mut mem = Memory::new();
        let mut svc = ServiceManager::new();
        let header = make_header(0x0002, 1, 0);
        mem.write32(IPC_BUFFER_ADDR, header);
        mem.write32(IPC_BUFFER_ADDR + 4, 0);
        let cmd = IpcCommand::parse(&mem);
        handle(&cmd, &mut mem, &mut svc);
        assert_eq!(mem.read32(IPC_BUFFER_ADDR + 8), 1);
    }

    #[test]
    fn dsp_load_component() {
        let mut mem = Memory::new();
        let mut svc = ServiceManager::new();
        let header = make_header(0x0011, 3, 0);
        mem.write32(IPC_BUFFER_ADDR, header);
        let cmd = IpcCommand::parse(&mem);
        handle(&cmd, &mut mem, &mut svc);
        assert_eq!(mem.read32(IPC_BUFFER_ADDR + 8), 1);
    }
}
