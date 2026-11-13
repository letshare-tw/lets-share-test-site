# RIDER-WEB-SCAN-01

Controlled test site only. Pickup and delivery now scan QR / Code 128 bag codes locally using BarcodeDetector and the existing in-page video. Only an exact decoded bag code fills the field; mismatches never fill it. Unsupported browsers retain manual input. No automatic photo, upload, submission, or seal confirmation.

Cancellation guards cover modal/session/task/revision changes, manual edits, stopped video and background tabs. Scan attempts last approximately 7 seconds while detection resolves normally. No external decoder or network request was added.

Validation: node syntax checks and 7 mocked scanner cases PASS. Existing proof regression helpers now enter bag codes manually rather than invoking fake scanning. Those full DOM regressions were not executed in this increment (jsdom unavailable). Real phone camera/QR/Code128 acceptance remains PENDING. Formal operations stay locked.
