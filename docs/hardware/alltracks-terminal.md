# Alltracks Open Hardware Terminal

> Open-source GPS + voice note terminal for outdoor tracking.

Alltracks Open Hardware Terminal is a small open-source outdoor device focused on three core actions:

1. **One-click location record** — save the current GPS point as a waypoint.
2. **Continuous GPS track recording** — record tracks offline and sync later.
3. **Voice note at location** — press and hold to record voice, then bind the note to the current position.

The goal is not to build a full navigation device at the beginning. The first version should be a reliable, simple, hackable field terminal for hiking, running, cycling, sailing, travel, trail maintenance, delivery, and community field records.

---

## 1. Product Positioning

### Name

**Alltracks Terminal**  
Codename: **AOT-01**

### Tagline

**Record every step. Mark every moment.**

### Design Principles

- Offline first
- One-hand operation
- Long battery life
- Weather resistant
- Open hardware
- Open firmware
- Simple API integration with Alltracks
- Data belongs to the user

---

## 2. Core Use Cases

### 2.1 Hiking / Trail Running

- Start track recording before a hike or run.
- Press one button to mark water source, viewpoint, camp, danger, bridge, junction, or trail issue.
- Hold the voice button to record quick notes without taking out a phone.

### 2.2 Community Field Service

Useful for Alltracks / Hortsun style local service workflows:

- Mark job site position.
- Record before/after notes.
- Capture voice memo while working.
- Sync to customer/job timeline later.

### 2.3 Event / Trackathon

- Participants can carry low-cost terminals.
- Tracks can be synced to an Alltracks event page.
- Checkpoints and manual notes can be verified by timestamp + location.

---

## 3. MVP Features

### 3.1 Required Features

| Feature | Description |
| --- | --- |
| GPS positioning | Read GPS coordinates, altitude, speed, heading, and timestamp |
| One-click waypoint | Short press saves current location |
| Track recording | Continuous GPX-like point recording |
| Voice note | Press and hold to record audio memo |
| Local storage | Store tracks, waypoints, and audio offline |
| BLE sync | Sync data to Alltracks mobile app |
| Battery status | Display or report battery level |
| USB-C charging | Recharge via USB-C |
| Open firmware | ESP-IDF / Arduino / MicroPython friendly |
| Open hardware | KiCad files, BOM, enclosure files |

### 3.2 Nice-to-have Features

| Feature | Description |
| --- | --- |
| Wi-Fi sync | Direct upload when Wi-Fi is available |
| Small screen | Show GPS status, time, coordinates, battery, recording state |
| Vibration motor | Haptic confirmation for button actions |
| Buzzer | Optional sound feedback |
| E-paper display | Lower power alternative to OLED |
| LoRa module | Future off-grid messaging / checkpoint relay |
| SOS mode | Emergency marker, not a certified rescue beacon |

---

## 4. Hardware Architecture

```text
+--------------------------------------------------+
|               Alltracks Terminal                 |
|                                                  |
|  +---------+      +---------------------------+  |
|  | GPS     | ---> | MCU: ESP32-S3             |  |
|  | Module  |      | BLE / Wi-Fi / Storage     |  |
|  +---------+      +-------------+-------------+  |
|                              |                  |
|  +---------+      +----------+----------+       |
|  | Mic     | ---> | Audio Recording     |       |
|  +---------+      +---------------------+       |
|                                                  |
|  +---------+      +---------------------+       |
|  | Buttons | ---> | Waypoint / Voice    |       |
|  +---------+      +---------------------+       |
|                                                  |
|  +---------+      +---------------------+       |
|  | Battery | ---> | Power Management    |       |
|  +---------+      +---------------------+       |
|                                                  |
|  +---------+      +---------------------+       |
|  | Display | <--- | Status UI           |       |
|  +---------+      +---------------------+       |
+--------------------------------------------------+
```

---

## 5. Recommended MVP Hardware

### 5.1 MCU

Recommended:

- **ESP32-S3**

Reasons:

- BLE + Wi-Fi built in
- Good community support
- Enough performance for GPS parsing and audio recording
- Works with ESP-IDF, Arduino framework, and MicroPython
- Affordable and easy to prototype

### 5.2 GPS Module

Recommended options:

- u-blox NEO-M10N / MAX-M10S
- Quectel L76K / LC76G

Requirements:

- Multi-GNSS support: GPS / GLONASS / Galileo / BeiDou / QZSS
- UART interface
- External antenna support preferred
- Low power mode preferred

### 5.3 Voice Input

Options:

- I2S MEMS microphone
- Analog microphone + ADC

Recommended:

- I2S MEMS microphone for cleaner digital input

MVP behavior:

