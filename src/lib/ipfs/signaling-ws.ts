// Señalización WebRTC usando WebSocket como canal de signaling

import { onNewPeer } from "../global";

// La URL del WebSocket se toma de la variable de entorno PUBLIC_SIGNALING_URL
export class WebSocketSignaling {
  private ws: WebSocket;
  private infoHash: Uint8Array;
  private peerId: Uint8Array;
  private onSignalCallback: (msg: string, remotePeerId: string) => void = () => {};
  private isOpen: boolean = false;
  private pendingMessages: string[] = [];

  constructor(infoHash: Uint8Array, peerId: Uint8Array) {
    this.infoHash = infoHash;
    this.peerId = peerId;
    const wsUrl = import.meta.env.PUBLIC_SIGNALING_URL;
    if (!wsUrl) {
      throw new Error('PUBLIC_SIGNALING_URL no definida en las variables de entorno');
    }
    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => {
      this.isOpen = true;
      // Identificación inicial (opcional, según tu backend)
      this.ws.send(JSON.stringify({ type: 'register', infoHash: Array.from(this.infoHash), peerId: Array.from(this.peerId) }));
      // Envía mensajes pendientes
      this.pendingMessages.forEach(msg => this.ws.send(msg));
      this.pendingMessages = [];
    };
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if(data.type === 'userlist') {
          onNewPeer({ remotePeerId: data.peers, infoHash: this.infoHash, peerId: this.peerId });
        }
      } catch (err) {
        console.warn('[WS-SIGNAL] Mensaje no JSON:', event.data);
      }
    };
    this.ws.onerror = (err) => {
      console.error('[WS-SIGNAL] Error en WebSocket:', err);
    };
    this.ws.onclose = () => {
      this.isOpen = false;
      console.warn('[WS-SIGNAL] WebSocket cerrado');
    };
  }

  async start() {
    // No-op: el WebSocket se conecta en el constructor
  }

  sendBroadcast(msg: string) {
    this.sendSignal(msg);
  }

  sendSignal(msg: string, remotePeerIds?: string[]) {
    const payload = JSON.stringify({
      type: 'signal',
      to: remotePeerIds, // si es null, el ws lo broadcasteará
      from: Array.from(this.peerId),
      infoHash: Array.from(this.infoHash),
      msg,
    });
    if (this.isOpen) {
      this.ws.send(payload);
    } else {
      this.pendingMessages.push(payload);
    }
  }

  onSignal(cb: (msg: string, remotePeerId: string) => void) {
    this.onSignalCallback = cb;
  }
}
