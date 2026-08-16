// Authoritative 60 FPS Physics & Tilt Simulation Engine

import { 
  GameRoomState, 
  PlayerState, 
  EntityItem, 
  WorkStation, 
  PlayerInput, 
  FishSpeciesId 
} from '../shared/types';
import { 
  CANVAS_WIDTH, 
  BOAT_BOUNDS, 
  DECK_BOUNDS, 
  PHYSICS 
} from '../shared/constants';
import { FISH_REGISTRY } from '../shared/fishDatabase';
import { getRecipeForStation } from '../shared/recipes';

export class PhysicsEngine {
  public static update(room: GameRoomState, playerInputs: Map<string, PlayerInput>, onEvent?: (type: string, data: any) => void): void {
    const boatCenterX = CANVAS_WIDTH / 2;

    // 1. Update Players from Inputs
    room.players.forEach(player => {
      // If stunned or slipping, count down timer
      if (player.isStunned) {
        player.stunTimer -= 1 / 60;
        if (player.stunTimer <= 0) {
          player.isStunned = false;
        }
      }

      const input = playerInputs.get(player.id) || { dx: 0, dy: 0, actionGrab: false, actionThrow: false, actionInteract: false, actionSlap: false };

      if (!player.isStunned) {
        const moveSpeed = player.isSlipping ? PHYSICS.playerSpeed * 0.4 : PHYSICS.playerSpeed;
        player.vx += input.dx * moveSpeed * 0.3;
        player.vy += input.dy * moveSpeed * 0.3;

        // Facing direction
        if (Math.abs(input.dx) > Math.abs(input.dy)) {
          if (input.dx > 0.1) player.facing = 'right';
          else if (input.dx < -0.1) player.facing = 'left';
        } else {
          if (input.dy > 0.1) player.facing = 'down';
          else if (input.dy < -0.1) player.facing = 'up';
        }
      }

      // Apply boat tilt gravity to players
      const tiltSlideForce = (room.boatAngle / 18) * (player.isSlipping ? 0.35 : 0.08);
      player.vx += tiltSlideForce;

      // Friction & damping
      const friction = player.isSlipping ? 0.96 : PHYSICS.playerFriction;
      player.vx *= friction;
      player.vy *= friction;

      player.x += player.vx;
      player.y += player.vy;

      // Keep player inside deck bounds
      player.x = Math.max(DECK_BOUNDS.minX, Math.min(DECK_BOUNDS.maxX, player.x));
      player.y = Math.max(DECK_BOUNDS.minY, Math.min(DECK_BOUNDS.maxY, player.y));

      // Handle item position if holding
      if (player.holdingItemId) {
        const heldItem = room.items.find(i => i.id === player.holdingItemId);
        if (heldItem) {
          heldItem.x = player.x;
          heldItem.y = player.y - 20;
          heldItem.vx = player.vx;
          heldItem.vy = player.vy;

          // If holding a Slime Eel, count timer to drop
          if (heldItem.speciesId === 'eel') {
            heldItem.stateTimer = (heldItem.stateTimer || 0) + (1 / 60);
            if (heldItem.stateTimer > 2.5) {
              // Slip out of hands!
              heldItem.stateTimer = 0;
              player.holdingItemId = null;
              heldItem.isHeld = false;
              heldItem.heldByPlayerId = null;
              heldItem.vx = (Math.random() - 0.5) * 6;
              heldItem.vy = (Math.random() - 0.5) * 6;
              onEvent?.('sfx', 'splash');
              onEvent?.('feed', { text: `🐍 Slime Eel wriggled out of ${player.name}'s grip!`, type: 'info' });
            }
          }
        } else {
          player.holdingItemId = null;
        }
      }

      // Handle Actions: Grab / Drop / Throw / Slap
      if (input.actionGrab) {
        PhysicsEngine.handlePlayerGrab(room, player, onEvent);
      }
      if (input.actionThrow) {
        PhysicsEngine.handlePlayerThrow(room, player, onEvent);
      }
      if (input.actionSlap) {
        PhysicsEngine.handlePlayerSlap(room, player, onEvent);
      }
    });

    // 2. Calculate Boat Center of Mass & Tilt Angle
    let portWeight = 0;
    let starboardWeight = 0;

    room.players.forEach(p => {
      if (p.x < boatCenterX) portWeight += 4.0;
      else starboardWeight += 4.0;
    });

    room.items.forEach(item => {
      if (item.x < boatCenterX) portWeight += item.mass;
      else starboardWeight += item.mass;
    });

    const targetAngle = Math.max(
      -PHYSICS.maxBoatAngle,
      Math.min(PHYSICS.maxBoatAngle, (starboardWeight - portWeight) * PHYSICS.tiltSensitivity)
    );

    // Smooth boat tilt spring interpolation
    room.boatAngle += (targetAngle - room.boatAngle) * 0.08;

    // 3. Update Loose Items Physics
    const itemTiltForce = (room.boatAngle / 10) * PHYSICS.tiltGravityMultiplier;

    for (let i = room.items.length - 1; i >= 0; i--) {
      const item = room.items[i];
      if (item.isHeld) continue;

      item.vx += itemTiltForce;
      item.vx *= PHYSICS.itemFriction;
      item.vy *= PHYSICS.itemFriction;

      item.x += item.vx;
      item.y += item.vy;

      // Special item timers: Bombfish
      if (item.speciesId === 'bombfish') {
        item.stateTimer = (item.stateTimer ?? PHYSICS.bombfishFuseSeconds) - (1 / 60);
        if (item.stateTimer <= 0) {
          // EXPLODE!
          PhysicsEngine.triggerExplosion(room, item.x, item.y, onEvent);
          room.items.splice(i, 1);
          continue;
        }
      }

      // Check Cooler Station Deposit
      const cooler = room.stations.find(s => s.type === 'cooler');
      if (cooler && PhysicsEngine.isItemInStation(item, cooler)) {
        room.teamCash += item.value;
        onEvent?.('sfx', 'ding');
        onEvent?.('feed', { text: `💵 Sold ${item.name} for $${item.value}!`, type: 'score' });
        onEvent?.('item_sold', { player: item.heldByPlayerId, item });
        room.items.splice(i, 1);
        continue;
      }

      // Check Overboard condition
      if (
        item.x < BOAT_BOUNDS.x - 20 ||
        item.x > BOAT_BOUNDS.x + BOAT_BOUNDS.width + 20 ||
        item.y < BOAT_BOUNDS.y - 20 ||
        item.y > BOAT_BOUNDS.y + BOAT_BOUNDS.height + 20
      ) {
        onEvent?.('sfx', 'splash');
        onEvent?.('feed', { text: `🌊 ${item.name} washed overboard!`, type: 'hazard' });
        onEvent?.('item_overboard', { item });
        room.items.splice(i, 1);
        continue;
      }
    }

    // 4. Update Work Stations (Cutting, Frying, Soup)
    room.stations.forEach(station => {
      if (station.heldItem && station.isProcessing) {
        station.progress += 1 / (60 * (station.heldItem.stateTimer || 3));
        if (station.progress >= 1.0) {
          // Finished cooking/processing!
          PhysicsEngine.completeStationProcess(station, onEvent);
        }
      }
    });
  }

