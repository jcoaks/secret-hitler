// Per-browser memory. Storage can be missing or throw (private mode, blocked
// site data), so every access is guarded and the app works without it.

const SEAT_PREFIX = 'sh:seat:';
const NAME_KEY = 'sh:name';
const INTRO_PREFIX = 'sh:intro-seen:';

function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function write(storage: () => Storage, key: string, value: string | null): void {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // Ignore: the app keeps working for this tab.
  }
}

const local = () => window.localStorage;
const tab = () => window.sessionStorage;

/** Room codes are stored normalized ("KX7QM2"). */
export const seatToken = {
  get: (code: string) => read(local, SEAT_PREFIX + code),
  set: (code: string, token: string) => write(local, SEAT_PREFIX + code, token),
  clear: (code: string) => write(local, SEAT_PREFIX + code, null),
};

export const lastName = {
  get: () => read(local, NAME_KEY) ?? '',
  set: (name: string) => write(local, NAME_KEY, name),
};

/** Whether this tab already dismissed the role reveal for the current game in a room. */
export const introSeen = {
  get: (code: string) => read(tab, INTRO_PREFIX + code) === '1',
  set: (code: string, seen: boolean) => write(tab, INTRO_PREFIX + code, seen ? '1' : null),
};
