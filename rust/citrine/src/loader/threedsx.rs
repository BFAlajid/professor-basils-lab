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
    let bss_size = header.bss_size as usize;
    // data_seg_size includes BSS; on-disk data is the remainder
    let data_disk_size = (header.data_seg_size as usize).saturating_sub(bss_size);
    let total_seg = code_size + rodata_size + data_disk_size;

    if data.len() < segments_offset + total_seg { return None; }

    // Page-align segment addresses (linker expects 0x1000-aligned placement)
    let code_pages = page_align(code_size as u32);
    let rodata_pages = page_align(rodata_size as u32);
    let rodata_addr = base_addr + code_pages;
    let data_addr = rodata_addr + rodata_pages;
    let bss_addr = data_addr + data_disk_size as u32;

    // Load code segment at base
    let code_data = &data[segments_offset..segments_offset + code_size];
    mem.write_block(base_addr, code_data);

    // Load rodata segment at page-aligned offset
    let rodata_slice = &data[segments_offset + code_size..segments_offset + code_size + rodata_size];
    mem.write_block(rodata_addr, rodata_slice);

    // Load data segment at page-aligned offset
    let data_slice = &data[segments_offset + code_size + rodata_size..segments_offset + total_seg];
    mem.write_block(data_addr, data_slice);

    // Clear BSS
    for i in 0..bss_size {
        mem.write8(bss_addr + i as u32, 0);
    }

    // Process relocations
    // 3DSX relocation format (per devkitPro reference):
    //   Stored values have top 4 bits = sub-type, bottom 28 bits = linear address
    //   Linear address is an offset into all segments concatenated (pre-alignment)
    //   TranslateAddr maps linear offset -> virtual address using segment sizes
    let reloc_data_offset = segments_offset + total_seg;
    let seg_addrs = [base_addr, rodata_addr, data_addr];
    let seg_sizes = [code_size as u32, rodata_size as u32, data_disk_size as u32 + bss_size as u32];
    let mut reloc_pos = reloc_data_offset;

    for seg in 0..3 {
        if reloc_hdr_size < 8 { continue; }
        let rh_off = reloc_headers_offset + seg * reloc_hdr_size;
        let abs_count = read_u32(data, rh_off) as usize;
        let rel_count = read_u32(data, rh_off + 4) as usize;
        let seg_base = seg_addrs[seg];
        let mut pos = seg_base;

        // Table 0 — Absolute relocations: translate linear addr to virtual addr
        for _ in 0..abs_count {
            if reloc_pos + 4 > data.len() { break; }
            let entry = read_u32(data, reloc_pos);
            reloc_pos += 4;
            let skip = (entry & 0xFFFF) as u32;
            let patch = ((entry >> 16) & 0xFFFF) as u32;
            pos += skip * 4;
            for _ in 0..patch {
                let val = mem.read32(pos);
                let linear_addr = val & 0x0FFF_FFFF;
                let translated = translate_addr(linear_addr, &seg_addrs, &seg_sizes);
                mem.write32(pos, translated);
                pos += 4;
            }
        }

        // Table 1 — Cross-segment relative relocations: write (translated - pos)
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
                let sub_type = val >> 28;
                let linear_addr = val & 0x0FFF_FFFF;
                let translated = translate_addr(linear_addr, &seg_addrs, &seg_sizes);
                if sub_type == 1 {
                    // PREL31: keep top bit, write 31-bit relative offset
                    let rel = translated.wrapping_sub(pos);
                    mem.write32(pos, (val & 0x8000_0000) | (rel & 0x7FFF_FFFF));
                } else {
                    // Normal: write relative offset
                    mem.write32(pos, translated.wrapping_sub(pos));
                }
                pos += 4;
            }
        }
    }

    Some(base_addr)
}

/// Maps a linear offset (across concatenated segments pre-alignment) to a virtual address.
/// This matches devkitPro's TranslateAddr: the linear offset falls into whichever segment
/// it lands in based on cumulative raw sizes, then maps to that segment's virtual address.
fn translate_addr(linear: u32, seg_addrs: &[u32; 3], seg_sizes: &[u32; 3]) -> u32 {
    let off0 = seg_sizes[0];
    let off1 = off0 + seg_sizes[1];
    if linear < off0 {
        seg_addrs[0] + linear
    } else if linear < off1 {
        seg_addrs[1] + (linear - off0)
    } else {
        seg_addrs[2] + (linear - off1)
    }
}

