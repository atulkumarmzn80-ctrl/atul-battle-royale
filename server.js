const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
// Configure this according to your hosting plan. No finite server has literally unlimited capacity.
const MAX_PLAYERS_PER_ROOM = Number(process.env.MAX_PLAYERS_PER_ROOM || 100);
const const publicDir = __dirname;
const rooms = new Map();
const sockets = new Map();

function code() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s;
  do { s = Array.from({length:5}, () => chars[Math.floor(Math.random()*chars.length)]).join(''); }
  while (rooms.has(s));
  return s;
}
function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}
function snapshot(room) {
  const players = {};
  for (const [id, p] of room.players) players[id] = p.state;
  return {type:'snapshot', players, count:room.players.size, code:room.code};
}
function broadcast(room) {
  const packet = JSON.stringify(snapshot(room));
  for (const p of room.players.values()) if (p.ws.readyState === WebSocket.OPEN) p.ws.send(packet);
}
function remove(ws) {
  const id = sockets.get(ws);
  if (!id) return;
  sockets.delete(ws);
  for (const [roomCode, room] of rooms) {
    if (room.players.has(id)) {
      room.players.delete(id);
      if (room.players.size === 0) rooms.delete(roomCode);
      else broadcast(room);
      break;
    }
  }
}
const server = http.createServer((req,res) => {
  let pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  if (pathname === '/') pathname = '/index.html';
  const file = path.join(publicDir, pathname);
  if (!file.startsWith(publicDir)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(file);
    const types = {'.html':'text/html; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.css':'text/css','.js':'text/javascript'};
    res.writeHead(200, {'Content-Type':types[ext] || 'application/octet-stream'});
    res.end(data);
  });
});
const wss = new WebSocket.Server({server, path:'/ws', maxPayload:16*1024});
wss.on('connection', ws => {
  ws.on('message', raw => {
    let d; try { d = JSON.parse(raw.toString()); } catch { return; }
    if (d.type === 'create') {
      const c = code(), id = Math.random().toString(36).slice(2,11);
      const room = {code:c, players:new Map()};
      rooms.set(c, room);
      room.players.set(id, {ws, state:{name:String(d.name||'Player').slice(0,16),x:0,z:0,yaw:0,hp:100}});
      sockets.set(ws,id); ws.roomCode=c;
      send(ws,{type:'room',code:c,id});
      broadcast(room);
    } else if (d.type === 'join') {
      const c = String(d.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
      const room = rooms.get(c);
      if (!room) return send(ws,{type:'error',message:'Room not found. Ask the host to create a room again.'});
      if (room.players.size >= MAX_PLAYERS_PER_ROOM) return send(ws,{type:'error',message:'Room is full. Server room limit: '+MAX_PLAYERS_PER_ROOM});
      const id = Math.random().toString(36).slice(2,11);
      room.players.set(id,{ws,state:{name:String(d.name||'Player').slice(0,16),x:(Math.random()-.5)*8,z:(Math.random()-.5)*8,yaw:0,hp:100}});
      sockets.set(ws,id); ws.roomCode=c;
      send(ws,{type:'joined',code:c,id});
      broadcast(room);
    } else {
      const id=sockets.get(ws); if(!id)return;
      const room=rooms.get(ws.roomCode); if(!room)return;
      const p=room.players.get(id); if(!p)return;
      if(d.type==='state') {
        p.state={name:String(d.name||'Player').slice(0,16),x:Number(d.x)||0,z:Number(d.z)||0,yaw:Number(d.yaw)||0,hp:Math.max(0,Math.min(100,Number(d.hp)||100))};
        broadcast(room);
      } else if(d.type==='fire') {
        for (const [otherId, other] of room.players) if (otherId!==id) send(other.ws,{type:'tagged',from:id});
      }
    }
  });
  ws.on('close',()=>remove(ws)); ws.on('error',()=>remove(ws));
});
server.listen(PORT,()=>console.log(`Atul Battle Royale server listening on ${PORT}; room cap=${MAX_PLAYERS_PER_ROOM}`));
