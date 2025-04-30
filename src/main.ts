import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import { audioCtx, peerConnections, setPeerListUpdateCallback } from './lib/global';
import { asciiToBytes20, randomBytes20, toHex } from './lib/utils';
import { AvroWebSocketClient } from './lib/ws/avro-websocket-client';
import Oscillator from './oscilator';
import Reproductor from './reproductor';
import Theremin from './theremin';



async function main() {
  // Define infoHash (ambos peers deben usar el mismo valor, 20 bytes ASCII)
  const infoHash = asciiToBytes20('pluralofono-demo-202');

  // Genera un peerId aleatorio de 20 bytes
  const peerId = randomBytes20();

  document.querySelector('#peerid-panel')!.innerHTML = `Mi PeerID: ${toHex(peerId)}`;
  document.querySelector('#infohash-panel')!.innerHTML = `InfoHash: ${toHex(infoHash)}`;

  console.table({ peerId: toHex(peerId), peerIdLength: peerId.length, infoHash: toHex(infoHash), infoHashLength: infoHash.length });

  function updatePeerListPanel() {
    const peers = Object.keys(peerConnections);
    console.log('[UI] updatePeerListPanel:', peers);
    document.querySelector('#peer-list-panel')!.innerHTML = `<b>Peers conectados: </b><br>${peers.length === 0 ? '<i>Ninguno</i>' : peers.map(id => `<span>${id}</span>`).join('<br>')}`;
  }
  updatePeerListPanel();

  // Registra la función de actualización en global.ts
  setPeerListUpdateCallback(updatePeerListPanel);


  // Prepara el canvas y oscilador
  const canvas = document.getElementById('osc-canvas') as HTMLCanvasElement;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Oscilador local
  const osc = new Oscillator(audioCtx);
  const rep = new Reproductor({audioContext: audioCtx, canvas});
  const avroWebSocketClient = new AvroWebSocketClient({ onMessageCallback: (msg: any) => rep.playAndDraw({x: msg.freq, y: msg.gain}), username: 'test', logger: {
    isOpen: true,
    message: ""
  } });
  const theremin = new Theremin({oscillator: osc, webSocketClient: avroWebSocketClient, canvas});

  // Overlay para pedir interacción del usuario
  const overlay = document.getElementById('overlay') as HTMLDivElement;

  function startAudio() {
    audioCtx.resume().then(() => {
      theremin.start();
      overlay.remove();
    });
  }
  overlay.addEventListener('click', startAudio);

}

main();
