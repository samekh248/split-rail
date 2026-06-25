import { useEffect, useRef, useState } from 'react';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FormField } from '@/components/auth/FormField';
import { useCreateRegion, useDeleteRegion, useRegions, useUpdateRegion } from '@/api/regions';

export interface RegionManagementPanelProps {
  open: boolean;
  onClose: () => void;
}

export function RegionManagementPanel({ open, onClose }: RegionManagementPanelProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { data: regions = [], refetch } = useRegions();
  const createRegion = useCreateRegion();
  const deleteRegion = useDeleteRegion();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const updateRegion = useUpdateRegion(editingId ?? '');

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setNotes('');
    setError(null);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await createRegion.mutateAsync({ name, notes: notes || null });
      resetForm();
      await refetch();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create region.');
    }
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId) {
      return;
    }
    setError(null);
    try {
      await updateRegion.mutateAsync({ name, notes: notes || null });
      resetForm();
      await refetch();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update region.');
    }
  };

  const startEditing = (region: (typeof regions)[number]) => {
    setEditingId(region.id ?? null);
    setName(region.name ?? '');
    setNotes(region.notes ?? '');
    setError(null);
  };

  const isPending = createRegion.isPending || updateRegion.isPending || deleteRegion.isPending;

  return (
    <div className="welcome-modal__backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="welcome-modal region-panel"
        data-testid="booking-region-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="region-panel-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="region-panel__header">
          <h2 id="region-panel-title" className="welcome-modal__title">
            Manage regions
          </h2>
          <button
            type="button"
            className="region-panel__close"
            data-testid="booking-region-panel-close"
            aria-label="Close"
            onClick={onClose}
          >
            <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
          </button>
        </header>

        <section className="region-panel__section" aria-labelledby="region-panel-list-heading">
          <h3 id="region-panel-list-heading" className="region-panel__section-title">
            Regions
          </h3>
          {regions.length === 0 ? (
            <p className="region-panel__empty">No regions yet. Add one below to organize venues.</p>
          ) : (
            <table className="team-table region-panel__table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Venues</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((region) => (
                  <tr key={region.id}>
                    <td>{region.name}</td>
                    <td>{region.venueCount ?? 0}</td>
                    <td>
                      <div className="team-table__actions">
                        <button
                          type="button"
                          data-testid={`edit-region-${region.id}`}
                          disabled={isPending}
                          onClick={() => startEditing(region)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          data-testid={`delete-region-${region.id}`}
                          disabled={isPending}
                          onClick={() =>
                            region.id &&
                            deleteRegion.mutate(region.id, { onSuccess: () => void refetch() })
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <form
          className="region-panel__form"
          onSubmit={editingId ? handleUpdate : handleCreate}
          aria-labelledby="region-panel-form-heading"
        >
          <h3 id="region-panel-form-heading" className="region-panel__section-title">
            {editingId ? 'Edit region' : 'Add region'}
          </h3>
          <FormField
            id="region-panel-name"
            label="Name"
            type="text"
            value={name}
            onChange={setName}
            required
            disabled={isPending}
          />
          <div className="form-field">
            <label htmlFor="region-panel-notes" className="form-field__label">
              Notes
            </label>
            <textarea
              id="region-panel-notes"
              className="form-field__input"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isPending}
              rows={3}
              data-testid="region-panel-notes"
            />
          </div>
          {error ? (
            <p className="team-modal__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="team-modal__actions">
            {editingId ? (
              <button type="button" className="btn-secondary" disabled={isPending} onClick={resetForm}>
                Cancel edit
              </button>
            ) : null}
            <button type="submit" className="team-modal__save" disabled={isPending || !name.trim()}>
              {editingId
                ? updateRegion.isPending
                  ? 'Saving…'
                  : 'Save region'
                : createRegion.isPending
                  ? 'Adding…'
                  : 'Add region'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
