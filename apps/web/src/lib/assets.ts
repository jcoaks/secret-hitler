// Artwork adapted from the Secret Hitler board game (CC BY-NC-SA 4.0) by Secret Hitler Online.
import type { BoardId, Party, Policy, Role } from '@sh/engine';
import boardDiscard from '../assets/board-discard.webp';
import boardDraw from '../assets/board-draw.webp';
import boardFascistSmall from '../assets/board-fascist-5-6.webp';
import boardFascistMedium from '../assets/board-fascist-7-8.webp';
import boardFascistLarge from '../assets/board-fascist-9-10.webp';
import boardLiberal from '../assets/board-liberal.webp';
import boardPolicyBack from '../assets/board-policy.webp';
import boardPolicyFascist from '../assets/board-policy-fascist.webp';
import boardPolicyLiberal from '../assets/board-policy-liberal.webp';
import boardTracker from '../assets/board-tracker.webp';
import membershipBack from '../assets/party-membership.webp';
import membershipFascist from '../assets/party-membership-fascist.webp';
import membershipLiberal from '../assets/party-membership-liberal.webp';
import playerBase from '../assets/player-base.webp';
import playerBaseUnselectable from '../assets/player-base-unselectable.webp';
import iconBusy from '../assets/player-icon-busy.webp';
import iconFascist from '../assets/player-icon-fascist.webp';
import iconHitler from '../assets/player-icon-hitler.webp';
import iconJa from '../assets/player-icon-ja.webp';
import iconLiberal from '../assets/player-icon-liberal.webp';
import iconNein from '../assets/player-icon-nein.webp';
import policyFascist from '../assets/policy-fascist.webp';
import policyLiberal from '../assets/policy-liberal.webp';
import envelopeBack from '../assets/role-envelope-back.webp';
import envelopeFront from '../assets/role-envelope-front.webp';
import roleFascist1 from '../assets/role-fascist-1.webp';
import roleFascist2 from '../assets/role-fascist-2.webp';
import roleFascist3 from '../assets/role-fascist-3.webp';
import roleHitler from '../assets/role-hitler.webp';
import roleLiberal1 from '../assets/role-liberal-1.webp';
import roleLiberal2 from '../assets/role-liberal-2.webp';
import roleLiberal3 from '../assets/role-liberal-3.webp';
import roleLiberal4 from '../assets/role-liberal-4.webp';
import roleLiberal5 from '../assets/role-liberal-5.webp';
import roleLiberal6 from '../assets/role-liberal-6.webp';
import victoryFascistFooter from '../assets/victory-fascist-footer.webp';
import victoryFascistHeader from '../assets/victory-fascist-header.webp';
import victoryLiberalFooter from '../assets/victory-liberal-footer.webp';
import victoryLiberalHeader from '../assets/victory-liberal-header.webp';
import voteNo from '../assets/vote-no.webp';
import voteYes from '../assets/vote-yes.webp';

const portraitModules = import.meta.glob<string>('../assets/portraits/*.svg', {
  eager: true,
  import: 'default',
});

export function portraitUrl(portrait: number): string {
  return portraitModules[`../assets/portraits/${portrait}.svg`] ?? '';
}

export const art = {
  boardLiberal,
  boardFascist: {
    small: boardFascistSmall,
    medium: boardFascistMedium,
    large: boardFascistLarge,
  } satisfies Record<BoardId, string>,
  boardPolicy: { liberal: boardPolicyLiberal, fascist: boardPolicyFascist } satisfies Record<
    Policy,
    string
  >,
  boardPolicyBack,
  boardTracker,
  boardDraw,
  boardDiscard,
  policy: { liberal: policyLiberal, fascist: policyFascist } satisfies Record<Policy, string>,
  membership: { liberal: membershipLiberal, fascist: membershipFascist } satisfies Record<
    Party,
    string
  >,
  membershipBack,
  playerBase,
  playerBaseUnselectable,
  roleIcon: { liberal: iconLiberal, fascist: iconFascist, hitler: iconHitler } satisfies Record<
    Role,
    string
  >,
  iconBusy,
  iconJa,
  iconNein,
  voteYes,
  voteNo,
  envelopeFront,
  envelopeBack,
  victory: {
    liberal: { header: victoryLiberalHeader, footer: victoryLiberalFooter },
    fascist: { header: victoryFascistHeader, footer: victoryFascistFooter },
  } satisfies Record<Party, { header: string; footer: string }>,
};

const ROLE_CARDS: Record<Role, string[]> = {
  liberal: [roleLiberal1, roleLiberal2, roleLiberal3, roleLiberal4, roleLiberal5, roleLiberal6],
  fascist: [roleFascist1, roleFascist2, roleFascist3],
  hitler: [roleHitler],
};

/** Each player always gets the same card art for their role (by seat), like drawing from the box. */
export function roleCardUrl(role: Role, seed: string): string {
  const cards = ROLE_CARDS[role];
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return cards[hash % cards.length] as string;
}