- Device records compressed audio or raw WAV.
- Mobile app receives audio during sync.
- Speech-to-text can happen on the phone or server side.
- The terminal does not need to run AI transcription locally in v1.

### 5.4 Storage

Options:

- Onboard SPI Flash
- microSD card

Recommended MVP:

- 16MB+ Flash for config and small logs
- microSD for long tracks and audio notes

### 5.5 Display

Options:

- 0.96 inch OLED
- 1.3 inch OLED
- Small e-paper screen
- No screen, LED-only MVP

Recommended first prototype:

- 0.96 inch OLED

Displayed information:

- GPS lock status
- Current time
- Recording state
- Battery level
- Last waypoint saved
- BLE sync status

### 5.6 Buttons

Minimum:

- Power button
- Main waypoint button
- Voice button

Possible simplified interaction:

| Action | Behavior |
| --- | --- |
| Short press main button | Save waypoint |
| Long press main button | Start / stop track recording |
| Hold voice button | Record voice note |
| Double press main button | Mark special checkpoint |

### 5.7 Battery

Recommended MVP:

- 1000–2000mAh LiPo
- USB-C charging
- Battery protection circuit
- Fuel gauge preferred

Target battery life:

- 12–24 hours depending on GPS frequency, screen, BLE, and storage mode

---

## 6. Firmware Design

### 6.1 Firmware Modules

```text
firmware/
  gps/
    nmea_parser
    fix_manager
  tracking/
    track_recorder
    waypoint_manager
  audio/
    voice_recorder
  storage/
    file_store
    metadata_index
  sync/
    ble_service
    wifi_upload_optional
  ui/
    display
    led_status
    button_handler
  power/
    battery
    sleep_manager
  config/
    device_settings
```

### 6.2 Device States

| State | Description |
| --- | --- |
| Booting | Device starts and loads config |
| Searching GPS | Waiting for GPS fix |
| Ready | GPS available, not recording |
| Recording Track | Track points are being saved |
| Recording Voice | Voice memo is being recorded |
| Syncing | BLE / Wi-Fi sync in progress |
| Low Battery | Battery below threshold |
| Sleep | Low-power state |

### 6.3 GPS Recording Strategy

Default:

- Record one GPS point every 5–10 seconds.
- Record more frequently when speed is high.
- Record less frequently when stationary.

Example adaptive policy:

| Condition | Interval |
| --- | --- |
| Stationary | 30–60 seconds |
| Walking / hiking | 5–10 seconds |
| Running / cycling | 1–5 seconds |

### 6.4 File Format

Track point JSONL example:

```json
{"type":"track_point","ts":"2026-07-04T14:32:10Z","lat":49.123456,"lon":-123.123456,"alt":125.4,"speed":1.2,"hdop":0.9}
```

Waypoint JSON example:

```json
{
  "type": "waypoint",
  "id": "wp_20260704_143210",
  "ts": "2026-07-04T14:32:10Z",
  "lat": 49.123456,
  "lon": -123.123456,
  "alt": 125.4,
  "label": "manual_mark",
  "source": "button"
}
```

Voice note metadata example:

```json
{
  "type": "voice_note",
  "id": "voice_20260704_143300",
  "ts": "2026-07-04T14:33:00Z",
  "lat": 49.123500,
  "lon": -123.123500,
  "audio_file": "voice_20260704_143300.wav",
  "duration_sec": 12,
  "transcript": null
}
```

---

## 7. BLE Sync Protocol

### 7.1 Device Information

- Device ID
- Firmware version
- Battery level
- Storage usage
- Last sync time

### 7.2 Sync Objects

| Object | Direction |
| --- | --- |
| Track metadata | Device → App |
| Track points | Device → App |
| Waypoints | Device → App |
| Voice files | Device → App |
| Device config | App ↔ Device |
| Firmware update | App → Device |

### 7.3 Alltracks Object Mapping

```text
Device Track      -> Alltracks Track
Device Waypoint   -> Alltracks Checkpoint / Marker
Device Voice Note -> Alltracks Checkpoint Note
Device Session    -> Alltracks Activity / Event Record
```

---

## 8. Mobile App Integration

Alltracks mobile app should add a **Device** section.

### 8.1 Device Screens

- Connect Device
- Device Status
- Sync Tracks
- Synced Waypoints
- Voice Notes
- Device Settings
- Firmware Update

### 8.2 Sync Flow

```text
1. User opens Alltracks app
2. App scans BLE devices
3. User connects Alltracks Terminal
4. App reads device summary
5. User taps Sync
6. App imports tracks, waypoints, and voice notes
7. App uploads to Alltracks backend when network is available
8. Device marks synced files as safe to archive/delete
```

---

## 9. Enclosure Design