  private static handlePlayerGrab(room: GameRoomState, player: PlayerState, onEvent?: (type: string, data: any) => void): void {
    if (player.holdingItemId) {
      // Check if standing near a station to place item
      const nearStation = room.stations.find(s => 
        !s.heldItem &&
        Math.hypot(s.x + s.w/2 - player.x, s.y + s.h/2 - player.y) < 55
      );

      const held = room.items.find(i => i.id === player.holdingItemId);
      if (!held) {
        player.holdingItemId = null;
        return;
      }

      if (nearStation) {
        const recipe = getRecipeForStation(nearStation.type, held);
        if (recipe) {
          nearStation.heldItem = held;
          nearStation.isProcessing = true;
          nearStation.progress = 0;
          held.stateTimer = recipe.processTimeSeconds;
          held.isHeld = false;
          held.heldByPlayerId = null;
          player.holdingItemId = null;
          onEvent?.('sfx', 'station_start');
          onEvent?.('feed', { text: `👨‍🍳 Started processing ${held.name} at ${nearStation.name}!`, type: 'info' });
          return;
        }
      }

      // Otherwise drop on deck
      held.isHeld = false;
      held.heldByPlayerId = null;
      held.vx = player.vx * 1.2;
      held.vy = player.vy * 1.2;
      player.holdingItemId = null;
      onEvent?.('sfx', 'drop');
    } else {
      // Check if station has finished item ready to pick up
      const stationWithItem = room.stations.find(s => 
        s.heldItem && 
        !s.isProcessing &&
        Math.hypot(s.x + s.w/2 - player.x, s.y + s.h/2 - player.y) < 55
      );

      if (stationWithItem && stationWithItem.heldItem) {
        const item = stationWithItem.heldItem;
        stationWithItem.heldItem = null;
        item.isHeld = true;
        item.heldByPlayerId = player.id;
        player.holdingItemId = item.id;
        onEvent?.('sfx', 'pickup');
        return;
      }

      // Check nearest loose item on deck
      let nearestItem: EntityItem | null = null;
      let minDist = 48;

      room.items.forEach(item => {
        if (item.isHeld) return;
        const dist = Math.hypot(item.x - player.x, item.y - player.y);
        if (dist < minDist) {
          minDist = dist;
          nearestItem = item;
        }
      });

      if (nearestItem) {
        const item = nearestItem as EntityItem;
        item.isHeld = true;
        item.heldByPlayerId = player.id;
        player.holdingItemId = item.id;
        onEvent?.('sfx', 'pickup');
      }
    }
  }

