# ARTISAN-CAMERA-05
Base b1d66f34fb0df9390315456312392e343881a9d5. Frontend only.
Removed photo section heading and initial flat-clothing instruction. Kept modal title, guide, view selector and shutter. Viewport-aware fit uses current dialog/header/control measurements to size camera width with3:4 aspect, preserving centered capture geometry. Refit on window/visualViewport resize, initial fallback usesdvh. No forced form input focus.
Removed optional label-size field, draft entry and submit reference. Item size summary now derives solely from chestCm and lengthCm, avoiding null-field submission errors.
Syntax and VM markup/viewport budget tests PASS. Actual phone UI fit still requires user verification. Product photos/item storage remain in-memory demo; existing receiving test persistence unchanged.
