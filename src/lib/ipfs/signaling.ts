// src/lib/ipfs/signaling.ts
// Señalización WebRTC usando WebTorrent Tracker como canal de signaling
// signaling.ts usando bittorrent-tracker puro para signaling WebRTC
import TrackerClient from 'bittorrent-tracker/client';
import { onNewPeer } from '../global';

const TRACKER_URLS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.fastcast.nz',
  'wss://signal.torrentcdn.com'
];

const peers: Map<string, any> = new Map();

export class BitTorrentSignaling {
  private client: any;
  private infoHash: Uint8Array;
  private peerId: Uint8Array;
  private onSignalCallback: (msg: string, remotePeerId: string) => void = () => {};

  constructor(infoHash: Uint8Array, peerId: Uint8Array) {
    console.log('weaweeawea')
    this.infoHash = infoHash;
    this.peerId = peerId;
    this.client = new TrackerClient({
      infoHash: infoHash,
      peerId: peerId,
      announce: TRACKER_URLS,
      rtcConfig: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      }
    });
  }

  async start() {
    this.client.on('error', (err: any) => console.error('[TRACKER] Error:', err));
    this.client.on('warning', (err: any) => console.warn('[TRACKER] Warning:', err));
    // Cuando se conecta a otro peer vía tracker
    this.client.on('peer', (trackerPeer: any) => {
      const remotePeerId = trackerPeer.id || trackerPeer._id || '(unknown)';
      console.log('onNewPeer is', onNewPeer);
      onNewPeer({ remotePeerId, infoHash: this.infoHash, peerId: this.peerId });
      peers.set(remotePeerId, trackerPeer);
      trackerPeer.on('data', (data: Uint8Array) => {
        const msg = new TextDecoder().decode(data);
        this.onSignalCallback(msg, remotePeerId);
      });
    });
    this.client.start();
  }

  // Envía señalización a un peer específico (o a todos)
  sendSignal(msg: string, remotePeerId?: string) {
    console.log('[SIGNAL] Enviando señalización:', msg, 'a', remotePeerId || 'todos');
    const data = new TextEncoder().encode(msg);
    if (remotePeerId && peers.has(remotePeerId)) {
      peers.get(remotePeerId).send(data);
    } else {
      // Broadcast a todos los peers conectados
      for (const peer of peers.values()) {
        peer.send(data);
      }
    }
  }

  // Registra callback para mensajes recibidos
  onSignal(cb: (msg: string, remotePeerId: string) => void) {
    this.onSignalCallback = cb;
  }
}