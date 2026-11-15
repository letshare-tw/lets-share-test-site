# ARTISAN-TEST-02 — persistent batch receiving

Base: d48d4c2b4878f07b1b6bfb2b2fbf0f8af3f49308. Existing approved UI unchanged except collapsible receiving test tools and barcode/receipt display.

Sources: own isolated artisan test_bags (explicit create_test_bags -> in_transit -> explicit simulate_handover -> pending), and own enabled nonformal rider workspace tasks with receiver_key=receiver and status handover_pending/delivered. This is a same-owner synthetic test bridge, not authorization to receive another real person's delivery. public.lx_share_bags is untouched.

All requests recheck existing four-account Google/member gate and artisan activation. RLS/no direct table grants; private receiving_snapshot is not executable by clients. Private gateway identity_gateway locks own workspace. receive_batch confirmed=true, 1..30 unique exact bag codes; batch owner+UUID stores canonical codes for replay. Invalid late item rolls back whole batch. Existing rider receive gateway handles its own revision, events and delivered/received_at/receipt_code updates. Successful replay returns refreshed snapshot, not an old cached bag state.

Frontend newest-first scan list remains. Save sends one atomic RPC with stable UUID across retries. Uncertain responses read status first. Camera remains active across scans, stops on save. Reload reloads backend bags; QR Code Generator 1.4.4 is vendored with upstream MIT copyright. Barcode scanning remains device dependent; manual input supported.

User path: 收件 -> 收件測試工具／袋碼 -> ①建立三袋 -> ②模擬交件 -> 袋碼 (QR on another screen/printed) -> scan OR manual -> confirm seal -> save -> reload -> received receipt. Fixtures are per-account idempotent, never reset already received bags. Buttons do not grant formal qualifications, create real share requests or fake rider proof photos. Existing real rider test handovers become visible through refresh.

Verification (SQL all BEGIN/ROLLBACK, no durable fixtures created): transit denied, create/hand over, atomic late-invalid rollback, one receipt across command replay, cross-owner hidden, real existing rider handover transitions to delivered with receipt then rolled back. JS load/dedupe/QR generation and syntax PASS. Phone camera and real user save/reload PENDING. Security advisory INFO no-policy +2 intentionally RPC-only private tables; existing 3 WARN category/count unchanged.

Still pending: real cross-account rider/artisan assignment roles, true share bag mapping, persistent garment inventory/photos; catalog UI remains in-memory and explicitly says demo. No formal operation/payments enabled.
