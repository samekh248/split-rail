import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  formatMultiSelectLabel,
  MultiSelectField,
} from '@/components/auth/MultiSelectField';

const options = [
  { value: 'stage-1', label: 'Main Stage' },
  { value: 'stage-2', label: 'Side Stage' },
  { value: 'stage-3', label: 'Rodeo Arena' },
];

describe('formatMultiSelectLabel', () => {
  it('shows the placeholder when nothing is selected', () => {
    expect(formatMultiSelectLabel([], options, 'All stages')).toBe('All stages');
  });

  it('summarizes one, two, or many selections', () => {
    expect(formatMultiSelectLabel(['stage-1'], options, 'All stages')).toBe('Main Stage');
    expect(formatMultiSelectLabel(['stage-1', 'stage-2'], options, 'All stages')).toBe(
      'Main Stage, Side Stage',
    );
    expect(formatMultiSelectLabel(['stage-1', 'stage-2', 'stage-3'], options, 'All stages')).toBe(
      'Main Stage + 2 more',
    );
  });
});

describe('MultiSelectField', () => {
  it('toggles values and supports select all / clear', () => {
    const onChange = vi.fn();
    render(
      <MultiSelectField
        id="stage-filter"
        label="Stage"
        values={[]}
        options={options}
        placeholder="All stages"
        onChange={onChange}
        data-testid="stage-filter"
      />,
    );

    fireEvent.click(screen.getByTestId('stage-filter'));
    fireEvent.click(screen.getByTestId('stage-filter-option-stage-1').querySelector('input')!);
    expect(onChange).toHaveBeenCalledWith(['stage-1']);

    onChange.mockClear();
    fireEvent.click(screen.getByTestId('stage-filter-select-all'));
    expect(onChange).toHaveBeenCalledWith(['stage-1', 'stage-2', 'stage-3']);

    onChange.mockClear();
    fireEvent.click(screen.getByTestId('stage-filter-clear'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
