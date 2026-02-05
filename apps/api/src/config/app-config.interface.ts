export interface AppConfig {
  server: {
    port: number;
  };
  mongodb: {
    uri: string;
    maxPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
  };
}
