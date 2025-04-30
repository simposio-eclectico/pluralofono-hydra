import Oscillator from "./oscilator";
// @ts-ignore
const AudioContext: any = window.AudioContext || window.webkitAudioContext;

export type ReproductorProps = {
  audioContext: AudioContext;
  canvas: HTMLCanvasElement;
};

export type Point = {
  x: number;
  y: number;
  strokeStyle?: string;
  lineWidth?: number;
}

export default class Reproductor {
  private ctx: CanvasRenderingContext2D;
  private currX: number;
  private currY: number;
  private strokeStyle: string;
  private lineWidth: number;
  private audioContext: AudioContext;
  private canvas: HTMLCanvasElement;
  oscillator: Oscillator | undefined;
  inited: boolean;

  constructor({audioContext, canvas}: ReproductorProps) {
    this.audioContext = audioContext;
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("No se pudo obtener el contexto 2D del canvas");
    }
    this.ctx = context;
    // Iniciar en el centro del canvas
    this.currX = canvas.width / 2;
    this.currY = canvas.height / 2;
    this.strokeStyle = "black";
    this.lineWidth = 2;
    this.inited = false;
    
    // Configuración inicial del contexto
    this.ctx.strokeStyle = this.strokeStyle;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  private playSound(freq: number, gain: number) {
    if (this.oscillator) {
      this.oscillator.setFrequency(freq);
      this.oscillator.setGain(gain);
    }
  }

  private scalePoint(point: Point): {x: number, y: number} {
    // Escalar las coordenadas normalizadas (0-1) a las dimensiones del canvas
    return {
      x: point.x * this.canvas.width,
      y: point.y * this.canvas.height
    };
  }

  public playAndDraw(point: Point) {
    if (!this.inited) {
      this.oscillator = new Oscillator(this.audioContext);
      this.oscillator.start();
      this.inited = true;
    }

    // Escalar las coordenadas
    const scaledPoint = this.scalePoint(point);
    
    // Actualizar estilos si se proporcionan en el punto
    if (point.strokeStyle) {
      this.strokeStyle = point.strokeStyle;
      this.ctx.strokeStyle = this.strokeStyle;
    }
    if (point.lineWidth) {
      this.lineWidth = point.lineWidth;
      this.ctx.lineWidth = this.lineWidth;
    }

    // Reproducir sonido
    this.playSound(point.x, point.y);
    
    // Dibujar línea
    this.ctx.beginPath();
    this.ctx.moveTo(this.currX, this.currY);
    this.ctx.lineTo(scaledPoint.x, scaledPoint.y);
    this.ctx.stroke();
    
    // Actualizar posición actual
    this.currX = scaledPoint.x;
    this.currY = scaledPoint.y;
  }
}