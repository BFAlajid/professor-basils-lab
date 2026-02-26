use crate::memory::Memory;

pub const TLS_BASE: u32 = 0x1FF8_2000;
pub const IPC_COMMAND_OFFSET: u32 = 0x80;
pub const IPC_BUFFER_ADDR: u32 = TLS_BASE + IPC_COMMAND_OFFSET;
pub const IPC_BUFFER_WORDS: usize = 64;

#[derive(Debug, Clone)]
pub struct IpcCommand {
    pub header: u32,
    pub command_id: u16,
    pub normal_params: u16,
    pub translate_params: u16,
    pub params: Vec<u32>,
}

impl IpcCommand {
    pub fn parse(mem: &Memory) -> Self {
        let header = mem.read32(IPC_BUFFER_ADDR);
        let command_id = ((header >> 16) & 0xFFFF) as u16;
        let normal_params = ((header >> 6) & 0x3F) as u16;
        let translate_params = (header & 0x3F) as u16;

        let total = (normal_params + translate_params) as usize;
        let mut params = Vec::with_capacity(total);
        for i in 0..total {
            let word = mem.read32(IPC_BUFFER_ADDR + 4 + (i as u32) * 4);
            params.push(word);
        }

        Self {
            header,
            command_id,
            normal_params,
            translate_params,
            params,
        }
    }

    pub fn param(&self, index: usize) -> u32 {
        self.params.get(index).copied().unwrap_or(0)
    }

    pub fn write_response(mem: &mut Memory, header: u32, result: u32, values: &[u32]) {
        let normal_count = (values.len() + 1) as u32;
        let resp_header = (header & 0xFFFF_0000) | ((normal_count & 0x3F) << 6);
        mem.write32(IPC_BUFFER_ADDR, resp_header);
        mem.write32(IPC_BUFFER_ADDR + 4, result);
        for (i, &val) in values.iter().enumerate() {
            mem.write32(IPC_BUFFER_ADDR + 8 + (i as u32) * 4, val);
        }
    }

    pub fn write_response_raw(mem: &mut Memory, words: &[u32]) {
        for (i, &word) in words.iter().enumerate() {
            mem.write32(IPC_BUFFER_ADDR + (i as u32) * 4, word);
        }
    }
}

pub fn make_header(cmd_id: u16, normal: u16, translate: u16) -> u32 {
    ((cmd_id as u32) << 16) | ((normal as u32 & 0x3F) << 6) | (translate as u32 & 0x3F)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::memory::Memory;

    #[test]
    fn parse_ipc_command() {
        let mut mem = Memory::new();
        let header = make_header(0x0001, 2, 0);
        mem.write32(IPC_BUFFER_ADDR, header);
        mem.write32(IPC_BUFFER_ADDR + 4, 0xAAAA);
        mem.write32(IPC_BUFFER_ADDR + 8, 0xBBBB);

        let cmd = IpcCommand::parse(&mem);
        assert_eq!(cmd.command_id, 0x0001);
        assert_eq!(cmd.normal_params, 2);
        assert_eq!(cmd.translate_params, 0);
        assert_eq!(cmd.param(0), 0xAAAA);
        assert_eq!(cmd.param(1), 0xBBBB);
    }

    #[test]
    fn write_response() {
        let mut mem = Memory::new();
        let header = make_header(0x0001, 2, 0);
        IpcCommand::write_response(&mut mem, header, 0, &[0x1234, 0x5678]);
        assert_eq!(mem.read32(IPC_BUFFER_ADDR + 4), 0);
        assert_eq!(mem.read32(IPC_BUFFER_ADDR + 8), 0x1234);
        assert_eq!(mem.read32(IPC_BUFFER_ADDR + 12), 0x5678);
    }

    #[test]
    fn make_header_encoding() {
        let h = make_header(0x0042, 3, 1);
        assert_eq!((h >> 16) & 0xFFFF, 0x0042);
        assert_eq!((h >> 6) & 0x3F, 3);
        assert_eq!(h & 0x3F, 1);
    }

    #[test]
    fn param_out_of_bounds() {
        let cmd = IpcCommand {
            header: 0,
            command_id: 0,
            normal_params: 0,
            translate_params: 0,
            params: vec![],
        };
        assert_eq!(cmd.param(99), 0);
    }
}