fn page_align(size: u32) -> u32 {
    (size + 0xFFF) & !0xFFF
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

    /// Build a 3DSX binary with optional relocation tables.
    /// `reloc_tables` is [code_relocs, rodata_relocs, data_relocs] where each is
    /// (abs_entries, rel_entries) — each entry is a raw u32 reloc word.
    fn make_3dsx_with_relocs(
        code: &[u8],
        rodata: &[u8],
        ds: &[u8],
        bss: u32,
        reloc_tables: Option<[(&[u32], &[u32]); 3]>,
    ) -> Vec<u8> {
        let mut out = Vec::new();
        out.extend_from_slice(&MAGIC_3DSX);
        out.extend_from_slice(&32u16.to_le_bytes()); // header_size
        out.extend_from_slice(&8u16.to_le_bytes());  // reloc_header_size
        out.extend_from_slice(&0u32.to_le_bytes());  // format_version
        out.extend_from_slice(&0u32.to_le_bytes());  // flags
        out.extend_from_slice(&(code.len() as u32).to_le_bytes());
        out.extend_from_slice(&(rodata.len() as u32).to_le_bytes());
        out.extend_from_slice(&((ds.len() as u32) + bss).to_le_bytes());
        out.extend_from_slice(&bss.to_le_bytes());

        // Relocation headers (3 segments x 8 bytes each)
        if let Some(ref tables) = reloc_tables {
            for (abs, rel) in tables {
                out.extend_from_slice(&(abs.len() as u32).to_le_bytes());
                out.extend_from_slice(&(rel.len() as u32).to_le_bytes());
            }
        } else {
            for _ in 0..3 {
                out.extend_from_slice(&0u32.to_le_bytes());
                out.extend_from_slice(&0u32.to_le_bytes());
            }
        }

        // Segment data
        out.extend_from_slice(code);
        out.extend_from_slice(rodata);
        out.extend_from_slice(ds);

        // Relocation entries: all abs tables first per segment, then all rel tables
        if let Some(tables) = reloc_tables {
            for (abs, rel) in &tables {
                for &word in *abs {
                    out.extend_from_slice(&word.to_le_bytes());
                }
                for &word in *rel {
                    out.extend_from_slice(&word.to_le_bytes());
                }
            }
        }

        out
    }

    fn make_3dsx(code: &[u8], rodata: &[u8], ds: &[u8], bss: u32) -> Vec<u8> {
        make_3dsx_with_relocs(code, rodata, ds, bss, None)
    }

    /// Encode a skip/patch reloc entry: bottom 16 = skip (in words), top 16 = patch count
    fn reloc_entry(skip_words: u16, patch_count: u16) -> u32 {
        (skip_words as u32) | ((patch_count as u32) << 16)
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
        assert_eq!(mem.read32(base), 0x000000EA);
        assert_eq!(mem.read8(base + 0x1000), 0);
    }

    #[test]
    fn parse_too_short() {
        let data = vec![0x33, 0x44];
        assert!(parse_header(&data).is_none());
    }

    #[test]
    fn translate_addr_maps_segments() {
        let addrs = [0x10_0000, 0x10_2000, 0x10_4000];
        let sizes = [0x1500, 0x800, 0x400]; // raw sizes (pre page-align)
        // In code segment
        assert_eq!(translate_addr(0x100, &addrs, &sizes), 0x10_0100);
        // In rodata segment (linear 0x1500 = start of rodata)
        assert_eq!(translate_addr(0x1500, &addrs, &sizes), 0x10_2000);
        assert_eq!(translate_addr(0x1600, &addrs, &sizes), 0x10_2100);
        // In data segment (linear 0x1D00 = 0x1500 + 0x800)
        assert_eq!(translate_addr(0x1D00, &addrs, &sizes), 0x10_4000);
        assert_eq!(translate_addr(0x1D10, &addrs, &sizes), 0x10_4010);
    }

    #[test]
    fn absolute_reloc_translates_linear_addr() {
        // Code = 0x100 bytes (not page-aligned), rodata = 4 bytes
        // Code has a pointer at offset 0 that should point to rodata[0]
        // Linear addr of rodata[0] = 0x100 (code_size)
        let mut code = vec![0u8; 0x100];
        // Store linear address 0x100 (= start of rodata) in code[0..4]
        let linear_rodata_start: u32 = 0x100;
        code[0..4].copy_from_slice(&linear_rodata_start.to_le_bytes());

        let rodata = vec![0xDD; 4];

        // Absolute reloc for code segment: skip=0 words, patch=1 word
        let abs_entry = reloc_entry(0, 1);

        let data = make_3dsx_with_relocs(
            &code, &rodata, &[], 0,
            Some([
                (&[abs_entry], &[]),  // code segment: 1 abs reloc
                (&[], &[]),           // rodata: none
                (&[], &[]),           // data: none
            ]),
        );

        let mut mem = Memory::new();
        let base = 0x0010_0000;
        load(&data, &mut mem, base);

        // rodata is at base + page_align(0x100) = base + 0x1000
        let expected_rodata_addr = base + 0x1000;
        let patched = mem.read32(base);
        assert_eq!(patched, expected_rodata_addr,
            "Absolute reloc should translate linear addr 0x{:X} to virtual 0x{:X}, got 0x{:X}",
            linear_rodata_start, expected_rodata_addr, patched);
    }

    #[test]
    fn cross_segment_reloc_writes_relative_offset() {
        // Code = 0x100 bytes, rodata = 4 bytes
        // Code has a cross-segment relative ref at offset 4 pointing to rodata[0]
        // Linear addr of rodata[0] = 0x100
        let mut code = vec![0u8; 0x100];
        let linear_rodata_start: u32 = 0x100;
        code[4..8].copy_from_slice(&linear_rodata_start.to_le_bytes());

        let rodata = vec![0xCC; 4];

        // Cross-segment reloc for code segment: skip=1 word, patch=1 word
        let rel_entry = reloc_entry(1, 1);

        let data = make_3dsx_with_relocs(
            &code, &rodata, &[], 0,
            Some([
                (&[], &[rel_entry]),  // code: 1 cross-seg reloc
                (&[], &[]),
                (&[], &[]),
            ]),
        );

        let mut mem = Memory::new();
        let base = 0x0010_0000;
        load(&data, &mut mem, base);

        let rodata_vaddr = base + 0x1000;
        let patch_addr = base + 4;
        let expected_rel = rodata_vaddr.wrapping_sub(patch_addr);
        let patched = mem.read32(patch_addr);
        assert_eq!(patched, expected_rel,
            "Cross-seg reloc at 0x{:X} should be relative offset 0x{:X} to rodata 0x{:X}, got 0x{:X}",
            patch_addr, expected_rel, rodata_vaddr, patched);
    }

    #[test]
    fn cross_segment_prel31_preserves_top_bit() {
        // Test PREL31 sub-type (top 4 bits = 1): keeps sign bit, writes 31-bit relative
        let mut code = vec![0u8; 0x100];
        // sub_type=1 (top 4 bits), linear addr = 0x100 (rodata start)
        let val: u32 = (1 << 28) | 0x100;
        code[0..4].copy_from_slice(&val.to_le_bytes());

        let rodata = vec![0xBB; 4];

        let rel_entry = reloc_entry(0, 1);

        let data = make_3dsx_with_relocs(
            &code, &rodata, &[], 0,
            Some([
                (&[], &[rel_entry]),
                (&[], &[]),
                (&[], &[]),
            ]),
        );

        let mut mem = Memory::new();
        let base = 0x0010_0000;
        load(&data, &mut mem, base);

        let rodata_vaddr = base + 0x1000;
        let rel = rodata_vaddr.wrapping_sub(base);
        // PREL31: top bit from original value (bit 31 of val = 0), bottom 31 = relative
        let expected = (val & 0x8000_0000) | (rel & 0x7FFF_FFFF);
        let patched = mem.read32(base);
        assert_eq!(patched, expected,
            "PREL31 reloc should write 0x{:X}, got 0x{:X}", expected, patched);
    }
}
