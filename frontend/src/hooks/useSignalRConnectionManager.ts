import * as signalR from "@microsoft/signalr";

// SignalR base URL (hubs are mapped at root level, not under /api)
const SIGNALR_BASE_URL =
  import.meta.env.VITE_SIGNALR_BASE_URL || "http://localhost:5049";

// Global connection manager - one connection per hubUrl
class SignalRConnectionManager {
  private connections: Map<string, signalR.HubConnection> = new Map();
  private connectionStates: Map<
    string,
    "Disconnected" | "Connecting" | "Connected" | "Reconnecting"
  > = new Map();
  private subscribers: Map<string, Set<() => void>> = new Map();
  private connectingPromises: Map<string, Promise<signalR.HubConnection>> =
    new Map();

  getConnection(hubUrl: string): signalR.HubConnection | null {
    return this.connections.get(hubUrl) || null;
  }

  getConnectionState(
    hubUrl: string
  ): "Disconnected" | "Connecting" | "Connected" | "Reconnecting" {
    return this.connectionStates.get(hubUrl) || "Disconnected";
  }

  async createConnection(
    hubUrl: string,
    getAccessToken: () => string | null
  ): Promise<signalR.HubConnection> {
    // If connection already exists and is connected, return it
    const existingConnection = this.connections.get(hubUrl);
    if (
      existingConnection &&
      existingConnection.state === signalR.HubConnectionState.Connected
    ) {
      return existingConnection;
    }

    // If connection is already being created, wait for that promise instead of creating a new one
    const existingPromise = this.connectingPromises.get(hubUrl);
    if (existingPromise) {
      return existingPromise;
    }

    // If connection exists but is not connected, stop it first
    if (existingConnection) {
      await existingConnection.stop().catch(console.error);
      this.connections.delete(hubUrl);
      this.connectionStates.delete(hubUrl);
    }

    const token = getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    // Create connection promise
    const connectionPromise = this._createConnectionInternal(
      hubUrl,
      getAccessToken
    );
    this.connectingPromises.set(hubUrl, connectionPromise);

    try {
      const connection = await connectionPromise;
      this.connectingPromises.delete(hubUrl);
      return connection;
    } catch (err) {
      this.connectingPromises.delete(hubUrl);
      throw err;
    }
  }

  private async _createConnectionInternal(
    hubUrl: string,
    getAccessToken: () => string | null
  ): Promise<signalR.HubConnection> {
    // Create new connection
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${SIGNALR_BASE_URL}${hubUrl}`, {
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
    connection.onclose((_error) => {
      // Only update state if this is still the active connection
      if (this.connections.get(hubUrl) === connection) {
        this.connectionStates.set(hubUrl, "Disconnected");
        this.notifySubscribers(hubUrl);
      }
    });

    connection.onreconnecting((_error) => {
      if (this.connections.get(hubUrl) === connection) {
        this.connectionStates.set(hubUrl, "Reconnecting");
        this.notifySubscribers(hubUrl);
      }
    });

    connection.onreconnected((_connectionId) => {
      if (this.connections.get(hubUrl) === connection) {
        this.connectionStates.set(hubUrl, "Connected");
        this.notifySubscribers(hubUrl);
      }
    });

    // Start connection
    try {
      await connection.start();
      // Double-check that this is still the active connection
      if (this.connections.get(hubUrl) === connection) {
        this.connectionStates.set(hubUrl, "Connected");
        this.notifySubscribers(hubUrl);
      }
    } catch (err) {
      // Only update state if this is still the active connection
      if (this.connections.get(hubUrl) === connection) {
        this.connectionStates.set(hubUrl, "Disconnected");
        this.notifySubscribers(hubUrl);
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
    if (
      connection &&
      connection.state !== signalR.HubConnectionState.Disconnected
    ) {
      await connection.stop().catch(console.error);
      this.connections.delete(hubUrl);
      this.connectionStates.delete(hubUrl);
      this.subscribers.delete(hubUrl);
      this.connectingPromises.delete(hubUrl);
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
