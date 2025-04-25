export function asciiToBytes20(str: string): Uint8Array {
    const arr = new Uint8Array(20);
    for (let i = 0; i < 20; i++) arr[i] = str.charCodeAt(i) || 0;
    return arr;
}
export function randomBytes20(): Uint8Array {
    const arr = new Uint8Array(20);
    self.crypto.getRandomValues(arr);
    return arr;
}
export function toHex(arr: Uint8Array) {
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}