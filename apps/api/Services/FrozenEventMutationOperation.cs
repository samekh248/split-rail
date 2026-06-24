namespace SplitRail.Api.Services;

public static class FrozenEventMutationOperation
{
    public const string UpdateEventMetadata = "update_event_metadata";
    public const string DeleteEvent = "delete_event";
    public const string LockBudget = "lock_budget";
    public const string CreateLineItem = "create_line_item";
    public const string UpdateLineItem = "update_line_item";
    public const string DeleteLineItem = "delete_line_item";
    public const string CreateArtist = "create_artist";
    public const string UpdateArtist = "update_artist";
    public const string DeleteArtist = "delete_artist";
    public const string Recalculate = "recalculate";
    public const string QboSyncRecompute = "qbo_sync_recompute";

    public const string PersistenceUpdateEvent = "persistence_update_event";
    public const string PersistenceDeleteEvent = "persistence_delete_event";
    public const string PersistenceCreateLineItem = "persistence_create_line_item";
    public const string PersistenceUpdateLineItem = "persistence_update_line_item";
    public const string PersistenceDeleteLineItem = "persistence_delete_line_item";
    public const string PersistenceCreateArtist = "persistence_create_artist";
    public const string PersistenceUpdateArtist = "persistence_update_artist";
    public const string PersistenceDeleteArtist = "persistence_delete_artist";
}
