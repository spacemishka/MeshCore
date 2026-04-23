# Companion Protocol Reference

- **Last Updated**: 2026-04-23
- **Protocol Version**: Companion Firmware v1.12.0+
- **Latest Protocol Version Code**: 3 (with SNR headers for messages)

This document is the **protocol reference guide** for MeshCore companion apps communicating over Bluetooth Low Energy (BLE).

For **detailed endpoint specifications** (command payloads, binary schemas, response formats), see [Bluetooth Data Endpoints](./bluetooth_data_endpoints.md).

For **existing SDK libraries**, see:
- JavaScript: [https://github.com/meshcore-dev/meshcore.js](https://github.com/meshcore-dev/meshcore.js)
- Python: [https://github.com/meshcore-dev/meshcore_py](https://github.com/meshcore-dev/meshcore_py)
- TypeScript: See `meshcore_ts/` folder in this repository

For **example implementations**, see `examples/companion_radio/` in this repository.

## Security Notice

All secrets, hashes, and cryptographic values shown in this guide are example values only.

- All hex values, public keys and hashes are for demonstration purposes only
- Never use example secrets in production
- Always generate new cryptographically secure random secrets
- Please implement proper security practices in your implementation

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [BLE Connection](#ble-connection)
3. [Packet Structure](#packet-structure)
4. [Endpoint Reference Matrix](#endpoint-reference-matrix)
5. [Startup Sequence](#startup-sequence)
6. [Implementation Guidelines](#implementation-guidelines)
7. [Troubleshooting](#troubleshooting)

---

## Quick Reference

| What | Value |
|------|-------|
| Service UUID | `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` |
| RX Characteristic (write) | `6E400002-B5A3-F393-E0A9-E50E24DCCA9E` |
| TX Characteristic (notify) | `6E400003-B5A3-F393-E0A9-E50E24DCCA9E` |
| Max Frame Size | 172 bytes |
| Byte Order | Little-endian (all multi-byte integers) |
| String Encoding | UTF-8 |
| Pairing Security | MITM protected with PIN |
| Command Sequencing | One command in-flight at a time |

---

## BLE Connection

### Service and Characteristics

MeshCore exposes a Nordic UART style BLE service:

- **Service UUID**: `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
- **RX Characteristic** (App → Firmware): `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`
- **TX Characteristic** (Firmware → App): `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`

### Connection Steps

1. **Scan & Connect**: Find device advertising the service UUID, establish BLE connection
2. **Discover**: Find service and both characteristics
3. **Subscribe**: Enable notifications on TX characteristic
4. **Send**: Now ready to send commands via RX characteristic

### Platform-Specific Notes

**Android**:
- Use `BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT` for reliable writes
- Request MTU of 512 bytes if available

**iOS**:
- Use `CBCharacteristicWriteType.withResponse` for reliability
- Check `maximumWriteValueLength` for write sizing

**Python (bleak)**:
- MTU negotiated automatically
- Use `write_gatt_char(char_uuid, data, response=True)`

**JavaScript/Web Bluetooth**:
- MTU typically 512 bytes
- Handle notifications via `characteristic.oncharacteristicvaluechanged`

### MTU and Frame Sizing

- Default BLE MTU is 23 bytes (20 bytes payload)
- Large commands like `SET_CHANNEL` require MTU negotiation
- Always validate frame size ≤ 172 bytes before write
- Android/iOS typically support MTU 512; web browsers vary

### Connection Loss & Reconnection

- MeshCore devices may disconnect after inactivity (typically 5–10 minutes)
- Implement auto-reconnect with exponential backoff
- Use connection state listeners to detect loss

---

## Packet Structure

The protocol uses binary frames with the following structure:

```
[Frame Type (1 byte)] [Data (variable length)]
```

**Frame Types**:
- **Command**: sent from app to firmware (codes 0x01–0x3D)
- **Response**: sent from firmware in reply (codes 0x00–0x1A)
- **Push**: sent asynchronously from firmware (codes 0x80–0x90)

**Byte Order**: All multi-byte integers are **little-endian** unless noted.

**Strings**: Encoded as UTF-8, either null-terminated or fixed-width with null padding.

---

## Endpoint Reference Matrix

This section provides the authoritative listing of all commands, responses, and push codes.

For **complete binary field layouts**, see [Bluetooth Data Endpoints](./bluetooth_data_endpoints.md).

### App → Device Commands (0x01–0x3D)

| Code | Name | Purpose |
|------|------|---------|
| 0x01 | CMD_APP_START | Initialize companion app; identify app name |
| 0x02 | CMD_SEND_TXT_MSG | Send text message to contact |
| 0x03 | CMD_SEND_CHANNEL_TXT_MSG | Send text message to channel |
| 0x04 | CMD_GET_CONTACTS | Fetch all or recently modified contacts |
| 0x05 | CMD_GET_DEVICE_TIME | Get device's current time (unix seconds) |
| 0x06 | CMD_SET_DEVICE_TIME | Set device time |
| 0x07 | CMD_SEND_SELF_ADVERT | Broadcast self advertisement |
| 0x08 | CMD_SET_ADVERT_NAME | Set device's advertised name |
| 0x09 | CMD_ADD_UPDATE_CONTACT | Add or update contact record |
| 0x0A | CMD_SYNC_NEXT_MESSAGE | Fetch next queued message |
| 0x0B | CMD_SET_RADIO_PARAMS | Configure radio frequency/bandwidth/spreading |
| 0x0C | CMD_SET_RADIO_TX_POWER | Set radio transmit power (dBm) |
| 0x0D | CMD_RESET_PATH | Clear routing path for contact |
| 0x0E | CMD_SET_ADVERT_LATLON | Set device's advertised GPS location |
| 0x0F | CMD_REMOVE_CONTACT | Delete contact |
| 0x10 | CMD_SHARE_CONTACT | Share contact with peer |
| 0x11 | CMD_EXPORT_CONTACT | Export contact in serialized format |
| 0x12 | CMD_IMPORT_CONTACT | Import contact from blob |
| 0x13 | CMD_REBOOT | Reboot device |
| 0x14 | CMD_GET_BATT_AND_STORAGE | Query battery voltage and storage |
| 0x15 | CMD_SET_TUNING_PARAMS | Set RX/airtime tuning parameters |
| 0x16 | CMD_DEVICE_QUERY | GET device capabilities and protocol version |
| 0x17 | CMD_EXPORT_PRIVATE_KEY | Export device's private key (if permitted) |
| 0x18 | CMD_IMPORT_PRIVATE_KEY | Import private key (if permitted) |
| 0x19 | CMD_SEND_RAW_DATA | Send raw data with routing path |
| 0x1A | CMD_SEND_LOGIN | Send login request to contact |
| 0x1B | CMD_SEND_STATUS_REQ | Request status from contact |
| 0x1C | CMD_HAS_CONNECTION | Check if path exists to contact |
| 0x1D | CMD_LOGOUT | Log out from contact |
| 0x1E | CMD_GET_CONTACT_BY_KEY | Fetch single contact by public key |
| 0x1F | CMD_GET_CHANNEL | Get channel configuration by index |
| 0x20 | CMD_SET_CHANNEL | Create/update channel (supports 16-byte secret) |
| 0x21 | CMD_SIGN_START | Start signing operation |
| 0x22 | CMD_SIGN_DATA | Feed data chunks to signing |
| 0x23 | CMD_SIGN_FINISH | Complete signing, retrieve signature |
| 0x24 | CMD_SEND_TRACE_PATH | Send path discovery trace |
| 0x25 | CMD_SET_DEVICE_PIN | Set BLE pairing PIN |
| 0x26 | CMD_SET_OTHER_PARAMS | Set misc device parameters |
| 0x27 | CMD_SEND_TELEMETRY_REQ | Request telemetry from contact (legacy) |
| 0x28 | CMD_GET_CUSTOM_VARS | Fetch all custom variables |
| 0x29 | CMD_SET_CUSTOM_VAR | Set custom variable (key:value) |
| 0x2A | CMD_GET_ADVERT_PATH | Get path to advertiser |
| 0x2B | CMD_GET_TUNING_PARAMS | Get current RX/airtime tuning values |
| 0x32 | CMD_SEND_BINARY_REQ | Send binary request to contact |
| 0x33 | CMD_FACTORY_RESET | Factory reset device |
| 0x34 | CMD_SEND_PATH_DISCOVERY_REQ | Send path discovery request |
| 0x36 | CMD_SET_FLOOD_SCOPE | Set flood scope / transport key |
| 0x37 | CMD_SEND_CONTROL_DATA | Send control data |
| 0x38 | CMD_GET_STATS | Retrieve statistics |
| 0x39 | CMD_SEND_ANON_REQ | Send anonymous request |
| 0x3A | CMD_SET_AUTOADD_CONFIG | Configure auto-add settings |
| 0x3B | CMD_GET_AUTOADD_CONFIG | Get auto-add configuration |
| 0x3C | CMD_GET_ALLOWED_REPEAT_FREQ | Get allowed repeat frequency range |
| 0x3D | CMD_SET_PATH_HASH_MODE | Set path hashing mode |

**Reserved/Unused**: 0x2C–0x31, 0x35

### Device → App Responses (0x00–0x1A)

| Code | Name | Purpose |
|------|------|---------|
| 0x00 | RESP_CODE_OK | Generic success (no data) |
| 0x01 | RESP_CODE_ERR | Error response with error code |
| 0x02 | RESP_CODE_CONTACTS_START | Start of contact list (with count) |
| 0x03 | RESP_CODE_CONTACT | Single contact record |
| 0x04 | RESP_CODE_END_OF_CONTACTS | End of contact list |
| 0x05 | RESP_CODE_SELF_INFO | Device's own info and capabilities |
| 0x06 | RESP_CODE_SENT | Message sent confirmation with tag/timeout |
| 0x07 | RESP_CODE_CONTACT_MSG_RECV | Contact message (legacy, no SNR) |
| 0x08 | RESP_CODE_CHANNEL_MSG_RECV | Channel message (legacy, no SNR) |
| 0x09 | RESP_CODE_CURR_TIME | Current device time |
| 0x0A | RESP_CODE_NO_MORE_MESSAGES | End of message queue |
| 0x0B | RESP_CODE_EXPORT_CONTACT | Exported contact blob |
| 0x0C | RESP_CODE_BATT_AND_STORAGE | Battery voltage and storage usage |
| 0x0D | RESP_CODE_DEVICE_INFO | Device capabilities and build info |
| 0x0E | RESP_CODE_PRIVATE_KEY | Exported private key blob |
| 0x0F | RESP_CODE_DISABLED | Feature disabled |
| 0x10 | RESP_CODE_CONTACT_MSG_RECV_V3 | Contact message (V3 with SNR header) |
| 0x11 | RESP_CODE_CHANNEL_MSG_RECV_V3 | Channel message (V3 with SNR header) |
| 0x12 | RESP_CODE_CHANNEL_INFO | Channel configuration |
| 0x13 | RESP_CODE_SIGN_START | Signing started, max length set |
| 0x14 | RESP_CODE_SIGNATURE | Signed data (64-byte signature) |
| 0x15 | RESP_CODE_CUSTOM_VARS | Custom variables (CSV format) |
| 0x16 | RESP_CODE_ADVERT_PATH | Path to advertiser |
| 0x17 | RESP_CODE_TUNING_PARAMS | Device's RX/airtime tuning values |
| 0x18 | RESP_CODE_STATS | Statistics payload |
| 0x19 | RESP_CODE_AUTOADD_CONFIG | Auto-add configuration |
| 0x1A | RESP_ALLOWED_REPEAT_FREQ | Allowed repeat frequency range |

**Error Codes** (byte 1 when code is 0x01):
- 0x01: Unsupported command
- 0x02: Not found
- 0x03: Table full
- 0x04: Bad state
- 0x05: File I/O error
- 0x06: Illegal argument

### Device → App Push Events (0x80–0x90)

These arrive asynchronously, without a pending command.

| Code | Name | Purpose |
|------|------|---------|
| 0x80 | PUSH_CODE_ADVERT | New advertisement received |
| 0x81 | PUSH_CODE_PATH_UPDATED | Path to contact changed |
| 0x82 | PUSH_CODE_SEND_CONFIRMED | Message delivery confirmed (with round-trip time) |
| 0x83 | PUSH_CODE_MSG_WAITING | New message available to sync |
| 0x84 | PUSH_CODE_RAW_DATA | Raw data received with SNR/RSSI |
| 0x85 | PUSH_CODE_LOGIN_SUCCESS | Login request successful |
| 0x86 | PUSH_CODE_LOGIN_FAIL | Login request failed |
| 0x87 | PUSH_CODE_STATUS_RESPONSE | Status response received |
| 0x88 | PUSH_CODE_LOG_RX_DATA | Log/debug data from RX |
| 0x89 | PUSH_CODE_TRACE_DATA | Path trace data |
| 0x8A | PUSH_CODE_NEW_ADVERT | New contact advertisement (full record) |
| 0x8B | PUSH_CODE_TELEMETRY_RESPONSE | Telemetry data received |
| 0x8C | PUSH_CODE_BINARY_RESPONSE | Binary response to earlier request |
| 0x8D | PUSH_CODE_PATH_DISCOVERY_RESPONSE | Path discovery response |
| 0x8E | PUSH_CODE_CONTROL_DATA | Control data received |
| 0x8F | PUSH_CODE_CONTACT_DELETED | Contact deleted on device |
| 0x90 | PUSH_CODE_CONTACTS_FULL | Contact table is full |

---

## Startup Sequence

**Recommended for all apps**:

1. **Connect**: Establish BLE connection, discover services, enable TX notifications
2. **Identify**: Send `CMD_APP_START` with your app name
3. **Negotiate**: Send `CMD_DEVICE_QUERY` to learn device capabilities and protocol version
4. **Sync Time**: Send `CMD_SET_DEVICE_TIME` with current Unix timestamp
5. **Load Contacts**: Send `CMD_GET_CONTACTS` to fetch full contact list
6. **Load Channels**: Send `CMD_GET_CHANNEL` for each channel index (typically 0–7)
7. **Drain Queue**: Send `CMD_SYNC_NEXT_MESSAGE` repeatedly until `RESP_CODE_NO_MORE_MESSAGES`
8. **Wait for Push**: Now listen for async push notifications

See [Bluetooth Data Endpoints](./bluetooth_data_endpoints.md#8-minimal-startup-sequence-recommended) for detailed payload examples.

---

## Implementation Guidelines

### Command Sequencing

**Critical**: Send only one command at a time.

1. Send command via RX characteristic
2. Wait for response (5-second timeout recommended)
3. Handle all response frames (some commands send multiple frames)
4. Only then send next command

✓ **Correct**: Sequential command queue with one in-flight command

```
1. Send CMD_GET_CONTACTS
2. Receive RESP_CODE_CONTACTS_START + multiple RESP_CODE_CONTACT + RESP_CODE_END_OF_CONTACTS
3. Send next command
```

✗ **Wrong**: Sending multiple commands before first completes

```
1. Send CMD_GET_DEVICE_TIME
2. Send CMD_GET_CONTACTS (while waiting for device time response!)
```

### Response Matching

- Use the response code (0x00–0x1A) to identify which command was replied to
- Some commands expect multiple response frames (e.g., `CMD_GET_CONTACTS` → 1+ `RESP_CODE_CONTACT` frames)
- Track pending commands and match responses by type

### Async Push Handling

- Pushes (0x80–0x90) can arrive at any time, even while waiting for response
- Handle pushes in parallel: buffer them, don't block on the command response
- Example: `PUSH_CODE_MSG_WAITING` while processing contact list

### Message Format Versions

- **V3 Messages** (0x10–0x11): Include 3-byte SNR header; support protocol version 3+
- **Legacy Messages** (0x07–0x08): No SNR header; for backward compatibility

Detect device version from `RESP_CODE_DEVICE_INFO` byte 1 to choose parsing strategy.

### Frame Size Constraints

- Maximum frame: 172 bytes
- Larger commands like `SET_CHANNEL` (50 bytes) must fit within this
- Text payloads are naturally length-limited by frame size

### Error Handling

When receiving `RESP_CODE_ERR` (0x01):
- Byte 1 contains error code (0x01–0x06)
- Log error, abandon current command
- Resume with next command in queue
- Do NOT retry immediately; implement backoff for persistent errors

---

## Troubleshooting

### Device Disconnects After Inactivity

**Symptom**: Connection lost after 5–10 minutes of no activity

**Solution**: Implement periodic "keep-alive" commands such as `CMD_GET_DEVICE_TIME` every few minutes

### Writes Appear to Fail (MTU Issue)

**Symptom**: Large write (e.g., `SET_CHANNEL`, 50+ bytes) fails silently

**Solution**: Request larger MTU (512 bytes) before sending large commands
- Android: `gatt.requestMtu(512)`
- iOS: Check `maximumWriteValueLength(for:)`
- Web Bluetooth: Typically 512 automatically

### Response Timeout or Hangs

**Symptom**: Send command, never receive response

**Solution**:
1. Verify device is still connected (check connection state callbacks)
2. Check TX characteristic notifications are enabled
3. Verify command format matches protocol (correct byte 0, payload structure)
4. Increase timeout to 10 seconds (some operations slow)
5. Reboot device or reconnect

### Device Reports "Command Not Supported"

**Symptom**: `RESP_CODE_ERR` with code 0x01 (unsupported)

**Solution**: Check if feature is compile-time gated (e.g., `CMD_EXPORT_PRIVATE_KEY`). Query `RESP_CODE_DEVICE_INFO` or check [Bluetooth Data Endpoints](./bluetooth_data_endpoints.md#3-app--device-command-endpoints) status column.

### Garbled Messages or Parse Errors

**Symptom**: Text appears corrupted or parser crashes

**Solution**:
1. Verify UTF-8 decoding; confirm message byte after timestamp
2. Check V3 vs. legacy message format (field 1 byte 1 may be SNR value in V3)
3. Ensure little-endian integer parsing for timestamps and coordinates

For more details on message structure, see [Bluetooth Data Endpoints](./bluetooth_data_endpoints.md#6-binary-schemas).


## Related Documents

- **[Bluetooth Data Endpoints](./bluetooth_data_endpoints.md)**: Complete binary field layouts, schemas, all command/response payloads
- **[Packet Format](./packet_format.md)**: Mesh radio packet structure (not BLE-specific)
- **[KISS Modem Protocol](./kiss_modem_protocol.md)**: Serial modem protocol for older interfaces

## Additional Resources

- **Source Code Reference**: `examples/companion_radio/MyMesh.cpp` (command handler with all endpoint definitions)
- **BLE Implementation**: `src/helpers/{nrf52,esp32}/SerialBLEInterface.cpp`
- **Live SDKs**: JavaScript, Python repos linked at top of this document

| 0x08  | PACKET_CHANNEL_MSG_RECV    | Channel message (standard)    |
| 0x09  | PACKET_CURRENT_TIME        | Current time response         |
| 0x0A  | PACKET_NO_MORE_MSGS        | No more messages available    |
| 0x0C  | PACKET_BATTERY             | Battery level                 |
| 0x0D  | PACKET_DEVICE_INFO         | Device information            |
| 0x10  | PACKET_CONTACT_MSG_RECV_V3 | Contact message (V3 with SNR) |
| 0x11  | PACKET_CHANNEL_MSG_RECV_V3 | Channel message (V3 with SNR) |
| 0x12  | PACKET_CHANNEL_INFO        | Channel information           |
| 0x80  | PACKET_ADVERTISEMENT       | Advertisement packet          |
| 0x82  | PACKET_ACK                 | Acknowledgment                |
| 0x83  | PACKET_MESSAGES_WAITING    | Messages waiting notification |
| 0x88  | PACKET_LOG_DATA            | RF log data (can be ignored)  |

### Parsing Responses

**PACKET_OK** (0x00):
```
Byte 0: 0x00
Bytes 1-4: Optional value (32-bit little-endian integer)
```

**PACKET_ERROR** (0x01):
```
Byte 0: 0x01
Byte 1: Error code (optional)
```

**PACKET_CHANNEL_INFO** (0x12):
```
Byte 0: 0x12
Byte 1: Channel Index
Bytes 2-33: Channel Name (32 bytes, null-terminated)
Bytes 34-49: Secret (16 bytes)
```

**Note**: The device returns the 16-byte channel secret in this response.

**PACKET_DEVICE_INFO** (0x0D):
```
Byte 0: 0x0D
Byte 1: Firmware Version (uint8)
Bytes 2+: Variable length based on firmware version

For firmware version >= 3:
Byte 2: Max Contacts Raw (uint8, actual = value * 2)
Byte 3: Max Channels (uint8)
Bytes 4-7: BLE PIN (32-bit little-endian)
Bytes 8-19: Firmware Build (12 bytes, UTF-8, null-padded)
Bytes 20-59: Model (40 bytes, UTF-8, null-padded)
Bytes 60-79: Version (20 bytes, UTF-8, null-padded)
Byte 80: Client repeat enabled/preferred (firmware v9+)
Byte 81: Path hash mode (firmware v10+)
```

**Parsing Pseudocode**:
```python
def parse_device_info(data):
    if len(data) < 2:
        return None
    
    fw_ver = data[1]
    info = {'fw_ver': fw_ver}
    
    if fw_ver >= 3 and len(data) >= 80:
        info['max_contacts'] = data[2] * 2
        info['max_channels'] = data[3]
        info['ble_pin'] = int.from_bytes(data[4:8], 'little')
        info['fw_build'] = data[8:20].decode('utf-8').rstrip('\x00').strip()
        info['model'] = data[20:60].decode('utf-8').rstrip('\x00').strip()
        info['ver'] = data[60:80].decode('utf-8').rstrip('\x00').strip()
    
    return info
```

**PACKET_BATTERY** (0x0C):
```
Byte 0: 0x0C
Bytes 1-2: Battery Voltage (16-bit little-endian, millivolts)
Bytes 3-6: Used Storage (32-bit little-endian, KB)
Bytes 7-10: Total Storage (32-bit little-endian, KB)
```

**Parsing Pseudocode**:
```python
def parse_battery(data):
    if len(data) < 3:
        return None
    
    mv = int.from_bytes(data[1:3], 'little')
    info = {'battery_mv': mv}
    
    if len(data) >= 11:
        info['used_kb'] = int.from_bytes(data[3:7], 'little')
        info['total_kb'] = int.from_bytes(data[7:11], 'little')
    
    return info
```

**PACKET_SELF_INFO** (0x05):
```
Byte 0: 0x05
Byte 1: Advertisement Type
Byte 2: TX Power
Byte 3: Max TX Power
Bytes 4-35: Public Key (32 bytes, hex)
Bytes 36-39: Advertisement Latitude (32-bit little-endian, divided by 1e6)
Bytes 40-43: Advertisement Longitude (32-bit little-endian, divided by 1e6)
Byte 44: Multi ACKs
Byte 45: Advertisement Location Policy
Byte 46: Telemetry Mode (bitfield)
Byte 47: Manual Add Contacts (bool)
Bytes 48-51: Radio Frequency (32-bit little-endian, divided by 1000.0)
Bytes 52-55: Radio Bandwidth (32-bit little-endian, divided by 1000.0)
Byte 56: Radio Spreading Factor
Byte 57: Radio Coding Rate
Bytes 58+: Device Name (UTF-8, variable length, no null terminator required)
```

**Parsing Pseudocode**:
```python
def parse_self_info(data):
    if len(data) < 36:
        return None
    
    offset = 1
    info = {
        'adv_type': data[offset],
        'tx_power': data[offset + 1],
        'max_tx_power': data[offset + 2],
        'public_key': data[offset + 3:offset + 35].hex()
    }
    offset += 35
    
    lat = int.from_bytes(data[offset:offset+4], 'little') / 1e6
    lon = int.from_bytes(data[offset+4:offset+8], 'little') / 1e6
    info['adv_lat'] = lat
    info['adv_lon'] = lon
    offset += 8
    
    info['multi_acks'] = data[offset]
    info['adv_loc_policy'] = data[offset + 1]
    telemetry_mode = data[offset + 2]
    info['telemetry_mode_env'] = (telemetry_mode >> 4) & 0b11
    info['telemetry_mode_loc'] = (telemetry_mode >> 2) & 0b11
    info['telemetry_mode_base'] = telemetry_mode & 0b11
    info['manual_add_contacts'] = data[offset + 3] > 0
    offset += 4
    
    freq = int.from_bytes(data[offset:offset+4], 'little') / 1000.0
    bw = int.from_bytes(data[offset+4:offset+8], 'little') / 1000.0
    info['radio_freq'] = freq
    info['radio_bw'] = bw
    info['radio_sf'] = data[offset + 8]
    info['radio_cr'] = data[offset + 9]
    offset += 10
    
    if offset < len(data):
        name_bytes = data[offset:]
        info['name'] = name_bytes.decode('utf-8').rstrip('\x00').strip()
    
    return info
```

**PACKET_MSG_SENT** (0x06):
```
Byte 0: 0x06
Byte 1: Route Flag (0 = direct, 1 = flood)
Bytes 2-5: Tag / Expected ACK (4 bytes, little-endian)
Bytes 6-9: Suggested Timeout (32-bit little-endian, milliseconds)
```

**PACKET_ACK** (0x82):
```
Byte 0: 0x82
Bytes 1-6: ACK Code (6 bytes, hex)
```

### Error Codes

**PACKET_ERROR** (0x01) may include an error code in byte 1:

| Error Code | Description |
|------------|-------------|
| 0x00 | Generic error (no specific code) |
| 0x01 | Invalid command |
| 0x02 | Invalid parameter |
| 0x03 | Channel not found |
| 0x04 | Channel already exists |
| 0x05 | Channel index out of range |
| 0x06 | Secret mismatch |
| 0x07 | Message too long |
| 0x08 | Device busy |
| 0x09 | Not enough storage |

**Note**: Error codes may vary by firmware version. Always check byte 1 of `PACKET_ERROR` response.

### Frame Handling

BLE implementations enqueue and deliver one protocol frame per BLE write/notification at the firmware layer.

- Apps should treat each characteristic write/notification as exactly one companion protocol frame
- Apps should still validate frame lengths before parsing
- Future transports or firmware revisions may differ, so avoid assuming fixed payload sizes for variable-length responses

### Response Handling

1. **Command-Response Pattern**:
   - Send command via RX characteristic
   - Wait for response via TX characteristic (notification)
   - Match response to command using sequence numbers or command type
   - Handle timeout (typically 5 seconds)
   - Use command queue to prevent concurrent commands

2. **Asynchronous Messages**:
   - Device may send messages at any time via TX characteristic
   - Handle `PACKET_MESSAGES_WAITING` (0x83) by polling `GET_MESSAGE` command
   - Parse incoming messages and route to appropriate handlers
   - Validate frame length before decoding

3. **Response Matching**:
   - Match responses to commands by expected packet type:
     - `APP_START` → `PACKET_SELF_INFO`
     - `DEVICE_QUERY` → `PACKET_DEVICE_INFO`
     - `GET_CHANNEL` → `PACKET_CHANNEL_INFO`
     - `SET_CHANNEL` → `PACKET_OK` or `PACKET_ERROR`
     - `SEND_CHANNEL_MESSAGE` → `PACKET_MSG_SENT`
     - `GET_MESSAGE` → `PACKET_CHANNEL_MSG_RECV`, `PACKET_CONTACT_MSG_RECV`, or `PACKET_NO_MORE_MSGS`
     - `GET_BATTERY` → `PACKET_BATTERY`

4. **Timeout Handling**:
   - Default timeout: 5 seconds per command
   - On timeout: Log error, clear current command, proceed to next in queue
   - Some commands may take longer (e.g., `SET_CHANNEL` may need 1-2 seconds)
   - Consider longer timeout for channel operations

5. **Error Recovery**:
   - On `PACKET_ERROR`: Log error code, clear current command
   - On connection loss: Clear command queue, attempt reconnection
   - On invalid response: Log warning, clear current command, proceed

---

## Example Implementation Flow

### Initialization

```python
# 1. Scan for MeshCore device
device = scan_for_device("MeshCore")

# 2. Connect to BLE GATT
gatt = connect_to_device(device)

# 3. Discover services and characteristics
service = discover_service(gatt, "6E400001-B5A3-F393-E0A9-E50E24DCCA9E")
rx_char = discover_characteristic(service, "6E400002-B5A3-F393-E0A9-E50E24DCCA9E")
tx_char = discover_characteristic(service, "6E400003-B5A3-F393-E0A9-E50E24DCCA9E")

# 4. Enable notifications on TX characteristic
enable_notifications(tx_char, on_notification_received)

# 5. Send AppStart command
send_command(rx_char, build_app_start())
wait_for_response(PACKET_SELF_INFO)
```

### Creating a Private Channel

```python
# 1. Generate 16-byte secret
secret_16_bytes = generate_secret(16)  # Use CSPRNG
secret_hex = secret_16_bytes.hex()

# 2. Build SET_CHANNEL command
channel_name = "YourChannelName"
channel_index = 1  # Use 1-7 for private channels
command = build_set_channel(channel_index, channel_name, secret_16_bytes)

# 3. Send command
send_command(rx_char, command)
response = wait_for_response(PACKET_OK)

# 4. Store secret locally
store_channel_secret(channel_index, secret_hex)
```

### Sending a Message

```python
# 1. Build channel message command
channel_index = 1
message = "Hello, MeshCore!"
timestamp = int(time.time())
command = build_channel_message(channel_index, message, timestamp)

# 2. Send command
send_command(rx_char, command)
response = wait_for_response(PACKET_MSG_SENT)
```

### Receiving Messages

```python
def on_notification_received(data):
    packet_type = data[0]
    
    if packet_type == PACKET_CHANNEL_MSG_RECV or packet_type == PACKET_CHANNEL_MSG_RECV_V3:
        message = parse_channel_message(data)
        handle_channel_message(message)
    elif packet_type == PACKET_MESSAGES_WAITING:
        # Poll for messages
        send_command(rx_char, build_get_message())
```

---

## Best Practices

1. **Connection Management**:
   - Implement auto-reconnect with exponential backoff
   - Handle disconnections gracefully
   - Store last connected device address for quick reconnection

2. **Secret Management**:
   - Always use cryptographically secure random number generators
   - Store secrets securely (encrypted storage)
   - Never log or transmit secrets in plain text

3. **Message Handling**:
   - Send `CMD_SYNC_NEXT_MESSAGE` when `PUSH_CODE_MSG_WAITING` is received
   - Implement message deduplication to avoid display the same message twice

4. **Channel Management**:
    - Fetch all channel slots even if you encounter an empty slot
    - Ideally save new channels into the first empty slot

5. **Error Handling**:
   - Implement timeouts for all commands (typically 5 seconds)
   - Handle `RESP_CODE_ERR` responses appropriately

---

## Troubleshooting

### Connection Issues

- **Device not found**: Ensure device is powered on and advertising
- **Connection timeout**: Check Bluetooth permissions and device proximity
- **GATT errors**: Ensure proper service/characteristic discovery

### Command Issues

- **No response**: Verify notifications are enabled, check connection state
- **Error responses**: Verify command format and check error code
- **Timeout**: Increase timeout value or try again

### Message Issues

- **Messages not received**: Poll `GET_MESSAGE` command periodically
- **Duplicate messages**: Implement message deduplication using timestamp/content as a unique id
- **Message truncation**: Send long messages as separate shorter messages
