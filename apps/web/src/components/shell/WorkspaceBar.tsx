import type { ReactNode } from 'react';

export interface WorkspaceBarProps {
  content?: ReactNode;
}

export function WorkspaceBar({ content }: WorkspaceBarProps) {
  if (!content) {
    return null;
  }

  return (
    <div className="workspace-bar" data-testid="workspace-bar">
      <div className="workspace-bar__content" data-testid="workspace-bar-content">
        {content}
      </div>
    </div>
  );
}
