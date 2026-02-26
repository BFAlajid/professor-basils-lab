#[derive(Debug, Clone)]
pub enum SyncObject {
    Mutex(MutexState),
    Semaphore(SemaphoreState),
    Event(EventState),
}

#[derive(Debug, Clone)]
pub struct MutexState {
    pub owner_thread: Option<u32>,
    pub lock_count: u32,
    pub waiting: Vec<u32>,
}

#[derive(Debug, Clone)]
pub struct SemaphoreState {
    pub count: i32,
    pub max_count: i32,
    pub waiting: Vec<u32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ResetType {
    OneShot,
    Sticky,
    Pulse,
}

#[derive(Debug, Clone)]
pub struct EventState {
    pub signaled: bool,
    pub reset_type: ResetType,
    pub waiting: Vec<u32>,
}

impl MutexState {
    pub fn new() -> Self {
        Self {
            owner_thread: None,
            lock_count: 0,
            waiting: Vec::new(),
        }
    }
}

impl SemaphoreState {
    pub fn new(initial: i32, max: i32) -> Self {
        Self {
            count: initial,
            max_count: max,
            waiting: Vec::new(),
        }
    }
}

impl EventState {
    pub fn new(reset_type: ResetType) -> Self {
        Self {
            signaled: false,
            reset_type,
            waiting: Vec::new(),
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum AcquireResult {
    Success,
    WouldBlock,
    InvalidObject,
}

pub fn acquire(obj: &mut SyncObject, thread_id: u32) -> AcquireResult {
    match obj {
        SyncObject::Mutex(m) => {
            match m.owner_thread {
                None => {
                    m.owner_thread = Some(thread_id);
                    m.lock_count = 1;
                    AcquireResult::Success
                }
                Some(owner) if owner == thread_id => {
                    m.lock_count += 1;
                    AcquireResult::Success
                }
                Some(_) => {
                    if !m.waiting.contains(&thread_id) {
                        m.waiting.push(thread_id);
                    }
                    AcquireResult::WouldBlock
                }
            }
        }
        SyncObject::Semaphore(s) => {
            if s.count > 0 {
                s.count -= 1;
                AcquireResult::Success
            } else {
                if !s.waiting.contains(&thread_id) {
                    s.waiting.push(thread_id);
                }
                AcquireResult::WouldBlock
            }
        }
        SyncObject::Event(e) => {
            if e.signaled {
                if e.reset_type == ResetType::OneShot {
                    e.signaled = false;
                }
                AcquireResult::Success
            } else {
                if !e.waiting.contains(&thread_id) {
                    e.waiting.push(thread_id);
                }
                AcquireResult::WouldBlock
            }
        }
    }
}

pub fn release(obj: &mut SyncObject, thread_id: u32) -> Vec<u32> {
    let mut woken = Vec::new();
    match obj {
        SyncObject::Mutex(m) => {
            if m.owner_thread == Some(thread_id) {
                m.lock_count -= 1;
                if m.lock_count == 0 {
                    m.owner_thread = None;
                    if let Some(next) = m.waiting.first().copied() {
                        m.waiting.remove(0);
                        m.owner_thread = Some(next);
                        m.lock_count = 1;
                        woken.push(next);
                    }
                }
            }
        }
        SyncObject::Semaphore(s) => {
            if s.count < s.max_count {
                s.count += 1;
                if !s.waiting.is_empty() && s.count > 0 {
                    let next = s.waiting.remove(0);
                    s.count -= 1;
                    woken.push(next);
                }
            }
        }
        SyncObject::Event(e) => {
            e.signaled = true;
            match e.reset_type {
                ResetType::OneShot => {
                    if let Some(next) = e.waiting.first().copied() {
                        e.waiting.remove(0);
                        e.signaled = false;
                        woken.push(next);
                    }
                }
                ResetType::Sticky => {
                    woken.extend(e.waiting.drain(..));
                }
                ResetType::Pulse => {
                    woken.extend(e.waiting.drain(..));
                    e.signaled = false;
                }
            }
        }
    }
    woken
}

pub fn clear_event(obj: &mut SyncObject) {
    if let SyncObject::Event(e) = obj {
        e.signaled = false;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mutex_acquire_release() {
        let mut m = SyncObject::Mutex(MutexState::new());
        assert_eq!(acquire(&mut m, 1), AcquireResult::Success);
        assert_eq!(acquire(&mut m, 2), AcquireResult::WouldBlock);
        assert_eq!(acquire(&mut m, 1), AcquireResult::Success);
        let w = release(&mut m, 1);
        assert!(w.is_empty());
        let w = release(&mut m, 1);
        assert_eq!(w, vec![2]);
    }

    #[test]
    fn semaphore_acquire_release() {
        let mut s = SyncObject::Semaphore(SemaphoreState::new(2, 5));
        assert_eq!(acquire(&mut s, 1), AcquireResult::Success);
        assert_eq!(acquire(&mut s, 2), AcquireResult::Success);
        assert_eq!(acquire(&mut s, 3), AcquireResult::WouldBlock);
        let w = release(&mut s, 0);
        assert_eq!(w, vec![3]);
    }

    #[test]
    fn event_oneshot() {
        let mut e = SyncObject::Event(EventState::new(ResetType::OneShot));
        assert_eq!(acquire(&mut e, 1), AcquireResult::WouldBlock);
        let w = release(&mut e, 0);
        assert_eq!(w, vec![1]);
        assert_eq!(acquire(&mut e, 2), AcquireResult::WouldBlock);
    }

    #[test]
    fn event_sticky() {
        let mut e = SyncObject::Event(EventState::new(ResetType::Sticky));
        let _ = acquire(&mut e, 1);
        let _ = acquire(&mut e, 2);
        let w = release(&mut e, 0);
        assert_eq!(w.len(), 2);
        assert_eq!(acquire(&mut e, 3), AcquireResult::Success);
    }

    #[test]
    fn clear_event_resets() {
        let mut e = SyncObject::Event(EventState::new(ResetType::Sticky));
        let _ = release(&mut e, 0);
        assert_eq!(acquire(&mut e, 1), AcquireResult::Success);
        clear_event(&mut e);
        assert_eq!(acquire(&mut e, 2), AcquireResult::WouldBlock);
    }
}
