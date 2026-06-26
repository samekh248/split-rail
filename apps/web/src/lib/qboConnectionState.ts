export type QboConnectionState = 'Disconnected' | 'Connected' | 'Expired';

export function isQboConnectedState(state: QboConnectionState | string | undefined): boolean {
  return state === 'Connected';
}

export function parseQboConnectionState(value: string | undefined): QboConnectionState {
  if (value === 'Connected' || value === 'Expired') {
    return value;
  }
  return 'Disconnected';
}
