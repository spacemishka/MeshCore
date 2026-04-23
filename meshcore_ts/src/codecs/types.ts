/**
 * Low-level codec utilities for binary encoding/decoding
 * All integers use little-endian byte order unless noted
 */

/**
 * Read little-endian uint16 from buffer at offset
 */
export function readUInt16LE(buffer: Uint8Array, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8);
}

/**
 * Write little-endian uint16 to buffer at offset
 */
export function writeUInt16LE(
  buffer: Uint8Array,
  offset: number,
  value: number
): void {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >> 8) & 0xff;
}

/**
 * Read little-endian uint32 from buffer at offset
 */
export function readUInt32LE(buffer: Uint8Array, offset: number): number {
  return (
    buffer[offset] |
    (buffer[offset + 1] << 8) |
    (buffer[offset + 2] << 16) |
    (buffer[offset + 3] << 24)
  );
}

/**
 * Write little-endian uint32 to buffer at offset
 */
export function writeUInt32LE(
  buffer: Uint8Array,
  offset: number,
  value: number
): void {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >> 8) & 0xff;
  buffer[offset + 2] = (value >> 16) & 0xff;
  buffer[offset + 3] = (value >> 24) & 0xff;
}

/**
 * Read little-endian int8 from buffer at offset
 */
export function readInt8(buffer: Uint8Array, offset: number): number {
  const value = buffer[offset];
  return value > 127 ? value - 256 : value;
}

/**
 * Write int8 to buffer at offset
 */
export function writeInt8(
  buffer: Uint8Array,
  offset: number,
  value: number
): void {
  buffer[offset] = value < 0 ? value + 256 : value;
}

/**
 * Read little-endian int32 from buffer at offset
 */
export function readInt32LE(buffer: Uint8Array, offset: number): number {
  const value = readUInt32LE(buffer, offset);
  return value > 2147483647 ? value - 4294967296 : value;
}

/**
 * Write little-endian int32 to buffer at offset
 */
export function writeInt32LE(
  buffer: Uint8Array,
  offset: number,
  value: number
): void {
  const unsigned = value < 0 ? value + 4294967296 : value;
  writeUInt32LE(buffer, offset, unsigned);
}

/**
 * Decode UTF-8 null-terminated string from buffer starting at offset
 * Reads up to maxLen bytes or until null terminator is found
 */
export function readNullTerminatedString(
  buffer: Uint8Array,
  offset: number,
  maxLen: number
): string {
  let len = 0;
  while (len < maxLen && buffer[offset + len] !== 0) {
    len++;
  }
  return new TextDecoder().decode(buffer.slice(offset, offset + len));
}

/**
 * Decode fixed-width UTF-8 string (may contain null padding)
 */
export function readFixedString(
  buffer: Uint8Array,
  offset: number,
  maxLen: number
): string {
  const nullIndex = buffer.slice(offset, offset + maxLen).indexOf(0);
  const len = nullIndex >= 0 ? nullIndex : maxLen;
  return new TextDecoder().decode(buffer.slice(offset, offset + len));
}

/**
 * Encode UTF-8 string into buffer at offset, padded with nulls to reach maxLen
 * Returns number of bytes written
 */
export function writeFixedString(
  buffer: Uint8Array,
  offset: number,
  value: string,
  maxLen: number
): number {
  const encoded = new TextEncoder().encode(value);
  const len = Math.min(encoded.length, maxLen);
  buffer.set(encoded.slice(0, len), offset);

  // Pad with nulls
  for (let i = len; i < maxLen; i++) {
    buffer[offset + i] = 0;
  }

  return maxLen;
}

/**
 * Copy raw bytes from source to target at offset
 */
export function writeBytes(
  buffer: Uint8Array,
  offset: number,
  data: Uint8Array | number[]
): void {
  buffer.set(data, offset);
}

/**
 * Extract raw bytes from buffer
 */
export function readBytes(
  buffer: Uint8Array,
  offset: number,
  length: number
): Uint8Array {
  return buffer.slice(offset, offset + length);
}
