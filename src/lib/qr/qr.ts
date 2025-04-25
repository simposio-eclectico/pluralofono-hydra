import QRCode from 'qrcode';

export async function generateQR(data: string, canvas: HTMLCanvasElement) {
  await QRCode.toCanvas(canvas, data);
}

export async function decodeQR(image: HTMLImageElement): Promise<string> {
  // Para decodificar QR en web, se recomienda usar una librería como 'jsQR' o 'html5-qrcode'.
  // Aquí solo se deja la función como placeholder.
  throw new Error('Implementar decodificación de QR con jsQR o html5-qrcode');
}
