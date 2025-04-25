import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import { audioCtx, dataChannelReady, peerConnections, setPeerListUpdateCallback } from '../lib/global';
import { WebSocketSignaling } from '../lib/ipfs/signaling-ws';
import { asciiToBytes20, randomBytes20, toHex } from '../lib/utils';
import Oscillator from '../oscilator';



async function main() {
  // Define infoHash (ambos peers deben usar el mismo valor, 20 bytes ASCII)
  const infoHash = asciiToBytes20('pluralofono-demo-202');
  document.body.insertAdjacentHTML('beforebegin', `<div id="infohash-panel" style="position:fixed;top:0;right:0;background:#222;color:#fff;padding:4px;z-index:2000;">InfoHash: <b>${toHex(infoHash)}</b></div>`);

  // Genera un peerId aleatorio de 20 bytes
  const peerId = randomBytes20();


  // Inicializa el signaling global para este peer
  const signaling = new WebSocketSignaling(infoHash, peerId);
  await signaling.start(); // Esto conecta al tracker y permite detectar otros peers. SIN ESTO NO HAY COMUNICACIÓN.

  document.body.insertAdjacentHTML('beforebegin', `<div id="peerid-panel" style="position:fixed;top:24px;left:0;background:#222;color:#fff;padding:4px;z-index:2000;">Mi PeerID: ${toHex(peerId)}</div>`);
  document.body.insertAdjacentHTML('beforebegin', `<div id="peer-list-panel" style="position:fixed;top:40px;left:0;background:#222;color:#fff;padding:4px;z-index:2000;"></div>`);

  console.table({ peerId: toHex(peerId), peerIdLength: peerId.length, infoHash: toHex(infoHash), infoHashLength: infoHash.length });

  function updatePeerListPanel() {
    const peers = Object.keys(peerConnections);
    console.log('[UI] updatePeerListPanel:', peers);
    document.querySelector('#peer-list-panel').innerHTML = `<b>Peers conectados:</b><br>${peers.length === 0 ? '<i>Ninguno</i>' : peers.map(id => `<span>${id}</span>`).join('<br>')}`;
  }
  updatePeerListPanel();

  // Registra la función de actualización en global.ts
  setPeerListUpdateCallback(updatePeerListPanel);


  // Prepara el canvas y oscilador
  document.body.innerHTML = `<div><canvas id="osc-canvas"></canvas><canvas id="qr-canvas" style="position:fixed;right:10px;top:10px;"></canvas></div>`;
  const canvas = document.getElementById('osc-canvas') as HTMLCanvasElement;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Oscilador local
  const osc = new Oscillator(audioCtx);

  // Overlay para pedir interacción del usuario
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0,0,0,0.8)';
  overlay.style.color = 'white';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '1000';
  overlay.style.fontSize = '2rem';
  overlay.innerText = 'Haz click para activar el audio';
  document.body.appendChild(overlay);

  function startAudio() {
    audioCtx.resume().then(() => {
      osc.start();
      overlay.remove();
    });
  }
  overlay.addEventListener('click', startAudio);

  // Estado local
  let lastFreq = 0;
  let lastGain = 0;



  // Envía estado a todos los peers conectados cuyo canal esté abierto
  function sendOscState(freq: number, gain: number) {
    console.log(dataChannelReady)
    Object.entries(peerConnections).forEach(([remotePeerId, conn]) => {
      if (dataChannelReady[remotePeerId]) {
        console.log(`[SEND] Enviando estado a ${remotePeerId}:`, { freq, gain });
        conn.send({ from: toHex(peerId), freq, gain });
      } else {
        // Solo loguea si intentamos enviar a un peer no listo
        console.warn(`[SEND] Intento de enviar antes de que el canal esté listo con ${remotePeerId}`);
      }
    });
  }

  // Control por mouse/touch
  function handleControl(x: number, y: number) {
    const freq = x / canvas.width;
    const gain = 1 - y / canvas.height;
    osc.setFrequency(freq);
    osc.setGain(gain);
    lastFreq = freq;
    lastGain = gain;
    sendOscState(freq, gain);
  }
  canvas.addEventListener('mousemove', (e) => {
    if (e.buttons > 0) handleControl(e.offsetX, e.offsetY);
  });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      handleControl(t.clientX - rect.left, t.clientY - rect.top);
    }
  });

}

main();
