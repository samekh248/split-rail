import type { ReactNode } from 'react';
import { ModalCloseButton } from '@/components/shell/ModalCloseButton';

export interface ModalHeaderProps {
  title: string;
  titleId: string;
  onClose: () => void;
  closeDisabled?: boolean;
  closeTestId?: string;
  className?: string;
  titleClassName?: string;
  titleAction?: ReactNode;
}

export function ModalHeader({
  title,
  titleId,
  onClose,
  closeDisabled = false,
  closeTestId,
  className = 'modal-header',
  titleClassName = 'welcome-modal__title',
  titleAction,
}: ModalHeaderProps) {
  return (
    <header className={className}>
      <div className="modal-header__title-row">
        <h2 id={titleId} className={titleClassName}>
          {title}
        </h2>
        {titleAction}
      </div>
      <ModalCloseButton onClick={onClose} disabled={closeDisabled} data-testid={closeTestId} />
    </header>
  );
}