### 9.1 Physical Requirements

- Small enough for one-hand use
- Glove-friendly button
- Lanyard hole
- Backpack strap mount or clip
- USB-C waterproof cover
- Speaker/mic acoustic opening with membrane
- Outdoor readable display
- IP54 minimum for prototype
- IP67 target for production

### 9.2 Prototype Enclosure

Recommended:

- 3D printed case
- TPU button cover
- Silicone gasket
- Screwed back plate
- Replaceable front window

---

## 10. Open Source Repository Structure

Recommended structure:

```text
hardware/alltracks-terminal/
  README.md
  docs/
    product-design.md
    firmware-design.md
    ble-protocol.md
    enclosure.md
  kicad/
  firmware/
  enclosure/
    stl/
    step/
  app-sdk/
  bom/
    bom.csv
  LICENSE
```

Suggested licenses:

- Hardware: CERN-OHL-S or CC BY-SA 4.0
- Firmware: Apache-2.0 or MIT
- Documentation: CC BY-SA 4.0

---

## 11. Prototype Roadmap

### Phase 0 — Proof of Concept

Goal: prove the core workflow.

Use off-the-shelf modules:

- ESP32-S3 DevKit
- GPS breakout module
- I2S MEMS mic
- OLED screen
- microSD module
- LiPo battery module
- 3D printed case

Deliverables:

- GPS track recording
- One-click waypoint
- Voice recording
- USB export or BLE sync demo

### Phase 1 — Field Prototype

Goal: real outdoor test.

Deliverables:

- Custom PCB v0.1
- Basic enclosure
- BLE sync to Alltracks app
- GPX export
- 6–12 hour battery test

### Phase 2 — Open Hardware Alpha

Goal: publish as open hardware.

Deliverables:

- KiCad source files
- BOM
- Firmware source code
- Enclosure STEP/STL files
- Build guide
- Flashing guide
- Community feedback process

### Phase 3 — Small Batch

Goal: 10–50 unit pilot.

Deliverables:

- Improved PCB
- Better enclosure
- Battery life optimization
- Field testing with hiking / running / community jobs
- Public documentation

---

## 12. Engineering Roles Needed

### 12.1 Embedded Hardware Engineer

Responsibilities:

- Select MCU, GPS, mic, battery, display, charging IC
- Design schematic and PCB
- Prepare BOM
- Coordinate PCB assembly
- Debug hardware prototype

Skills:

- ESP32 / STM32 / Nordic
- GPS modules
- LiPo charging
- Low-power design
- KiCad

### 12.2 Firmware Engineer

Responsibilities:

- GPS parsing
- Track recorder
- Button logic
- Audio recording
- BLE sync protocol
- Storage management
- OTA update

Skills:

- ESP-IDF / Arduino / FreeRTOS
- BLE GATT
- FATFS / SD card
- Low-power firmware

### 12.3 Mechanical / Industrial Designer

Responsibilities:

- Enclosure design
- Waterproofing strategy
- Button design
- Clip / lanyard / mount
- 3D print and iteration

Skills:

- Fusion 360 / SolidWorks
- 3D printing
- Outdoor product design

### 12.4 Alltracks App Developer

Responsibilities:

- Device pairing
- BLE sync UI
- Track import
- Voice note upload
- Firmware update UI

---

## 13. First Prototype Budget Estimate

| Item | Estimate |
| --- | --- |
| Off-the-shelf modules | CAD $100–300 |
| 3D printed enclosure | CAD $50–200 |
| Firmware PoC | CAD $1,000–5,000 |
| Custom PCB prototype | CAD $1,000–5,000 |
| Full field prototype | CAD $5,000–15,000 |

A low-cost MVP can start with off-the-shelf modules before investing in custom PCB.

---

## 14. MVP Definition

The first successful prototype only needs to prove this loop:

```text
Power on
→ GPS lock
→ Start track recording
→ Press button to save waypoint
→ Hold button to record voice note
→ Sync to Alltracks app
→ Show track + waypoint + voice note on Alltracks map
```

Do not add full navigation, maps, messaging, or complex AI in v1.

---

## 15. Open Questions

- Should v1 include a display, or should it be LED-only?
- Should voice transcription happen on mobile, server, or device?
- Should data sync only via BLE, or also USB-C mass storage?
- Should the device support replaceable batteries?
- Should LoRa be reserved for a future Pro version?
- Should the first public release be a DIY kit or assembled device?

---

## 16. Next Actions

1. Build off-the-shelf module prototype.
2. Define BLE protocol v0.1.
3. Add Device section to Alltracks app.
4. Test GPS accuracy and battery life outdoors.
5. Create KiCad PCB after workflow is validated.
6. Publish hardware files and build guide.
