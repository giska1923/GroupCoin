export interface SocketConfig {
  cors?: {
    origin: string | string[];
    methods: string[];
  };
}
