//! SVC numbers, dispatcher trait, and a default Phase 1 dispatcher.
//!
//! On ARM11 user mode, `SVC #imm` raises a software interrupt that traps
//! into kernel mode. The CPU will hand control to a `SvcDispatcher`,
//! which inspects the immediate and routes to the matching handler.
//!
//! Phase 1 understands the SVC numbering and stubs out a handful of
//! handlers that the homebrew CRT0 hits during startup. Anything else
//! returns success and gets logged.

use crate::handle::HandleKind;

/// Known ARM11 user-mode SVC numbers.
///
/// Subset of the Horizon SVC table — extended on demand as homebrew
/// requires more.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum SvcNumber {
    ControlMemory = 0x01,
    QueryMemory = 0x02,
    ExitProcess = 0x03,
    GetProcessAffinityMask = 0x04,
    SetProcessAffinityMask = 0x05,
    CreateThread = 0x08,
    ExitThread = 0x09,
    SleepThread = 0x0A,
    GetThreadPriority = 0x0B,
    SetThreadPriority = 0x0C,
    CreateMutex = 0x13,
    ReleaseMutex = 0x14,
    CreateSemaphore = 0x15,
    ReleaseSemaphore = 0x16,
    CreateEvent = 0x17,
    SignalEvent = 0x18,
    ClearEvent = 0x19,
    CloseHandle = 0x23,
    WaitSync1 = 0x24,
    WaitSyncN = 0x25,
    DuplicateHandle = 0x27,
    GetSystemTick = 0x28,
    ConnectToPort = 0x2D,
    SendSyncRequest = 0x32,
    GetProcessId = 0x35,
    GetThreadId = 0x37,
    Break = 0x3C,
    OutputDebugString = 0x3D,
}

impl SvcNumber {
    /// Decode a raw immediate. Returns `None` for SVCs we don't model.
    pub fn from_u8(value: u8) -> Option<Self> {
        Some(match value {
            0x01 => Self::ControlMemory,
            0x02 => Self::QueryMemory,
            0x03 => Self::ExitProcess,
            0x04 => Self::GetProcessAffinityMask,
            0x05 => Self::SetProcessAffinityMask,
            0x08 => Self::CreateThread,
            0x09 => Self::ExitThread,
            0x0A => Self::SleepThread,
            0x0B => Self::GetThreadPriority,
            0x0C => Self::SetThreadPriority,
            0x13 => Self::CreateMutex,
            0x14 => Self::ReleaseMutex,
            0x15 => Self::CreateSemaphore,
            0x16 => Self::ReleaseSemaphore,
            0x17 => Self::CreateEvent,
            0x18 => Self::SignalEvent,
            0x19 => Self::ClearEvent,
            0x23 => Self::CloseHandle,
            0x24 => Self::WaitSync1,
            0x25 => Self::WaitSyncN,
            0x27 => Self::DuplicateHandle,
            0x28 => Self::GetSystemTick,
            0x2D => Self::ConnectToPort,
            0x32 => Self::SendSyncRequest,
            0x35 => Self::GetProcessId,
            0x37 => Self::GetThreadId,
            0x3C => Self::Break,
            0x3D => Self::OutputDebugString,
            _ => return None,
        })
    }
}

/// Outcome of an SVC dispatch.
#[derive(Debug, Clone, Copy)]
pub struct SvcResult {
    /// Value placed in R0 on return to user mode.
    pub r0: u32,
    /// If true, the calling thread should block (the scheduler will pick a
    /// new runnable thread). Phase 1 has no scheduler, so the CPU just
    /// notes this and keeps running.
    pub block: bool,
}

/// Caller registers handed to the SVC handler. Mirrors the ARM EABI
/// argument layout (R0..R3 plus an extension slot at R4/R5).
pub struct SvcContext<'a> {
    pub r0: u32,
    pub r1: u32,
    pub r2: u32,
    pub r3: u32,
    pub r4: u32,
    pub r5: u32,
    pub kernel: &'a mut crate::Kernel,
}

