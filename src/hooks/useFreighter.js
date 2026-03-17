import { useState, useCallback } from "react";
import { isConnected, requestAccess, getNetwork } from "@stellar/freighter-api";
import { waitForFreighter } from "../utils/detectFreighter";

export function useFreighter() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [network, setNetwork] = useState(null);

  const connect = useCallback(async () => {
    if (isConnecting) return null;

    setError(null);
    setIsConnecting(true);

    try {
      // 1. Wait for Freighter to inject itself
      const detected = await waitForFreighter(3000);

      if (!detected) {
        throw new Error("NOT_INSTALLED");
      }

      // 2. Check it's unlocked
      const connectionStatus = await isConnected();
      if (!connectionStatus) {
        throw new Error("LOCKED");
      }

      // 3. Request access
      const access = await requestAccess();
      if (access.error) {
        throw new Error("ACCESS_DENIED");
      }

      const address = access.address || access; 
      const finalAddress = typeof address === 'string' ? address : address.publicKey;

      // 4. Get Network Info
      const currentNetwork = await getNetwork();
      setNetwork(currentNetwork);

      setPublicKey(finalAddress);
      console.log(`Connected to ${currentNetwork}:`, finalAddress);
      return { success: true, address: finalAddress, network: currentNetwork };

    } catch (err) {
      console.error("Freighter connection failed:", err.message);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  return { connect, isConnecting, publicKey, network, error };
}
