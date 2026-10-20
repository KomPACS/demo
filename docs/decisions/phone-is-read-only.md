# The phone view is read-only

Below 768 px the app is for a quick walkthrough. A banner says that a mobile app is not planned, and every write control is disabled (a `fieldset disabled` wrapper). Navigation is a bottom tab bar.

## Consequences

- The guard reacts to resizes, so a form opened on desktop becomes read-only when the window shrinks.
- Calling a hospital from the phone is also disabled, because recording the call outcome is a write.
