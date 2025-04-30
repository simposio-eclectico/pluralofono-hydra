import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import avro from "avsc";
import { simpleSchema } from "../../schema/simple-schema";
import { WebSocketClientInterface } from './websocket.interface';

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
export class AvroWebSocketClient implements WebSocketClientInterface {
  private socket: WebSocket;
  private schema: avro.Type;
  private onMessageCallback: OnMessageCallback;
  constructor({ onMessageCallback, username, logger }: ConnectOptions) {
    this.onMessageCallback = onMessageCallback;
    const wsUrl = import.meta.env.PUBLIC_WS_URL;
    if (!wsUrl) {
      throw new Error('PUBLIC_WS_URL no definida en las variables de entorno');
    }
    this.socket = new WebSocket(`${wsUrl}?username=${username}`);
    this.schema = avro.Type.forSchema(simpleSchema);

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

    this.socket.onmessage = (event: any) => {
      this.onmessage(event);
    };
  }

  async onmessage(event: any): Promise<void> {
    try {
      let data: Buffer;
      if (event.data instanceof ArrayBuffer) {
        data = Buffer.from(new Uint8Array(event.data));
      } else if (event.data instanceof Blob) {
        const arrayBuffer = await event.data.arrayBuffer();
        data = Buffer.from(new Uint8Array(arrayBuffer));
      } else if (event.data instanceof String ||  typeof event.data === 'string') {
        // NOOP: actualizar lista de peers
        return;
      } else {
        throw new Error("Formato de datos no soportado: " + typeof event.data);
      }

      const parsedEvent = this.schema.fromBuffer(data);
      this.onMessageCallback(parsedEvent);
    } catch (error) {
      console.error("Error al procesar el mensaje:", error);
      console.log(event.data)
    }
  }

  send(message: any) {
    const avroMessage = this.schema.toBuffer(message);
    this.socket.send(avroMessage);
  }
}
