import avro from "avsc";
import { Buffer } from 'buffer';
import midiSchema from "../../schema/midi-schema";
// @ts-ignore
globalThis.Buffer = Buffer

interface Logger {
  message: string;
  isOpen: string | boolean;
  error?: Event;
}

interface OnMessageCallback {
  (event: Event): void;
}

interface ConnectOptions {
  onMessageCallback: OnMessageCallback;
  username: string;
  logger: Logger;
}

/**
 * Función CONNECT. Conecta al WS.
 * @param {*} username
 */
export class AvroWebSocketClient {
  private socket: WebSocket;
  private schema: avro.Type;
  constructor({ onMessageCallback, username, logger }: ConnectOptions) {
    this.socket = new WebSocket(`ws://localhost:9876/ws?username=${username}`);
    this.schema = avro.Type.forSchema(midiSchema);

    /**
     * Handler de errores
     * @param {*} error
     */
    this.socket.onerror = (error) => {
      logger.message = "Error al conectar a servidor.";
      logger.isOpen = false;
      logger.error = error;
    };

    this.socket.onopen = (event) => {
      // @ts-ignore
      logger.message = "Conectado a: " + event.currentTarget.url;
      logger.isOpen = true;
    };

    this.socket.onclose = () => {
      logger.message = "Desconectada.";
      logger.isOpen = "closed";
    };

    this.socket.onmessage = (event) => {
      const parsedEvent = this.schema.fromBuffer(event.data);
      onMessageCallback(parsedEvent);
    };
  }

  send(message: any) {
    const avroMessage = this.schema.toBuffer(message);
    this.socket.send(avroMessage);
  }
}
