/**
 * EIP-6963: Multi Injected Provider Discovery
 * This utility allows the application to discover multiple injected EVM providers.
 */

let providers = [];
const listeners = new Set();

export function getDiscoveredProviders() {
  return providers;
}

export function subscribeToProviders(callback) {
  listeners.add(callback);
  callback(providers);
  return () => listeners.delete(callback);
}

function announceProvider(event) {
  const { info, provider } = event.detail;
  
  // Check if already registered
  if (providers.find(p => p.info.uuid === info.uuid)) return;
  
  providers = [...providers, { info, provider }];
  listeners.forEach(callback => callback(providers));
}

// Start listening for provider announcements
if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', announceProvider);
  // Dispatch request for providers that already announced
  window.dispatchEvent(new CustomEvent('eip6963:requestProvider'));
}

/**
 * Hook-friendly wrapper for React
 */
import { useState, useEffect } from 'react';

export function useDiscoveredProviders() {
  const [discovered, setDiscovered] = useState(providers);

  useEffect(() => {
    return subscribeToProviders(setDiscovered);
  }, []);

  return discovered;
}
