---
name: nebupet
description: "Launch NebuPet — a cute pixel art desktop pet that syncs with OpenClaw messages and shows agent status"
metadata:
  openclaw:
    emoji: "🐰"
    os: ["macos"]
    requires:
      bins: ["node", "npm"]
---

# NebuPet — AI Desktop Pet

A macOS desktop pet that lives on your screen, syncs with your OpenClaw conversations, and shows real-time agent status with pixel art animations.

## Features
- Cute pixel art bunny girl character with 4-frame animation
- OpenClaw message sync via webhook (port 18790)
- Agent status display: thinking bubble, typing computer animation
- Emotion effects: hearts, stars, angry marks, sleep Zzz
- Click interaction with random responses
- Drag to reposition
- Screen awareness (Cmd+Shift+Space)
- macOS native transparent window

## When to use
Use this skill when the user asks to:
- Start or launch the desktop pet
- Show a desktop companion
- Enable the desktop pet overlay

## Instructions

1. Check if NebuPet is installed:
```bash
ls ~/Documents/codes/NebuPet/package.json
```

2. If not installed, clone and set up:
```bash
cd ~/Documents/codes && git clone https://github.com/yukiwu-boop/nebupet.git NebuPet && cd NebuPet && npm install
```

3. Start NebuPet:
```bash
cd ~/Documents/codes/NebuPet && npm start &
```

4. Verify the webhook server is running:
```bash
curl -s http://127.0.0.1:18790/health
```

5. Confirm to the user that NebuPet is running and explain the controls:
   - **Click** the pet to interact
   - **Drag** to move her around
   - **Cmd+Shift+Space** to ask about current app
   - **Tray icon** (top right) for settings
   - Messages from Telegram/other channels will appear as chat bubbles

## Rules
- Always check if the pet is already running before starting a new instance
- If port 18790 is already in use, the pet is likely already running
- Do not modify the pet's source code without user permission