/// Trait the CPU calls when it decodes an SVC instruction.
pub trait SvcDispatcher {
    fn dispatch(&mut self, svc: u8, ctx: SvcContext<'_>) -> SvcResult;
}

/// Default Phase 1 dispatcher.
///
/// Implements the minimum surface area needed to get a homebrew CRT0
/// past initialization: thread create/exit, handle close, system-tick
/// poll, and a debug-print sink. Unknown SVCs are logged and return a
/// generic error code so we notice them.
pub struct DefaultSvcDispatcher {
    /// Diagnostic log of unhandled or otherwise interesting SVCs.
    pub log: Vec<String>,
}

impl DefaultSvcDispatcher {
    pub fn new() -> Self {
        Self { log: Vec::new() }
    }
}

impl Default for DefaultSvcDispatcher {
    fn default() -> Self {
        Self::new()
    }
}

/// Generic Horizon error code returned for unknown SVCs.
pub const ERR_NOT_IMPLEMENTED: u32 = 0xD8E0_07EE;

impl SvcDispatcher for DefaultSvcDispatcher {
    fn dispatch(&mut self, svc: u8, ctx: SvcContext<'_>) -> SvcResult {
        match SvcNumber::from_u8(svc) {
            Some(SvcNumber::OutputDebugString) => {
                self.log
                    .push(format!("debug str @ {:#010x}, len {}", ctx.r0, ctx.r1));
                SvcResult { r0: 0, block: false }
            }
            Some(SvcNumber::GetSystemTick) => SvcResult { r0: 0, block: false },
            Some(SvcNumber::CloseHandle) => {
                ctx.kernel.handles.close(ctx.r0);
                SvcResult { r0: 0, block: false }
            }
            Some(SvcNumber::CreateThread) => {
                // ARM EABI for svcCreateThread:
                //   r0 = priority, r1 = entry, r2 = arg, r3 = stack_top
                // We map entry → r1, stack_top → r3 here. The stub kernel
                // ignores `arg` for now.
                let id = ctx.kernel.threads.create(ctx.r1, ctx.r3, ctx.r0 as i32);
                let h = ctx.kernel.handles.allocate(HandleKind::Thread, id);
                SvcResult { r0: h, block: false }
            }
            Some(SvcNumber::ExitThread) => {
                let cur = ctx.kernel.threads.current_id;
                ctx.kernel.threads.terminate(cur);
                SvcResult { r0: 0, block: false }
            }
            Some(SvcNumber::SleepThread) => SvcResult {
                r0: 0,
                block: true,
            },
            Some(SvcNumber::GetProcessId) => SvcResult { r0: 1, block: false },
            Some(SvcNumber::GetThreadId) => SvcResult {
                r0: ctx.kernel.threads.current_id,
                block: false,
            },
            Some(_) => SvcResult { r0: 0, block: false },
            None => {
                self.log.push(format!("unknown SVC {:#04x}", svc));
                SvcResult {
                    r0: ERR_NOT_IMPLEMENTED,
                    block: false,
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Kernel;

    fn ctx<'a>(kernel: &'a mut Kernel) -> SvcContext<'a> {
        SvcContext {
            r0: 0,
            r1: 0,
            r2: 0,
            r3: 0,
            r4: 0,
            r5: 0,
            kernel,
        }
    }

    #[test]
    fn svc_number_round_trip() {
        let cases = [
            (0x01u8, SvcNumber::ControlMemory),
            (0x08, SvcNumber::CreateThread),
            (0x09, SvcNumber::ExitThread),
            (0x0A, SvcNumber::SleepThread),
            (0x23, SvcNumber::CloseHandle),
            (0x28, SvcNumber::GetSystemTick),
            (0x2D, SvcNumber::ConnectToPort),
            (0x32, SvcNumber::SendSyncRequest),
            (0x3D, SvcNumber::OutputDebugString),
        ];
        for (raw, expected) in cases {
            let n = SvcNumber::from_u8(raw).expect("known SVC");
            assert_eq!(n, expected);
            assert_eq!(n as u8, raw);
        }
    }

    #[test]
    fn svc_number_unknown_returns_none() {
        assert!(SvcNumber::from_u8(0xFF).is_none());
        assert!(SvcNumber::from_u8(0x00).is_none());
    }

    #[test]
    fn dispatch_known_svc() {
        let mut kernel = Kernel::new();
        let mut disp = DefaultSvcDispatcher::new();
        let res = disp.dispatch(0x28, ctx(&mut kernel)); // GetSystemTick
        assert_eq!(res.r0, 0);
        assert!(!res.block);
        assert!(disp.log.is_empty());
    }

    #[test]
    fn dispatch_unknown_logs_warning() {
        let mut kernel = Kernel::new();
        let mut disp = DefaultSvcDispatcher::new();
        let res = disp.dispatch(0xAB, ctx(&mut kernel));
        assert_eq!(res.r0, ERR_NOT_IMPLEMENTED);
        assert_eq!(disp.log.len(), 1);
        assert!(disp.log[0].contains("0xab"));
    }

    #[test]
    fn dispatch_create_thread_allocates_handle() {
        let mut kernel = Kernel::new();
        let mut disp = DefaultSvcDispatcher::new();
        let mut c = ctx(&mut kernel);
        c.r0 = 0x30; // priority
        c.r1 = 0x0010_0000; // entry
        c.r3 = 0x0020_0000; // stack
        let res = disp.dispatch(0x08, c);
        assert_ne!(res.r0, 0, "must return a non-zero handle");
        // Handle and thread must both have been created.
        assert_eq!(kernel.handles.len(), 1);
        assert_eq!(kernel.threads.count(), 1);
    }

    #[test]
    fn dispatch_close_handle() {
        let mut kernel = Kernel::new();
        let h = kernel
            .handles
            .allocate(crate::handle::HandleKind::Event, 1);
        assert_eq!(kernel.handles.len(), 1);

        let mut disp = DefaultSvcDispatcher::new();
        let mut c = ctx(&mut kernel);
        c.r0 = h;
        let res = disp.dispatch(0x23, c);
        assert_eq!(res.r0, 0);
        assert_eq!(kernel.handles.len(), 0);
    }

    #[test]
    fn dispatch_output_debug_string_logs() {
        let mut kernel = Kernel::new();
        let mut disp = DefaultSvcDispatcher::new();
        let mut c = ctx(&mut kernel);
        c.r0 = 0x0010_1000;
        c.r1 = 12;
        let res = disp.dispatch(0x3D, c);
        assert_eq!(res.r0, 0);
        assert_eq!(disp.log.len(), 1);
        assert!(disp.log[0].contains("debug str"));
    }

    #[test]
    fn dispatch_exit_thread_terminates_current() {
        let mut kernel = Kernel::new();
        // Seed a thread so there's a current_id.
        kernel.threads.create(0x100, 0x2000, 0x30);
        let cur = kernel.threads.current_id;
        let mut disp = DefaultSvcDispatcher::new();
        let res = disp.dispatch(0x09, ctx(&mut kernel));
        assert_eq!(res.r0, 0);
        assert_eq!(
            kernel.threads.get(cur).unwrap().state,
            crate::thread::ThreadState::Terminated
        );
    }

    #[test]
    fn dispatch_sleep_blocks_thread() {
        let mut kernel = Kernel::new();
        let mut disp = DefaultSvcDispatcher::new();
        let res = disp.dispatch(0x0A, ctx(&mut kernel));
        assert!(res.block);
    }
}
