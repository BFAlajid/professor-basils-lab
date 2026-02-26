use crate::memory::Memory;
use crate::kernel::ipc::IpcCommand;
use super::ServiceManager;

pub fn handle(cmd: &IpcCommand, mem: &mut Memory, _svc: &mut ServiceManager) {
    match cmd.command_id {
        0x0801 => {
            // Initialize
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x080C => {
            // OpenArchive
            IpcCommand::write_response(mem, cmd.header, 0, &[0x100]);
        }
        0x080E => {
            // CloseArchive
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x0802 => {
            // OpenFile
            IpcCommand::write_response(mem, cmd.header, 0, &[0x101]);
        }
        0x0808 => {
            // CreateFile
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x0809 => {
            // CreateDirectory
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x0803 => {
            // DeleteFile
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x0807 => {
            // OpenDirectory
            IpcCommand::write_response(mem, cmd.header, 0, &[0x102]);
        }
        0x0861 => {
            // InitializeWithSdkVersion
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x0862 => {
            // SetPriority
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
    fn fs_initialize() {
        let mut mem = Memory::new();
        let mut svc = ServiceManager::new();
        let header = make_header(0x0801, 1, 0);
        mem.write32(IPC_BUFFER_ADDR, header);
        mem.write32(IPC_BUFFER_ADDR + 4, 0x20000);
        let cmd = IpcCommand::parse(&mem);
        handle(&cmd, &mut mem, &mut svc);
        assert_eq!(mem.read32(IPC_BUFFER_ADDR + 4), 0);
    }

    #[test]
    fn fs_open_archive() {
        let mut mem = Memory::new();
        let mut svc = ServiceManager::new();
        let header = make_header(0x080C, 3, 0);
        mem.write32(IPC_BUFFER_ADDR, header);
        let cmd = IpcCommand::parse(&mem);
        handle(&cmd, &mut mem, &mut svc);
        assert_eq!(mem.read32(IPC_BUFFER_ADDR + 8), 0x100);
    }
}
