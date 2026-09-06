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

function phoneFromJid(value) {
  const jid = jidFrom(value);
  if (!jid) return '';
  return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
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

export function normalizeWahaGroups(payload, sessionId, now = new Date().toISOString(), sessionIdentity = null) {
  const source = Array.isArray(payload)
    ? payload
    : payload?.groups || payload?.data || payload?.items || [];

  const normalized = source.flatMap(raw => {
    const group = raw?.group || raw?.groupMetadata || raw;
    const id = jidFrom(firstDefined(group?.id, group?.JID, group?.jid, group?.groupId, raw?.id, raw?.JID));
    if (!id) return [];
    const participants = firstDefined(group?.participants, group?.Participants, raw?.participants, raw?.Participants);
    const participantList = Array.isArray(participants) ? participants : [];
    const ownPhone = phoneFromJid(firstDefined(sessionIdentity?.id, sessionIdentity?.JID, sessionIdentity?.jid, sessionIdentity));
    const ownParticipant = ownPhone
      ? participantList.find(participant => [participant?.JID, participant?.jid, participant?.id, participant?.PhoneNumber, participant?.phoneNumber]
        .some(candidate => phoneFromJid(candidate) === ownPhone))
      : null;
    const isOwner = Boolean(ownPhone && [group?.OwnerJID, group?.ownerJid, group?.OwnerPN, group?.owner]
      .some(candidate => phoneFromJid(candidate) === ownPhone));
    const isAdmin = Boolean(firstDefined(group?.isAdmin, group?.IsAdmin, raw?.isAdmin, false))
      || Boolean(ownParticipant?.IsAdmin || ownParticipant?.isAdmin || ownParticipant?.IsSuperAdmin || ownParticipant?.isSuperAdmin)
      || isOwner;
    return [{
      id,
      name: groupName(group),
      memberCount: Number(firstDefined(group?.size, group?.memberCount, raw?.size, raw?.memberCount, participantList.length, 0)),
      isAdmin,
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
