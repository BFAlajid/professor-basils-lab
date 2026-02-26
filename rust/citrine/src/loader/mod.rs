pub mod threedsx;

pub enum RomFormat {
    ThreeDSX,
    Unknown,
}

pub fn detect_format(data: &[u8]) -> RomFormat {
    if data.len() >= 4 && threedsx::check_magic(data) {
        RomFormat::ThreeDSX
    } else {
        RomFormat::Unknown
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_3dsx_magic() {
        let mut data = vec![0u8; 64];
        data[0] = 0x33; // 3
        data[1] = 0x44; // D
        data[2] = 0x53; // S
        data[3] = 0x58; // X
        match detect_format(&data) {
            RomFormat::ThreeDSX => {}
            _ => panic!("expected ThreeDSX"),
        }
    }

    #[test]
    fn detect_unknown() {
        let data = vec![0u8; 64];
        match detect_format(&data) {
            RomFormat::Unknown => {}
            _ => panic!("expected Unknown"),
        }
    }
}
