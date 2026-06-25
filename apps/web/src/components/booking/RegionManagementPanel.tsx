import { useState } from 'react';
import { useCreateRegion, useDeleteRegion, useRegions, useUpdateRegion } from '@/api/regions';

export interface RegionManagementPanelProps {
  open: boolean;
  onClose: () => void;
}

export function RegionManagementPanel({ open, onClose }: RegionManagementPanelProps) {
  const { data: regions = [], refetch } = useRegions();
  const createRegion = useCreateRegion();
  const deleteRegion = useDeleteRegion();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const updateRegion = useUpdateRegion(editingId ?? '');

  if (!open) {
    return null;
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await createRegion.mutateAsync({ name, notes: notes || null });
      setName('');
      setNotes('');
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
      setEditingId(null);
      setName('');
      setNotes('');
      await refetch();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update region.');
    }
  };

  return (
    <div className="booking-region-panel" data-testid="booking-region-panel" role="dialog" aria-modal="true">
      <header>
        <h2>Manage regions</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>
      <ul>
        {regions.map((region) => (
          <li key={region.id}>
            <span>{region.name}</span>
            <span>{region.venueCount ?? 0} venues</span>
            <button
              type="button"
              onClick={() => {
                setEditingId(region.id ?? null);
                setName(region.name ?? '');
                setNotes(region.notes ?? '');
              }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => region.id && deleteRegion.mutate(region.id, { onSuccess: () => refetch() })}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={editingId ? handleUpdate : handleCreate}>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button type="submit">{editingId ? 'Save region' : 'Add region'}</button>
      </form>
    </div>
  );
}
