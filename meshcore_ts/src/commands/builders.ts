/**
 * Command builders for MeshCore BLE protocol
 * Construct command frames to send to device
 */

import { CommandCode, MAX_FRAME_SIZE } from '../types';
import {
  writeUInt32LE,
  writeInt32LE,
  writeFixedString,
  writeBytes,
  writeInt8,
  writeUInt16LE,
} from '../codecs/types';

class CommandBuffer {
  private buffer: Uint8Array;
  private offset: number;

  constructor(capacity = MAX_FRAME_SIZE) {
    this.buffer = new Uint8Array(capacity);
    this.offset = 0;
  }

  writeByte(value: number): this {
    this.buffer[this.offset++] = value & 0xff;
    return this;
  }

  writeInt8(value: number): this {
    writeInt8(this.buffer, this.offset, value);
    this.offset += 1;
    return this;
  }

  writeUInt16LE(value: number): this {
    writeUInt16LE(this.buffer, this.offset, value);
    this.offset += 2;
    return this;
  }

  writeUInt32LE(value: number): this {
    writeUInt32LE(this.buffer, this.offset, value);
    this.offset += 4;
    return this;
  }

  writeInt32LE(value: number): this {
    writeInt32LE(this.buffer, this.offset, value);
    this.offset += 4;
    return this;
  }

  writeBytes(data: Uint8Array | number[]): this {
    writeBytes(this.buffer, this.offset, data);
    this.offset += data.length;
    return this;
  }

  writeFixedString(value: string, maxLen: number): this {
    writeFixedString(this.buffer, this.offset, value, maxLen);
    this.offset += maxLen;
    return this;
  }

  writeString(value: string): this {
    const encoded = new TextEncoder().encode(value);
    this.writeBytes(encoded);
    return this;
  }

  writeReserved(count: number): this {
    for (let i = 0; i < count; i++) {
      this.writeByte(0);
    }
    return this;
  }

  getBuffer(): Uint8Array {
    return this.buffer.slice(0, this.offset);
  }

  private validateSize(): void {
    if (this.offset > MAX_FRAME_SIZE) {
      throw new Error(
        `Command buffer overflow: ${this.offset} > ${MAX_FRAME_SIZE}`
      );
    }
  }
}

// ============================================================================
// Command Builders
// ============================================================================

