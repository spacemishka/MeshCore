# Bluetooth Data Endpoints (App API)

- Last Updated: 2026-03-19
- Firmware Scope: Companion Radio firmware (protocol used over BLE)
- Source of truth: `examples/companion_radio/MyMesh.cpp` command handler and BLE serial interfaces

This document describes every data endpoint currently exposed to an app over Bluetooth, including:

- GATT service/characteristics
- App -> Device command frames
- Device -> App response and push frames
- Binary field layouts so an app can parse and build packets reliably

All multi-byte integers are little-endian unless noted.

## 1. BLE Transport Endpoints

MeshCore uses Nordic UART style BLE transport:

- Service UUID: `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
- RX characteristic (app writes): `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`
- TX characteristic (device notifies): `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`

Security and framing notes:

- Pairing is MITM protected with PIN.
- Maximum protocol frame size is 172 bytes.
- Each BLE write is handled as one protocol frame.
- Each TX notification from firmware is one protocol frame.

## 2. Frame Model

Each frame starts with a 1-byte code.

- App -> Device: first byte = command code
- Device -> App sync response: first byte = response code
- Device -> App async event: first byte = push code (0x80+)

General pattern:

1. App writes one command frame.
2. Firmware replies with one or more response frames.
3. Firmware may emit push frames at any time.

## 3. App -> Device Command Endpoints

Status meanings:

- Implemented: command is accepted and handled.
- Partial: command exists with constraints/legacy behavior.
- Unsupported: command code exists but returns error.

| Code | Name | Status | Request Payload | Typical Reply |
|---|---|---|---|---|
| 0x01 | CMD_APP_START | Implemented | `[cmd][7 reserved][app_name?]` | `RESP_CODE_SELF_INFO` |
| 0x02 | CMD_SEND_TXT_MSG | Implemented | `[cmd][txt_type][attempt][ts:4][pubkey_prefix:6][text]` | `RESP_CODE_SENT` or `RESP_CODE_ERR` |
| 0x03 | CMD_SEND_CHANNEL_TXT_MSG | Implemented | `[cmd][txt_type][channel_idx][ts:4][text]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x04 | CMD_GET_CONTACTS | Implemented | `[cmd]` or `[cmd][since:4]` | `RESP_CODE_CONTACTS_START`, repeated `RESP_CODE_CONTACT`, then `RESP_CODE_END_OF_CONTACTS` |
| 0x05 | CMD_GET_DEVICE_TIME | Implemented | `[cmd]` | `RESP_CODE_CURR_TIME` |
| 0x06 | CMD_SET_DEVICE_TIME | Implemented | `[cmd][unix_secs:4]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x07 | CMD_SEND_SELF_ADVERT | Implemented | `[cmd]` or `[cmd][mode]` (`1=flood`) | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x08 | CMD_SET_ADVERT_NAME | Implemented | `[cmd][utf8_name]` | `RESP_CODE_OK` |
| 0x09 | CMD_ADD_UPDATE_CONTACT | Implemented | contact record frame (see Contact schema below) | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x0A | CMD_SYNC_NEXT_MESSAGE | Implemented | `[cmd]` | queued message (`RESP_CODE_*_MSG_RECV*`) or `RESP_CODE_NO_MORE_MESSAGES` |
| 0x0B | CMD_SET_RADIO_PARAMS | Implemented | `[cmd][freq_hz:4][bw_hz:4][sf:1][cr:1][repeat?:1]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x0C | CMD_SET_RADIO_TX_POWER | Implemented | `[cmd][tx_dbm:int8]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x0D | CMD_RESET_PATH | Implemented | `[cmd][pubkey:32]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x0E | CMD_SET_ADVERT_LATLON | Implemented | `[cmd][lat_e6:int32][lon_e6:int32][alt?:int32]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x0F | CMD_REMOVE_CONTACT | Implemented | `[cmd][pubkey:32]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x10 | CMD_SHARE_CONTACT | Implemented | `[cmd][pubkey:32]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x11 | CMD_EXPORT_CONTACT | Implemented | `[cmd]` (self) or `[cmd][pubkey:32]` | `RESP_CODE_EXPORT_CONTACT` |
| 0x12 | CMD_IMPORT_CONTACT | Implemented | `[cmd][serialized_contact_blob...]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x13 | CMD_REBOOT | Implemented | `[cmd]["reboot"]` | Reboots (no guaranteed final frame) |
| 0x14 | CMD_GET_BATT_AND_STORAGE | Implemented | `[cmd]` | `RESP_CODE_BATT_AND_STORAGE` |
| 0x15 | CMD_SET_TUNING_PARAMS | Implemented | `[cmd][rx_delay_x1000:4][airtime_factor_x1000:4]` | `RESP_CODE_OK` |
| 0x16 | CMD_DEVICE_QEURY | Implemented | `[cmd][app_protocol_ver]` | `RESP_CODE_DEVICE_INFO` |
| 0x17 | CMD_EXPORT_PRIVATE_KEY | Partial | `[cmd]` | `RESP_CODE_PRIVATE_KEY` or `RESP_CODE_DISABLED` |
| 0x18 | CMD_IMPORT_PRIVATE_KEY | Partial | `[cmd][keypair_blob:64]` | `RESP_CODE_OK` / `RESP_CODE_ERR` / `RESP_CODE_DISABLED` |
| 0x19 | CMD_SEND_RAW_DATA | Implemented | `[cmd][path_len:int8][path][payload>=4]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x1A | CMD_SEND_LOGIN | Implemented | `[cmd][pubkey:32][password_utf8]` | `RESP_CODE_SENT` or `RESP_CODE_ERR` |
| 0x1B | CMD_SEND_STATUS_REQ | Implemented | `[cmd][pubkey:32]` | `RESP_CODE_SENT` or `RESP_CODE_ERR` |
| 0x1C | CMD_HAS_CONNECTION | Implemented | `[cmd][pubkey:32]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x1D | CMD_LOGOUT | Implemented | `[cmd][pubkey:32]` | `RESP_CODE_OK` |
| 0x1E | CMD_GET_CONTACT_BY_KEY | Implemented | `[cmd][pubkey:32]` | `RESP_CODE_CONTACT` or `RESP_CODE_ERR` |
| 0x1F | CMD_GET_CHANNEL | Implemented | `[cmd][channel_idx]` | `RESP_CODE_CHANNEL_INFO` or `RESP_CODE_ERR` |
| 0x20 | CMD_SET_CHANNEL | Implemented (16-byte secret) | `[cmd][idx][name:32][secret:16]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x20 | CMD_SET_CHANNEL (32-byte secret) | Unsupported | `[cmd][idx][name:32][secret:32]` | `RESP_CODE_ERR` |
| 0x21 | CMD_SIGN_START | Implemented | `[cmd]` | `RESP_CODE_SIGN_START` |
| 0x22 | CMD_SIGN_DATA | Implemented | `[cmd][chunk...]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x23 | CMD_SIGN_FINISH | Implemented | `[cmd]` | `RESP_CODE_SIGNATURE` or `RESP_CODE_ERR` |
| 0x24 | CMD_SEND_TRACE_PATH | Implemented | `[cmd][tag:4][auth:4][flags:1][path...]` | `RESP_CODE_SENT` or `RESP_CODE_ERR` |
| 0x25 | CMD_SET_DEVICE_PIN | Implemented | `[cmd][pin:4]` (`0` or 6-digit) | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x26 | CMD_SET_OTHER_PARAMS | Implemented | `[cmd][manual_add][telemetry_mode?][adv_loc_policy?][multi_acks?]` | `RESP_CODE_OK` |
| 0x27 | CMD_SEND_TELEMETRY_REQ | Implemented (legacy) | remote: `[cmd][reserved:3][pubkey:32]`; self: 4-byte variant | `RESP_CODE_SENT` or push telemetry |
| 0x28 | CMD_GET_CUSTOM_VARS | Implemented | `[cmd]` | `RESP_CODE_CUSTOM_VARS` |
| 0x29 | CMD_SET_CUSTOM_VAR | Implemented | `[cmd]["name:value"]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x2A | CMD_GET_ADVERT_PATH | Implemented | `[cmd][reserved][pubkey_prefix:6]` | `RESP_CODE_ADVERT_PATH` or `RESP_CODE_ERR` |
| 0x2B | CMD_GET_TUNING_PARAMS | Implemented | `[cmd]` | `RESP_CODE_TUNING_PARAMS` |
| 0x32 | CMD_SEND_BINARY_REQ | Implemented | `[cmd][pubkey:32][request_payload...]` | `RESP_CODE_SENT` or `RESP_CODE_ERR` |
| 0x33 | CMD_FACTORY_RESET | Implemented | `[cmd]["reset"]` | `RESP_CODE_OK` then reboot, or `RESP_CODE_ERR` |
| 0x34 | CMD_SEND_PATH_DISCOVERY_REQ | Implemented | `[cmd][reserved=0][pubkey:32]` | `RESP_CODE_SENT` or `RESP_CODE_ERR` |
| 0x36 | CMD_SET_FLOOD_SCOPE | Implemented | `[cmd][reserved=0][transport_key?:16]` | `RESP_CODE_OK` |
| 0x37 | CMD_SEND_CONTROL_DATA | Implemented | `[cmd][control_first_byte_with_0x80_set][payload...]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |
| 0x38 | CMD_GET_STATS | Implemented | `[cmd][stats_type]` | `RESP_CODE_STATS` or `RESP_CODE_ERR` |
| 0x39 | CMD_SEND_ANON_REQ | Implemented | `[cmd][pubkey:32][payload...]` | `RESP_CODE_SENT` or `RESP_CODE_ERR` |
| 0x3A | CMD_SET_AUTOADD_CONFIG | Implemented | `[cmd][config_bits][max_hops?]` | `RESP_CODE_OK` |
| 0x3B | CMD_GET_AUTOADD_CONFIG | Implemented | `[cmd]` | `RESP_CODE_AUTOADD_CONFIG` |
| 0x3C | CMD_GET_ALLOWED_REPEAT_FREQ | Implemented | `[cmd]` | `RESP_ALLOWED_REPEAT_FREQ` |
| 0x3D | CMD_SET_PATH_HASH_MODE | Implemented | `[cmd][reserved=0][mode(0..2)]` | `RESP_CODE_OK` or `RESP_CODE_ERR` |

