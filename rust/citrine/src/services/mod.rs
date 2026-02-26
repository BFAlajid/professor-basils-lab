pub mod apt;
pub mod gsp;
pub mod hid;
pub mod fs_user;
pub mod dsp;

use crate::memory::Memory;
use crate::kernel::ipc::IpcCommand;

pub struct ServiceManager {
    pub apt_initialized: bool,
    pub gsp_rights_acquired: bool,
    pub hid_shared_mem_handle: Option<u32>,
    pub gsp_shared_mem_handle: Option<u32>,
    pub gsp_interrupt_handle: Option<u32>,
    pub buttons: u32,
}

impl ServiceManager {
    pub fn new() -> Self {
        Self {
            apt_initialized: false,
            gsp_rights_acquired: false,
            hid_shared_mem_handle: None,
            gsp_shared_mem_handle: None,
            gsp_interrupt_handle: None,
            buttons: 0,
        }
    }

    pub fn handle_request(&mut self, service_name: &str, mem: &mut Memory) {
        let cmd = IpcCommand::parse(mem);
        match service_name {
            "apt:U" | "apt:S" => apt::handle(&cmd, mem, self),
            "gsp::Gpu" => gsp::handle(&cmd, mem, self),
            "hid:USER" => hid::handle(&cmd, mem, self),
            "fs:USER" => fs_user::handle(&cmd, mem, self),
            "dsp::DSP" => dsp::handle(&cmd, mem, self),
            _ => {
                IpcCommand::write_response(mem, cmd.header, 0, &[]);
            }
        }
    }

    pub fn set_buttons(&mut self, buttons: u32) {
        self.buttons = buttons;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn service_manager_creation() {
        let sm = ServiceManager::new();
        assert!(!sm.apt_initialized);
        assert!(!sm.gsp_rights_acquired);
        assert_eq!(sm.buttons, 0);
    }

    #[test]
    fn unknown_service_returns_success() {
        let mut sm = ServiceManager::new();
        let mut mem = Memory::new();
        let header = crate::kernel::ipc::make_header(0x0001, 0, 0);
        mem.write32(crate::kernel::ipc::IPC_BUFFER_ADDR, header);
        sm.handle_request("unknown:SVC", &mut mem);
    }
}
