import Oscillator from "../oscilator";
import { avroSchema } from "../schema/simple-schema";
import { PeerConnection, PeerConnectionWithHooks } from "./peer/connection";
import { toHex } from "./utils";

export type SetupPeerHooks = (conn: PeerConnectionWithHooks, remotePeerId: string) => void;

// Diccionario global de conexiones
export const peerConnections: Record<string, PeerConnection> = {};

let peerListUpdateCallback: (() => void) | null = null;
export function setPeerListUpdateCallback(cb: () => void) {
    peerListUpdateCallback = cb;
}

// Cuando se detecta un nuevo peer, crea la conexión y asigna hooks
export function onNewPeer({ remotePeerId, infoHash, peerId }:
    { remotePeerId: Uint8Array, infoHash: Uint8Array, peerId: Uint8Array }) {
    const stringRemotePeerId = toHex(remotePeerId);
    if (!peerConnections[stringRemotePeerId]) {
        const conn = new PeerConnection(stringRemotePeerId, avroSchema, infoHash, remotePeerId);
        peerConnections[stringRemotePeerId] = conn;
        setupPeerHooks(conn, stringRemotePeerId);
        if (peerListUpdateCallback) peerListUpdateCallback();
        conn.startSignaling();
        if (toHex(peerId) > stringRemotePeerId) {
            console.log('creando oferta')
            conn.createOffer();
        }
    }
}

// Audio
export const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

// Diccionario de osciladores remotos
export const remoteOscillators: Record<string, Oscillator> = {};

// Flags de dataChannelReady por peer
export const dataChannelReady: Record<string, boolean> = {};

// Asigna hooks para cada nueva conexión
export function setupPeerHooks(conn: PeerConnectionWithHooks, remotePeerId: string) {
    console.log('[RTC] Asignando hooks para peer', remotePeerId);
    console.log('[RTC] Asignando hooks para peer', remotePeerId);
    conn.onDataChannelOpen = function () {
        console.log('[RTC] DataChannel abierto para peer', remotePeerId);
        dataChannelReady[remotePeerId] = true;
        console.log(`[UI] DataChannel listo para enviar a ${remotePeerId}`);
    };
    // Limpieza automática al cerrar canal de datos
    conn.onRemotePeerDisconnected = function (remotePeerId: string) {
        console.log('[RTC] Peer desconectado, limpiando:', remotePeerId);
        delete peerConnections[remotePeerId];
        delete remoteOscillators[remotePeerId];
        delete dataChannelReady[remotePeerId];
        if (peerListUpdateCallback) peerListUpdateCallback();
    };
    conn.onRemoteOscData = function (msg: { from: string, freq: number, gain: number }) {
        console.log('[RECV]', msg);
        if (!remoteOscillators[msg.from]) {
            remoteOscillators[msg.from] = new Oscillator(audioCtx);
            remoteOscillators[msg.from].start();
        }
        remoteOscillators[msg.from].setFrequency(msg.freq);
        remoteOscillators[msg.from].setGain(msg.gain);
    };
    conn.onRemotePeerDisconnected = function (remotePeerId: string) {
        if (remotePeerId && remoteOscillators[remotePeerId]) {
            remoteOscillators[remotePeerId].setGain(0); // silenciar
            delete remoteOscillators[remotePeerId];
            console.log(`Oscilador de peer ${remotePeerId} eliminado.`);
        }
    };
}
