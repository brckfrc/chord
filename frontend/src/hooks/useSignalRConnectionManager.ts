import * as signalR from "@microsoft/signalr";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5049";

// Global connection manager - one connection per hubUrl
class SignalRConnectionManager {
  private connections: Map<string, signalR.HubConnection> = new Map();
  private connectionStates: Map<string, "Disconnected" | "Connecting" | "Connected" | "Reconnecting"> = new Map();
  private subscribers: Map<string, Set<() => void>> = new Map();

  getConnection(hubUrl: string): signalR.HubConnection | null {
    return this.connections.get(hubUrl) || null;
  }

  getConnectionState(hubUrl: string): "Disconnected" | "Connecting" | "Connected" | "Reconnecting" {
    return this.connectionStates.get(hubUrl) || "Disconnected";
  }

  async createConnection(
    hubUrl: string,
    getAccessToken: () => string | null
  ): Promise<signalR.HubConnection> {
    // If connection already exists and is connected, return it
    const existingConnection = this.connections.get(hubUrl);
    if (existingConnection && existingConnection.state === signalR.HubConnectionState.Connected) {
      return existingConnection;
    }

    // If connection exists but is not connected, stop it first
    if (existingConnection) {
      await existingConnection.stop().catch(console.error);
    }

    const token = getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    // Create new connection
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}${hubUrl}`, {
        accessTokenFactory: () => getAccessToken() || "",
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          return 30000;
        },
      })
      .build();

    this.connections.set(hubUrl, connection);
    this.connectionStates.set(hubUrl, "Connecting");

    // Connection state handlers
    connection.onclose((error) => {
      this.connectionStates.set(hubUrl, "Disconnected");
      this.notifySubscribers(hubUrl);
    });

    connection.onreconnecting((error) => {
      this.connectionStates.set(hubUrl, "Reconnecting");
      this.notifySubscribers(hubUrl);
    });

    connection.onreconnected((connectionId) => {
      this.connectionStates.set(hubUrl, "Connected");
      this.notifySubscribers(hubUrl);
    });

    // Start connection
    try {
      await connection.start();
      this.connectionStates.set(hubUrl, "Connected");
      this.notifySubscribers(hubUrl);
      if (onStateChange) {
        onStateChange("Connected");
      }
    } catch (err) {
      this.connectionStates.set(hubUrl, "Disconnected");
      this.notifySubscribers(hubUrl);
      if (onStateChange) {
        onStateChange("Disconnected");
      }
      throw err;
    }

    return connection;
  }

  subscribe(hubUrl: string, callback: () => void): () => void {
    if (!this.subscribers.has(hubUrl)) {
      this.subscribers.set(hubUrl, new Set());
    }
    this.subscribers.get(hubUrl)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(hubUrl);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(hubUrl);
        }
      }
    };
  }

  private notifySubscribers(hubUrl: string) {
    const subscribers = this.subscribers.get(hubUrl);
    if (subscribers) {
      subscribers.forEach((callback) => callback());
    }
  }

  async stopConnection(hubUrl: string): Promise<void> {
    const connection = this.connections.get(hubUrl);
    if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
      await connection.stop().catch(console.error);
      this.connections.delete(hubUrl);
      this.connectionStates.delete(hubUrl);
      this.subscribers.delete(hubUrl);
    }
  }

  async stopAllConnections(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map((hubUrl) =>
      this.stopConnection(hubUrl)
    );
    await Promise.all(promises);
  }
}

export const connectionManager = new SignalRConnectionManager();

