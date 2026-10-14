# Panic Ring feature matrix

This matrix records the proposed safety features against the current browser-based
Progressive Web App (PWA). There is no presentation deck in the repository, so this
file is the project-side feature matrix. A PWA cannot reliably provide native
hardware-key monitoring, continuous background work, or carrier USSD access.

## Insert-ready slide

**Placement:** After Slide 32 (discretion and cover screens) or Slide 36
(accessibility), depending on the deck's narrative.

**Title:** Beyond the Basics: Advanced Threat-Mitigation & Inclusion Features

**Subtitle:** Designed to close functional gaps, preserve user-controlled evidence,
and bridge the digital divide.

| Enhancement area | What it does | Threat model and safeguard | Deck integration |
|---|---|---|---|
| **Hands-Free Audio Triggers** | Proposed on-device detection of a user-configured phrase or acoustic pattern to initiate a silent alert. | **Risk:** False triggers or unintended capture. **Safeguard:** Require a deliberate, user-configured trigger; process audio on-device; do not retain or upload continuous raw audio. Validate false-trigger rates, permissions, and an accessible cancel path before launch. | Slide 16 (Ideate: Emergency) and Slide 29 (Future scope). |
| **Zero-Knowledge Cloud Escrow** | Optional encrypted sync of user-selected incident notes or evidence, so device loss need not mean data loss. | **Risk:** Cloud breach or account compromise. **Safeguard:** Encrypt client-side before upload; keep decryption keys under user control; no staff-held master key. Document recovery and key-loss limits, retention, and deletion behavior, and verify that the service receives ciphertext only. | Slide 8 (Evidence control) and Slide 24 (Responsible Governance). |
| **Dynamic Decoy Activity & Hardware Gestures** | Proposed decoy-screen activity that appears less static, plus native OS-supported shortcuts where the platform permits them. | **Risk:** A static screen may raise suspicion; shortcuts may conflict with OS emergency behavior. **Safeguard:** Keep activity within the app and avoid impersonating OS notifications; use only supported native shortcuts, tested per platform, without intercepting or replacing OS emergency functions. | Slides 7 and 32 (Discretion and Cover Screens). |
| **USSD Feature-Phone Companion Mode** | A carrier-operated USSD flow for sending a basic emergency ping from supported feature phones. | **Risk:** USSD use may appear in carrier or billing records. **Safeguard:** Mark as a future, carrier-dependent option; give clear privacy warnings about carrier records and verify local availability before users rely on it. | Slide 29 (Could Have) and Slide 36 (Accessibility). |

**Presenter note:** These are proposed differentiators, not current Panic Ring
capabilities. The current product is a browser-based PWA; audio monitoring in the
background, hardware-button shortcuts, cloud evidence escrow, and USSD require
separate native, backend, or carrier integrations and validation before they can be
promised in the pitch.

| Proposed feature | Current fit | Integration direction | Dependencies and acceptance gates |
|---|---|---|---|
| Audio-triggered emergency mode | Not implemented. Browser audio capture requires permission and an active page; background listening/recording is not reliable. | Consider a user-enabled, on-device trigger in a native app. Keep alerting and recording separate, with explicit consent and visible permission controls. | Native audio lifecycle, tested trigger/false-positive rates, clear recording consent and retention, platform/legal review, and a safe cancel path. |
| Hardware shortcut gestures | Not available to a web app. The OS owns power-button and volume-key shortcuts. | Native Android/iOS integration using supported OS emergency/shortcut APIs; do not claim arbitrary key interception. | Per-platform implementation and device testing; must not interfere with OS emergency calling. |
| Dynamic fake notifications | Not implemented. Existing disguise screens are local UI, not real notification history or live weather. | If pursued, limit to clearly scoped in-app decoy content; do not impersonate operating-system notifications or claim live data. | Decide supported disguise, content source, offline behavior, and how the feature avoids accidental disclosure. |
| Optional zero-knowledge cloud escrow | Not implemented. Supabase is present, but there is no encrypted evidence-sync flow or recovery-key protocol. | Encrypt client-side with a user-controlled recovery key before upload; server stores ciphertext only. Separate account authentication from decryption. | Threat model, key-loss/recovery UX, authenticated storage policies, deletion/retention guarantees, ciphertext-only tests, and independent security review. |
| Export metadata scrubbing | Implemented for note JSON exports as an opt-in checkbox. It removes note IDs, timestamps, export time, and chronological ordering; note text and an integrity hash remain. | Use the metadata-reduced export when sharing privacy is more important than chronology. The default export preserves timestamps. | Verify exported JSON before sharing. Scrubbing cannot detect identifying details written into note text and weakens evidentiary chronology. |
| Walk-me-home / escort timer | Partial: the app already has a local check-in countdown that opens SMS on expiry. It does not currently verify a safe PIN, track location in the background, or guarantee delivery while closed/offline. | Extend only with an explicit safe-PIN flow and foreground location updates; keep SMS as a user-mediated fallback until a reliable delivery service exists. | Define PIN behavior and timeout/cancel UX; test suspension, permission denial, offline state, and duplicate alerts. Never promise background tracking or delivery that the platform cannot guarantee. |
| Anonymous trusted messaging | Not implemented. There is no trusted-contact identity/consent model or message relay in the current schema. | Add an authenticated, privacy-preserving relay with contact verification, rate limits, minimal retention, and notification controls that respect the disguise. | Backend/API, abuse prevention, contact enrollment, message-delivery semantics, and threat-model/privacy review. |
| USSD / feature-phone companion | Not implementable in this PWA. USSD sessions are carrier-controlled and require operator support. | Explore a separate carrier partnership and USSD service; keep the phone-side flow independent of this web client. | Operator agreements, supported-region/carrier list, short-code allocation, service backend, and local emergency-service review. |
| Icon-led accessible interface | Not implemented as a complete mode. Existing screens are primarily text-based; isolated icon or high-contrast styling would not provide consistent low-literacy support. | Design a consistent, user-tested icon vocabulary with text alternatives, high contrast, scalable controls, and optional user-initiated audio guidance. | Accessibility and low-literacy user testing, screen-reader checks, localization, and confirmation that speech/audio never starts unexpectedly. |

## Implementation status

Only the metadata-reduced export is enabled in this change. Features marked partial
or not implemented need product decisions, native platform work, or backend/carrier
integrations before they can be represented as supported functionality.