Reserved/unhandled command IDs:

- 0x2C..0x31 are parked (future use)
- 0x35 is currently unused

## 4. Device -> App Response Endpoints

| Code | Name | Payload |
|---|---|---|
| 0x00 | RESP_CODE_OK | `[code]` |
| 0x01 | RESP_CODE_ERR | `[code][err_code]` |
| 0x02 | RESP_CODE_CONTACTS_START | `[code][total_contacts:4]` |
| 0x03 | RESP_CODE_CONTACT | full contact record (see Contact schema) |
| 0x04 | RESP_CODE_END_OF_CONTACTS | `[code][most_recent_lastmod:4]` |
| 0x05 | RESP_CODE_SELF_INFO | node info (see Self Info schema) |
| 0x06 | RESP_CODE_SENT | `[code][route_flag][tag_or_ack:4][est_timeout_ms:4]` |
| 0x07 | RESP_CODE_CONTACT_MSG_RECV | contact message (legacy) |
| 0x08 | RESP_CODE_CHANNEL_MSG_RECV | channel message (legacy) |
| 0x09 | RESP_CODE_CURR_TIME | `[code][unix_secs:4]` |
| 0x0A | RESP_CODE_NO_MORE_MESSAGES | `[code]` |
| 0x0B | RESP_CODE_EXPORT_CONTACT | exported contact blob |
| 0x0C | RESP_CODE_BATT_AND_STORAGE | `[code][mv:2][used_kb:4][total_kb:4]` |
| 0x0D | RESP_CODE_DEVICE_INFO | device info (see Device Info schema) |
| 0x0E | RESP_CODE_PRIVATE_KEY | `[code][identity_blob:64]` |
| 0x0F | RESP_CODE_DISABLED | `[code]` |
| 0x10 | RESP_CODE_CONTACT_MSG_RECV_V3 | contact message (with SNR header) |
| 0x11 | RESP_CODE_CHANNEL_MSG_RECV_V3 | channel message (with SNR header) |
| 0x12 | RESP_CODE_CHANNEL_INFO | `[code][channel_idx][name:32][secret:16]` |
| 0x13 | RESP_CODE_SIGN_START | `[code][reserved][max_len:4]` |
| 0x14 | RESP_CODE_SIGNATURE | `[code][signature:64]` |
| 0x15 | RESP_CODE_CUSTOM_VARS | `[code][csv_utf8 "k:v,k:v,..."]` |
| 0x16 | RESP_CODE_ADVERT_PATH | `[code][recv_ts:4][path_len][path_bytes...]` |
| 0x17 | RESP_CODE_TUNING_PARAMS | `[code][rx_delay_x1000:4][airtime_factor_x1000:4]` |
| 0x18 | RESP_CODE_STATS | `[code][stats_type][stats_payload...]` |
| 0x19 | RESP_CODE_AUTOADD_CONFIG | `[code][config_bits][max_hops]` |
| 0x1A | RESP_ALLOWED_REPEAT_FREQ | `[code][lower_hz:4][upper_hz:4]...` |

