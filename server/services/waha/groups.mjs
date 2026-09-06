function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '');
}

function jidFrom(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return undefined;
  return firstDefined(
    value._serialized,
    value.id,
    value.JID,
    value.jid,
    value.user && value.server ? `${value.user}@${value.server}` : undefined,
    value.User && value.Server ? `${value.User}@${value.Server}` : undefined,
  );
}

function groupName(group) {
  const candidate = firstDefined(
    group.name,
    group.subject,
    group.Name,
    group.Subject,
    group.groupName,
    group.GroupName?.Name,
    group.groupMetadata?.subject,
    group._data?.Name,
  );
  if (typeof candidate === 'string') return candidate;
  return candidate?.Name || candidate?.name || 'Grupo sem nome';
}

export function normalizeWahaGroups(payload, sessionId, now = new Date().toISOString()) {
  const source = Array.isArray(payload)
    ? payload
    : payload?.groups || payload?.data || payload?.items || [];

  const normalized = source.flatMap(raw => {
    const group = raw?.group || raw?.groupMetadata || raw;
    const id = jidFrom(firstDefined(group?.id, group?.JID, group?.jid, group?.groupId, raw?.id, raw?.JID));
    if (!id) return [];
    const participants = firstDefined(group?.participants, group?.Participants, raw?.participants, raw?.Participants);
    const participantList = Array.isArray(participants) ? participants : [];
    return [{
      id,
      name: groupName(group),
      memberCount: Number(firstDefined(group?.size, group?.memberCount, raw?.size, raw?.memberCount, participantList.length, 0)),
      isAdmin: Boolean(firstDefined(group?.isAdmin, group?.IsAdmin, raw?.isAdmin, false)),
      status: 'active',
      messagesSent30d: 0,
      messagesReceived30d: 0,
      lastActivity: now,
      addedAt: now,
      ...(sessionId ? { sessionId } : {}),
    }];
  });

  return Array.from(new Map(normalized.map(group => [group.id, group])).values());
}