export const Commands = {
  /**
   * CMD_APP_START (0x01)
   * Initialize companion app communication
   */
  appStart(appName?: string): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.APP_START);
    cmd.writeReserved(7);
    if (appName) {
      cmd.writeString(appName);
    }
    return cmd.getBuffer();
  },

  /**
   * CMD_DEVICE_QUERY (0x16)
   * Query device capabilities and protocol version
   */
  deviceQuery(appProtocolVersion = 3): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.DEVICE_QUERY);
    cmd.writeByte(appProtocolVersion);
    return cmd.getBuffer();
  },

  /**
   * CMD_GET_DEVICE_TIME (0x05)
   * Get current device time
   */
  getDeviceTime(): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.GET_DEVICE_TIME);
    return cmd.getBuffer();
  },

  /**
   * CMD_SET_DEVICE_TIME (0x06)
   * Set device time (unix seconds)
   */
  setDeviceTime(unixSecs: number): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.SET_DEVICE_TIME);
    cmd.writeUInt32LE(unixSecs);
    return cmd.getBuffer();
  },

  /**
   * CMD_GET_CONTACTS (0x04)
   * Fetch all contacts or contacts modified since timestamp
   */
  getContacts(since?: number): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.GET_CONTACTS);
    if (since !== undefined) {
      cmd.writeUInt32LE(since);
    }
    return cmd.getBuffer();
  },

  /**
   * CMD_GET_CONTACT_BY_KEY (0x1E)
   * Fetch single contact by public key
   */
  getContactByKey(publicKey: Uint8Array): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.GET_CONTACT_BY_KEY);
    cmd.writeBytes(publicKey);
    return cmd.getBuffer();
  },

  /**
   * CMD_SYNC_NEXT_MESSAGE (0x0A)
   * Get next queued message
   */
  syncNextMessage(): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.SYNC_NEXT_MESSAGE);
    return cmd.getBuffer();
  },

  /**
   * CMD_SEND_TXT_MSG (0x02)
   * Send text message to contact
   */
  sendTxtMsg(
    txtType: number,
    attempt: number,
    timestamp: number,
    pubkeyPrefix: Uint8Array,
    text: string
  ): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.SEND_TXT_MSG);
    cmd.writeByte(txtType);
    cmd.writeByte(attempt);
    cmd.writeUInt32LE(timestamp);
    cmd.writeBytes(pubkeyPrefix);
    cmd.writeString(text);
    return cmd.getBuffer();
  },

  /**
   * CMD_SEND_CHANNEL_TXT_MSG (0x03)
   * Send text message to channel
   */
  sendChannelTxtMsg(
    txtType: number,
    channelIdx: number,
    timestamp: number,
    text: string
  ): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.SEND_CHANNEL_TXT_MSG);
    cmd.writeByte(txtType);
    cmd.writeByte(channelIdx);
    cmd.writeUInt32LE(timestamp);
    cmd.writeString(text);
    return cmd.getBuffer();
  },

  /**
   * CMD_SET_ADVERT_NAME (0x08)
   * Set device advertisement name
   */
  setAdvertName(name: string): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.SET_ADVERT_NAME);
    cmd.writeString(name);
    return cmd.getBuffer();
  },

  /**
   * CMD_SET_ADVERT_LATLON (0x0E)
   * Set device advertisement location
   */
  setAdvertLatLon(
    latE6: number,
    lonE6: number,
    altM?: number
  ): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.SET_ADVERT_LATLON);
    cmd.writeInt32LE(latE6);
    cmd.writeInt32LE(lonE6);
    if (altM !== undefined) {
      cmd.writeInt32LE(altM);
    }
    return cmd.getBuffer();
  },

  /**
   * CMD_SET_RADIO_PARAMS (0x0B)
   * Configure radio parameters
   */
  setRadioParams(
    freqHz: number,
    bwHz: number,
    sf: number,
    cr: number,
    repeat?: boolean
  ): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.SET_RADIO_PARAMS);
    cmd.writeUInt32LE(freqHz);
    cmd.writeUInt32LE(bwHz);
    cmd.writeByte(sf);
    cmd.writeByte(cr);
    if (repeat !== undefined) {
      cmd.writeByte(repeat ? 1 : 0);
    }
    return cmd.getBuffer();
  },

  /**
   * CMD_SET_RADIO_TX_POWER (0x0C)
   * Set radio TX power in dBm
   */
  setRadioTxPower(dbm: number): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.SET_RADIO_TX_POWER);
    cmd.writeInt8(dbm);
    return cmd.getBuffer();
  },

  /**
   * CMD_RESET_PATH (0x0D)
   * Reset path for contact
   */
  resetPath(publicKey: Uint8Array): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.RESET_PATH);
    cmd.writeBytes(publicKey);
    return cmd.getBuffer();
  },

  /**
   * CMD_REMOVE_CONTACT (0x0F)
   * Delete contact by public key
   */
  removeContact(publicKey: Uint8Array): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.REMOVE_CONTACT);
    cmd.writeBytes(publicKey);
    return cmd.getBuffer();
  },

  /**
   * CMD_GET_BATT_AND_STORAGE (0x14)
   * Query battery voltage and storage usage
   */
  getBattAndStorage(): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.GET_BATT_AND_STORAGE);
    return cmd.getBuffer();
  },

  /**
   * CMD_GET_CHANNEL (0x1F)
   * Get channel info by index
   */
  getChannel(channelIdx: number): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.GET_CHANNEL);
    cmd.writeByte(channelIdx);
    return cmd.getBuffer();
  },

  /**
   * CMD_SET_CHANNEL (0x20)
   * Create or update channel (16-byte secret)
   */
  setChannel(
    idx: number,
    name: string,
    secret: Uint8Array // must be 16 bytes
  ): Uint8Array {
    if (secret.length !== 16) {
      throw new Error('Channel secret must be 16 bytes');
    }
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.SET_CHANNEL);
    cmd.writeByte(idx);
    cmd.writeFixedString(name, 32);
    cmd.writeBytes(secret);
    return cmd.getBuffer();
  },

  /**
   * CMD_SET_DEVICE_PIN (0x25)
   * Set BLE pairing PIN (0 or 6-digit)
   */
  setDevicePin(pin: number): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.SET_DEVICE_PIN);
    cmd.writeUInt32LE(pin);
    return cmd.getBuffer();
  },

  /**
   * CMD_SEND_SELF_ADVERT (0x07)
   * Broadcast self advertisement
   */
  sendSelfAdvert(mode?: 'flood' | 'normal'): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.SEND_SELF_ADVERT);
    if (mode === 'flood') {
      cmd.writeByte(1);
    }
    return cmd.getBuffer();
  },

  /**
   * CMD_SEND_RAW_DATA (0x19)
   * Send raw data with path
   */
  sendRawData(path: Uint8Array, payload: Uint8Array): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.SEND_RAW_DATA);
    cmd.writeByte(path.length);
    cmd.writeBytes(path);
    cmd.writeBytes(payload);
    return cmd.getBuffer();
  },

  /**
   * CMD_SEND_BINARY_REQ (0x32)
   * Send binary request to contact
   */
  sendBinaryReq(publicKey: Uint8Array, payload: Uint8Array): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.SEND_BINARY_REQ);
    cmd.writeBytes(publicKey);
    cmd.writeBytes(payload);
    return cmd.getBuffer();
  },

  /**
   * CMD_GET_CUSTOM_VARS (0x28)
   * Get all custom variables
   */
  getCustomVars(): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.GET_CUSTOM_VARS);
    return cmd.getBuffer();
  },

  /**
   * CMD_SET_CUSTOM_VAR (0x29)
   * Set custom variable (key:value format)
   */
  setCustomVar(key: string, value: string): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.SET_CUSTOM_VAR);
    cmd.writeString(`${key}:${value}`);
    return cmd.getBuffer();
  },

  /**
   * CMD_REBOOT (0x13)
   * Reboot device
   */
  reboot(): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.REBOOT);
    cmd.writeString('reboot');
    return cmd.getBuffer();
  },

  /**
   * CMD_FACTORY_RESET (0x33)
   * Factory reset device
   */
  factoryReset(): Uint8Array {
    const cmd = new CommandBuffer();
    cmd.writeByte(CommandCode.FACTORY_RESET);
    cmd.writeString('reset');
    return cmd.getBuffer();
  },
};