### Error Codes (`RESP_CODE_ERR` byte 1)

- 0x01: unsupported command
- 0x02: not found
- 0x03: table full
- 0x04: bad state
- 0x05: file I/O error
- 0x06: illegal argument

## 5. Device -> App Push Endpoints (Async)

These can arrive without a pending request.

| Code | Name | Payload |
|---|---|---|
| 0x80 | PUSH_CODE_ADVERT | `[code][pubkey:32]` |
| 0x81 | PUSH_CODE_PATH_UPDATED | `[code][pubkey:32]` |
| 0x82 | PUSH_CODE_SEND_CONFIRMED | `[code][ack:4][trip_time_ms:4]` |
| 0x83 | PUSH_CODE_MSG_WAITING | `[code]` |
| 0x84 | PUSH_CODE_RAW_DATA | `[code][snr_x4:int8][rssi:int8][reserved][payload...]` |
| 0x85 | PUSH_CODE_LOGIN_SUCCESS | variable (legacy/new format) |
| 0x86 | PUSH_CODE_LOGIN_FAIL | `[code][reserved][pubkey_prefix:6]` |
| 0x87 | PUSH_CODE_STATUS_RESPONSE | `[code][reserved][pubkey_prefix:6][status_payload...]` |
| 0x88 | PUSH_CODE_LOG_RX_DATA | implementation-specific log payload |
| 0x89 | PUSH_CODE_TRACE_DATA | trace payload with tag/auth/path hashes/snr trail |
| 0x8A | PUSH_CODE_NEW_ADVERT | full contact record (same schema as RESP_CODE_CONTACT) |
| 0x8B | PUSH_CODE_TELEMETRY_RESPONSE | `[code][reserved][pubkey_prefix:6][telemetry_blob...]` |
| 0x8C | PUSH_CODE_BINARY_RESPONSE | `[code][reserved][tag:4][binary_payload...]` |
| 0x8D | PUSH_CODE_PATH_DISCOVERY_RESPONSE | `[code][reserved][pubkey_prefix:6][out_path_len][out_path][in_path_len][in_path]` |
| 0x8E | PUSH_CODE_CONTROL_DATA | `[code][snr_x4:int8][rssi:int8][path_len][payload...]` |
| 0x8F | PUSH_CODE_CONTACT_DELETED | `[code][pubkey:32]` |
| 0x90 | PUSH_CODE_CONTACTS_FULL | `[code]` |

