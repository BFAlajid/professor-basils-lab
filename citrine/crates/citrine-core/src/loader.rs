//! 3DSX homebrew loader.
//!
//! `.3dsx` is the standard file format for 3DS homebrew compiled with
//! devkitARM and libctru. It is a relocatable executable with three
//! segments (code, rodata, data+bss) and per-segment relocation tables.
//!
//! Reference: <https://www.3dbrew.org/wiki/3DSX_Format>
//!
//! # Phase 1 scope
//!
//! This loader parses the header and segments and produces a
//! [`LoadedProgram`] that can be copied into a memory image. It does
//! **not** apply relocations yet — relocation processing is deferred to
//! a later phase. Hello-world homebrew is typically position-independent
//! or has very few absolute relocations, so this is enough to exercise
//! the CPU + kernel with real code.
//!
//! The layout the loader produces:
//!
//! ```text
//! base_address + 0            code segment
//! base_address + rodata_off   rodata segment   (4-byte aligned)
//! base_address + data_off     data segment     (4-byte aligned, BSS zeroed)
//! ```

/// Errors from the 3DSX loader.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LoaderError {
    /// The file is shorter than required for the header or its segments.
    TooSmall,
    /// Magic bytes were not "3DSX".
    BadMagic,
    /// header_size must be 32 (standard) or 44 (with SMDH/ROMFS extension).
    UnsupportedHeaderSize(u16),
    /// format_version must be 0.
    UnsupportedFormatVersion(u32),
    /// A segment's declared size ran past the end of the file.
    SegmentTruncated {
        segment: &'static str,
        expected: usize,
        actual: usize,
    },
}

impl core::fmt::Display for LoaderError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            LoaderError::TooSmall => write!(f, "3DSX file is too small to contain a valid header"),
            LoaderError::BadMagic => write!(f, "3DSX magic bytes not found"),
            LoaderError::UnsupportedHeaderSize(sz) => {
                write!(f, "unsupported 3DSX header size: {} (expected 32 or 44)", sz)
            }
            LoaderError::UnsupportedFormatVersion(v) => {
                write!(f, "unsupported 3DSX format version: {} (expected 0)", v)
            }
            LoaderError::SegmentTruncated {
                segment,
                expected,
                actual,
            } => write!(
                f,
                "{} segment truncated: expected {} bytes, found {}",
                segment, expected, actual
            ),
        }
    }
}

/// A 3DSX program ready to be copied into a memory image.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LoadedProgram {
    /// Address the program expects to be loaded at.
    pub base_address: u32,
    /// Address of the first instruction (== base_address for 3DSX).
    pub entry_point: u32,
    /// Code segment bytes.
    pub code: Vec<u8>,
    /// Rodata segment bytes.
    pub rodata: Vec<u8>,
    /// Data segment bytes (BSS portion already zero-extended).
    pub data: Vec<u8>,
    /// Total memory footprint when laid out: code + rodata + data
    /// (data already includes BSS).
    pub total_size: u32,
    /// Code segment offset relative to base.
    pub code_offset: u32,
    /// Rodata segment offset relative to base.
    pub rodata_offset: u32,
    /// Data segment offset relative to base.
    pub data_offset: u32,
}

impl LoadedProgram {
    /// Copy code/rodata/data into a memory image starting at `self.base_address`.
    /// `image` is the contiguous host memory buffer that the bus will serve.
    /// Returns the total bytes written. Silently truncates if the image is
    /// too small.
    pub fn copy_into(&self, image: &mut [u8]) -> usize {
        // `image` is a host-side buffer representing the memory span from
        // `base_address` to `base_address + total_size`. The segment
        // offsets are relative to the start of `image`, not to 0 in the
        // physical address space.
        let mut written = 0;
        written += copy_segment(image, self.code_offset as usize, &self.code);
        written += copy_segment(image, self.rodata_offset as usize, &self.rodata);
        written += copy_segment(image, self.data_offset as usize, &self.data);
        written
    }
}

