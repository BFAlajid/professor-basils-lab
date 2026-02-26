pub struct Cp15 {
    control: u32,
    ttbr0: u32,
    ttbr1: u32,
    ttbcr: u32,
    domain_access: u32,
    thread_id_user: u32,
    thread_id_priv: u32,
}

impl Cp15 {
    pub fn new() -> Self {
        Self {
            control: 0x0005_1078,
            ttbr0: 0,
            ttbr1: 0,
            ttbcr: 0,
            domain_access: 0,
            thread_id_user: 0,
            thread_id_priv: 0,
        }
    }

    pub fn read(&self, crn: u32, opc1: u32, crm: u32, opc2: u32) -> u32 {
        match (crn, opc1, crm, opc2) {
            (0, 0, 0, 0) => 0x410F_B767,  // Main ID (ARM1176JZF-S)
            (0, 0, 0, 1) => 0x0001_1131,  // Cache type
            (1, 0, 0, 0) => self.control,
            (2, 0, 0, 0) => self.ttbr0,
            (2, 0, 0, 1) => self.ttbr1,
            (2, 0, 0, 2) => self.ttbcr,
            (3, 0, 0, 0) => self.domain_access,
            (13, 0, 0, 2) => self.thread_id_user,
            (13, 0, 0, 3) => self.thread_id_priv,
            _ => 0,
        }
    }

    pub fn write(&mut self, crn: u32, opc1: u32, crm: u32, opc2: u32, val: u32) {
        match (crn, opc1, crm, opc2) {
            (1, 0, 0, 0) => self.control = val,
            (2, 0, 0, 0) => self.ttbr0 = val,
            (2, 0, 0, 1) => self.ttbr1 = val,
            (2, 0, 0, 2) => self.ttbcr = val,
            (3, 0, 0, 0) => self.domain_access = val,
            (7, _, _, _) => {} // Cache operations (nop)
            (8, _, _, _) => {} // TLB operations (nop)
            (13, 0, 0, 2) => self.thread_id_user = val,
            (13, 0, 0, 3) => self.thread_id_priv = val,
            _ => {}
        }
    }

    pub fn mmu_enabled(&self) -> bool {
        self.control & 1 != 0
    }
}
