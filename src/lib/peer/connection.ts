import avro, { Schema } from 'avsc';
import { Buffer } from 'buffer';
import { BitTorrentSignaling } from '../ipfs/signaling';

export type PeerConnectionWithHooks = PeerConnection & {
  onDataChannelOpen?: () => void;
  onRemoteOscData?: (msg: { from: string, freq: number, gain: number }) => void;
  onRemotePeerDisconnected?: (remotePeerId: string) => void;
};

// PeerConnection solo con BitTorrentSignaling + WebRTC
export class PeerConnection {
  private avroType: avro.Type;
  // Usa el peerConnections global de global.ts para gestionar peers conectados
  private signaling: BitTorrentSignaling;
  private peerConnection: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private remoteId: string | null = null;
  private localId: string;
  private isOfferer: boolean = false;

  constructor(localId: string, avroSchema: Schema, infoHash: Uint8Array, peerId: Uint8Array) {
    this.localId = localId;
    this.avroType = avro.Type.forSchema(avroSchema);
    this.signaling = new BitTorrentSignaling(infoHash, peerId);
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
  }

  async startSignaling() {
    await this.signaling.start();
    this.signaling.onSignal(async (msg: string, remotePeerId: string) => {
      console.log('[SIGNAL] Mensaje recibido de peer:', remotePeerId, msg);
      this.remoteId = remotePeerId;
      const data = JSON.parse(msg);
      if (data.type === 'offer' || data.type === 'answer') {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        if (data.type === 'offer') {
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          this.signaling.sendSignal(JSON.stringify(this.peerConnection.localDescription));
        }
      } else if (data.candidate) {
        await this.peerConnection.addIceCandidate(data);
      }
    });
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.sendSignal(JSON.stringify(event.candidate));
      }
    };
    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
      console.log('[ondatachannel] remoteId:', this.remoteId);
      if (this.remoteId) {
        PeerConnection.connectedPeers.add(this.remoteId);
        console.log('[ondatachannel] Peer agregado al set:', this.remoteId, PeerConnection.connectedPeers);
      }
      console.log('DataChannel recibido y listo');
    };
  }

  async createOffer() {
    this.isOfferer = true;
    this.dataChannel = this.peerConnection.createDataChannel('data');
    this.setupDataChannel();
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.signaling.sendSignal(JSON.stringify(offer));
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;
    this.dataChannel.binaryType = 'arraybuffer';
    this.dataChannel.onopen = () => {
      console.log('[dataChannel.onopen] remoteId:', this.remoteId);
      if (this.remoteId) {
        PeerConnection.connectedPeers.add(this.remoteId);
        console.log('[dataChannel.onopen] Peer agregado al set:', this.remoteId, PeerConnection.connectedPeers);
      }
      if ((this as any).onDataChannelOpen) {
        (this as any).onDataChannelOpen();
      }
      console.log('DataChannel abierto');
    };
    this.dataChannel.onclose = () => {
      if (this.remoteId) {
        PeerConnection.connectedPeers.delete(this.remoteId);
        console.log('[dataChannel.onclose] Peer eliminado del set:', this.remoteId, PeerConnection.connectedPeers);
      }
      console.log('DataChannel cerrado');
    };
    this.dataChannel.onmessage = (event) => {
      const buf = new Uint8Array(event.data);
      const decoded = this.avroType.fromBuffer(Buffer.from(buf));
      console.log('[RECV] Recibido de remote', decoded);
      if ((this as any).onRemoteOscData) {
        (this as any).onRemoteOscData(decoded);
      }
    };
  }

  send(data: any) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const buf = this.avroType.toBuffer(data);
      this.dataChannel.send(buf);
      console.log('[SEND] Enviado por datachannel:', data);
    } else {
      console.warn('[SEND] No se puede enviar, dataChannel no está abierto', this.dataChannel);
    }
  }

  getId() {
    return this.localId;
  }
}
