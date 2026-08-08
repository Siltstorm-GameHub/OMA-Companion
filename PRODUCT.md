# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Members of the "Old Masters" Discord gaming community. Primary surface is a logged-in companion dashboard (German UI) for event registration, tournament brackets, points/rank progression, and profiles. A second, unauthenticated surface — the OBS overlay — is consumed indirectly: community streamers embed it as a Browser Source in OBS, and the actual audience is their Twitch viewers watching a live stream, not app users.

## Product Purpose

Companion app for a Discord community's recurring gaming events: registration, tournament/bracket management, live scoring, a points/rank economy, leaderboards, and post-event recaps. Success is a community that can self-run and follow events without needing Discord alone.

## Positioning

Tightly integrated with the community's existing Discord server (roles, events, channels) rather than a generic tournament-bracket SaaS — event data, points, and identity all tie back to the Discord community itself.

## Operating Context

- Dashboard: authenticated, desktop and mobile web, dark theme, German copy, glassmorphic surface language already established (`.glass` / `.glass-heavy` in `globals.css`).
- OBS overlay (`/overlay/[eventId]`): unauthenticated, token-gated public route. Rendered inside OBS as a Browser Source and composited live over a streamer's gameplay footage — arbitrary, unpredictable, often bright/busy backgrounds. No page chrome, transparent canvas, must stay legible without a stream operator adjusting anything.

## Capabilities and Constraints

- Tournament formats: single/double elimination bracket, round robin, liga (league table), FFA/coop stats.
- Live match/score updates push to the overlay via SSE (~1s latency), not polling.
- Overlay link is one token per event, issued to all community members who register as a streamer for that event.

## Brand Commitments

Existing dark glassmorphic dashboard UI (`src/app/globals.css`): teal (`#14b8a6`) as primary accent, deep near-black bases, Space Grotesk display font. The overlay is a new surface and inherits the app's identity (teal accent, dark/glass language) but is not required to reuse dashboard chrome verbatim, since it must work transparently over video instead of the dashboard's own background.

## Product Principles

- Community-first: features exist to make the community's own events easier to run, not to generalize into a platform.
- Legibility over decoration on the overlay: it sits over unpredictable video, so contrast and clarity beat visual flourish.
- Live data feels live: score/bracket changes should appear near-instantly, not on a refresh or noticeable delay.
- German-first UI copy throughout.
