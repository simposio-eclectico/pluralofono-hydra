// src/lib/ipfs/signaling.ts
// Señalización WebRTC usando WebTorrent Tracker como canal de signaling
// signaling.ts usando bittorrent-tracker puro para signaling WebRTC
import TrackerClient from 'bittorrent-tracker/client';
import { onNewPeer } from '../global';

const TRACKER_URLS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz:443',
  'wss://tracker.files.fm:7073/announce',
];

const peers: Map<string, any> = new Map();

export class BitTorrentSignaling {
  private client: any;
  private infoHash: Uint8Array;
  private peerId: Uint8Array;
  private onSignalCallback: (msg: string, remotePeerId: string) => void = () => { };

  constructor(infoHash: Uint8Array, peerId: Uint8Array) {
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
      onNewPeer({ remotePeerId, infoHash: this.infoHash, peerId: this.peerId });
      peers.set(remotePeerId, trackerPeer);
      trackerPeer.on('data', (data: Uint8Array) => {
        const msg = new TextDecoder().decode(data);
        this.onSignalCallback(msg, remotePeerId);
      });
      trackerPeer.on('close', () => {
        peers.delete(remotePeerId);
        console.log('[TRACKER] Peer cerrado:', remotePeerId);
      });
    });
    this.client.start();
  }

  // Envía señalización a un peer específico (o a todos)
  sendSignal(msg: string, remotePeerId?: string) {
    console.log('[SIGNAL] Enviando señalización:', msg, 'a', remotePeerId || 'todos');
    const data = new TextEncoder().encode(msg);
    if (remotePeerId && peers.has(remotePeerId)) {
      const peer = peers.get(remotePeerId);
      if (peer) {
        if (typeof peer.connected !== 'undefined' && !peer.connected) {
          console.warn('[SIGNAL] Peer no está conectado, se omite');
        } else if (peer._channel && peer._channel.readyState !== 'open') {
          console.warn('[SIGNAL] Canal interno NO abierto, se omite');
        } else {
          try {
            peer.send(data);
          } catch (err) {
            console.error('[SIGNAL] Error enviando señalización:', err);
          }
        }
      } else {
        console.warn('[SIGNAL] Peer para', remotePeerId, 'es null, se omite');
      }
    } else {
      for (const peer of peers.values()) {
        if (!peer) {
          console.warn('[SIGNAL] Peer es null o undefined, se omite');
          continue;
        }
        if (typeof peer.connected !== 'undefined' && !peer.connected) {
          console.warn('[SIGNAL] Peer no está conectado, se omite');
          continue;
        }
        // Opcional: chequea el canal interno
        if (peer._channel && peer._channel.readyState !== 'open') {
          console.warn('[SIGNAL] Canal interno NO abierto, se omite');
          continue;
        }
        try {
          peer.send(data);
        } catch (err) {
          console.error('[SIGNAL] Error enviando señalización:', err);
        }
      }
    }
  }

  // Registra callback para mensajes recibidos
  onSignal(cb: (msg: string, remotePeerId: string) => void) {
    this.onSignalCallback = cb;
  }
}