import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import avro from "avsc";

export const avroSchema: avro.Schema = {
  type: 'record',
  name: 'OscMsg',
  fields: [
    { name: 'from', type: 'string' },
    { name: 'freq', type: 'float' },
    { name: 'gain', type: 'float' }
  ]
};