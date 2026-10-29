ATUL BATTLE ROYALE — Scalable server prototype

This build replaces peer-to-peer connections with a WebSocket game server. Players join a room by code and the server broadcasts player positions to everyone in that room.

DEPLOY
1. Upload this entire project folder to a Node.js hosting service that supports long-lived WebSocket connections (for example Render, Railway, or a VPS).
2. The host should run `npm install` then `npm start`.
3. Make sure the host routes HTTPS requests and WebSocket upgrades to the same service. The included client connects to /ws on the same host.
4. Open the service URL on the first phone, tap CREATE ROOM, and share the code.
5. Other players open the same URL, enter the code and tap JOIN ROOM.

CAPACITY
- Default room cap is 100 players, configured by MAX_PLAYERS_PER_ROOM environment variable.
- You can raise the cap, but do not set it arbitrarily high on a small server. Real capacity depends on CPU, RAM, bandwidth, update frequency, and hosting limits. "Unlimited" players is not physically possible.
- For a real large-scale game, add authentication, rate limiting, server-authoritative movement/combat, persistence, monitoring, and load testing.

IMPORTANT
- This is a prototype, not a full PUBG-like game.
- It has a simple 3D arena, touch controls, room codes, position sync, and a basic tag/fire action.
- Character photo panels are not photorealistic rigged 3D face scans.
- External Three.js library needs internet.
