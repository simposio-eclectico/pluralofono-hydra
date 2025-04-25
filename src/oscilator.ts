interface OscillatorOptions {
  maxFreq: number;
  maxVol: number;
  initialVol: number;
  detune: number;
}

export default class Oscillator {
  ctx: AudioContext;
  oscillator: OscillatorNode;
  gainNode: GainNode;
  options: OscillatorOptions;

  constructor(
    audioContext: AudioContext,
    oscillatorOptions: OscillatorOptions = {
      initialVol: 0.001,
      maxVol: 0.02,
      maxFreq: 6000,
      detune: 100,
    }
  ) {
    this.ctx = audioContext;
    this.oscillator = this.ctx.createOscillator();
    this.gainNode = this.ctx.createGain();
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);
    this.gainNode.gain.value = oscillatorOptions.initialVol;
    this.oscillator.detune.value = oscillatorOptions.detune;
    this.options = oscillatorOptions;
  }

  start() {
    this.oscillator.start(0);
  }

  setFrequency(hz: number) {
    if(hz > 1 || hz < 0) throw new RangeError("frequency must be between 0 and 1");
    this.oscillator.frequency.value = hz * this.options.maxFreq;
  }

  setGain(value: number) {
    if(value > 1 || value < 0) throw new RangeError("gain value must be between 0 and 1");
    this.gainNode.gain.value = value * this.options.maxVol;
  }

  setType(type: OscillatorType) {
    this.oscillator.type = type;
  }

}
