//! citrine-kernel — high-level emulation (HLE) of the 3DS Horizon kernel.
//!
//! ## Why HLE
//!
//! The 3DS runs Horizon OS, a microkernel written for the ARM11. A
//! low-level emulator would have to load and execute the kernel binary
//! itself; an HLE emulator instead intercepts kernel boundaries and
//! reimplements the API on the host. This is what Citra and Panda3DS do,
//! and it's what we do here.
//!
//! The kernel boundary on ARM11 is the **SVC** (software interrupt)
//! instruction. When user code wants to allocate memory, create a thread,
//! or talk to a service, it issues an SVC and the kernel handles it.
//! [`svc::SvcDispatcher`] is the trait the CPU calls when it decodes an
//! SVC; [`svc::DefaultSvcDispatcher`] is the Phase 1 stub.
//!
//! ## Phase 1 scope
//!
//! - [`handle::HandleTable`] — allocate / close / duplicate handles
//! - [`thread::ThreadTable`] — create and terminate threads (no scheduling)
//! - [`memory::MemoryMap`] — physical region constants for the Old 3DS
//! - [`service::ServiceRegistry`] — named service-port registry with a
//!   stub `srv:` implementation
//! - [`svc::DefaultSvcDispatcher`] — minimal SVC handler set covering
//!   the operations homebrew CRT0 hits during startup
//!
//! Real service implementations (HID, GSP, FS, audio) and a real
//! scheduler land in subsequent phases.

pub mod handle;
pub mod memory;
pub mod service;
pub mod svc;
pub mod thread;

pub use handle::{Handle, HandleEntry, HandleKind, HandleTable, CURRENT_PROCESS, CURRENT_THREAD, INVALID_HANDLE};
pub use memory::{MemoryMap, MemoryRegion};
pub use service::{Service, ServiceRegistry, SrvService};
pub use svc::{DefaultSvcDispatcher, SvcContext, SvcDispatcher, SvcNumber, SvcResult};
pub use thread::{Thread, ThreadState, ThreadTable};

/// The HLE kernel: owns the handle table, thread table, service registry
/// and memory map.
///
/// One `Kernel` corresponds to one running 3DS process. The CPU borrows it
/// mutably during SVC dispatch.
pub struct Kernel {
    pub handles: HandleTable,
    pub threads: ThreadTable,
    pub services: ServiceRegistry,
    pub memory_map: MemoryMap,
}

impl Kernel {
    pub fn new() -> Self {
        let mut services = ServiceRegistry::new();
        services.register(Box::new(SrvService));
        Self {
            handles: HandleTable::new(),
            threads: ThreadTable::new(),
            services,
            memory_map: MemoryMap::default_3ds(),
        }
    }
}

impl Default for Kernel {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kernel_owns_subsystems() {
        let kernel = Kernel::new();
        // Handle table starts empty.
        assert_eq!(kernel.handles.len(), 0);
        // No threads created yet.
        assert_eq!(kernel.threads.count(), 0);
        // srv: is preregistered.
        assert!(kernel.services.names().any(|n| n == "srv:"));
        // FCRAM is mapped.
        assert!(kernel.memory_map.region_by_name("FCRAM").is_some());
    }

    #[test]
    fn kernel_default_matches_new() {
        let a = Kernel::default();
        let b = Kernel::new();
        assert_eq!(a.handles.len(), b.handles.len());
        assert_eq!(a.threads.count(), b.threads.count());
        assert_eq!(
            a.services.names().count(),
            b.services.names().count()
        );
    }

    #[test]
    fn kernel_can_route_svc_through_default_dispatcher() {
        let mut kernel = Kernel::new();
        let mut disp = DefaultSvcDispatcher::new();
        let ctx = SvcContext {
            r0: 0x30,
            r1: 0x0010_0000,
            r2: 0,
            r3: 0x0020_0000,
            r4: 0,
            r5: 0,
            kernel: &mut kernel,
        };
        let res = disp.dispatch(0x08, ctx); // CreateThread
        assert_ne!(res.r0, 0);
        assert_eq!(kernel.threads.count(), 1);
        assert_eq!(kernel.handles.len(), 1);
    }
}
