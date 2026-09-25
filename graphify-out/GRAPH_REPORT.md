# Graph Report - OMA-Companion  (2026-09-25)

## Corpus Check
- 1001 files · ~3,327,798 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4967 nodes · 13463 edges · 188 communities (165 shown, 23 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d2f5d89`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- roles.ts
- prisma.ts
- ranked-season.ts
- live-battle.ts
- fotograf-service.ts
- journalist-service.ts
- app/layout.tsx
- GuestGate.tsx
- interactive.ts
- coach-service.ts
- time.ts
- getSessionUser
- series-event-points.ts
- CommunityJobsPanel.tsx
- duels-live.ts
- RankedAvatar.tsx
- ranks.ts
- duel-live-battle.ts
- DuelLiveView.tsx
- CommunityJobsAdminPanel.tsx
- MobaIcon.tsx
- (dashboard)/leaderboard/page.tsx
- BattleCardView.tsx
- ProfileMobileView.tsx
- notify-dispatch.ts
- LiveBattleView.tsx
- EventCompleteClient.tsx
- board-match3.ts
- gems-tournament.ts
- requireModeratorOrEventSquadCaptain
- community-job-service.ts
- shop-config.ts
- OverlayClient.tsx
- clip-contest.ts
- coach-guide-service.ts
- gameservers.ts
- packs.ts
- MobaIcon
- types.ts
- tournament/[id]/page.tsx
- resolveAvatarsForCards
- formatBerlinDate
- community-job-config.ts
- job-recommendations.ts
- JobBadge.tsx
- auth.ts
- discord-rest.ts
- podium/[id]/route.tsx
- FotografTools.tsx
- amp.ts
- dispatchNotification
- BattleScreen.tsx
- DailyPollBanner.tsx
- CoinIcon.tsx
- TournamentManager.tsx
- BattleLogEntry
- EventEditClient.tsx
- SeriesDetailClient.tsx
- revert-event-completion.ts
- devDependencies
- skill-pool.ts
- community-board-comment-service.ts
- EmptyState.tsx
- Skeleton.tsx
- dashboard/page.tsx
- dependencies
- awardProfileCompletionIfNeeded
- hasMinRole
- admin/events/[id]/complete/route.ts
- challenge.ts
- ReportEditor.tsx
- GameNameInput.tsx
- events/series/[id]/page.tsx
- visionaer-service.ts
- formatBerlinTime
- SeriesIcon.tsx
- [id]/settings/SettingsClient.tsx
- tutorial.ts
- ProfileOverlayClient.tsx
- community-job-payout/route.ts
- AdminEventsClient.tsx
- ConfirmDialog.tsx
- ClipVotingClient.tsx
- (dashboard)/events/page.tsx
- bot/index.ts
- CoachTools.tsx
- MarkdownLite.tsx
- compilerOptions
- send/route.ts
- EventAdminRow.tsx
- useConfirm
- CommunityBoardClient.tsx
- manifest.json
- community-job-discord-votes.ts
- JournalistTools.tsx
- apply-season-results.ts
- EventSetupWizard.tsx
- NotificationRulesPanel.tsx
- (dashboard)/battle-cards/page.tsx
- PackOpener.tsx
- adapters.ts
- admin/community-jobs/disputes/route.ts
- recurrence.ts
- isVideoUrl
- studio-templates.ts
- minigames-config.ts
- photo-request-service.ts
- report/[id]/page.tsx
- photo-request-service.ts
- useServerLiveStatus.ts
- useServerLiveStatus.ts
- skins/types.ts
- BadgesSection.tsx
- GamePlayersModal.tsx
- scripts
- ThemeProvider.tsx
- report/[id]/page.tsx
- getActiveMembership
- VictoryChestReveal.tsx
- upload/route.ts
- TextsClient.tsx
- duels/[id]/respond/route.ts
- AdminDonationsClient.tsx
- ServerCard.tsx
- promotion-request-service.ts
- process-badge-art.ts
- ThemeProvider.tsx
- DashboardChrome.tsx
- series/[id]/complete/route.ts
- overlay/[id]/page.tsx
- Product
- GuildHub – Discord Companion
- [tacticCardId]/route.ts
- sharp
- widget/events/route.ts
- sonner
- StarterPickFlow.tsx
- three
- tank
- notifications.ts
- bear
- @types/three
- middleware.ts
- discord-roles.ts
- new-season/page.tsx
- updateQuestProgress
- PollOptionGameInput.tsx
- Monster-Artwork — Edelstein-Kampf
- SeasonConfigPanel.tsx
- preferences/route.ts
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- generate-brand-assets.ts
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- UserRoleManager.tsx
- chroma-key.js
- battle-cards/layout.tsx
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- bot-runner.mjs
- eslint.config.mjs
- next.config.ts
- @vercel/blob
- backstory.ts
- postcss.config.mjs
- tailwind.config.ts
- vercel.json
- { GET, POST }
- size
- MIN_MATCHES_FOR_RANKING
- ScoreBreakdownBlock.tsx
- [contribId]/route.ts
- HeroStatValue.tsx

## God Nodes (most connected - your core abstractions)
1. `getSessionUser()` - 321 edges
2. `requireRole()` - 209 edges
3. `formatBerlinDate()` - 119 edges
4. `hasMinRole()` - 109 edges
5. `dispatchNotification()` - 88 edges
6. `Loader2` - 66 edges
7. `getBerlinDateParts()` - 56 edges
8. `X` - 55 edges
9. `JobBadge()` - 43 edges
10. `CoinIcon()` - 37 edges

## Surprising Connections (you probably didn't know these)
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts
- `main()` --calls--> `getCommunityJob()`  [EXTRACTED]
  scripts/fix-community-job-payouts.ts → src/lib/community-jobs.ts
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json
- `StandardCardSeed` --references--> `ActiveSkillData`  [EXTRACTED]
  prisma/battle-cards-seed-data.ts → src/lib/battle-engine/types.ts

## Import Cycles
- None detected.

## Communities (188 total, 23 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (75): POST(), DELETE(), GET(), PATCH(), POST(), GET(), PATCH(), DELETE() (+67 more)

### Community 1 - "prisma.ts"
Cohesion: 0.03
Nodes (111): EventCard(), EventUser, Props, SeriesEventItem, STATUS_CFG, StreamingPartner, LeaderboardPage(), MEDALS (+103 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.15
Nodes (20): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), DuplicateProgress(), NextLevelPreview() (+12 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.12
Nodes (33): POST(), DndCharacterRow, DndLocationRow, formatDuration(), polygonPoints(), TYPE_LABEL, WorldMap(), EVEN_ROW (+25 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.03
Nodes (92): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+84 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.12
Nodes (38): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog(), beginTrapCheck() (+30 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.13
Nodes (15): metadata, russoOne, spaceGrotesk, viewport, CursorGlow(), ExitAppGuard(), TRAP_STATE, SessionProvider() (+7 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.09
Nodes (43): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+35 more)

### Community 8 - "interactive.ts"
Cohesion: 0.11
Nodes (54): LiveBattleSnapshot, generateBoard(), hasAnyValidMove(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate (+46 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.05
Nodes (76): POST(), PATCH(), GET(), POST(), GET(), POST(), GET(), POST() (+68 more)

### Community 10 - "time.ts"
Cohesion: 0.24
Nodes (15): LOGO_POSITIONS, StudioEditor(), ImageDown, drawLogo(), drawWatermark(), loadImage(), LogoPosition, prepareUploadImage() (+7 more)

### Community 11 - "getSessionUser"
Cohesion: 0.07
Nodes (40): GET(), POST(), GET(), DELETE(), PATCH(), DELETE(), POST(), GET() (+32 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (49): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+41 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.11
Nodes (25): POST(), CATEGORIES, EventSetupWizard(), inputStyle, PlacementReward, PLATFORMS, PollConfig, RECURRENCE_OPTS (+17 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.11
Nodes (29): drawFrame(), imageCache, loadLayers(), loadPixelImage(), PixelCharacter(), Props, Rect, DIRS (+21 more)

### Community 16 - "ranks.ts"
Cohesion: 0.08
Nodes (36): BracketView(), Match, Participant, roundLabel(), uname(), User, CATEGORY_BADGE_CLASS, EventPokalWinners() (+28 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.06
Nodes (42): Props, openSection(), ProfileCompletion(), Props, CustomBadgeDisplay, Props, Tab, TABS (+34 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (41): VfxEvent, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction (+33 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.13
Nodes (18): GameserverWidget(), Server, ServerRow(), ApplyButton(), Light, LIGHT_COLOR, LIGHT_LABEL, Server (+10 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.06
Nodes (32): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+24 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.04
Nodes (52): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+44 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.07
Nodes (33): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+25 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.22
Nodes (11): PATCH(), patchSchema, PATCH(), requestSchema, metadata, MyCardPage(), CardContentError, CardContentPatch (+3 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.16
Nodes (19): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), MessageCircleMore, ShieldCheck (+11 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.09
Nodes (42): POST(), POST(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps() (+34 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.19
Nodes (13): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+5 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.13
Nodes (22): AdminUsersClient(), formatLastLogin(), api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees() (+14 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.10
Nodes (37): GET(), GET(), GET(), isAuthorized(), buildCampaignEnemyTeam(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked() (+29 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.12
Nodes (28): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), GEMS_DIFFICULTIES, POST(), formatStart(), GET() (+20 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.18
Nodes (20): ABILITY_KEYS, AbilityScores, clampToBaseline(), CLASS_SPEED_MIDPOINT, deriveBaseStats(), DerivedStats, DND_CLASS_BASE_STATS, roll4d6DropLowest() (+12 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.09
Nodes (26): GET(), PATCH(), POST(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage() (+18 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.06
Nodes (31): buildFfaRanking(), buildMatchRanking(), cornerStyle(), displayName(), ELEMENT_SIZE, ElementContent(), elementPositionStyle(), ElementSlot (+23 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.13
Nodes (21): POST(), POST(), GET(), GET(), GET(), collectNominations(), CommunityNomination, finalizeContest() (+13 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.22
Nodes (18): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+10 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.14
Nodes (18): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, BattleStatsPanel(), isStoredBattleLog(), StoredBattleLog (+10 more)

### Community 36 - "packs.ts"
Cohesion: 0.10
Nodes (31): POST(), serializeDrawResult(), PACK_LABEL, POST(), VALID_KINDS, ShopPage(), CHEST_TABLE, ChestPrize (+23 more)

### Community 37 - "MobaIcon"
Cohesion: 0.07
Nodes (41): GET(), POST(), DELETE(), DELETE(), POST(), GET(), POST(), DELETE() (+33 more)

### Community 38 - "types.ts"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.07
Nodes (63): GET(), PUT(), requestSchema, GET(), POST(), requestSchema, toDbResult(), DuelDeckPage() (+55 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.10
Nodes (28): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), pickRandom(), aliveUnits(), resolveEffectTargets() (+20 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.18
Nodes (11): BattleLauncher(), Mode, RankRow(), BattleRankBadge(), RANK_STYLE, MatchmakingWidget(), BATTLE_RANKS, BattleRankEntry (+3 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.04
Nodes (81): APPLY, main(), PATCH(), GET(), POST(), GET(), POST(), GET() (+73 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.11
Nodes (34): berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames(), getDismissedItemKeys() (+26 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.20
Nodes (14): GET(), AdsTarget, ampCall(), AmpInstance, callWithSession(), getBaseUrl(), getInstanceDetails(), getInstanceSummaries() (+6 more)

### Community 45 - "auth.ts"
Cohesion: 0.22
Nodes (10): EventCardLink(), GateButton(), GateLink(), GateOptions, GuestBanner(), GuestGateContext, GuestGateValue, useGuestGate() (+2 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.10
Nodes (23): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+15 more)

### Community 49 - "amp.ts"
Cohesion: 0.15
Nodes (19): GET(), IdeaPageClient(), IdeaPage(), ReportPage(), ReportPageClient(), api(), ReportEditor(), AUTHOR (+11 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.23
Nodes (11): gamedig, gamedig, GET(), GET(), StatusEntry, getInstances(), getInstancesRaw(), toInstanceStatus() (+3 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (26): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+18 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.15
Nodes (17): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+9 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.11
Nodes (25): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+17 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.21
Nodes (9): choose(), coastal(), neighbors(), pick(), Baut eine Hex-Weltkarte aus den Assets in ../Hex Map. Aufruf: python build_world, alle Dateien <prefix>NN.png (nur Ziffern hinter dem Prefix), terrain_of(), terrain_of_fixed() (+1 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.14
Nodes (17): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), awardPoints(), parsePlacementPts() (+9 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.20
Nodes (15): POST(), toJson(), GET(), withDndOverriddenFields(), getDndClass(), DND_LOCATIONS, DndLocationDef, ensureDndWorldSeeded() (+7 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.04
Nodes (65): Badge, CATEGORIES, CATEGORY_LABELS, User, Event, EventAdminRow(), Match, MatchEntry (+57 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (25): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+17 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.09
Nodes (42): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, LiveSnapshot, cell(), LiveBattleAwaiting (+34 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.15
Nodes (19): GET(), loadProfileOverlayState(), GameCoverPicker(), GameCover(), coverCache, GameNameInput(), GameNameInputProps, highlightMatch() (+11 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.28
Nodes (10): GET(), isAuthorized(), POST(), positionAlongPath(), stepMinutesOf(), commitAllDueArrivals(), locationAtHex(), parseTravelPath() (+2 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.10
Nodes (18): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward, PLATFORMS (+10 more)

### Community 65 - "dependencies"
Cohesion: 0.04
Nodes (47): @auth/prisma-adapter, canvas-confetti, discord.js, @google/generative-ai, lucide-react, motion, next, next-auth (+39 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.18
Nodes (15): isAuthorized(), isOverridden(), POST(), toJson(), isAuthorized(), POST(), isAuthorized(), POST() (+7 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.18
Nodes (14): CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), CATEGORY_LABELS, DAILY_CAPS, POINT_RULES, PointCategory, RANK_POINT_CATEGORIES (+6 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.20
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.17
Nodes (6): RULES, AnimatedBackground(), Cell, PULSE_COLORS, CheckSquare, ShieldAlert

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.30
Nodes (10): GET(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), getGradientBackground(), getLogoBadge() (+2 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.12
Nodes (16): metadata, ABILITY_LABEL, ABILITY_SCORE_CANDIDATES, ABILITY_STEPS, CharacterCreation(), Phase, RolledCard, RollingReveal() (+8 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.10
Nodes (16): GalleryEntry, MONTH_NAMES, Nomination, Props, WinnerClip, ClipWinnerCard(), Props, WinnerNomination (+8 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.08
Nodes (31): POST(), GET(), UserLite, AdminEventCompletePage(), DEFAULT_POLL, DEFAULT_REWARDS, MultiPollConfig, parsePoll() (+23 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.18
Nodes (9): api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem, PhotoRequestsBlock() (+1 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.12
Nodes (20): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+12 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.14
Nodes (17): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), RARITIES (+9 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.22
Nodes (13): POST(), GET(), GET(), POST(), InterviewPage(), answerInterview(), createInterview(), declineInterview() (+5 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.02
Nodes (103): Anomalies, AnomaliesClient(), Person, PayoutsClient(), Preview, Run, Week, AdminApplication (+95 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.08
Nodes (52): GET(), PATCH(), PATCH(), GET(), PATCH(), PATCH(), GET(), PATCH() (+44 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.05
Nodes (33): MonthlyContests, Props, YearlyContests, SeriesOption, COIN_SOURCES, PointsInfoModal(), ConfirmDialog(), TabItem (+25 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.04
Nodes (79): GET(), GET(), POST(), POST(), DELETE(), PATCH(), PATCH(), POST() (+71 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.18
Nodes (15): POST(), GET(), DEFAULT_SCENE, getLocationScene(), LOCATION_SCENES, LocationSceneDef, spawnPointFor(), ensureDndStoryContentSeeded() (+7 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.04
Nodes (14): POST(), requestSchema, GameSuggestion, GameSuggestion, DEFAULT_PREFS, POST(), POST(), POST() (+6 more)

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.29
Nodes (8): ActivityFeed(), cleanReason(), Filter, Tx, txType(), formatRelative(), RelativeTime(), RelativeTimeProps

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.38
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 90 - "useConfirm"
Cohesion: 0.11
Nodes (24): main(), DISCORD_REASONS, GET(), isAuthorized(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl() (+16 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.15
Nodes (15): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, Thumb() (+7 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.19
Nodes (8): CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS, ErrorNotice(), DIFFICULTY_CONFIG, DIFFICULTY_ORDER, NpcBattleLauncher()

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.09
Nodes (43): GemsResultScreen(), GemsReward, AvailableAction, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue() (+35 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.03
Nodes (82): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, Props, Role (+74 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.15
Nodes (22): BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), LeaderboardTabs(), Tab, TABS, getCombinedElo() (+14 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.29
Nodes (6): centeredRect(), Handle, ImageCropTool(), PRESETS, Rect, Crop

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.06
Nodes (37): CardRow, TacticCardRow, CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient() (+29 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.33
Nodes (7): GET(), isAuthorized(), POST(), toJson(), Interview, InterviewClient(), name()

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.24
Nodes (7): POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, VoteKind, VoteOwnerLookup

### Community 102 - "recurrence.ts"
Cohesion: 0.70
Nodes (3): HeroStatValue(), useValueDelta(), ValueDeltaBadge()

### Community 103 - "isVideoUrl"
Cohesion: 0.33
Nodes (6): LogOut, Moon, Sun, MobileTopBar(), ROUTE_TITLES, useTheme()

### Community 104 - "studio-templates.ts"
Cohesion: 0.40
Nodes (4): CountdownBadge(), EndsCountdown(), PollCountdown(), usePollCountdown()

### Community 105 - "minigames-config.ts"
Cohesion: 0.18
Nodes (20): GET(), isAuthorized(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction() (+12 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.11
Nodes (24): POST(), POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST() (+16 more)

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.04
Nodes (64): GET(), GET(), GET(), DELETE(), PATCH(), POST(), GET(), GET() (+56 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.32
Nodes (3): JobTexts, JobIcon(), JOB_ICONS

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.40
Nodes (5): ELEMENT_KEYS, parseLayout(), ProfileOverlayPage(), ProfileElementKey, ProfileLayoutPositions

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.40
Nodes (4): DiscordLoginButton(), Props, GuestLockOverlay(), Props

### Community 112 - "BadgesSection.tsx"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.21
Nodes (12): ANIMS, CATALOG_PATH, CATEGORIES, CategoryDef, CROP, cropSheet(), main(), OUT_DIR (+4 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.16
Nodes (24): GET(), PATCH(), patchSchema, GET(), isAuthorized(), softResetRating(), addMonthsUTC(), getCurrentSeasonNumber() (+16 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.24
Nodes (9): GET(), GET(), isAuthorized(), formatDate(), SeasonConfigPanel(), toDateInputValue(), SeasonConfig, fromDatetimeLocalBerlin() (+1 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "TextsClient.tsx"
Cohesion: 0.24
Nodes (7): Menu, Share, BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.13
Nodes (23): POST(), ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, CLASS_BASE_STATS, isOverridden(), runSeasonUpdate(), toJson(), buildSeasonInputs() (+15 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.21
Nodes (12): GET(), GET(), GET(), isAuthorized(), authHeader(), DiscordEmbed, DiscordGuildEmoji, DiscordTextChannel (+4 more)

### Community 124 - "ServerCard.tsx"
Cohesion: 0.29
Nodes (9): POST(), POST(), notifyPvpBattleResolved(), advanceDndQuestObjective(), advanceDndQuestObjectiveForUser(), DND_QUESTS, ensureDndQuestsSeeded(), rewardDndQuest() (+1 more)

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.08
Nodes (23): SteamGameResult, Health, FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props, PollOptionGameInputProps (+15 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "ThemeProvider.tsx"
Cohesion: 0.22
Nodes (12): YearReviewPage(), checkAndAwardBadges(), loadStats(), BADGE_CATEGORY_LABELS, BADGE_DEFS, BadgeDef, BadgeStats, findNewlyEarnedBadges() (+4 more)

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.12
Nodes (30): GET(), POST(), GET(), OptionInput, POST(), POST(), findEventByDiscordId(), notifyTournamentStarted() (+22 more)

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 137 - "[tacticCardId]/route.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 139 - "widget/events/route.ts"
Cohesion: 0.15
Nodes (7): DashboardLayout(), BackToTop(), GuestGateProvider(), PartnerFooter(), Partner, NewsItem, isLinkPreviewBot()

### Community 140 - "sonner"
Cohesion: 0.25
Nodes (4): metadata, SceneData, SceneEventLogEntry, ScenePresentCard

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.13
Nodes (18): average(), GET(), BattleChallengeWidget(), GemsChallengeUserPicker(), uname(), UserLite, CONFIG, MatchupBadge() (+10 more)

### Community 142 - "three"
Cohesion: 0.12
Nodes (16): BattleCardsTabsInner(), DND_LINK_TAB, isTabKey(), TabKey, TABS, DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard (+8 more)

### Community 144 - "tank"
Cohesion: 0.39
Nodes (6): POST(), requestSchema, grantStarterPick(), REQUIRED_CLASSES, StarterPickError, startOrResetTutorial()

### Community 146 - "notifications.ts"
Cohesion: 0.09
Nodes (31): GET(), POST(), POST(), POST(), DELETE(), PATCH(), DELETE(), POST() (+23 more)

### Community 148 - "@types/three"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "discord-roles.ts"
Cohesion: 0.13
Nodes (21): RankTile(), JobBadgeProps, useJobBadge(), RankedAvatarProps, RankRing(), RankRingProps, BADGE_LEVEL_THRESHOLDS, JOB_BADGE_META (+13 more)

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 158 - "SeasonConfigPanel.tsx"
Cohesion: 0.11
Nodes (26): GET(), GET(), isAuthorized(), calcStreak(), GET(), GET(), POST(), CreateContestForm() (+18 more)

### Community 160 - "preferences/route.ts"
Cohesion: 0.05
Nodes (32): DEFAULTS, GET(), POST(), DELETE(), displayNameOf(), PATCH(), UserLite, userSummary() (+24 more)

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 163 - "HeroStatValue.tsx"
Cohesion: 0.13
Nodes (22): curve(), curvePercent(), STANDARD_CARDS, StandardCardSeed, ACTIVE_POOL, DD_ACTIVE_SKILLS, DD_PASSIVE_KITS, DD_ULTIMATE_SKILLS (+14 more)

### Community 167 - "generate-brand-assets.ts"
Cohesion: 0.40
Nodes (3): OUT_DIR, PNG_SIZES, SOURCE

### Community 172 - "Kapitel-Hintergründe — Kampagne"
Cohesion: 0.50
Nodes (3): Benötigte Dateien, Format, Kapitel-Hintergründe — Kampagne

### Community 195 - "backstory.ts"
Cohesion: 0.40
Nodes (5): generateBackstory(), HOOKS, OPENERS, ORIGINS, pick()

### Community 254 - "ScoreBreakdownBlock.tsx"
Cohesion: 0.36
Nodes (7): Breakdown, fmt(), ScoreBreakdownBlock(), signed(), StreamResult, Week, Scale

### Community 270 - "[contribId]/route.ts"
Cohesion: 0.06
Nodes (52): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), GET(), DELETE() (+44 more)

### Community 274 - "HeroStatValue.tsx"
Cohesion: 0.03
Nodes (95): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+87 more)

## Knowledge Gaps
- **1107 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1102 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `report/[id]/page.tsx` to `roles.ts`, `prisma.ts`, `ThemeProvider.tsx`, `coach-service.ts`, `getSessionUser`, `[contribId]/route.ts`, `duel-live-battle.ts`, `notifications.ts`, `HeroStatValue.tsx`, `(dashboard)/leaderboard/page.tsx`, `requireModeratorOrEventSquadCaptain`, `SeasonConfigPanel.tsx`, `packs.ts`, `MobaIcon`, `types.ts`, `community-job-config.ts`, `amp.ts`, `DailyPollBanner.tsx`, `BattleLogEntry`, `admin/events/[id]/complete/route.ts`, `AdminEventsClient.tsx`, `ClipVotingClient.tsx`, `bot/index.ts`, `MarkdownLite.tsx`, `admin/community-jobs/disputes/route.ts`, `upload/route.ts`, `AdminDonationsClient.tsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `DashboardChrome.tsx`, `series/[id]/complete/route.ts`, `fotograf-service.ts`, `[tacticCardId]/route.ts`, `series-event-points.ts`, `duels-live.ts`, `@types/three`, `ProfileMobileView.tsx`, `new-season/page.tsx`, `requireModeratorOrEventSquadCaptain`, `shop-config.ts`, `clip-contest.ts`, `JobBadge.tsx`, `dispatchNotification`, `CoinIcon.tsx`, `revert-event-completion.ts`, `hasMinRole`, `SeriesIcon.tsx`, `community-job-payout/route.ts`, `ClipVotingClient.tsx`, `EventAdminRow.tsx`, `apply-season-results.ts`, `photo-request-service.ts`, `report/[id]/page.tsx`, `ThemeProvider.tsx`, `duels/[id]/respond/route.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `prisma.ts` to `roles.ts`, `fotograf-service.ts`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `duel-live-battle.ts`, `HeroStatValue.tsx`, `MobaIcon.tsx`, `board-match3.ts`, `community-job-config.ts`, `FotografTools.tsx`, `amp.ts`, `SeriesDetailClient.tsx`, `dashboard/page.tsx`, `tutorial.ts`, `ProfileOverlayClient.tsx`, `ConfirmDialog.tsx`, `ClipVotingClient.tsx`, `(dashboard)/events/page.tsx`, `bot/index.ts`, `send/route.ts`, `EventSetupWizard.tsx`, `adapters.ts`, `report/[id]/page.tsx`, `report/[id]/page.tsx`, `ScoreBreakdownBlock.tsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1107 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02529032258064516 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.029627047751829907 - nodes in this community are weakly interconnected._
- **Should `live-battle.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11522198731501057 - nodes in this community are weakly interconnected._