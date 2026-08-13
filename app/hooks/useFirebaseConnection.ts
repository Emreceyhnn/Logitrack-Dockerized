import { useEffect, useState } from "react";
import { db, ref, onValue } from "@/app/lib/firebase";

/**
 * Tracks the live Firebase RTDB socket state via the special `.info/connected`
 * node. Returns `false` while the client is disconnected (offline, dropped
 * socket, mid-reconnect) so the UI can stop presenting cached data as live.
 *
 * `.info/connected` is readable without auth and fires immediately with the
 * current state, then again on every connect/disconnect transition.
 */
export const useFirebaseConnection = (): boolean => {
  // Assume connected until proven otherwise so we don't flash an offline banner
  // on the very first paint before the listener has reported in.
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const infoRef = ref(db, ".info/connected");
    const unsubscribe = onValue(infoRef, (snapshot) => {
      setConnected(snapshot.val() === true);
    });
    return () => unsubscribe();
  }, []);

  return connected;
};
