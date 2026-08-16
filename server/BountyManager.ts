// Uncle Gary's Sabotage Bounty Management System

import { PlayerState, SecretBounty, EntityItem } from '../shared/types';
import { generateSecretBounty } from '../shared/bounties';

export class BountyManager {
  public static assignInitialBounty(player: PlayerState): SecretBounty {
    const bounty = generateSecretBounty(player.playerIndex);
    player.activeBounty = bounty;
    return bounty;
  }

  public static rerollBounty(player: PlayerState): SecretBounty {
    const bounty = generateSecretBounty(player.playerIndex);
    player.activeBounty = bounty;
    return bounty;
  }

  public static onGameEvent(
    eventType: string, 
    data: any, 
    players: PlayerState[], 
    onBountyCompleted: (player: PlayerState, bounty: SecretBounty) => void
  ): void {
    players.forEach(player => {
      const b = player.activeBounty;
      if (!b || b.isCompleted) return;

      let progress = false;

      if (b.type === 'steal_fish' && eventType === 'steal_or_slap') {
        if (data.attacker?.id === player.id) {
          b.currentCount++;
          progress = true;
        }
      } else if (b.type === 'drop_overboard' && eventType === 'item_overboard') {
        b.currentCount++;
        progress = true;
      } else if (b.type === 'slap_player' && eventType === 'steal_or_slap') {
        if (data.attacker?.id === player.id) {
          b.currentCount++;
          progress = true;
        }
      }

      if (progress && b.currentCount >= b.targetCount) {
        b.isCompleted = true;
        player.privateCash += b.rewardCash;
        onBountyCompleted(player, b);
      }
    });
  }
}