## 6. Binary Schemas

### Contact record schema (responses and pushes)

Used by:

- `RESP_CODE_CONTACT`
- `PUSH_CODE_NEW_ADVERT`

Layout:

- Byte 0: code
- Bytes 1-32: public key (32)
- Byte 33: type
- Byte 34: flags
- Byte 35: out_path_len
- Bytes 36-99: out_path (64)
- Bytes 100-131: name (32, zero-padded)
- Bytes 132-135: last_advert_timestamp
- Bytes 136-139: gps_lat_e6
- Bytes 140-143: gps_lon_e6
- Bytes 144-147: lastmod

### Self info schema (`RESP_CODE_SELF_INFO`)

- Byte 0: code (0x05)
- Byte 1: advert type
- Byte 2: current TX power
- Byte 3: max TX power
- Bytes 4-35: self public key
- Bytes 36-39: latitude e6
- Bytes 40-43: longitude e6
- Byte 44: multi_acks
- Byte 45: advert_loc_policy
- Byte 46: telemetry mode bitfield
- Byte 47: manual_add_contacts
- Bytes 48-51: radio frequency in Hz
- Bytes 52-55: radio bandwidth in Hz
- Byte 56: radio SF
- Byte 57: radio CR
- Bytes 58..N: node name UTF-8

