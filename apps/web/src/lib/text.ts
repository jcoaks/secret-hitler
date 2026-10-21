import type { Party, Policy, Power, Role, WinReason } from '@sh/engine';

export const ROLE_NAME: Record<Role, string> = {
  liberal: 'Liberal',
  fascist: 'Fascista',
  hitler: 'Hitler',
};

export const PARTY_NAME: Record<Party, string> = { liberal: 'Liberal', fascist: 'Fascista' };

export const POLICY_NAME: Record<Policy, string> = { liberal: 'liberal', fascist: 'fascista' };

export const POWER_NAME: Record<Power, string> = {
  investigate: 'Investigación',
  peek: 'Espiar políticas',
  special_election: 'Elección especial',
  execution: 'Ejecución',
};

export const POWER_HINT: Record<Power, string> = {
  investigate: 'El presidente investiga la afiliación de un jugador.',
  peek: 'El presidente mira las tres próximas políticas.',
  special_election: 'El presidente elige al siguiente candidato a presidente.',
  execution: 'El presidente debe ejecutar a un jugador.',
};

export const WIN_TEXT: Record<WinReason, string> = {
  liberal_policies: '¡Los liberales aprobaron cinco políticas liberales!',
  hitler_executed: '¡Los liberales ejecutaron a Hitler!',
  fascist_policies: '¡Los fascistas aprobaron seis políticas fascistas!',
  hitler_elected: '¡Los fascistas eligieron a Hitler como canciller!',
};

/** From the original Spanish role alerts. */
export const ROLE_GOALS: Record<Role, string[]> = {
  hitler: [
    'Ganas si eres elegido canciller una vez que haya 3 políticas fascistas en el tablero, o si el tablero se llena de políticas fascistas.',
    'Pierdes si el tablero se llena de políticas liberales o si eres ejecutado.',
    'Intenta ganar confianza y confía en los otros fascistas para que te abran oportunidades.',
  ],
  fascist: [
    'Ganas si Hitler es elegido canciller una vez que haya 3 políticas fascistas en el tablero, o si el tablero se llena de políticas fascistas.',
    'Pierdes si el tablero se llena de políticas liberales o si Hitler es ejecutado.',
    'Mantén las sospechas lejos de Hitler y busca formas de sembrar confusión en el juego.',
  ],
  liberal: [
    'Ganas si el tablero se llena de políticas liberales, o si Hitler es ejecutado.',
    'Pierdes si el tablero se llena de políticas fascistas, o si Hitler es elegido canciller después de que se aprueben 3 políticas fascistas.',
    'Mantén los ojos abiertos y busca acciones sospechosas. Descubre a Hitler, ¡y recuerda que cualquiera podría estar mintiendo!',
  ],
};
