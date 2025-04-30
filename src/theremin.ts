import { WebSocketClientInterface } from "./lib/ws/websocket.interface";
import Oscillator from "./oscilator";
// @ts-ignore
const AudioContext: any = window.AudioContext || window.webkitAudioContext;

export type ThereminProps = {
  oscillator: Oscillator;
  webSocketClient: WebSocketClientInterface;
  canvas: HTMLCanvasElement;
};

export default class Theremin {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isPlaying: boolean;
  private prevX: number;
  private currX: number;
  private prevY: number;
  private currY: number;
  private strokeStyle: string;
  private lineWidth: number;
  private webSocketClient: WebSocketClientInterface;
  oscillator: Oscillator;
  scaledX: number;
  scaledY: number;
  inited: boolean;

  constructor({oscillator, webSocketClient, canvas}: ThereminProps) {
    this.oscillator = oscillator;
    this.webSocketClient = webSocketClient;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.isPlaying = false;
    this.prevX = 0;
    this.prevY = 0;
    this.currX = 0;
    this.currY = 0;
    this.scaledX = 0;
    this.scaledY = 0;
    this.strokeStyle = "black";
    this.lineWidth = 2;
    this.inited = false;

    canvas.addEventListener(
      "mousemove",
      (e) => {
        this.draw(e);
      },
      false
    );
    canvas.addEventListener(
      "mousedown",
      (e) => {
        this.point(e);
      },
      false
    );
    canvas.addEventListener(
      "mouseup",
      () => {
        this.release();
      },
      false
    );

    canvas.addEventListener(
      "touchstart",
      (e) => {
        this.point(e.touches[0]);
      },
      false
    );
    canvas.addEventListener(
      "touchend",
       () => {
        this.release();
      },
      false
    );
    canvas.addEventListener(
      "touchmove",
       (e) => {
        this.draw(e.touches[0]);
      },
      false
    );
  }

  private updateMousePos(e: MouseEvent | Touch) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width; // relationship bitmap vs. element for x
    const scaleY = this.canvas.height / rect.height; // relationship bitmap vs. element for y
    const mouse = {
      x: (e.clientX - rect.left) * scaleX, // scale mouse coordinates after they have
      y: (e.clientY - rect.top) * scaleY, // been adjusted to be relative to element
    };
    this.prevX = this.currX;
    this.prevY = this.currY;
    this.currX = mouse.x;
    this.currY = mouse.y;
    this.scaledX = mouse.x / this.canvas.width;
    this.scaledY = mouse.y / this.canvas.height;
  }

  private sendOrPlaySound() {
    if (this.oscillator) {
      this.oscillator.setFrequency(this.scaledX);
      this.oscillator.setGain(this.scaledY);
      // Mensaje compatible con simple-schema.ts
      const msg = {
        from: 'local', // puedes reemplazar por un identificador real si lo tienes
        freq: this.scaledX,
        gain: this.scaledY
      };
      this.webSocketClient.send(msg);
    }
  }

  private draw(e: MouseEvent | Touch) {
    if (this.isPlaying) {
      this.updateMousePos(e);
      this.sendOrPlaySound();
      this.ctx.beginPath();
      this.ctx.moveTo(this.prevX, this.prevY);
      this.ctx.lineTo(this.currX, this.currY);
      this.ctx.strokeStyle = this.strokeStyle;
      this.ctx.lineWidth = this.lineWidth;
      this.ctx.stroke();
      this.ctx.closePath();
    }
  }

  private release() {
    this.isPlaying = false;
  }

  private point(e: MouseEvent | Touch) {
    if (!this.inited) {
      this.oscillator.start();
      this.inited = true;
    }
    if (this.oscillator) {
      this.updateMousePos(e);
      this.isPlaying = true;
      this.sendOrPlaySound();
      this.ctx.beginPath();
      this.ctx.fillRect(this.currX, this.currY, 2, 2);
      this.ctx.closePath();
    }
  }

  public start() {
    this.oscillator.start();
    this.inited = true;
  }
}
