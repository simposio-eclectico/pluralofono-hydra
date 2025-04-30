export interface WebSocketClientInterface {
  send(message: any): void;
  onmessage(event: any): void;
}