### Device info schema (`RESP_CODE_DEVICE_INFO`)

- Byte 0: code (0x0D)
- Byte 1: firmware protocol version (`FIRMWARE_VER_CODE`)
- Byte 2: max contacts raw (`max_contacts = value * 2`)
- Byte 3: max channels
- Bytes 4-7: BLE PIN
- Bytes 8-19: firmware build string (12)
- Bytes 20-59: model/manufacturer string (40)
- Bytes 60-79: firmware semantic version string (20)
- Byte 80: client repeat enabled/preferred
- Byte 81: path hash mode

### Message schemas

Contact message V3 (`RESP_CODE_CONTACT_MSG_RECV_V3`):

- `[code][snr_x4:int8][r0][r1][pubkey_prefix:6][path_len][txt_type][ts:4][extra?][text...]`
- `extra` is present for signed messages (4 bytes sender prefix)

Channel message V3 (`RESP_CODE_CHANNEL_MSG_RECV_V3`):

- `[code][snr_x4:int8][r0][r1][channel_idx][path_len][txt_type][ts:4][text...]`

Legacy variants (`RESP_CODE_CONTACT_MSG_RECV`, `RESP_CODE_CHANNEL_MSG_RECV`) are the same without the 3-byte SNR+reserved header.

## 7. App Implementation Rules

Use this behavior for robust app interoperability:

1. Connect, discover service/chars, subscribe to TX notifications.
2. Send `CMD_APP_START`, then `CMD_DEVICE_QEURY`.
3. Use a single-flight command queue (1 in-flight command at a time).
4. Handle async pushes in parallel with command responses.
5. On `PUSH_CODE_MSG_WAITING`, poll `CMD_SYNC_NEXT_MESSAGE` until `RESP_CODE_NO_MORE_MESSAGES`.
6. Track `RESP_CODE_SENT.tag` and match it to follow-up push responses (`0x8C`, `0x82`, etc.).
7. Enforce max frame size 172 bytes before write.
8. Treat unsupported/disabled endpoints as capability-dependent and feature gate in UI.

## 8. Minimal Startup Sequence (Recommended)

1. `CMD_APP_START`
2. `CMD_DEVICE_QEURY`
3. `CMD_GET_CONTACTS` (full sync)
4. `CMD_GET_CHANNEL` for channel indices used by your app (typically 0..7)
5. `CMD_SYNC_NEXT_MESSAGE` loop until no more messages
6. Start normal app operation with push handling enabled

## 9. Versioning Notes

- Protocol evolves with `FIRMWARE_VER_CODE` returned by `RESP_CODE_DEVICE_INFO`.
- V3 message formats add SNR header (`RESP_CODE_*_MSG_RECV_V3`).
- Some commands are compile-time gated (`CMD_EXPORT_PRIVATE_KEY`, `CMD_IMPORT_PRIVATE_KEY`).
- `CMD_SEND_TELEMETRY_REQ` is legacy; prefer binary request/response patterns where possible.