use crate::memory::Memory;
use crate::kernel::ipc::IpcCommand;
use super::ServiceManager;

pub fn handle(cmd: &IpcCommand, mem: &mut Memory, svc: &mut ServiceManager) {
    match cmd.command_id {
        0x0001 => {
            // GetLockHandle — ctrulib reads handle from cmdbuf[5]
            let lock = svc.apt_lock_handle;
            IpcCommand::write_response(mem, cmd.header, 0, &[0, 0, 0, lock]);
        }
        0x0002 => {
            // Initialize — ctrulib reads events from cmdbuf[3] and cmdbuf[4]
            svc.apt_initialized = true;
            IpcCommand::write_response(mem, cmd.header, 0, &[0, svc.apt_signal_event, svc.apt_resume_event]);
        }
        0x0003 => {
            // Enable
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x0006 => {
            // GetAppletManInfo
            IpcCommand::write_response(mem, cmd.header, 0, &[0, 0, 0x300, 0x300]);
        }
        0x000B => {
            // InquireNotification
            IpcCommand::write_response(mem, cmd.header, 0, &[0]);
        }
        0x000C => {
            // SendParameter
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x000D => {
            // ReceiveParameter
            IpcCommand::write_response(mem, cmd.header, 0, &[0x300, 1, 0, 0]);
        }
        0x000E => {
            // GlanceParameter
            IpcCommand::write_response(mem, cmd.header, 0, &[0x300, 1, 0, 0]);
        }
        0x003B => {
            // CancelParameter
            IpcCommand::write_response(mem, cmd.header, 0, &[1]);
        }
        0x0043 => {
            // NotifyToWait
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x004B => {
            // AppletUtility
            IpcCommand::write_response(mem, cmd.header, 0, &[0]);
        }
        0x0055 => {
            // SetApplicationCpuTimeLimit
            IpcCommand::write_response(mem, cmd.header, 0, &[]);
        }
        0x0056 => {
            // GetApplicationCpuTimeLimit
            IpcCommand::write_response(mem, cmd.header, 0, &[30]);
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
    fn apt_initialize() {
        let mut mem = Memory::new();
        let mut svc = ServiceManager::new();
        let header = make_header(0x0002, 1, 0);
        mem.write32(IPC_BUFFER_ADDR, header);
        mem.write32(IPC_BUFFER_ADDR + 4, 0x300);
        let cmd = IpcCommand::parse(&mem);
        handle(&cmd, &mut mem, &mut svc);
        assert!(svc.apt_initialized);
        assert_eq!(mem.read32(IPC_BUFFER_ADDR + 4), 0);
    }

    #[test]
    fn apt_get_cpu_time() {
        let mut mem = Memory::new();
        let mut svc = ServiceManager::new();
        let header = make_header(0x0056, 0, 0);
        mem.write32(IPC_BUFFER_ADDR, header);
        let cmd = IpcCommand::parse(&mem);
        handle(&cmd, &mut mem, &mut svc);
        assert_eq!(mem.read32(IPC_BUFFER_ADDR + 8), 30);
    }
}
