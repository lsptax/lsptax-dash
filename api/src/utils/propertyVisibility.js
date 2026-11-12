/**
 * Active lists count a property only when the property and its client are both active.
 * Archived lists include a property that is archived itself, or that belongs to an archived client.
 */

export function activeOwnedPropertyWhere() {
  return {
    isArchived: false,
    client: { isArchived: false },
  };
}

export function propertyVisibilityWhere(isArchived) {
  if (isArchived) {
    return {
      OR: [{ isArchived: true }, { client: { isArchived: true } }],
    };
  }
  return activeOwnedPropertyWhere();
}

/**
 * Property rows to change when a client or prospect is archived or restored.
 * Archiving marks only properties that are active now.
 * Restoring brings back only those marked properties, and leaves individually archived ones archived.
 */
export function contactArchivePropertyChange(clientId, nextArchived) {
  if (nextArchived) {
    return {
      where: { clientId, isArchived: false },
      data: { isArchived: true, archivedWithClient: true },
    };
  }
  return {
    where: { clientId, archivedWithClient: true },
    data: { isArchived: false, archivedWithClient: false },
  };
}

/** A property archived or restored on its own is not tied to the client archive. */
export function propertyArchiveData(nextArchived) {
  return { isArchived: nextArchived, archivedWithClient: false };
}

/** Hearings follow the same active-property rule, with an optional client search. */
export function activeHearingPropertyWhere(clientMatch = null) {
  return {
    isArchived: false,
    client: clientMatch
      ? { AND: [{ isArchived: false }, clientMatch] }
      : { isArchived: false },
  };
}
