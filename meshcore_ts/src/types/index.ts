/**
 * MeshCore BLE Protocol Type Definitions
 * Extracted from firmware source: examples/companion_radio/MyMesh.cpp
 */

// ============================================================================
// Command Codes (0x01-0x3D)
// ============================================================================

export enum CommandCode {
  APP_START = 0x01,
  SEND_TXT_MSG = 0x02,
  SEND_CHANNEL_TXT_MSG = 0x03,
  GET_CONTACTS = 0x04,
  GET_DEVICE_TIME = 0x05,
  SET_DEVICE_TIME = 0x06,
  SEND_SELF_ADVERT = 0x07,
  SET_ADVERT_NAME = 0x08,
  ADD_UPDATE_CONTACT = 0x09,
  SYNC_NEXT_MESSAGE = 0x0a,
  SET_RADIO_PARAMS = 0x0b,
  SET_RADIO_TX_POWER = 0x0c,
  RESET_PATH = 0x0d,
  SET_ADVERT_LATLON = 0x0e,
  REMOVE_CONTACT = 0x0f,
  SHARE_CONTACT = 0x10,
  EXPORT_CONTACT = 0x11,
  IMPORT_CONTACT = 0x12,
  REBOOT = 0x13,
  GET_BATT_AND_STORAGE = 0x14,
  SET_TUNING_PARAMS = 0x15,
  DEVICE_QUERY = 0x16,
  EXPORT_PRIVATE_KEY = 0x17,
  IMPORT_PRIVATE_KEY = 0x18,
  SEND_RAW_DATA = 0x19,
  SEND_LOGIN = 0x1a,
  SEND_STATUS_REQ = 0x1b,
  HAS_CONNECTION = 0x1c,
  LOGOUT = 0x1d,
  GET_CONTACT_BY_KEY = 0x1e,
  GET_CHANNEL = 0x1f,
  SET_CHANNEL = 0x20,
  SIGN_START = 0x21,
  SIGN_DATA = 0x22,
  SIGN_FINISH = 0x23,
  SEND_TRACE_PATH = 0x24,
  SET_DEVICE_PIN = 0x25,
  SET_OTHER_PARAMS = 0x26,
  SEND_TELEMETRY_REQ = 0x27,
  GET_CUSTOM_VARS = 0x28,
  SET_CUSTOM_VAR = 0x29,
  GET_ADVERT_PATH = 0x2a,
  GET_TUNING_PARAMS = 0x2b,
  SEND_BINARY_REQ = 0x32,
  FACTORY_RESET = 0x33,
  SEND_PATH_DISCOVERY_REQ = 0x34,
  SET_FLOOD_SCOPE = 0x36,
  SEND_CONTROL_DATA = 0x37,
  GET_STATS = 0x38,
  SEND_ANON_REQ = 0x39,
  SET_AUTOADD_CONFIG = 0x3a,
  GET_AUTOADD_CONFIG = 0x3b,
  GET_ALLOWED_REPEAT_FREQ = 0x3c,
  SET_PATH_HASH_MODE = 0x3d,
}

// ============================================================================
// Response Codes (0x00-0x1A)
// ============================================================================

export enum ResponseCode {
  OK = 0x00,
  ERR = 0x01,
  CONTACTS_START = 0x02,
  CONTACT = 0x03,
  END_OF_CONTACTS = 0x04,
  SELF_INFO = 0x05,
  SENT = 0x06,
  CONTACT_MSG_RECV = 0x07,
  CHANNEL_MSG_RECV = 0x08,
  CURR_TIME = 0x09,
  NO_MORE_MESSAGES = 0x0a,
  EXPORT_CONTACT = 0x0b,
  BATT_AND_STORAGE = 0x0c,
  DEVICE_INFO = 0x0d,
  PRIVATE_KEY = 0x0e,
  DISABLED = 0x0f,
  CONTACT_MSG_RECV_V3 = 0x10,
  CHANNEL_MSG_RECV_V3 = 0x11,
  CHANNEL_INFO = 0x12,
  SIGN_START = 0x13,
  SIGNATURE = 0x14,
  CUSTOM_VARS = 0x15,
  ADVERT_PATH = 0x16,
  TUNING_PARAMS = 0x17,
  STATS = 0x18,
  AUTOADD_CONFIG = 0x19,
  ALLOWED_REPEAT_FREQ = 0x1a,
}

// ============================================================================
// Push Codes (0x80-0x90)
// ============================================================================

export enum PushCode {
  ADVERT = 0x80,
  PATH_UPDATED = 0x81,
  SEND_CONFIRMED = 0x82,
  MSG_WAITING = 0x83,
  RAW_DATA = 0x84,
  LOGIN_SUCCESS = 0x85,
  LOGIN_FAIL = 0x86,
  STATUS_RESPONSE = 0x87,
  LOG_RX_DATA = 0x88,
  TRACE_DATA = 0x89,
  NEW_ADVERT = 0x8a,
  TELEMETRY_RESPONSE = 0x8b,
  BINARY_RESPONSE = 0x8c,
  PATH_DISCOVERY_RESPONSE = 0x8d,
  CONTROL_DATA = 0x8e,
  CONTACT_DELETED = 0x8f,
  CONTACTS_FULL = 0x90,
}

// ============================================================================
// Error Codes (returned in RESP_CODE_ERR byte 1)
// ============================================================================

