//! Kernel handle table.
//!
//! 3DS handles are 32-bit IDs that name kernel objects (threads, mutexes,
//! events, sessions, etc.). The kernel hands them out to user code, which
//! then references them in subsequent SVCs.
//!
//! Two pseudo-handles are baked into the SVC ABI and never appear in the
//! table itself: `CURRENT_PROCESS` and `CURRENT_THREAD`.

/// 3DS handle: an opaque 32-bit identifier.
pub type Handle = u32;

/// Reserved value meaning "no handle".
pub const INVALID_HANDLE: Handle = 0;

/// Pseudo-handle resolving to the calling process.
pub const CURRENT_PROCESS: Handle = 0xFFFF8001;

/// Pseudo-handle resolving to the calling thread.
pub const CURRENT_THREAD: Handle = 0xFFFF8000;

/// Kind of kernel object a handle references.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HandleKind {
    Thread,
    Mutex,
    Event,
    Semaphore,
    Session,
    ClientSession,
    Process,
}

/// One row in the handle table.
#[derive(Debug, Clone, Copy)]
pub struct HandleEntry {
    pub kind: HandleKind,
    pub object_id: u32,
    pub refcount: u32,
}

/// Per-process handle table.
///
/// Phase 1 uses a flat `Vec<(Handle, HandleEntry)>` rather than a sparse map.
/// Lookups are O(n), which is fine while we're booting one homebrew app.
pub struct HandleTable {
    next_id: u32,
    table: Vec<(Handle, HandleEntry)>,
}

impl HandleTable {
    pub fn new() -> Self {
        // Start handles at 1 so 0 stays reserved as INVALID_HANDLE.
        Self {
            next_id: 1,
            table: Vec::new(),
        }
    }

    /// Insert a new entry, returning its freshly allocated handle.
    pub fn allocate(&mut self, kind: HandleKind, object_id: u32) -> Handle {
        let h = self.next_id;
        self.next_id = self.next_id.wrapping_add(1);
        if self.next_id == 0 {
            // Skip past INVALID_HANDLE on overflow.
            self.next_id = 1;
        }
        self.table.push((
            h,
            HandleEntry {
                kind,
                object_id,
                refcount: 1,
            },
        ));
        h
    }

    /// Decrement refcount and remove the entry when it hits zero.
    /// Returns true if an entry was actually closed.
    pub fn close(&mut self, handle: Handle) -> bool {
        if handle == INVALID_HANDLE {
            return false;
        }
        if let Some(idx) = self.table.iter().position(|(h, _)| *h == handle) {
            let entry = &mut self.table[idx].1;
            if entry.refcount > 1 {
                entry.refcount -= 1;
            } else {
                self.table.swap_remove(idx);
            }
            return true;
        }
        false
    }

    /// Look up an entry by handle.
    pub fn get(&self, handle: Handle) -> Option<&HandleEntry> {
        self.table
            .iter()
            .find(|(h, _)| *h == handle)
            .map(|(_, e)| e)
    }

    /// Create a new handle aliasing the same kernel object.
    pub fn duplicate(&mut self, handle: Handle) -> Option<Handle> {
        let (kind, object_id) = self
            .table
            .iter()
            .find(|(h, _)| *h == handle)
            .map(|(_, e)| (e.kind, e.object_id))?;
        Some(self.allocate(kind, object_id))
    }

    /// Number of live entries.
    pub fn len(&self) -> usize {
        self.table.len()
    }

    pub fn is_empty(&self) -> bool {
        self.table.is_empty()
    }
}

impl Default for HandleTable {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allocate_returns_unique_ids() {
        let mut table = HandleTable::new();
        let a = table.allocate(HandleKind::Thread, 1);
        let b = table.allocate(HandleKind::Mutex, 2);
        let c = table.allocate(HandleKind::Event, 3);
        assert_ne!(a, b);
        assert_ne!(b, c);
        assert_ne!(a, c);
        assert_ne!(a, INVALID_HANDLE);
    }

    #[test]
    fn allocated_entry_is_retrievable() {
        let mut table = HandleTable::new();
        let h = table.allocate(HandleKind::Process, 42);
        let entry = table.get(h).expect("entry must exist");
        assert_eq!(entry.kind, HandleKind::Process);
        assert_eq!(entry.object_id, 42);
        assert_eq!(entry.refcount, 1);
    }

    #[test]
    fn close_removes_entry() {
        let mut table = HandleTable::new();
        let h = table.allocate(HandleKind::Thread, 7);
        assert_eq!(table.len(), 1);
        assert!(table.close(h));
        assert_eq!(table.len(), 0);
        assert!(table.get(h).is_none());
    }

    #[test]
    fn close_invalid_handle_returns_false() {
        let mut table = HandleTable::new();
        assert!(!table.close(INVALID_HANDLE));
        assert!(!table.close(0xDEAD_BEEF));
    }

    #[test]
    fn duplicate_creates_new_handle() {
        let mut table = HandleTable::new();
        let original = table.allocate(HandleKind::Event, 99);
        let dup = table.duplicate(original).expect("duplicate must succeed");
        assert_ne!(original, dup);
        let entry = table.get(dup).unwrap();
        assert_eq!(entry.kind, HandleKind::Event);
        assert_eq!(entry.object_id, 99);
    }

    #[test]
    fn duplicate_unknown_handle_returns_none() {
        let mut table = HandleTable::new();
        assert!(table.duplicate(0x1234).is_none());
    }

    #[test]
    fn pseudo_handles_are_distinct_from_allocated() {
        let mut table = HandleTable::new();
        let h = table.allocate(HandleKind::Thread, 0);
        assert_ne!(h, CURRENT_PROCESS);
        assert_ne!(h, CURRENT_THREAD);
        assert_ne!(h, INVALID_HANDLE);
    }
}
