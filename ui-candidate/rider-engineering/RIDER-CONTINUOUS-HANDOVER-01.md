# RIDER-CONTINUOUS-HANDOVER-01
2026-11-14 Asia/Taipei. Test frontend only; no DB/Edge changes.

Same current delivery stop only. Existing safe grouping (receiver and exact destination) retained. Capture current bag, verify exact code, add compressed Blob to in-memory queue, open next bag with one shared camera. No uploads/handover during staging. Conditions and bag list are collapsed details below controls. Final swipe uploads and hands over each bag using existing authorized APIs.

This is a UI batch, not an atomic database transaction. Each entry stores its own upload path and command UUID/payload. Read back exact delivery_photo_path + pending/delivered state before skipping a previously committed bag. On uncertainty stop the loop; retry checks already committed entries, does not restart all handovers. Partial success displayed explicitly. No automatic receipt/signature. No optimistic release of capacity.

Queue scoped to owner/workspace/actor/epoch; close/tab/session change discards staging. Photos remain memory-only until final confirmation; closing/reloading requires retaking pending photos. During submission close/Escape blocked; account change still clears UI/streams. Existing 100000-byte private proof contract retained.

Verification: JS syntax; continuous-handover-regression.cjs mock tests serial per-bag upload, committed-but-lost response, no duplicate handover, scope rejection, handover_pending (not signed). Phone continuous scan/photo layout and real Auth/Storage batch E2E remain pending.
