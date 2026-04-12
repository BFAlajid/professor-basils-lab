//! 3DS screen geometry constants.
//!
//! The 3DS has two LCD panels driven independently by the LCD controller.
//! The top screen is wider than 4:3 (400 x 240) to accommodate the
//! autostereoscopic parallax barrier; the bottom screen is a standard
//! 320 x 240 single-eye panel.

pub const TOP_WIDTH: u32 = 400;
pub const TOP_HEIGHT: u32 = 240;
pub const BOTTOM_WIDTH: u32 = 320;
pub const BOTTOM_HEIGHT: u32 = 240;

/// Identifies one of the two physical 3DS screens.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Screen {
    Top,
    Bottom,
}

impl Screen {
    pub fn width(self) -> u32 {
        match self {
            Screen::Top => TOP_WIDTH,
            Screen::Bottom => BOTTOM_WIDTH,
        }
    }

    pub fn height(self) -> u32 {
        match self {
            Screen::Top => TOP_HEIGHT,
            Screen::Bottom => BOTTOM_HEIGHT,
        }
    }

    pub fn pixel_count(self) -> u32 {
        self.width() * self.height()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn top_geometry() {
        assert_eq!(Screen::Top.width(), 400);
        assert_eq!(Screen::Top.height(), 240);
        assert_eq!(TOP_WIDTH, 400);
        assert_eq!(TOP_HEIGHT, 240);
    }

    #[test]
    fn bottom_geometry() {
        assert_eq!(Screen::Bottom.width(), 320);
        assert_eq!(Screen::Bottom.height(), 240);
        assert_eq!(BOTTOM_WIDTH, 320);
        assert_eq!(BOTTOM_HEIGHT, 240);
    }

    #[test]
    fn pixel_count() {
        assert_eq!(Screen::Top.pixel_count(), 400 * 240);
        assert_eq!(Screen::Bottom.pixel_count(), 320 * 240);
    }

    #[test]
    fn screens_are_distinct() {
        assert_ne!(Screen::Top, Screen::Bottom);
        assert_ne!(Screen::Top.width(), Screen::Bottom.width());
        assert_eq!(Screen::Top.height(), Screen::Bottom.height());
    }
}
