# Party System Audit

## Current State
- gameParty.ts: Full CRUD (create/invite/accept/reject/leave/disband/search/join/kick)
- gameParties table: id, partyName, leaderId, leaderName, memberIds (JSON), memberNames (JSON), status (waiting/active/disbanded), maxMembers, isPublic, createdAt, updatedAt
- gamePartyInvites table: inviteId, partyId, inviteeId, inviteeName, inviterId, inviterName, status (pending/accepted/rejected/expired), expiresAt

## What's Missing
1. **Individual tick while in party**: afkTickEngine processes ALL active agents regardless of party status. This is CORRECT behavior - party members already tick independently.
2. **Boss challenge flow**: No "leader initiates boss → members get notification → accept/decline" flow exists. startBattle only handles single-player battles.
3. **Party battle integration**: No party-aware startBattle procedure. Need to create startPartyBattle that:
   - Leader initiates (boss challenge)
   - Members get real-time notification (via WebSocket or polling)
   - Members confirm participation
   - Battle includes all party members + their pets
4. **Turn timer**: No 30-second turn timer exists. submitCommand has no timeout.

## Plan
1. Individual tick: Already works ✅ (no changes needed)
2. Add boss challenge initiation flow (leader → members)
3. Add party battle start procedure
4. Add 30-second turn timer with admin config
5. Add front/back row positioning (player back, pet front)
