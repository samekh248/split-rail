import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLayerGroup, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useCreateStage, useDeleteStage, useStages } from '@/api/festivals';
import { StageDeleteConfirm } from '@/components/festival/StageDeleteConfirm';

export interface StageManagerPanelProps {
  venueId: string;
  eventId: string;
  canManage: boolean;
}

function mapStageError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('403')) {
    return 'You do not have permission to manage stages.';
  }
  if (message.includes('409') || message.includes('400')) {
    const detail = message.replace(/^\d+:\s*/, '');
    return detail || 'That stage change could not be applied.';
  }
  return 'Something went wrong. Please try again.';
}

export function StageManagerPanel({ venueId, eventId, canManage }: StageManagerPanelProps) {
  const stagesQuery = useStages(venueId, eventId);
  const createStage = useCreateStage(venueId, eventId);
  const deleteStage = useDeleteStage(venueId, eventId);

  const [newStageName, setNewStageName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    blockCount: number;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const stages = stagesQuery.data ?? [];
  const isLastStage = stages.length <= 1;

  const handleAdd = async () => {
    const name = newStageName.trim();
    if (!name) {
      setError('Stage name is required.');
      return;
    }
    setError(null);
    try {
      await createStage.mutateAsync({ name, sortOrder: null });
      setNewStageName('');
    } catch (err) {
      setError(mapStageError(err));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteError(null);
    setError(null);
    try {
      await deleteStage.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      const message = mapStageError(err);
      setDeleteError(message);
      setError(message);
    }
  };

  return (
    <section className="stage-manager" data-testid="stage-manager-panel">
      <h3 className="stage-manager__title">
        <FontAwesomeIcon icon={faLayerGroup} aria-hidden="true" /> Stages &amp; zones
      </h3>

      {stagesQuery.isLoading ? <p className="stage-manager__loading">Loading stages…</p> : null}

      {error ? (
        <p className="stage-manager__error" role="alert" data-testid="stage-manager-error">
          {error}
        </p>
      ) : null}

      <div className="stage-manager__table-wrap">
        <table className="ledger-table stage-manager__table">
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">Blocks</th>
              {canManage ? (
                <th scope="col" className="stage-manager__actions-col">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {stages.map((stage) => (
              <tr key={stage.id} data-testid={`stage-row-${stage.id}`}>
                <td className="stage-manager__name">{stage.name}</td>
                <td className="stage-manager__count">
                  {stage.blockCount} {stage.blockCount === 1 ? 'block' : 'blocks'}
                </td>
                {canManage ? (
                  <td className="stage-manager__actions">
                    <button
                      type="button"
                      className="stage-manager__delete btn-danger-outline"
                      data-testid={`stage-delete-${stage.id}`}
                      aria-label={
                        isLastStage
                          ? `Delete ${stage.name ?? 'stage'} — a festival must keep at least one stage`
                          : `Delete ${stage.name ?? 'stage'}`
                      }
                      onClick={() =>
                        setDeleteTarget({
                          id: stage.id ?? '',
                          name: stage.name ?? 'Stage',
                          blockCount: stage.blockCount ?? 0,
                        })
                      }
                      disabled={deleteStage.isPending || isLastStage}
                      title={isLastStage ? 'A festival must keep at least one stage.' : undefined}
                    >
                      <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage ? (
        <div className="stage-manager__add">
          <label className="sr-only" htmlFor="stage-manager-new-name">
            New stage name
          </label>
          <input
            id="stage-manager-new-name"
            type="text"
            className="form-field__input stage-manager__input"
            value={newStageName}
            onChange={(event) => setNewStageName(event.target.value)}
            placeholder="e.g. Rodeo Arena"
            disabled={createStage.isPending}
            data-testid="stage-manager-new-name"
          />
          <button
            type="button"
            className="stage-manager__add-button btn-primary--compact btn-icon-label"
            onClick={() => void handleAdd()}
            disabled={createStage.isPending}
            data-testid="stage-manager-add"
          >
            <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
            Add stage
          </button>
        </div>
      ) : null}

      <StageDeleteConfirm
        stageName={deleteTarget?.name ?? 'Stage'}
        blockCount={deleteTarget?.blockCount ?? 0}
        open={Boolean(deleteTarget)}
        isPending={deleteStage.isPending}
        error={deleteError}
        onCancel={() => {
          if (deleteStage.isPending) {
            return;
          }
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </section>
  );
}