export enum ErrorCode {
  UNSUPPORTED_COMMAND = 0x01,
  NOT_FOUND = 0x02,
  TABLE_FULL = 0x03,
  BAD_STATE = 0x04,
  FILE_IO_ERROR = 0x05,
  ILLEGAL_ARGUMENT = 0x06,
}

// ============================================================================
// BLE Service UUIDs
// ============================================================================

export const BLE_UUIDS = {
  SERVICE: '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
  RX_CHARACTERISTIC: '6E400002-B5A3-F393-E0A9-E50E24DCCA9E', // App writes here
  TX_CHARACTERISTIC: '6E400003-B5A3-F393-E0A9-E50E24DCCA9E', // Device notifies here
} as const;

export const MAX_FRAME_SIZE = 172;
export const PROTOCOL_VERSION = 3; // Latest supported

// ============================================================================
// Data Structure Types
// ============================================================================

/**
 * Contact record schema (148 bytes total when serialized)
 * Used by: RESP_CODE_CONTACT, PUSH_CODE_NEW_ADVERT
 */
export interface Contact {
  code: ResponseCode.CONTACT | PushCode.NEW_ADVERT;
  publicKey: Uint8Array; // 32 bytes
  type: number;
  flags: number;
  outPathLen: number;
  outPath: Uint8Array; // 64 bytes
  name: string; // 32 bytes, zero-padded
  lastAdvertTimestamp: number; // uint32
  gpsLatE6: number; // int32
  gpsLonE6: number; // int32
  lastMod: number; // uint32
}

/**
 * Self info schema (58+ bytes)
 * Used by: RESP_CODE_SELF_INFO
 */
export interface SelfInfo {
  code: ResponseCode.SELF_INFO;
  advertType: number;
  currentTxPower: number;
  maxTxPower: number;
  publicKey: Uint8Array; // 32 bytes
  latitudeE6: number; // int32
  longitudeE6: number; // int32
  multiAcks: boolean;
  advertLocPolicy: number;
  telemetryMode: number;
  manualAddContacts: boolean;
  radioFrequencyHz: number; // uint32
  radioBandwidthHz: number; // uint32
  radioSF: number;
  radioCR: number;
  nodeName: string; // UTF-8
}

/**
 * Device info schema (82+ bytes)
 * Used by: RESP_CODE_DEVICE_INFO
 */
export interface DeviceInfo {
  code: ResponseCode.DEVICE_INFO;
  firmwareProtocolVersion: number;
  maxContactsRaw: number; // actual max = value * 2
  maxChannels: number;
  blePIN: number; // uint32
  buildString: string; // 12 bytes
  modelString: string; // 40 bytes
  versionString: string; // 20 bytes
  clientRepeatEnabled: boolean;
  pathHashMode: number;
}

/**
 * Battery and storage info
 * Used by: RESP_CODE_BATT_AND_STORAGE
 */
export interface BatteryAndStorage {
  code: ResponseCode.BATT_AND_STORAGE;
  millivolts: number; // uint16
  usedKb: number; // uint32
  totalKb: number; // uint32
}

/**
 * Channel info schema
 * Used by: RESP_CODE_CHANNEL_INFO
 */
export interface ChannelInfo {
  code: ResponseCode.CHANNEL_INFO;
  channelIdx: number;
  name: string; // 32 bytes
  secret: Uint8Array; // 16 bytes
}

/**
 * Message V3 (with SNR header)
 */
export interface MessageV3 {
  code: ResponseCode.CONTACT_MSG_RECV_V3 | ResponseCode.CHANNEL_MSG_RECV_V3;
  snrX4: number; // int8
  reserved0: number;
  reserved1: number;
  pubkeyPrefix?: Uint8Array; // 6 bytes (contact messages)
  channelIdx?: number; // (channel messages)
  pathLen: number;
  txtType: number;
  timestamp: number; // uint32
  extraPrefix?: Uint8Array; // 4 bytes (signed messages)
  text: string;
}

/**
 * Message legacy (without SNR header)
 */
export interface MessageLegacy {
  code: ResponseCode.CONTACT_MSG_RECV | ResponseCode.CHANNEL_MSG_RECV;
  pubkeyPrefix?: Uint8Array; // 6 bytes (contact messages)
  channelIdx?: number; // (channel messages)
  pathLen: number;
  txtType: number;
  timestamp: number; // uint32
  extraPrefix?: Uint8Array; // 4 bytes (signed messages)
  text: string;
}

export type Message = MessageV3 | MessageLegacy;

/**
 * Generic response frame
 */
export interface ResponseFrame {
  code: ResponseCode | PushCode;
  payload: Uint8Array;
}

/**
 * Sent confirmation frame
 */
export interface SentConfirmation {
  code: ResponseCode.SENT;
  routeFlag: number;
  tagOrAck: number; // uint32
  estTimeoutMs: number; // uint32
}

/**
 * Raw data push
 */
export interface RawDataPush {
  code: PushCode.RAW_DATA;
  snrX4: number; // int8
  rssi: number; // int8
  payload: Uint8Array;
}

/**
 * Control data push
 */
export interface ControlDataPush {
  code: PushCode.CONTROL_DATA;
  snrX4: number; // int8
  rssi: number; // int8
  pathLen: number;
  payload: Uint8Array;
}
