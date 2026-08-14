import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLayerGroup, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useCreateStage, useDeleteStage, useStages } from '@/api/festivals';

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

  const handleDelete = async (stageId: string) => {
    setError(null);
    try {
      await deleteStage.mutateAsync(stageId);
    } catch (err) {
      setError(mapStageError(err));
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

      <ul className="stage-manager__list">
        {stages.map((stage) => (
          <li key={stage.id} className="stage-manager__item" data-testid={`stage-row-${stage.id}`}>
            <span className="stage-manager__name">{stage.name}</span>
            <span className="stage-manager__count">
              {stage.blockCount} {stage.blockCount === 1 ? 'block' : 'blocks'}
            </span>
            {canManage ? (
              <button
                type="button"
                className="stage-manager__delete btn-icon-label"
                data-testid={`stage-delete-${stage.id}`}
                onClick={() => void handleDelete(stage.id ?? '')}
                disabled={deleteStage.isPending || isLastStage}
                title={isLastStage ? 'A festival must keep at least one stage.' : undefined}
              >
                <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                <span className="sr-only">Delete {stage.name}</span>
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {canManage ? (
        <div className="stage-manager__add">
          <label className="sr-only" htmlFor="stage-manager-new-name">
            New stage name
          </label>
          <input
            id="stage-manager-new-name"
            type="text"
            className="stage-manager__input"
            value={newStageName}
            onChange={(event) => setNewStageName(event.target.value)}
            placeholder="e.g. Rodeo Arena"
            disabled={createStage.isPending}
            data-testid="stage-manager-new-name"
          />
          <button
            type="button"
            className="stage-manager__add-button btn-icon-label"
            onClick={() => void handleAdd()}
            disabled={createStage.isPending}
            data-testid="stage-manager-add"
          >
            <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
            Add stage
          </button>
        </div>
      ) : null}
    </section>
  );
}
