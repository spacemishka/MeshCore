/**
 * Frame encoding/decoding for MeshCore BLE protocol
 */

import { ResponseCode, PushCode, MAX_FRAME_SIZE } from '../types';
import {
  readUInt32LE,
  writeUInt32LE,
  readInt8,
  readInt32LE,
  readFixedString,
  readBytes,
  writeUInt16LE,
  readUInt16LE,
} from './types';

/**
 * Decode frame first byte to determine type
 */
export function getFrameType(
  buffer: Uint8Array
): 'command' | 'response' | 'push' | 'unknown' {
  const code = buffer[0];

  if (code >= 0x80) return 'push';
  if (code >= 0x01 && code <= 0x3d) return 'command';
  if (code >= 0x00 && code <= 0x1a) return 'response';

  return 'unknown';
}

/**
 * SelfInfo response decoder (0x05, 58+ bytes)
 */
export function decodeSelfInfo(frame: Uint8Array) {
  if (frame[0] !== ResponseCode.SELF_INFO) {
    throw new Error('Invalid response code for SelfInfo');
  }

  const publicKey = readBytes(frame, 4, 32);
  const nodeName = readFixedString(frame, 58, frame.length - 58);

  return {
    code: ResponseCode.SELF_INFO,
    advertType: frame[1],
    currentTxPower: frame[2],
    maxTxPower: frame[3],
    publicKey,
    latitudeE6: readInt32LE(frame, 36),
    longitudeE6: readInt32LE(frame, 40),
    multiAcks: frame[44] !== 0,
    advertLocPolicy: frame[45],
    telemetryMode: frame[46],
    manualAddContacts: frame[47] !== 0,
    radioFrequencyHz: readUInt32LE(frame, 48),
    radioBandwidthHz: readUInt32LE(frame, 52),
    radioSF: frame[56],
    radioCR: frame[57],
    nodeName,
  };
}

/**
 * DeviceInfo response decoder (0x0D, 82+ bytes)
 */
export function decodeDeviceInfo(frame: Uint8Array) {
  if (frame[0] !== ResponseCode.DEVICE_INFO) {
    throw new Error('Invalid response code for DeviceInfo');
  }

  const buildString = readFixedString(frame, 8, 12);
  const modelString = readFixedString(frame, 20, 40);
  const versionString = readFixedString(frame, 60, 20);

  return {
    code: ResponseCode.DEVICE_INFO,
    firmwareProtocolVersion: frame[1],
    maxContactsRaw: frame[2],
    maxChannels: frame[3],
    blePIN: readUInt32LE(frame, 4),
    buildString,
    modelString,
    versionString,
    clientRepeatEnabled: frame[80] !== 0,
    pathHashMode: frame[81],
  };
}

/**
 * Contact record decoder (148 bytes)
 * Used by RESP_CODE_CONTACT (0x03) and PUSH_CODE_NEW_ADVERT (0x8A)
 */
export function decodeContact(frame: Uint8Array, offset = 0) {
  const code = frame[offset] as ResponseCode | PushCode;
  if (
    code !== ResponseCode.CONTACT &&
    code !== PushCode.NEW_ADVERT
  ) {
    throw new Error('Invalid response code for Contact');
  }

  const publicKey = readBytes(frame, offset + 1, 32);
  const name = readFixedString(frame, offset + 100, 32);

  return {
    code,
    publicKey,
    type: frame[offset + 33],
    flags: frame[offset + 34],
    outPathLen: frame[offset + 35],
    outPath: readBytes(frame, offset + 36, 64),
    name,
    lastAdvertTimestamp: readUInt32LE(frame, offset + 132),
    gpsLatE6: readInt32LE(frame, offset + 136),
    gpsLonE6: readInt32LE(frame, offset + 140),
    lastMod: readUInt32LE(frame, offset + 144),
  };
}

/**
 * BatteryAndStorage response decoder (0x0C)
 */
export function decodeBatteryAndStorage(frame: Uint8Array) {
  if (frame[0] !== ResponseCode.BATT_AND_STORAGE) {
    throw new Error('Invalid response code for BatteryAndStorage');
  }

  return {
    code: ResponseCode.BATT_AND_STORAGE,
    millivolts: readUInt16LE(frame, 1),
    usedKb: readUInt32LE(frame, 3),
    totalKb: readUInt32LE(frame, 7),
  };
}

/**
 * Channel info decoder (0x12)
 */
export function decodeChannelInfo(frame: Uint8Array) {
  if (frame[0] !== ResponseCode.CHANNEL_INFO) {
    throw new Error('Invalid response code for ChannelInfo');
  }

  const name = readFixedString(frame, 2, 32);
  const secret = readBytes(frame, 34, 16);

  return {
    code: ResponseCode.CHANNEL_INFO,
    channelIdx: frame[1],
    name,
    secret,
  };
}

/**
 * Sent confirmation decoder (0x06)
 */
