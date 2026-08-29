// Comprehensive Automated Test Suite for Virtual Rooms, 4-Letter Codes, Roles, and Optional Password Security

import { RoomManager } from '../server/RoomManager';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

console.log('🧪 =============================================================');
console.log('🧪 RUNNING VIRTUAL ROOMS, ROLES & PASSWORD SECURITY TEST SUITE');
console.log('🧪 =============================================================\n');

// -------------------------------------------------------------
// TEST GROUP 1: Room Code Generation & Uniqueness
// -------------------------------------------------------------
console.log('🔑 TEST GROUP 1: Room Code Generation & Uniqueness');

const roomManager = new RoomManager();

const codes = new Set<string>();
for (let i = 0; i < 50; i++) {
  const code = roomManager.generateRoomCode();
  assert(code.length === 4, `Room code "${code}" is exactly 4 characters`);
  assert(/^[BCDFGHJKLMNPQRSTVWXYZ]{4}$/.test(code), `Room code "${code}" uses only clean consonants`);
  assert(!codes.has(code), `Room code "${code}" is unique across iterations`);
  codes.add(code);
}

console.log('✅ TEST GROUP 1 PASSED!\n');

// -------------------------------------------------------------
// TEST GROUP 2: Public Virtual Rooms (No Password)
// -------------------------------------------------------------
console.log('🚪 TEST GROUP 2: Public Virtual Rooms (No Password)');

const host1Socket = 'socket_host_1';
const room1 = roomManager.createRoom(host1Socket);

assert(room1.hasPassword === false, 'Room created without password has hasPassword === false');
assert(room1.password === undefined, 'Room created without password has undefined password field');
assert(room1.clients.size === 1, 'Host is immediately registered in room clients');
assert(roomManager.getRoom(room1.roomCode) !== undefined, 'Room is retrievable by 4-letter code');

// Remote player joins public room without password
const joinResult1 = roomManager.joinRoom(room1.roomCode, 'socket_player_1', 'controller', 'Sailor Blue');
assert(joinResult1.success === true, 'Player successfully joins public room without password');
assert(joinResult1.playerIndex === 1, 'First remote controller is assigned Player Slot 1 (P2)');
assert(joinResult1.roomCode === room1.roomCode, 'Returned room code matches');

console.log('✅ TEST GROUP 2 PASSED!\n');

// -------------------------------------------------------------
// TEST GROUP 3: Password-Protected Virtual Rooms
// -------------------------------------------------------------
console.log('🔒 TEST GROUP 3: Password-Protected Virtual Rooms & Guess Protection');

const host2Socket = 'socket_host_2';
const secretPin = 'slop1234';
const room2 = roomManager.createRoom(host2Socket, secretPin);

assert(room2.hasPassword === true, 'Protected room has hasPassword === true');
assert(room2.password === secretPin, 'Protected room stores clean password');

// 3.1 Random guesser attempts without password
const guesserResult1 = roomManager.joinRoom(room2.roomCode, 'socket_guesser_1', 'controller', 'Hacker Dave');
assert(guesserResult1.success === false, 'Guesser without password is rejected');
assert(guesserResult1.hasPassword === true, 'Rejection signals room requires password');
assert(guesserResult1.error?.includes('Incorrect password') === true, 'Error message warns about incorrect password');

// 3.2 Random guesser attempts with wrong password
const guesserResult2 = roomManager.joinRoom(room2.roomCode, 'socket_guesser_2', 'controller', 'Hacker Dave', 'wrongpass');
assert(guesserResult2.success === false, 'Guesser with wrong password is rejected');
assert(guesserResult2.error?.includes('Incorrect password') === true, 'Error message explicitly states incorrect password');

// 3.3 Invited friend joins with correct password
const friendResult = roomManager.joinRoom(room2.roomCode, 'socket_friend_1', 'controller', 'Friend Alice', secretPin);
assert(friendResult.success === true, 'Invited friend with correct password joins successfully');
assert(friendResult.playerIndex === 1, 'Friend assigned Player Slot 1 (P2)');

// 3.4 Verify case-insensitivity of room code
const friendResultUpper = roomManager.joinRoom(room2.roomCode.toLowerCase(), 'socket_friend_2', 'controller', 'Friend Bob', secretPin);
assert(friendResultUpper.success === true, 'Room code lookup is case-insensitive');
assert(friendResultUpper.playerIndex === 2, 'Friend Bob assigned Player Slot 2 (P3)');

console.log('✅ TEST GROUP 3 PASSED!\n');

// -------------------------------------------------------------
// TEST GROUP 4: Player Slot Balancing & Spectator Roles
// -------------------------------------------------------------
console.log('👥 TEST GROUP 4: Player Slot Capacity (Max 4) & Spectator Roles');

// Slot 3 (P4)
const player4Result = roomManager.joinRoom(room2.roomCode, 'socket_player_4', 'controller', 'Friend Charlie', secretPin);
assert(player4Result.success === true, 'Player 4 joined successfully');
assert(player4Result.playerIndex === 3, 'Charlie assigned Player Slot 3 (P4)');

// 5th player attempts to join as controller -> Room full
const player5Result = roomManager.joinRoom(room2.roomCode, 'socket_player_5', 'controller', 'Extra Player', secretPin);
assert(player5Result.success === false, '5th player is rejected because room is full');
assert(player5Result.error?.includes('full') === true, 'Error indicates room is full');

// But Spectator / Viewer can join without consuming slots!
const viewerResult = roomManager.joinRoom(room2.roomCode, 'socket_viewer_1', 'viewer', 'Twitch Chat', secretPin);
assert(viewerResult.success === true, 'Viewer can join full room without error');
assert(viewerResult.playerIndex === undefined, 'Viewer does not consume a player slot');

console.log('✅ TEST GROUP 4 PASSED!\n');

// -------------------------------------------------------------
// TEST GROUP 5: Disconnect & Lifecycle Cleanup
// -------------------------------------------------------------
console.log('🔌 TEST GROUP 5: Disconnect & Lifecycle Cleanup');

// Player 4 disconnects -> slot 3 freed
const p4Disconnect = roomManager.handleSocketDisconnect('socket_player_4');
assert(p4Disconnect.wasHost === false, 'Player disconnect is not marked as host disconnect');

// Now new player can take the freed slot!
const replacementResult = roomManager.joinRoom(room2.roomCode, 'socket_new_player', 'controller', 'Replacement Dave', secretPin);
assert(replacementResult.success === true, 'New player can take freed slot');
assert(replacementResult.playerIndex === 3, 'Replacement assigned freed slot 3');

// Host disconnects -> Room destroyed
const hostDisconnect = roomManager.handleSocketDisconnect(host2Socket);
assert(hostDisconnect.wasHost === true, 'Host disconnect is recognized as wasHost === true');
assert(roomManager.getRoom(room2.roomCode) === undefined, 'Virtual room is immediately cleaned up when host leaves');

console.log('✅ TEST GROUP 5 PASSED!\n');

console.log('🎉 =============================================================');
console.log('🎉 ALL VIRTUAL ROOM & SECURITY TESTS PASSED PERFECTLY!');
console.log('🎉 =============================================================\n');
