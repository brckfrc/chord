import { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { useAppSelector } from "@/store/hooks";
import { connectionManager } from "./useSignalRConnectionManager";

interface UseSignalROptions {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
}

export function useSignalR(hubUrl: string, options: UseSignalROptions = {}) {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const optionsRef = useRef(options);
  const connectionStateRef = useRef<"Disconnected" | "Connecting" | "Connected" | "Reconnecting">(
    connectionManager.getConnectionState(hubUrl)
  );
  const [connectionState, setConnectionState] = useState<
    "Disconnected" | "Connecting" | "Connected" | "Reconnecting"
  >(() => connectionManager.getConnectionState(hubUrl));
  const [error, setError] = useState<string | null>(null);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const getAccessToken = useCallback(() => {
    return localStorage.getItem("accessToken");
  }, []);

  // Initialize connection using global connection manager
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      return;
    }

    // Get or create connection
    let connection = connectionManager.getConnection(hubUrl);
    
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      // Create connection via manager
      connectionManager
        .createConnection(hubUrl, getAccessToken)
        .then((conn) => {
          connection = conn;
          connectionStateRef.current = "Connected";
          setConnectionState("Connected");
          setError(null);
          optionsRef.current.onConnected?.();
        })
        .catch((err) => {
          connectionStateRef.current = "Disconnected";
          setConnectionState("Disconnected");
          setError(err.message || "Failed to connect");
          console.error("SignalR connection error:", err);
        });
    } else {
      // Connection already exists and is connected
      connectionStateRef.current = "Connected";
      setConnectionState("Connected");
      setError(null);
    }

    // Subscribe to connection state changes
    const unsubscribe = connectionManager.subscribe(hubUrl, () => {
      const state = connectionManager.getConnectionState(hubUrl);
      const prevState = connectionStateRef.current;
      connectionStateRef.current = state;
      setConnectionState(state);
      
      // Call option callbacks based on state changes
      if (state === "Connected" && prevState !== "Connected") {
        if (prevState === "Reconnecting") {
          optionsRef.current.onReconnected?.();
        } else {
          optionsRef.current.onConnected?.();
        }
      } else if (state === "Disconnected" && prevState !== "Disconnected") {
        optionsRef.current.onDisconnected?.();
      } else if (state === "Reconnecting" && prevState !== "Reconnecting") {
        optionsRef.current.onReconnecting?.();
      }
    });

    // Cleanup - don't stop connection on unmount, let manager handle it
    // Connection will be stopped when no components are using it
    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, user, hubUrl, getAccessToken]);

  const invoke = useCallback(
    async <T = any>(methodName: string, ...args: any[]): Promise<T> => {
      const connection = connectionManager.getConnection(hubUrl);
      if (!connection) {
        throw new Error("SignalR connection not initialized");
      }

      if (connection.state !== signalR.HubConnectionState.Connected) {
        throw new Error("SignalR connection not connected");
      }

      return connection.invoke<T>(methodName, ...args);
    },
    [hubUrl]
  );

  const on = useCallback(
    (methodName: string, callback: (...args: any[]) => void) => {
      const connection = connectionManager.getConnection(hubUrl);
      if (!connection) {
        return () => {};
      }

      connection.on(methodName, callback);

      // Return cleanup function
      return () => {
        const conn = connectionManager.getConnection(hubUrl);
        if (conn) {
          conn.off(methodName, callback);
        }
      };
    },
    [hubUrl]
  );

  const off = useCallback(
    (methodName: string, callback?: (...args: any[]) => void) => {
      const connection = connectionManager.getConnection(hubUrl);
      if (!connection) {
        return;
      }

      if (callback) {
        connection.off(methodName, callback);
      } else {
        connection.off(methodName);
      }
    },
    [hubUrl]
  );

  return {
    connection: connectionManager.getConnection(hubUrl),
    connectionState,
    error,
    invoke,
    on,
    off,
    isConnected: connectionState === "Connected",
  };
}
