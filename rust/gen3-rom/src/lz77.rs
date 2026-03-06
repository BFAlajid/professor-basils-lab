/// LZ77 (LZSS variant) decompression for GBA ROM data.
///
/// Format:
/// - Byte 0: magic 0x10
/// - Bytes 1-3: decompressed size (24-bit LE)
/// - Compressed stream: groups of 8 blocks preceded by a flag byte
///   - Flag bit 0: literal byte
///   - Flag bit 1: back-reference (2 bytes: 4-bit length + 12-bit displacement)

const LZ77_MAGIC: u8 = 0x10;

/// Decompress LZ77-encoded data. Returns None if data is not LZ77 or is malformed.
pub fn decompress(data: &[u8], offset: usize) -> Option<Vec<u8>> {
    if offset >= data.len() {
        return None;
    }

    // Check magic byte
    if data[offset] != LZ77_MAGIC {
        return None;
    }

    // Read decompressed size (24-bit LE from bytes 1-3)
    if offset + 4 > data.len() {
        return None;
    }
    let decompressed_size = data[offset + 1] as usize
        | ((data[offset + 2] as usize) << 8)
        | ((data[offset + 3] as usize) << 16);

    if decompressed_size == 0 {
        return Some(Vec::new());
    }

    // Cap at 1 MB to prevent allocation bombs
    if decompressed_size > 1024 * 1024 {
        return None;
    }

    let mut output = Vec::with_capacity(decompressed_size);
    let mut src = offset + 4;

    while output.len() < decompressed_size {
        if src >= data.len() {
            return None;
        }

        let flags = data[src];
        src += 1;

        // Process 8 blocks per flag byte, MSB first
        for bit in (0..8).rev() {
            if output.len() >= decompressed_size {
                break;
            }

            if (flags >> bit) & 1 == 0 {
                // Literal byte
                if src >= data.len() {
                    return None;
                }
                output.push(data[src]);
                src += 1;
            } else {
                // Back-reference: 2 bytes
                if src + 2 > data.len() {
                    return None;
                }
                let b1 = data[src] as usize;
                let b2 = data[src + 1] as usize;
                src += 2;

                let length = ((b1 >> 4) & 0x0F) + 3; // 3-18 bytes
                let displacement = ((b1 & 0x0F) << 8) | b2; // 0-4095

                // Copy from already-decompressed output
                let start = output.len().checked_sub(displacement + 1)?;
                for i in 0..length {
                    if output.len() >= decompressed_size {
                        break;
                    }
                    output.push(output[start + i]);
                }
            }
        }
    }

    output.truncate(decompressed_size);
    Some(output)
}

/// Check if data at the given offset starts with the LZ77 magic byte
pub fn is_lz77(data: &[u8], offset: usize) -> bool {
    data.get(offset) == Some(&LZ77_MAGIC)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decompress_empty() {
        // Magic + size 0
        let data = [0x10, 0x00, 0x00, 0x00];
        let result = decompress(&data, 0).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn decompress_all_literals() {
        // 4 bytes decompressed, all literals
        // Flag byte: 0b00000000 = 8 literals
        let mut data = vec![0x10, 0x04, 0x00, 0x00]; // header: magic + size 4
        data.push(0x00); // flag byte: all literals
        data.push(0xAA); // literal 1
        data.push(0xBB); // literal 2
        data.push(0xCC); // literal 3
        data.push(0xDD); // literal 4

        let result = decompress(&data, 0).unwrap();
        assert_eq!(result, vec![0xAA, 0xBB, 0xCC, 0xDD]);
    }

    #[test]
    fn decompress_with_backref() {
        // Decompressed: [0xAA, 0xBB, 0xAA, 0xBB, 0xAA, 0xBB]
        // = 2 literals + 1 backref copying 4 bytes from displacement 1 (offset -2)
        let mut data = vec![0x10, 0x06, 0x00, 0x00]; // header: size 6
        // Flag byte: bits 7-0 = 0b00100000
        // bit 7 = 0 (literal), bit 6 = 0 (literal), bit 5 = 1 (backref),
        // bits 4-0 don't matter (we'll stop at size 6)
        data.push(0b0010_0000); // flag
        data.push(0xAA); // literal 0
        data.push(0xBB); // literal 1
        // Backref: length = 4 (encoded as 1, +3 = 4), displacement = 1 (copy from pos -2)
        // b1 = (length-3) << 4 | (displacement >> 8) = (1 << 4) | 0 = 0x10
        // b2 = displacement & 0xFF = 1
        data.push(0x10); // b1: length=4, displacement high=0
        data.push(0x01); // b2: displacement low=1

        let result = decompress(&data, 0).unwrap();
        assert_eq!(result, vec![0xAA, 0xBB, 0xAA, 0xBB, 0xAA, 0xBB]);
    }

    #[test]
    fn decompress_repeat_single_byte() {
        // Decompress 8 bytes of 0xFF using a literal + backref
        let mut data = vec![0x10, 0x08, 0x00, 0x00]; // size 8
        // Flag: bit 7 = 0 (literal), bit 6 = 1 (backref)
        data.push(0b0100_0000); // flag
        data.push(0xFF); // literal
        // Backref: length = 7 (encoded as 4, +3 = 7), displacement = 0 (copy from 1 byte back)
        data.push(0x40); // b1: length=7, displacement high=0
        data.push(0x00); // b2: displacement low=0

        let result = decompress(&data, 0).unwrap();
        assert_eq!(result, vec![0xFF; 8]);
    }

    #[test]
    fn decompress_with_offset() {
        // Data at offset 10 in the buffer
        let mut data = vec![0u8; 10];
        data.push(0x10); // magic
        data.push(0x02); // size 2
        data.push(0x00);
        data.push(0x00);
        data.push(0x00); // flag: all literals
        data.push(0x12);
        data.push(0x34);

        let result = decompress(&data, 10).unwrap();
        assert_eq!(result, vec![0x12, 0x34]);
    }

    #[test]
    fn decompress_invalid_magic() {
        let data = [0x20, 0x04, 0x00, 0x00, 0x00, 0xAA, 0xBB, 0xCC, 0xDD];
        assert!(decompress(&data, 0).is_none());
    }

    #[test]
    fn decompress_truncated() {
        // Claims size 100 but only has 2 bytes of data
        let data = [0x10, 0x64, 0x00, 0x00, 0x00, 0xAA, 0xBB];
        assert!(decompress(&data, 0).is_none());
    }

    #[test]
    fn decompress_too_large() {
        // Size > 1 MB
        let data = [0x10, 0x01, 0x00, 0x20]; // 2 MB
        assert!(decompress(&data, 0).is_none());
    }

    #[test]
    fn is_lz77_check() {
        let data = [0x10, 0x04, 0x00, 0x00];
        assert!(is_lz77(&data, 0));
        assert!(!is_lz77(&data, 1));

        let data2 = [0x20, 0x04];
        assert!(!is_lz77(&data2, 0));
    }

    #[test]
    fn decompress_offset_out_of_bounds() {
        let data = [0x10, 0x04, 0x00, 0x00];
        assert!(decompress(&data, 100).is_none());
    }
}
