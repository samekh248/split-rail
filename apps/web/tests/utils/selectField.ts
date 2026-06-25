import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

export async function pickSelectFieldOption(
  user: UserEvent,
  fieldTestId: string,
  optionValue: string,
): Promise<void> {
  await user.click(await screen.findByTestId(fieldTestId));
  await user.click(await screen.findByTestId(`${fieldTestId}-option-${optionValue}`));
}

export async function pickSelectFieldByLabel(
  user: UserEvent,
  label: string,
  optionName: string,
): Promise<void> {
  await user.click(screen.getByLabelText(label));
  await user.click(screen.getByRole('option', { name: optionName }));
}