/// Copy `src` into `image` at `dst_offset`, silently truncating if the
/// destination is too small. Returns bytes written.
fn copy_segment(image: &mut [u8], dst_offset: usize, src: &[u8]) -> usize {
    if dst_offset >= image.len() {
        return 0;
    }
    let room = image.len() - dst_offset;
    let n = src.len().min(room);
    image[dst_offset..dst_offset + n].copy_from_slice(&src[..n]);
    n
}

/// Round `value` up to the next multiple of 4.
fn align4(value: u32) -> u32 {
    (value + 3) & !3
}

/// Read a little-endian u32 from `bytes[offset..]`, panicking only if the
/// caller has already bounds-checked (never called without prior check).
fn read_u32(bytes: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes([
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3],
    ])
}

/// Read a little-endian u16 from `bytes[offset..]`, panicking only if the
/// caller has already bounds-checked.
fn read_u16(bytes: &[u8], offset: usize) -> u16 {
    u16::from_le_bytes([bytes[offset], bytes[offset + 1]])
}

/// Parse a 3DSX file. `base_address` becomes the load address; the entry
/// point is set to the same value (3DSX always enters at the start of the
/// code segment).
///
/// Relocations are NOT processed in Phase 1. This is sufficient for
/// position-independent homebrew, which is the typical case.
pub fn load_3dsx(bytes: &[u8], base_address: u32) -> Result<LoadedProgram, LoaderError> {
    // Minimum header is 32 bytes; fail fast if we can't even read that.
    if bytes.len() < 32 {
        return Err(LoaderError::TooSmall);
    }

    // Magic: "3DSX" (0x58534433 little-endian).
    if &bytes[0..4] != b"3DSX" {
        return Err(LoaderError::BadMagic);
    }

    let header_size = read_u16(bytes, 4);
    if header_size != 32 && header_size != 44 {
        return Err(LoaderError::UnsupportedHeaderSize(header_size));
    }

    let _reloc_hdr_size = read_u16(bytes, 6); // always 8, not validated
    let format_version = read_u32(bytes, 8);
    if format_version != 0 {
        return Err(LoaderError::UnsupportedFormatVersion(format_version));
    }

    let _flags = read_u32(bytes, 12);
    let code_seg_size = read_u32(bytes, 16);
    let rodata_seg_size = read_u32(bytes, 20);
    let data_seg_size = read_u32(bytes, 24);
    let bss_size = read_u32(bytes, 28);

    // If the header declared the 44-byte extended variant, check we have it.
    if (bytes.len() as u32) < header_size as u32 {
        return Err(LoaderError::TooSmall);
    }

    // The data file on disk does not contain the BSS portion; clamp just in
    // case a malformed file reports bss_size > data_seg_size.
    let data_file_size = data_seg_size.saturating_sub(bss_size);

    // After the header come three 8-byte relocation sub-headers (one per
    // segment). We read but ignore them in Phase 1 — their presence just
    // shifts where the segment bytes begin.
    let reloc_subheaders_bytes: u32 = 3 * 8;
    let segments_start = header_size as u32 + reloc_subheaders_bytes;

    // Total required file size before relocation tables.
    let required = segments_start
        .checked_add(code_seg_size)
        .and_then(|v| v.checked_add(rodata_seg_size))
        .and_then(|v| v.checked_add(data_file_size))
        .ok_or(LoaderError::TooSmall)?;
    if (bytes.len() as u32) < required {
        // Figure out which segment ran out so the caller gets a useful error.
        let code_start = segments_start as usize;
        let code_end = code_start.saturating_add(code_seg_size as usize);
        if bytes.len() < code_end {
            return Err(LoaderError::SegmentTruncated {
                segment: "code",
                expected: code_seg_size as usize,
                actual: bytes.len().saturating_sub(code_start),
            });
        }
        let rodata_start = code_end;
        let rodata_end = rodata_start.saturating_add(rodata_seg_size as usize);
        if bytes.len() < rodata_end {
            return Err(LoaderError::SegmentTruncated {
                segment: "rodata",
                expected: rodata_seg_size as usize,
                actual: bytes.len().saturating_sub(rodata_start),
            });
        }
        let data_start = rodata_end;
        let data_end = data_start.saturating_add(data_file_size as usize);
        if bytes.len() < data_end {
            return Err(LoaderError::SegmentTruncated {
                segment: "data",
                expected: data_file_size as usize,
                actual: bytes.len().saturating_sub(data_start),
            });
        }
        // Fallback if arithmetic suggested a shortfall we couldn't localise.
        return Err(LoaderError::TooSmall);
    }

    // Carve the segments out of the file.
    let code_start = segments_start as usize;
    let code_end = code_start + code_seg_size as usize;
    let code = bytes[code_start..code_end].to_vec();

    let rodata_start = code_end;
    let rodata_end = rodata_start + rodata_seg_size as usize;
    let rodata = bytes[rodata_start..rodata_end].to_vec();

    let data_start = rodata_end;
    let data_end = data_start + data_file_size as usize;
    let mut data = Vec::with_capacity(data_seg_size as usize);
    data.extend_from_slice(&bytes[data_start..data_end]);
    // BSS is the trailing portion — zero-extend to the full declared size.
    data.resize(data_seg_size as usize, 0);

    // Layout: code starts at offset 0; rodata follows code, 4-byte aligned;
    // data follows rodata, 4-byte aligned. Each offset is relative to base.
    let code_offset: u32 = 0;
    let rodata_offset = align4(code_offset + code_seg_size);
    let data_offset = align4(rodata_offset + rodata_seg_size);
    let total_size = data_offset + data_seg_size;

    Ok(LoadedProgram {
        base_address,
        entry_point: base_address,
        code,
        rodata,
        data,
        total_size,
        code_offset,
        rodata_offset,
        data_offset,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Build a synthetic 3DSX file with the given segments. Uses the
    /// standard 32-byte header, three empty relocation sub-headers, and
    /// writes the segments in order. `data_init` is only the initialised
    /// portion; the loader adds `bss_size` zero bytes after it.
    fn build_3dsx(code: &[u8], rodata: &[u8], data_init: &[u8], bss_size: u32) -> Vec<u8> {
        let mut out = Vec::new();
        // Magic "3DSX".
        out.extend_from_slice(b"3DSX");
        // header_size = 32.
        out.extend_from_slice(&32u16.to_le_bytes());
        // reloc_hdr_size = 8.
        out.extend_from_slice(&8u16.to_le_bytes());
        // format_version = 0.
        out.extend_from_slice(&0u32.to_le_bytes());
        // flags = 0.
        out.extend_from_slice(&0u32.to_le_bytes());
        // code_seg_size.
        out.extend_from_slice(&(code.len() as u32).to_le_bytes());
        // rodata_seg_size.
        out.extend_from_slice(&(rodata.len() as u32).to_le_bytes());
        // data_seg_size (file portion + bss).
        let data_seg_size = data_init.len() as u32 + bss_size;
        out.extend_from_slice(&data_seg_size.to_le_bytes());
        // bss_size.
        out.extend_from_slice(&bss_size.to_le_bytes());
        // Three relocation sub-headers (abs_count=0, rel_count=0 each = 24
        // zero bytes).
        out.extend_from_slice(&[0u8; 24]);
        // Segment bytes.
        out.extend_from_slice(code);
        out.extend_from_slice(rodata);
        out.extend_from_slice(data_init);
        out
    }

    /// Same as `build_3dsx` but uses the 44-byte extended header. Adds 12
    /// dummy bytes after the standard header (where the SMDH/ROMFS offsets
    /// would live).
    fn build_3dsx_ext(code: &[u8], rodata: &[u8], data_init: &[u8], bss_size: u32) -> Vec<u8> {
        let mut out = Vec::new();
        out.extend_from_slice(b"3DSX");
        out.extend_from_slice(&44u16.to_le_bytes());
        out.extend_from_slice(&8u16.to_le_bytes());
        out.extend_from_slice(&0u32.to_le_bytes());
        out.extend_from_slice(&0u32.to_le_bytes());
        out.extend_from_slice(&(code.len() as u32).to_le_bytes());
        out.extend_from_slice(&(rodata.len() as u32).to_le_bytes());
        let data_seg_size = data_init.len() as u32 + bss_size;
        out.extend_from_slice(&data_seg_size.to_le_bytes());
        out.extend_from_slice(&bss_size.to_le_bytes());
        // 12 extra bytes for the extended header (smdh_offset, smdh_size,
        // romfs_offset).
        out.extend_from_slice(&[0u8; 12]);
        // Three empty relocation sub-headers.
        out.extend_from_slice(&[0u8; 24]);
        out.extend_from_slice(code);
        out.extend_from_slice(rodata);
        out.extend_from_slice(data_init);
        out
    }

    #[test]
    fn loads_minimal_3dsx_with_only_code() {
        let code = [0x01, 0x02, 0x03, 0x04];
        let bytes = build_3dsx(&code, &[], &[], 0);
        let prog = load_3dsx(&bytes, 0x0010_0000).unwrap();
        assert_eq!(prog.entry_point, 0x0010_0000);
        assert_eq!(prog.base_address, 0x0010_0000);
        assert_eq!(prog.code, code);
        assert!(prog.rodata.is_empty());
        assert!(prog.data.is_empty());
    }

    #[test]
    fn loads_3dsx_with_all_segments() {
        let code = [0xAA; 8];
        let rodata = [0xBB; 8];
        let data = [0xCC; 8];
        let bytes = build_3dsx(&code, &rodata, &data, 0);
        let prog = load_3dsx(&bytes, 0).unwrap();
        assert_eq!(prog.code, code);
        assert_eq!(prog.rodata, rodata);
        assert_eq!(prog.data, data);
        assert_eq!(prog.code_offset, 0);
        assert_eq!(prog.rodata_offset, 8);
        assert_eq!(prog.data_offset, 16);
    }

    #[test]
    fn bss_is_zero_extended() {
        let code = [0u8; 4];
        let data_init = [0xDD; 8];
        // data_seg_size = 8 + 4 = 12, bss_size = 4.
        let bytes = build_3dsx(&code, &[], &data_init, 4);
        let prog = load_3dsx(&bytes, 0).unwrap();
        assert_eq!(prog.data.len(), 12);
        assert_eq!(&prog.data[..8], &[0xDD; 8]);
        assert_eq!(&prog.data[8..], &[0, 0, 0, 0]);
    }

    #[test]
    fn bss_only_segment() {
        let code = [0u8; 4];
        // Entirely BSS: no initialised bytes, bss_size = 8.
        let bytes = build_3dsx(&code, &[], &[], 8);
        let prog = load_3dsx(&bytes, 0).unwrap();
        assert_eq!(prog.data.len(), 8);
        assert!(prog.data.iter().all(|&b| b == 0));
    }

    #[test]
    fn extended_header_44_bytes_accepted() {
        let code = [0x11, 0x22, 0x33, 0x44];
        let bytes = build_3dsx_ext(&code, &[], &[], 0);
        let prog = load_3dsx(&bytes, 0x2000_0000).unwrap();
        assert_eq!(prog.entry_point, 0x2000_0000);
        assert_eq!(prog.code, code);
    }

    #[test]
    fn bad_magic_returns_error() {
        let mut bytes = vec![b'E', b'L', b'F', 0];
        // Pad to 32 bytes so the length check passes and magic is the
        // failing condition.
        bytes.resize(32, 0);
        assert_eq!(load_3dsx(&bytes, 0), Err(LoaderError::BadMagic));
    }

    #[test]
    fn header_size_36_rejected() {
        // Build a minimal valid file then stomp header_size.
        let mut bytes = build_3dsx(&[0u8; 4], &[], &[], 0);
        // header_size is at offset 4.
        bytes[4] = 36;
        bytes[5] = 0;
        assert_eq!(
            load_3dsx(&bytes, 0),
            Err(LoaderError::UnsupportedHeaderSize(36))
        );
    }

    #[test]
    fn format_version_1_rejected() {
        let mut bytes = build_3dsx(&[0u8; 4], &[], &[], 0);
        // format_version is at offset 8.
        bytes[8] = 1;
        assert_eq!(
            load_3dsx(&bytes, 0),
            Err(LoaderError::UnsupportedFormatVersion(1))
        );
    }

    #[test]
    fn truncated_header_returns_too_small() {
        let bytes = [0u8; 4];
        assert_eq!(load_3dsx(&bytes, 0), Err(LoaderError::TooSmall));
    }

    #[test]
    fn truncated_segment_returns_segment_truncated() {
        // Valid header claiming 100 bytes of code, only 50 provided.
        let mut bytes = Vec::new();
        bytes.extend_from_slice(b"3DSX");
        bytes.extend_from_slice(&32u16.to_le_bytes());
        bytes.extend_from_slice(&8u16.to_le_bytes());
        bytes.extend_from_slice(&0u32.to_le_bytes());
        bytes.extend_from_slice(&0u32.to_le_bytes());
        bytes.extend_from_slice(&100u32.to_le_bytes()); // code_seg_size
        bytes.extend_from_slice(&0u32.to_le_bytes()); // rodata_seg_size
        bytes.extend_from_slice(&0u32.to_le_bytes()); // data_seg_size
        bytes.extend_from_slice(&0u32.to_le_bytes()); // bss_size
        bytes.extend_from_slice(&[0u8; 24]); // reloc sub-headers
        bytes.extend_from_slice(&[0u8; 50]); // only 50 bytes of code
        let err = load_3dsx(&bytes, 0).unwrap_err();
        match err {
            LoaderError::SegmentTruncated {
                segment,
                expected,
                actual,
            } => {
                assert_eq!(segment, "code");
                assert_eq!(expected, 100);
                assert_eq!(actual, 50);
            }
            other => panic!("expected SegmentTruncated, got {:?}", other),
        }
    }

    #[test]
    fn entry_point_equals_base_address() {
        let bytes = build_3dsx(&[0u8; 4], &[], &[], 0);
        let prog = load_3dsx(&bytes, 0xDEAD_0000).unwrap();
        assert_eq!(prog.entry_point, 0xDEAD_0000);
        assert_eq!(prog.entry_point, prog.base_address);
    }

    #[test]
    fn total_size_includes_bss() {
        let code = [0u8; 4];
        // data_seg_size = 16, bss_size = 12.
        let bytes = build_3dsx(&code, &[], &[0xEE; 4], 12);
        let prog = load_3dsx(&bytes, 0).unwrap();
        // Layout: code [0..4], rodata starts at 4, data starts at 4, ends at 20.
        assert_eq!(prog.total_size, 20);
    }

    #[test]
    fn total_size_aligns_segments_to_4_bytes() {
        // code_seg_size = 5 → rodata_offset should round up to 8.
        let code = [0u8; 5];
        let rodata = [0u8; 3];
        let bytes = build_3dsx(&code, &rodata, &[], 0);
        let prog = load_3dsx(&bytes, 0).unwrap();
        assert_eq!(prog.code_offset, 0);
        assert_eq!(prog.rodata_offset, 8);
        // rodata ends at 11 → data_offset rounds to 12.
        assert_eq!(prog.data_offset, 12);
    }

    #[test]
    fn copy_into_writes_each_segment_at_correct_offset() {
        let code = [0x11; 4];
        let rodata = [0x22; 4];
        let data = [0x33; 4];
        let bytes = build_3dsx(&code, &rodata, &data, 0);
        let prog = load_3dsx(&bytes, 0).unwrap();
        let mut image = vec![0u8; 64];
        let written = prog.copy_into(&mut image);
        assert_eq!(written, 12);
        // code at offset 0.
        assert_eq!(&image[0..4], &[0x11; 4]);
        // rodata at code_offset + 4.
        assert_eq!(&image[prog.rodata_offset as usize..prog.rodata_offset as usize + 4], &[0x22; 4]);
        // data at next 4-byte aligned offset.
        assert_eq!(&image[prog.data_offset as usize..prog.data_offset as usize + 4], &[0x33; 4]);
    }

    #[test]
    fn copy_into_truncates_if_image_too_small() {
        let code = [0xAB; 16];
        let bytes = build_3dsx(&code, &[], &[], 0);
        let prog = load_3dsx(&bytes, 0).unwrap();
        let mut image = vec![0u8; 4];
        // Must not panic.
        let written = prog.copy_into(&mut image);
        assert_eq!(written, 4);
        assert_eq!(image, vec![0xAB; 4]);
    }

    #[test]
    fn loaded_program_is_position_independent_when_base_changes() {
        let code = [0xFF; 8];
        let rodata = [0xEE; 8];
        let data = [0xDD; 8];
        let bytes = build_3dsx(&code, &rodata, &data, 0);
        let a = load_3dsx(&bytes, 0x0010_0000).unwrap();
        let b = load_3dsx(&bytes, 0x0800_0000).unwrap();
        // Relative offsets must be identical regardless of base_address
        // because Phase 1 doesn't apply relocations.
        assert_eq!(a.code_offset, b.code_offset);
        assert_eq!(a.rodata_offset, b.rodata_offset);
        assert_eq!(a.data_offset, b.data_offset);
        assert_eq!(a.total_size, b.total_size);
        assert_eq!(a.code, b.code);
        assert_eq!(a.rodata, b.rodata);
        assert_eq!(a.data, b.data);
        // Only the base_address/entry_point fields differ.
        assert_ne!(a.base_address, b.base_address);
        assert_ne!(a.entry_point, b.entry_point);
    }

    #[test]
    fn large_segments_are_handled() {
        let code = vec![0xA5; 1024];
        let rodata = vec![0x5A; 1024];
        let data = vec![0x3C; 1024];
        let bytes = build_3dsx(&code, &rodata, &data, 0);
        let prog = load_3dsx(&bytes, 0).unwrap();
        assert_eq!(prog.code.len(), 1024);
        assert_eq!(prog.rodata.len(), 1024);
        assert_eq!(prog.data.len(), 1024);
        assert_eq!(prog.rodata_offset, 1024);
        assert_eq!(prog.data_offset, 2048);
        assert_eq!(prog.total_size, 3072);
    }

    #[test]
    fn code_offset_is_zero() {
        let bytes = build_3dsx(&[0xDE, 0xAD, 0xBE, 0xEF], &[0xCA, 0xFE], &[], 0);
        let prog = load_3dsx(&bytes, 0x1234_5678).unwrap();
        assert_eq!(prog.code_offset, 0);
    }

    #[test]
    fn display_formats_each_error_variant() {
        // Sanity check that the Display impl doesn't panic on any variant.
        let _ = format!("{}", LoaderError::TooSmall);
        let _ = format!("{}", LoaderError::BadMagic);
        let _ = format!("{}", LoaderError::UnsupportedHeaderSize(36));
        let _ = format!("{}", LoaderError::UnsupportedFormatVersion(1));
        let _ = format!(
            "{}",
            LoaderError::SegmentTruncated {
                segment: "code",
                expected: 100,
                actual: 50,
            }
        );
    }

    #[test]
    fn rodata_truncation_reports_rodata_segment() {
        // Valid code, but rodata claims more bytes than the file contains.
        let mut bytes = Vec::new();
        bytes.extend_from_slice(b"3DSX");
        bytes.extend_from_slice(&32u16.to_le_bytes());
        bytes.extend_from_slice(&8u16.to_le_bytes());
        bytes.extend_from_slice(&0u32.to_le_bytes());
        bytes.extend_from_slice(&0u32.to_le_bytes());
        bytes.extend_from_slice(&4u32.to_le_bytes()); // code_seg_size = 4
        bytes.extend_from_slice(&100u32.to_le_bytes()); // rodata_seg_size = 100
        bytes.extend_from_slice(&0u32.to_le_bytes()); // data_seg_size
        bytes.extend_from_slice(&0u32.to_le_bytes()); // bss_size
        bytes.extend_from_slice(&[0u8; 24]); // reloc sub-headers
        bytes.extend_from_slice(&[0u8; 4]); // code
        bytes.extend_from_slice(&[0u8; 10]); // only 10 bytes of rodata
        let err = load_3dsx(&bytes, 0).unwrap_err();
        match err {
            LoaderError::SegmentTruncated {
                segment, expected, ..
            } => {
                assert_eq!(segment, "rodata");
                assert_eq!(expected, 100);
            }
            other => panic!("expected SegmentTruncated, got {:?}", other),
        }
    }
}
