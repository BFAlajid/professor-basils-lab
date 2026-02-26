use crate::memory::Memory;

const HEADER_SIZE: usize = 32;
const MAGIC_3DSX: [u8; 4] = [0x33, 0x44, 0x53, 0x58];

pub struct ThreeDsxHeader {
    pub magic: [u8; 4],
    pub header_size: u16,
    pub reloc_header_size: u16,
    pub format_version: u32,
    pub flags: u32,
    pub code_seg_size: u32,
    pub rodata_seg_size: u32,
    pub data_seg_size: u32,
    pub bss_size: u32,
}

pub fn check_magic(data: &[u8]) -> bool {
    data.len() >= 4 && data[0..4] == MAGIC_3DSX
}

pub fn parse_header(data: &[u8]) -> Option<ThreeDsxHeader> {
    if data.len() < HEADER_SIZE { return None; }
    if !check_magic(data) { return None; }

    let mut magic = [0u8; 4];
    magic.copy_from_slice(&data[0..4]);

    Some(ThreeDsxHeader {
        magic,
        header_size: read_u16(data, 4),
        reloc_header_size: read_u16(data, 6),
        format_version: read_u32(data, 8),
        flags: read_u32(data, 12),
        code_seg_size: read_u32(data, 16),
        rodata_seg_size: read_u32(data, 20),
        data_seg_size: read_u32(data, 24),
        bss_size: read_u32(data, 28),
    })
}
pub fn load(data: &[u8], mem: &mut Memory, base_addr: u32) -> Option<u32> {
    let header = parse_header(data)?;
    let hdr_size = header.header_size as usize;
    let reloc_hdr_size = header.reloc_header_size as usize;
    let reloc_headers_offset = hdr_size;
    let reloc_headers_total = reloc_hdr_size * 3;
    let segments_offset = reloc_headers_offset + reloc_headers_total;

    let code_size = header.code_seg_size as usize;
    let rodata_size = header.rodata_seg_size as usize;
    let data_size = header.data_seg_size as usize;
    let total_seg = code_size + rodata_size + data_size;

    if data.len() < segments_offset + total_seg { return None; }

    // Load code segment
    let code_data = &data[segments_offset..segments_offset + code_size];
    mem.write_block(base_addr, code_data);

    // Load rodata segment
    let rodata_addr = base_addr + code_size as u32;
    let rodata_slice = &data[segments_offset + code_size..segments_offset + code_size + rodata_size];
    mem.write_block(rodata_addr, rodata_slice);

    // Load data segment
    let data_addr = rodata_addr + rodata_size as u32;
    let data_slice = &data[segments_offset + code_size + rodata_size..segments_offset + total_seg];
    mem.write_block(data_addr, data_slice);

    // Clear BSS
    let bss_addr = data_addr + data_size as u32;
    let bss_size = header.bss_size as usize;
    for i in 0..bss_size {
        mem.write8(bss_addr + i as u32, 0);
    }

    // Process relocations
    let reloc_data_offset = segments_offset + total_seg;
    let seg_addrs = [base_addr, rodata_addr, data_addr];
    let mut reloc_pos = reloc_data_offset;

    for seg in 0..3 {
        if reloc_hdr_size < 8 { continue; }
        let rh_off = reloc_headers_offset + seg * reloc_hdr_size;
        let abs_count = read_u32(data, rh_off) as usize;
        let rel_count = read_u32(data, rh_off + 4) as usize;
        let seg_base = seg_addrs[seg];
        let mut pos = seg_base;

        for _ in 0..abs_count {
            if reloc_pos + 4 > data.len() { break; }
            let entry = read_u32(data, reloc_pos);
            reloc_pos += 4;
            let skip = (entry & 0xFFFF) as u32;
            let patch = ((entry >> 16) & 0xFFFF) as u32;
            pos += skip * 4;
            for _ in 0..patch {
                let val = mem.read32(pos);
                mem.write32(pos, val.wrapping_add(base_addr));
                pos += 4;
            }
        }

        pos = seg_base;
        for _ in 0..rel_count {
            if reloc_pos + 4 > data.len() { break; }
            let entry = read_u32(data, reloc_pos);
            reloc_pos += 4;
            let skip = (entry & 0xFFFF) as u32;
            let patch = ((entry >> 16) & 0xFFFF) as u32;
            pos += skip * 4;
            for _ in 0..patch {
                let val = mem.read32(pos);
                mem.write32(pos, val.wrapping_add(seg_base));
                pos += 4;
            }
        }
    }

    Some(base_addr)
}
fn read_u16(data: &[u8], offset: usize) -> u16 {
    if offset + 2 > data.len() { return 0; }
    (data[offset] as u16) | ((data[offset + 1] as u16) << 8)
}

fn read_u32(data: &[u8], offset: usize) -> u32 {
    if offset + 4 > data.len() { return 0; }
    (data[offset] as u32)
        | ((data[offset + 1] as u32) << 8)
        | ((data[offset + 2] as u32) << 16)
        | ((data[offset + 3] as u32) << 24)
}
#[cfg(test)]
mod tests {
    use super::*;

    fn make_3dsx(code: &[u8], rodata: &[u8], ds: &[u8], bss: u32) -> Vec<u8> {
        let mut out = Vec::new();
        out.extend_from_slice(&MAGIC_3DSX);
        out.extend_from_slice(&32u16.to_le_bytes());
        out.extend_from_slice(&8u16.to_le_bytes());
        out.extend_from_slice(&0u32.to_le_bytes());
        out.extend_from_slice(&0u32.to_le_bytes());
        out.extend_from_slice(&(code.len() as u32).to_le_bytes());
        out.extend_from_slice(&(rodata.len() as u32).to_le_bytes());
        out.extend_from_slice(&(ds.len() as u32).to_le_bytes());
        out.extend_from_slice(&bss.to_le_bytes());
        for _ in 0..3 {
            out.extend_from_slice(&0u32.to_le_bytes());
            out.extend_from_slice(&0u32.to_le_bytes());
        }
        out.extend_from_slice(code);
        out.extend_from_slice(rodata);
        out.extend_from_slice(ds);
        out
    }

    #[test]
    fn check_magic_valid() {
        let data = [0x33, 0x44, 0x53, 0x58, 0, 0, 0, 0];
        assert!(check_magic(&data));
    }

    #[test]
    fn check_magic_invalid() {
        let data = [0x00, 0x00, 0x00, 0x00];
        assert!(!check_magic(&data));
    }

    #[test]
    fn parse_valid_header() {
        let code = vec![0xAA; 16];
        let data = make_3dsx(&code, &[], &[], 0);
        let header = parse_header(&data).unwrap();
        assert_eq!(header.code_seg_size, 16);
        assert_eq!(header.rodata_seg_size, 0);
    }

    #[test]
    fn load_basic() {
        let code = vec![0xEA, 0x00, 0x00, 0x00];
        let data = make_3dsx(&code, &[], &[], 4);
        let mut mem = Memory::new();
        let base = 0x0010_0000;
        let result = load(&data, &mut mem, base);
        assert_eq!(result, Some(base));
        assert_eq!(mem.read8(base + 4), 0);
    }

    #[test]
    fn parse_too_short() {
        let data = vec![0x33, 0x44];
        assert!(parse_header(&data).is_none());
    }
}
