export interface BlockConflictInfo {
  conflictingBlockId?: string;
  conflictingBlockTitle: string;
  conflictingStartTime?: string;
  conflictingEndTime?: string;
  message: string;
}

const CONFLICT_TITLE_PATTERN =
  /^'([^']+)' already occupies this stage from (\d{2}:\d{2}) to (\d{2}:\d{2})\./;

export function isBlockConflictError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.startsWith('409:') || message.includes('block_conflict');
}

export function parseBlockConflictError(error: unknown): BlockConflictInfo {
  const message = error instanceof Error ? error.message : String(error);
  const detail = message.replace(/^\d+:\s*/, '');
  const match = detail.match(CONFLICT_TITLE_PATTERN);

  if (match) {
    return {
      conflictingBlockTitle: match[1],
      conflictingStartTime: match[2],
      conflictingEndTime: match[3],
      message: detail,
    };
  }

  return {
    conflictingBlockTitle: 'another block',
    message: detail || 'This placement conflicts with another block on the same stage.',
  };
}
