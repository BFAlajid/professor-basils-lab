//! Service port registry.
//!
//! 3DS services live behind named ports (`srv:`, `gsp::Gpu`, `hid:USER`,
//! `apt:U`, `fs:USER`, `dsp::DSP`, ...). User code obtains a session by
//! calling `srv:GetServiceHandle("name")` and then sends IPC requests via
//! `SendSyncRequest`. The kernel itself owns the port → service mapping.
//!
//! Phase 1 supplies the registry plus a stub `srv:` implementation that
//! always returns an empty response. Real service handlers (HID, GSP,
//! filesystem, audio) plug into this trait later.

/// A handler for a named service port.
pub trait Service {
    /// Service-port name as it appears in `ConnectToPort` / `srv:GetServiceHandle`.
    fn name(&self) -> &str;

    /// Process one IPC request. `header` is the IPC command header word from
    /// the thread's TLS command buffer; `params` are the parameter words that
    /// follow it. Return value is the response payload that the kernel will
    /// write back to the caller's TLS.
    fn handle(&mut self, header: u32, params: &[u32]) -> Vec<u32>;
}

/// Map of port name → service handler.
pub struct ServiceRegistry {
    services: Vec<(String, Box<dyn Service>)>,
}

impl ServiceRegistry {
    pub fn new() -> Self {
        Self {
            services: Vec::new(),
        }
    }

    /// Insert a service. Replaces any existing entry with the same name.
    pub fn register(&mut self, service: Box<dyn Service>) {
        let name = service.name().to_string();
        if let Some(idx) = self.services.iter().position(|(n, _)| n == &name) {
            self.services[idx] = (name, service);
        } else {
            self.services.push((name, service));
        }
    }

    /// Mutable lookup. The handler is borrowed for the duration of the IPC
    /// call so it can mutate its own state.
    pub fn get_mut(&mut self, name: &str) -> Option<&mut (dyn Service + 'static)> {
        for (n, s) in self.services.iter_mut() {
            if n == name {
                return Some(s.as_mut());
            }
        }
        None
    }

    /// Iterator over registered port names.
    pub fn names(&self) -> impl Iterator<Item = &str> {
        self.services.iter().map(|(n, _)| n.as_str())
    }

    pub fn len(&self) -> usize {
        self.services.len()
    }

    pub fn is_empty(&self) -> bool {
        self.services.is_empty()
    }
}

impl Default for ServiceRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Stub `srv:` implementation. The real service-manager port responds to
/// `RegisterClient`, `EnableNotification`, `RegisterService`, etc. — Phase 1
/// just acknowledges every request.
pub struct SrvService;

impl Service for SrvService {
    fn name(&self) -> &str {
        "srv:"
    }

    fn handle(&mut self, _header: u32, _params: &[u32]) -> Vec<u32> {
        Vec::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct EchoService {
        name: &'static str,
        last_header: u32,
    }
    impl Service for EchoService {
        fn name(&self) -> &str {
            self.name
        }
        fn handle(&mut self, header: u32, params: &[u32]) -> Vec<u32> {
            self.last_header = header;
            let mut out = vec![header];
            out.extend_from_slice(params);
            out
        }
    }

    #[test]
    fn register_and_lookup() {
        let mut reg = ServiceRegistry::new();
        reg.register(Box::new(SrvService));
        assert_eq!(reg.len(), 1);
        let svc = reg.get_mut("srv:").expect("srv: present");
        let response = svc.handle(0, &[]);
        assert!(response.is_empty());
    }

    #[test]
    fn register_replaces_same_name() {
        let mut reg = ServiceRegistry::new();
        reg.register(Box::new(SrvService));
        reg.register(Box::new(SrvService));
        assert_eq!(reg.len(), 1);
    }

    #[test]
    fn lookup_unknown_returns_none() {
        let mut reg = ServiceRegistry::new();
        assert!(reg.get_mut("nope:").is_none());
    }

    #[test]
    fn names_iterator() {
        let mut reg = ServiceRegistry::new();
        reg.register(Box::new(SrvService));
        reg.register(Box::new(EchoService {
            name: "hid:USER",
            last_header: 0,
        }));
        let names: Vec<&str> = reg.names().collect();
        assert_eq!(names.len(), 2);
        assert!(names.contains(&"srv:"));
        assert!(names.contains(&"hid:USER"));
    }

    #[test]
    fn handle_passes_params_through() {
        let mut reg = ServiceRegistry::new();
        reg.register(Box::new(EchoService {
            name: "echo:",
            last_header: 0,
        }));
        let svc = reg.get_mut("echo:").unwrap();
        let resp = svc.handle(0xDEAD_BEEF, &[1, 2, 3]);
        assert_eq!(resp, vec![0xDEAD_BEEF, 1, 2, 3]);
    }
}
