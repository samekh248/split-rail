import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';

interface QboCorrectionBadgeProps {
  lineItemId: string;
}

export function QboCorrectionBadge({ lineItemId }: QboCorrectionBadgeProps) {
  return (
    <span
      className="ledger-row__qbo-correction-badge"
      data-testid={`qbo-correction-badge-${lineItemId}`}
      aria-label="QBO actuals include upstream corrections"
    >
      <FontAwesomeIcon icon={faClockRotateLeft} aria-hidden="true" />
    </span>
  );
}