  private static handlePlayerThrow(room: GameRoomState, player: PlayerState, onEvent?: (type: string, data: any) => void): void {
    if (!player.holdingItemId) return;
    const item = room.items.find(i => i.id === player.holdingItemId);
    if (!item) return;

    item.isHeld = false;
    item.heldByPlayerId = null;
    player.holdingItemId = null;

    let throwX = 0;
    let throwY = 0;
    if (player.facing === 'right') throwX = PHYSICS.throwPower;
    else if (player.facing === 'left') throwX = -PHYSICS.throwPower;
    else if (player.facing === 'down') throwY = PHYSICS.throwPower;
    else if (player.facing === 'up') throwY = -PHYSICS.throwPower;

    item.vx = player.vx + throwX;
    item.vy = player.vy + throwY;
    onEvent?.('sfx', 'throw');
    onEvent?.('item_thrown', { player, item });
  }

  private static handlePlayerSlap(room: GameRoomState, player: PlayerState, onEvent?: (type: string, data: any) => void): void {
    // Slap nearest other player within range
    const slapRange = 50;
    room.players.forEach(other => {
      if (other.id === player.id) return;
      const dist = Math.hypot(other.x - player.x, other.y - player.y);
      if (dist < slapRange) {
        let slapDirX = other.x - player.x;
        let slapDirY = other.y - player.y;
        const len = Math.hypot(slapDirX, slapDirY) || 1;
        other.vx += (slapDirX / len) * PHYSICS.slapPower;
        other.vy += (slapDirY / len) * PHYSICS.slapPower;
        other.isStunned = true;
        other.stunTimer = PHYSICS.slapStunDurationSeconds;

        // If other player was holding an item, slap it out!
        if (other.holdingItemId) {
          const dropped = room.items.find(i => i.id === other.holdingItemId);
          if (dropped) {
            dropped.isHeld = false;
            dropped.heldByPlayerId = null;
            dropped.vx = other.vx * 1.5;
            dropped.vy = other.vy * 1.5;
          }
          other.holdingItemId = null;
          onEvent?.('steal_or_slap', { attacker: player, victim: other });
        }

        onEvent?.('sfx', 'slap');
        onEvent?.('feed', { text: `💥 ${player.name} SLAPPED ${other.name}!`, type: 'hazard' });
      }
    });
  }

  private static triggerExplosion(room: GameRoomState, x: number, y: number, onEvent?: (type: string, data: any) => void): void {
    onEvent?.('sfx', 'explosion');
    onEvent?.('feed', { text: `💣 BOOM! Volcanic Bombfish exploded!`, type: 'hazard' });

    // Blast players away
    room.players.forEach(p => {
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < 180) {
        const force = (180 - dist) * 0.15;
        const dx = (p.x - x) / (dist || 1);
        const dy = (p.y - y) / (dist || 1);
        p.vx += dx * force;
        p.vy += dy * force;
        p.isStunned = true;
        p.stunTimer = 2.0;
      }
    });

    // Blast loose items away
    room.items.forEach(i => {
      const dist = Math.hypot(i.x - x, i.y - y);
      if (dist < 200) {
        const force = (200 - dist) * 0.2;
        i.vx += ((i.x - x) / (dist || 1)) * force;
        i.vy += ((i.y - y) / (dist || 1)) * force;
      }
    });
  }

  private static completeStationProcess(station: WorkStation, onEvent?: (type: string, data: any) => void): void {
    if (!station.heldItem) return;
    const item = station.heldItem;
    const recipe = getRecipeForStation(station.type, item);

    if (recipe) {
      item.name = recipe.outputName;
      item.emoji = recipe.outputEmoji;
      item.type = recipe.outputItemType;
      item.value = Math.round(item.value * recipe.valueMultiplier);
      item.isCooked = true;
      station.isProcessing = false;
      station.progress = 1.0;
      onEvent?.('sfx', 'ding');
      onEvent?.('feed', { text: `✨ Prepared delicious ${item.name} ($${item.value})!`, type: 'score' });
    }
  }

  private static isItemInStation(item: EntityItem, station: WorkStation): boolean {
    return (
      item.x >= station.x &&
      item.x <= station.x + station.w &&
      item.y >= station.y &&
      item.y <= station.y + station.h
    );
  }
}