export function decodeSentConfirmation(frame: Uint8Array) {
  if (frame[0] !== ResponseCode.SENT) {
    throw new Error('Invalid response code for SentConfirmation');
  }

  return {
    code: ResponseCode.SENT,
    routeFlag: frame[1],
    tagOrAck: readUInt32LE(frame, 2),
    estTimeoutMs: readUInt32LE(frame, 6),
  };
}

/**
 * Current time decoder (0x09)
 */
export function decodeCurrentTime(frame: Uint8Array) {
  if (frame[0] !== ResponseCode.CURR_TIME) {
    throw new Error('Invalid response code for CurrentTime');
  }

  return {
    code: ResponseCode.CURR_TIME,
    unixSecs: readUInt32LE(frame, 1),
  };
}

/**
 * Signature decoder (0x14)
 */
export function decodeSignature(frame: Uint8Array) {
  if (frame[0] !== ResponseCode.SIGNATURE) {
    throw new Error('Invalid response code for Signature');
  }

  return {
    code: ResponseCode.SIGNATURE,
    signature: readBytes(frame, 1, 64),
  };
}

/**
 * Message V3 decoder (0x10 for contact, 0x11 for channel)
 */
export function decodeMessageV3(frame: Uint8Array) {
  const code = frame[0];
  if (
    code !== ResponseCode.CONTACT_MSG_RECV_V3 &&
    code !== ResponseCode.CHANNEL_MSG_RECV_V3
  ) {
    throw new Error('Invalid response code for MessageV3');
  }

  const snrX4 = readInt8(frame, 1);
  const isContact = code === ResponseCode.CONTACT_MSG_RECV_V3;

  let offset = 4; // skip code + snrX4 + 2 reserved bytes

  const pubkeyPrefix = isContact ? readBytes(frame, offset, 6) : undefined;
  const channelIdx = !isContact ? frame[offset] : undefined;

  offset += isContact ? 6 : 1;

  const pathLen = frame[offset++];
  const txtType = frame[offset++];
  const timestamp = readUInt32LE(frame, offset);
  offset += 4;

  // Check if signed (extra 4-byte prefix)
  let extraPrefix: Uint8Array | undefined;
  if (offset < frame.length && frame[offset] !== 0) {
    extraPrefix = readBytes(frame, offset, 4);
    offset += 4;
  }

  const text = new TextDecoder().decode(frame.slice(offset));

  return {
    code,
    snrX4,
    reserved0: frame[2],
    reserved1: frame[3],
    ...(isContact && { pubkeyPrefix }),
    ...(!isContact && { channelIdx }),
    pathLen,
    txtType,
    timestamp,
    extraPrefix,
    text,
  };
}

/**
 * Message legacy decoder (0x07 for contact, 0x08 for channel)
 */
export function decodeMessageLegacy(frame: Uint8Array) {
  const code = frame[0];
  if (
    code !== ResponseCode.CONTACT_MSG_RECV &&
    code !== ResponseCode.CHANNEL_MSG_RECV
  ) {
    throw new Error('Invalid response code for MessageLegacy');
  }

  const isContact = code === ResponseCode.CONTACT_MSG_RECV;

  let offset = 1;

  const pubkeyPrefix = isContact ? readBytes(frame, offset, 6) : undefined;
  const channelIdx = !isContact ? frame[offset] : undefined;

  offset += isContact ? 6 : 1;

  const pathLen = frame[offset++];
  const txtType = frame[offset++];
  const timestamp = readUInt32LE(frame, offset);
  offset += 4;

  // Check if signed (extra 4-byte prefix)
  let extraPrefix: Uint8Array | undefined;
  if (offset < frame.length && frame[offset] !== 0) {
    extraPrefix = readBytes(frame, offset, 4);
    offset += 4;
  }

  const text = new TextDecoder().decode(frame.slice(offset));

  return {
    code,
    ...(isContact && { pubkeyPrefix }),
    ...(!isContact && { channelIdx }),
    pathLen,
    txtType,
    timestamp,
    extraPrefix,
    text,
  };
}

/**
 * Raw data push decoder (0x84)
 */
export function decodeRawDataPush(frame: Uint8Array) {
  if (frame[0] !== PushCode.RAW_DATA) {
    throw new Error('Invalid code for RawDataPush');
  }

  return {
    code: PushCode.RAW_DATA,
    snrX4: readInt8(frame, 1),
    rssi: readInt8(frame, 2),
    payload: readBytes(frame, 3, frame.length - 3),
  };
}

/**
 * Control data push decoder (0x8E)
 */
export function decodeControlDataPush(frame: Uint8Array) {
  if (frame[0] !== PushCode.CONTROL_DATA) {
    throw new Error('Invalid code for ControlDataPush');
  }

  const snrX4 = readInt8(frame, 1);
  const rssi = readInt8(frame, 2);
  const pathLen = frame[3];
  const payload = readBytes(frame, 4, frame.length - 4);

  return {
    code: PushCode.CONTROL_DATA,
    snrX4,
    rssi,
    pathLen,
    payload,
  };
}

/**
 * Validate frame size and return true if valid
 */
export function isValidFrameSize(size: number): boolean {
  return size > 0 && size <= MAX_FRAME_SIZE;
}
