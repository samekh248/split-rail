import { ModalCloseButton } from '@/components/shell/ModalCloseButton';

export interface ModalHeaderProps {
  title: string;
  titleId: string;
  onClose: () => void;
  closeDisabled?: boolean;
  closeTestId?: string;
  className?: string;
  titleClassName?: string;
}

export function ModalHeader({
  title,
  titleId,
  onClose,
  closeDisabled = false,
  closeTestId,
  className = 'modal-header',
  titleClassName = 'welcome-modal__title',
}: ModalHeaderProps) {
  return (
    <header className={className}>
      <h2 id={titleId} className={titleClassName}>
        {title}
      </h2>
      <ModalCloseButton onClick={onClose} disabled={closeDisabled} data-testid={closeTestId} />
    </header>
  );
}
