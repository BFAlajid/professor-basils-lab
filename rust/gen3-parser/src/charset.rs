/// Gen 3 character encoding → UTF-8 mapping.
///
/// Decodes bytes using the Gen 3 proprietary charset. Returns a UTF-8 string.
/// Stops at `0xFF` terminator, end of `max_len`, or end of data slice.
pub fn decode_gen3_string(data: &[u8], offset: usize, max_len: usize) -> String {
    let mut result = String::with_capacity(max_len);
    for i in 0..max_len {
        if offset + i >= data.len() {
            break;
        }
        let byte = data[offset + i];
        if byte == 0xFF {
            break; // string terminator
        }
        match byte {
            0x00 => result.push(' '),
            // Digits 0-9
            0xA1..=0xAA => result.push((b'0' + (byte - 0xA1)) as char),
            0xAB => result.push('!'),
            0xAC => result.push('?'),
            0xAD => result.push('.'),
            0xAE => result.push('-'),
            0xB0 => result.push('\u{2026}'), // ellipsis
            0xB1 => result.push('\u{201C}'), // left double quote
            0xB2 => result.push('\u{201D}'), // right double quote
            0xB3 => result.push('\u{2018}'), // left single quote
            0xB4 => result.push('\u{2019}'), // right single quote
            0xB5 => result.push('\u{2642}'), // male symbol
            0xB6 => result.push('\u{2640}'), // female symbol
            0xB8 => result.push(','),
            // Uppercase A-Z
            0xBB..=0xD4 => result.push((b'A' + (byte - 0xBB)) as char),
            // Lowercase a-z
            0xD5..=0xEE => result.push((b'a' + (byte - 0xD5)) as char),
            _ => result.push('?'),
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decode_uppercase_letters() {
        // A=0xBB, B=0xBC, ..., Z=0xD4
        let data: Vec<u8> = (0xBB..=0xD4).collect();
        assert_eq!(decode_gen3_string(&data, 0, 26), "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }

    #[test]
    fn decode_lowercase_letters() {
        // a=0xD5, b=0xD6, ..., z=0xEE
        let data: Vec<u8> = (0xD5..=0xEE).collect();
        assert_eq!(decode_gen3_string(&data, 0, 26), "abcdefghijklmnopqrstuvwxyz");
    }

    #[test]
    fn decode_digits() {
        // 0=0xA1, 1=0xA2, ..., 9=0xAA
        let data: Vec<u8> = (0xA1..=0xAA).collect();
        assert_eq!(decode_gen3_string(&data, 0, 10), "0123456789");
    }

    #[test]
    fn decode_special_characters() {
        let data = [0xAB, 0xAC, 0xAD, 0xAE, 0xB8];
        assert_eq!(decode_gen3_string(&data, 0, 5), "!?.-,");
    }

    #[test]
    fn decode_unicode_symbols() {
        let data = [0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6];
        let result = decode_gen3_string(&data, 0, 7);
        assert_eq!(result, "\u{2026}\u{201C}\u{201D}\u{2018}\u{2019}\u{2642}\u{2640}");
    }

    #[test]
    fn decode_space() {
        let data = [0x00, 0xBB, 0x00, 0xBC]; // " A B"
        assert_eq!(decode_gen3_string(&data, 0, 4), " A B");
    }

    #[test]
    fn stops_at_terminator() {
        let data = [0xBB, 0xBC, 0xFF, 0xBD, 0xBE]; // "AB" then terminator
        assert_eq!(decode_gen3_string(&data, 0, 5), "AB");
    }

    #[test]
    fn stops_at_terminator_first_byte() {
        let data = [0xFF, 0xBB, 0xBC];
        assert_eq!(decode_gen3_string(&data, 0, 3), "");
    }

    #[test]
    fn respects_max_len() {
        let data = [0xBB, 0xBC, 0xBD, 0xBE, 0xBF];
        assert_eq!(decode_gen3_string(&data, 0, 3), "ABC");
    }

    #[test]
    fn respects_offset() {
        let data = [0x00, 0x00, 0xBB, 0xBC, 0xBD];
        assert_eq!(decode_gen3_string(&data, 2, 3), "ABC");
    }

    #[test]
    fn offset_beyond_data_returns_empty() {
        let data = [0xBB, 0xBC];
        assert_eq!(decode_gen3_string(&data, 10, 5), "");
    }

    #[test]
    fn data_shorter_than_max_len() {
        let data = [0xBB, 0xBC]; // only 2 bytes, max_len=10
        assert_eq!(decode_gen3_string(&data, 0, 10), "AB");
    }

    #[test]
    fn unknown_bytes_map_to_question_mark() {
        let data = [0x50, 0x99, 0xEF]; // unmapped bytes
        assert_eq!(decode_gen3_string(&data, 0, 3), "???");
    }

    #[test]
    fn empty_data() {
        let data: [u8; 0] = [];
        assert_eq!(decode_gen3_string(&data, 0, 5), "");
    }

    #[test]
    fn typical_pokemon_name() {
        // "PIKACHU" in Gen 3 encoding
        let data = [
            0xCA, 0xC3, 0xC5, 0xBB, 0xBD, 0xC2, 0xCF, 0xFF, 0xFF, 0xFF,
        ];
        assert_eq!(decode_gen3_string(&data, 0, 10), "PIKACHU");
    }

    #[test]
    fn mixed_case_with_punctuation() {
        // "Mr.Mime" = M=0xC7, r=0xE6, .=0xAD, M=0xC7, i=0xDD, m=0xE1, e=0xD9
        let data = [0xC7, 0xE6, 0xAD, 0xC7, 0xDD, 0xE1, 0xD9, 0xFF];
        assert_eq!(decode_gen3_string(&data, 0, 8), "Mr.Mime");
    }
}
