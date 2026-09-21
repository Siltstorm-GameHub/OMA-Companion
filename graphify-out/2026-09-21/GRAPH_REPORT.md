# Graph Report - OMA-Companion  (2026-09-21)

## Corpus Check
- 936 files · ~3,010,226 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4468 nodes · 11130 edges · 197 communities (174 shown, 23 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `80bc7a8c`
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
- card-provisioning.ts
- DailyPollPanel.tsx
- useServerLiveStatus.ts
- points.ts
- FfaView.tsx
- EventPokalWinners.tsx
- GamePlayersModal.tsx
- scripts
- duel-deck.ts
- report/[id]/page.tsx
- getActiveMembership
- AdminNav.tsx
- VictoryChestReveal.tsx
- upload/route.ts
- branded-cover.ts
- duels/[id]/respond/route.ts
- AdminDonationsClient.tsx
- SeriesAdminRow.tsx
- CommunityBoardWidget.tsx
- ServerCard.tsx
- include
- process-badge-art.ts
- applyForJob
- updateQuestProgress
- SeriesCompleteClient.tsx
- clip-des-monats/page.tsx
- overlay/[id]/page.tsx
- Product
- GuildHub – Discord Companion
- series/[id]/complete/page.tsx
- DailySpin.tsx
- StarterPickFlow.tsx
- GameCover.tsx
- process-rank-art.ts
- run-season.ts
- requireModeratorOrSquadCaptain
- notifications.ts
- DailyMessagePanel.tsx
- OverlayClient
- middleware.ts
- BadgesAdminClient.tsx
- new-season/page.tsx
- BadgeIcon.tsx
- LiveStreamsBanner.tsx
- PwaInstallButton.tsx
- Monster-Artwork — Edelstein-Kampf
- [tacticCardId]/route.ts
- recharts
- lineup/route.ts
- battle-cards-challenge-cleanup/route.ts
- generate-brand-assets.ts
- seed-standard-cards/route.ts
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- UserRoleManager.tsx
- genre-icons.ts
- chroma-key.js
- battle-cards/layout.tsx
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- bot-runner.mjs
- eslint.config.mjs
- next.config.ts
- @vercel/blob
- postcss.config.mjs
- tailwind.config.ts
- vercel.json
- { GET, POST }
- size
- MIN_MATCHES_FOR_RANKING

## God Nodes (most connected - your core abstractions)
1. `getSessionUser()` - 314 edges
2. `requireRole()` - 209 edges
3. `formatBerlinDate()` - 116 edges
4. `hasMinRole()` - 109 edges
5. `dispatchNotification()` - 85 edges
6. `getBerlinDateParts()` - 56 edges
7. `requireWidgetKey()` - 36 edges
8. `CoinIcon()` - 35 edges
9. `RankedAvatar()` - 35 edges
10. `useConfirm()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json
- `StandardCardSeed` --references--> `ActiveSkillData`  [EXTRACTED]
  prisma/battle-cards-seed-data.ts → src/lib/battle-engine/types.ts

## Import Cycles
- None detected.

## Communities (197 total, 23 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (57): POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET(), DELETE() (+49 more)

### Community 1 - "prisma.ts"
Cohesion: 0.03
Nodes (36): DEFAULTS, GameSuggestion, isAuthorized(), POST(), DEFAULT_PREFS, GET(), POST(), DELETE() (+28 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.10
Nodes (27): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), RARITIES, STEP_LABELS (+19 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.05
Nodes (75): POST(), GET(), PUT(), requestSchema, POST(), POST(), POST(), serializeDrawResult() (+67 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.09
Nodes (32): GET(), POST(), POST(), POST(), DELETE(), PATCH(), DELETE(), POST() (+24 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.06
Nodes (53): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), GET(), DELETE() (+45 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.07
Nodes (20): RULES, metadata, russoOne, spaceGrotesk, viewport, FEATURES, AnimatedBackground(), Cell (+12 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.08
Nodes (26): EventCardLink(), BackToTop(), NAV, FloatingPill(), NAV, NavLink, useTheme(), GateButton() (+18 more)

### Community 8 - "interactive.ts"
Cohesion: 0.10
Nodes (59): LiveSnapshot, LiveBattleAwaiting, LiveBattleSnapshot, BoardGrid, SpecialGrid, SwapMove, LEVEL_STAT_MULTIPLIER, applyShieldAbsorption() (+51 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.06
Nodes (56): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+48 more)

### Community 10 - "time.ts"
Cohesion: 0.12
Nodes (18): GET(), isAuthorized(), POST(), GET(), POST(), Props, MONTH_NAMES, QuestsPage() (+10 more)

### Community 11 - "getSessionUser"
Cohesion: 0.04
Nodes (58): GET(), GET(), GET(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), DELETE(), PATCH() (+50 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.09
Nodes (35): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+27 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.03
Nodes (63): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+55 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.13
Nodes (37): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyTacticEffects(), asBattleLog(), beginTrapCheck(), checkDuelTimeout() (+29 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.03
Nodes (54): Nomination, Props, AlbumPage(), Props, EventLiveBadge(), Avatar(), EventTippsList(), Tipp (+46 more)

### Community 16 - "ranks.ts"
Cohesion: 0.04
Nodes (82): loadProfileOverlayState(), GamePlayer, GET(), CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), DesktopProfileTabs(), Tab (+74 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.08
Nodes (43): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+35 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (37): VfxEvent, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction (+29 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.04
Nodes (62): Anomalies, AnomaliesClient(), Person, PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS (+54 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.15
Nodes (17): average(), GET(), BattleChallengeWidget(), ChallengeUserPicker(), uname(), UserLite, GemsChallengeUserPicker(), uname() (+9 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.08
Nodes (35): DashboardLayout(), LeaderboardPage(), MEDALS, metadata, PODIUM_CONFIG, BracketView(), Match, Participant (+27 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.11
Nodes (22): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+14 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.33
Nodes (4): formatBirthday(), ProfileEditor(), Props, ImageUploadFieldProps

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.24
Nodes (14): formatStart(), GET(), POST(), generateBrandedCoverDataUri(), announceEventResults(), announceNewEvent(), CoverSource, createDiscordScheduledEvent() (+6 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.11
Nodes (35): AvailableAction, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue(), getArenaBackgroundStyle(), hpBarColor() (+27 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.09
Nodes (35): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, SwapAnim, swapTranslateFor(), TILE_ICON, cell() (+27 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.09
Nodes (37): GET(), GET(), GET(), isAuthorized(), GEMS_DIFFICULTIES, POST(), buildCampaignEnemyTeam(), CampaignBoardLevel (+29 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.48
Nodes (6): revokePointsByReason(), applyMatchResult(), ApplyMatchResultInput, finalFinalistReason(), finalWinReason(), loserOf()

### Community 30 - "community-job-service.ts"
Cohesion: 0.06
Nodes (61): APPLY, main(), PATCH(), GET(), POST(), GET(), POST(), GET() (+53 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.07
Nodes (37): GET(), PATCH(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage(), PACK_KIND_INFO (+29 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (21): buildFfaRanking(), buildMatchRanking(), displayName(), ElementSlot, formatEntryStats(), IdentityFlipTile(), LayoutEntry, MatchTicker() (+13 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.11
Nodes (25): POST(), POST(), GET(), PATCH(), POST(), GET(), GET(), GET() (+17 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.15
Nodes (18): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), countGuideVoteScore(), createGuide() (+10 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.11
Nodes (24): POST(), POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST() (+16 more)

### Community 36 - "packs.ts"
Cohesion: 0.07
Nodes (49): GET(), POST(), POST(), DELETE(), PATCH(), POST(), GET(), POST() (+41 more)

### Community 37 - "MobaIcon"
Cohesion: 0.08
Nodes (26): Mode, RankRow(), BattleRankBadge(), CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS, ErrorNotice() (+18 more)

### Community 38 - "types.ts"
Cohesion: 0.10
Nodes (27): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), pickRandom(), aliveUnits(), resolveEffectTargets() (+19 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.09
Nodes (44): POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps(), POST(), GET() (+36 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.05
Nodes (61): PACK_LABEL, POST(), VALID_KINDS, BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), BattleLauncher() (+53 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.07
Nodes (56): GET(), PATCH(), PATCH(), GET(), PATCH(), PATCH(), PATCH(), PATCH() (+48 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.13
Nodes (30): GET(), POST(), GET(), GET(), getActiveMembership(), getCommunityJobCatalog(), berlinDateParts(), coachRecommendationsFor() (+22 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.09
Nodes (25): api(), Coach, CoachRatingSection(), RateableSession, cache, flush(), inflight, isFresh() (+17 more)

### Community 45 - "auth.ts"
Cohesion: 0.33
Nodes (7): PATCH(), patchSchema, PATCH(), requestSchema, CardContentError, CardContentPatch, updateCardContent()

### Community 46 - "discord-rest.ts"
Cohesion: 0.09
Nodes (44): GET(), POST(), GET(), OptionInput, POST(), POST(), GET(), GET() (+36 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.21
Nodes (19): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+11 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.09
Nodes (27): AssetList(), Thumb(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile (+19 more)

### Community 49 - "amp.ts"
Cohesion: 0.08
Nodes (18): FullStandingsToggle(), Props, StandingRow, StandingUser, ArchivedSeason, FORMAT_LABELS, LegacyRow, Avatar() (+10 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.26
Nodes (12): DELETE(), GET(), POST(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), isActiveMember(), listMyPhotoRequests() (+4 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.17
Nodes (25): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+17 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.06
Nodes (22): SteamGameResult, PollOptionGameInputProps, Props, WinnerClip, DailyMessageBanner(), Message, coverUrl(), DailyPollBanner() (+14 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.22
Nodes (17): GET(), isAuthorized(), softResetRating(), addMonthsUTC(), getCurrentSeasonNumber(), getSeasonWindow(), grantDueSeasonRewards(), grantPlacementReward() (+9 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.12
Nodes (23): FORMATS, CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant (+15 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.05
Nodes (47): POST(), AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection() (+39 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.10
Nodes (25): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, GENRES (+17 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.10
Nodes (18): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, GENRES, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward (+10 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (25): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+17 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.14
Nodes (21): curve(), curvePercent(), StandardCardSeed, ACTIVE_POOL, DD_ACTIVE_SKILLS, DD_PASSIVE_KITS, DD_ULTIMATE_SKILLS, PASSIVE_POOL (+13 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.13
Nodes (21): DELETE(), DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES (+13 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.10
Nodes (20): api(), Idea, IdeasBoardClient(), IdeaList(), api(), GameCard(), GameInfo, IdeaBody() (+12 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.20
Nodes (17): POST(), POST(), POST(), EventSetupWizard(), createPollsForEvent(), parsePollsConfigJson(), PollConfig, buildBerlinDate() (+9 more)

### Community 65 - "dependencies"
Cohesion: 0.04
Nodes (47): @auth/prisma-adapter, canvas-confetti, discord.js, @google/generative-ai, lucide-react, motion, next, next-auth (+39 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.17
Nodes (14): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+6 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (21): GET(), POST(), DELETE(), DELETE(), AUTHOR, AuthorRow, authorSearch(), contentInfo() (+13 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.18
Nodes (17): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+9 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (18): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+10 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.15
Nodes (17): JobTexts, EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE (+9 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.13
Nodes (20): GET(), inputStyle, Series, CoverBrandBadge(), EventCoverDefault(), dynamicCache, GameCover(), GameCoverProps (+12 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.20
Nodes (12): api(), AreaKey, FoundUser, GameInfo, IdeaForm(), IdeaPrefill, MediaAsset, Similar (+4 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.08
Nodes (22): ActivityFeed(), cleanReason(), Filter, Tx, txType(), AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES (+14 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.12
Nodes (15): MonthlyContests, Props, YearlyContests, EventsTabs(), TabItem, TabPanel(), Tabs(), TabsProps (+7 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.07
Nodes (28): Event, needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES, Membership (+20 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.13
Nodes (14): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+6 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.24
Nodes (12): GET(), IdeaPage(), ReportPage(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData, toIdeaFeedEntry(), getSeriesParts() (+4 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.12
Nodes (18): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+10 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.19
Nodes (14): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), DEFAULT_SEASON_REWARD_CONFIG (+6 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.12
Nodes (25): GET(), GET(), GET(), isAuthorized(), calcStreak(), GET(), formatDate(), SeasonConfigPanel() (+17 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.05
Nodes (53): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+45 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.10
Nodes (17): ClipVotingClient(), ClipDesMonatsPage(), MONTH_NAMES, GalleryEntry, MONTH_NAMES, Nomination, MONTH_NAMES, ClipWinnerCard() (+9 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.31
Nodes (5): MyPrediction, MyPredictionsList(), uname(), UserLite, PredictionStreakCard()

### Community 84 - "bot/index.ts"
Cohesion: 0.22
Nodes (9): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), AdminEventBracketPage(), requireModeratorOrEventSquadCaptain() (+1 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.31
Nodes (10): POST(), GET(), POST(), answerInterview(), createInterview(), declineInterview(), InterviewResult, listMyInterviews() (+2 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.20
Nodes (14): GET(), AdsTarget, ampCall(), AmpInstance, callWithSession(), getBaseUrl(), getInstanceDetails(), getInstanceSummaries() (+6 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.12
Nodes (15): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+7 more)

### Community 90 - "useConfirm"
Cohesion: 0.23
Nodes (11): CustomBadgeDisplay, Props, checkAndAwardBadges(), loadStats(), Badge, BADGE_CATEGORY_LABELS, BADGE_DEFS, BadgeDef (+3 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.13
Nodes (15): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+7 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.09
Nodes (29): GET(), POST(), GET(), DELETE(), PATCH(), DELETE(), POST(), GET() (+21 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.30
Nodes (9): GET(), POST(), PATCH(), assignCurrentRole(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole() (+1 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.36
Nodes (9): applyTierJumpLimit(), computePercentiles(), computeSeasonResults(), hashSeed(), MemberSeasonResult, resolveClass(), TIER_ORDER, TIER_PERCENTILE_CEILING (+1 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.08
Nodes (21): CATEGORIES, GENRES, inputStyle, PlacementReward, PLATFORMS, PollConfig, RECURRENCE_OPTS, SeasonPrefill (+13 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.13
Nodes (16): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+8 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.26
Nodes (14): LOGO_POSITIONS, StudioEditor(), drawLogo(), drawWatermark(), loadImage(), LogoPosition, prepareUploadImage(), renderStudioCanvas() (+6 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.15
Nodes (11): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+3 more)

### Community 100 - "adapters.ts"
Cohesion: 0.09
Nodes (20): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, CardWithId (+12 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.24
Nodes (7): POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, VoteKind, VoteOwnerLookup

### Community 102 - "recurrence.ts"
Cohesion: 0.23
Nodes (11): gamedig, gamedig, GET(), GET(), StatusEntry, getInstances(), getInstancesRaw(), toInstanceStatus() (+3 more)

### Community 103 - "isVideoUrl"
Cohesion: 0.13
Nodes (14): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, centeredRect() (+6 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.60
Nodes (5): isAuthorized(), isOverridden(), POST(), toJson(), getSkillTemplate()

### Community 105 - "minigames-config.ts"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.13
Nodes (19): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, BattleStatsPanel(), isStoredBattleLog(), StoredBattleLog (+11 more)

### Community 107 - "card-provisioning.ts"
Cohesion: 0.18
Nodes (13): isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, CLASS_BASE_STATS, CLASS_SPEED_MIDPOINT (+5 more)

### Community 108 - "DailyPollPanel.tsx"
Cohesion: 0.22
Nodes (10): AdminEventCompletePage(), DEFAULT_POLL, DEFAULT_REWARDS, MultiPollConfig, parsePoll(), parseRewards(), PlacementReward, PollConfig (+2 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.11
Nodes (18): GameserverWidget(), Server, ServerRow(), ApplyButton(), Light, LIGHT_COLOR, LIGHT_LABEL, Server (+10 more)

### Community 110 - "points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 111 - "FfaView.tsx"
Cohesion: 0.39
Nodes (6): GET(), parseSteamAppId(), cache, getJson(), getSteamAppInfo(), SteamAppInfo

### Community 112 - "EventPokalWinners.tsx"
Cohesion: 0.22
Nodes (11): CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS, PokalSection() (+3 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.47
Nodes (4): POST(), ALL_CATEGORIES, ALL_GENRES, recomputeWanderpocalHolders()

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "duel-deck.ts"
Cohesion: 0.40
Nodes (3): CardRow, CommunityCardsAdmin(), AdminCommunityCardsPage()

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.31
Nodes (8): awardPoints(), parsePlacementPts(), PATCH(), BracketMatch, generateBracket(), generateRoundRobin(), POST(), shuffle()

### Community 117 - "getActiveMembership"
Cohesion: 0.47
Nodes (4): DISCORD_COLORS, hexToInt(), rankUpColor(), RANK_RING

### Community 118 - "AdminNav.tsx"
Cohesion: 0.22
Nodes (9): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, DailyPollActionBadge(), EventsActionBadge() (+1 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.26
Nodes (12): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+4 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "branded-cover.ts"
Cohesion: 0.30
Nodes (10): GET(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), getGradientBackground(), getLogoBadge() (+2 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.18
Nodes (10): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+2 more)

### Community 124 - "SeriesAdminRow.tsx"
Cohesion: 0.83
Nodes (3): GET(), isAuthorized(), legacyPollConfigured()

### Community 126 - "ServerCard.tsx"
Cohesion: 0.16
Nodes (14): main(), DISCORD_REASONS, GET(), isAuthorized(), openSection(), ProfileCompletion(), Props, createNotification() (+6 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 130 - "updateQuestProgress"
Cohesion: 0.42
Nodes (7): GET(), PATCH(), patchSchema, getSeasonConfig(), KEYS, setEloHardResetAt(), setSeason1StartAt()

### Community 131 - "SeriesCompleteClient.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 132 - "clip-des-monats/page.tsx"
Cohesion: 0.22
Nodes (9): cornerStyle(), ElementContent(), elementPositionStyle(), OverlayClient(), panelWidthFor(), pickTickerMatch(), usePanelRotator(), useStackedElements() (+1 more)

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 138 - "series/[id]/complete/page.tsx"
Cohesion: 0.25
Nodes (10): Avatar(), computeGroups(), computePlacementMap(), MEDALS, PlacementReward, Props, RewardsConfig, SeriesCompleteClient() (+2 more)

### Community 140 - "DailySpin.tsx"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.13
Nodes (18): GET(), api(), AssetOption, buildEventTemplate(), EventOption, FoundUser, InterviewOption, PostOption (+10 more)

### Community 142 - "GameCover.tsx"
Cohesion: 0.11
Nodes (24): AdminEventsPage(), CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, DashboardPage() (+16 more)

### Community 143 - "process-rank-art.ts"
Cohesion: 0.31
Nodes (8): BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RANKS, RAW_DIR, ringSvg()

### Community 144 - "run-season.ts"
Cohesion: 0.22
Nodes (12): POST(), ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, isOverridden(), runSeasonUpdate(), toJson(), buildSeasonInputs(), countBy() (+4 more)

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.31
Nodes (7): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardEventPokal(), awardSeriesPokal()

### Community 146 - "notifications.ts"
Cohesion: 0.16
Nodes (23): GET(), isAuthorized(), POST(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage() (+15 more)

### Community 147 - "DailyMessagePanel.tsx"
Cohesion: 0.40
Nodes (3): AdminTacticCardsPage(), TacticCardRow, TacticCardsAdmin()

### Community 148 - "OverlayClient"
Cohesion: 0.40
Nodes (5): ELEMENT_KEYS, parseLayout(), ProfileOverlayPage(), ProfileElementKey, ProfileLayoutPositions

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "BadgesAdminClient.tsx"
Cohesion: 0.16
Nodes (10): Badge, CATEGORIES, CATEGORY_LABELS, User, BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART (+2 more)

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 152 - "BadgeIcon.tsx"
Cohesion: 0.40
Nodes (4): DiscordLoginButton(), Props, GuestLockOverlay(), Props

### Community 153 - "LiveStreamsBanner.tsx"
Cohesion: 0.25
Nodes (4): CommunityStream, KIND_STYLE, PartnerStream, UnifiedStream

### Community 154 - "PwaInstallButton.tsx"
Cohesion: 0.32
Nodes (5): BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 156 - "[tacticCardId]/route.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 161 - "lineup/route.ts"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 167 - "generate-brand-assets.ts"
Cohesion: 0.40
Nodes (3): OUT_DIR, PNG_SIZES, SOURCE

### Community 169 - "seed-standard-cards/route.ts"
Cohesion: 0.53
Nodes (5): STANDARD_CARDS, GET(), isAuthorized(), POST(), toJson()

### Community 172 - "Kapitel-Hintergründe — Kampagne"
Cohesion: 0.50
Nodes (3): Benötigte Dateien, Format, Kapitel-Hintergründe — Kampagne

## Knowledge Gaps
- **1043 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1038 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `getSessionUser` to `roles.ts`, `fotograf-service.ts`, `journalist-service.ts`, `coach-service.ts`, `time.ts`, `series-event-points.ts`, `StarterPickFlow.tsx`, `GameCover.tsx`, `RankedAvatar.tsx`, `ranks.ts`, `(dashboard)/leaderboard/page.tsx`, `gems-tournament.ts`, `community-job-service.ts`, `shop-config.ts`, `coach-guide-service.ts`, `packs.ts`, `community-job-config.ts`, `job-recommendations.ts`, `discord-rest.ts`, `amp.ts`, `dispatchNotification`, `BattleLogEntry`, `community-board-comment-service.ts`, `hasMinRole`, `SeriesIcon.tsx`, `tutorial.ts`, `ClipVotingClient.tsx`, `bot/index.ts`, `CoachTools.tsx`, `MarkdownLite.tsx`, `community-job-discord-votes.ts`, `admin/community-jobs/disputes/route.ts`, `FfaView.tsx`, `upload/route.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `BattleLogEntry` to `series-event-points.ts`, `CommunityJobsPanel.tsx`, `GameCover.tsx`, `RankedAvatar.tsx`, `ranks.ts`, `StarterPickFlow.tsx`, `CommunityJobsAdminPanel.tsx`, `community-job-service.ts`, `packs.ts`, `resolveAvatarsForCards`, `community-job-config.ts`, `FotografTools.tsx`, `SeriesDetailClient.tsx`, `EmptyState.tsx`, `visionaer-service.ts`, `SeriesIcon.tsx`, `ProfileOverlayClient.tsx`, `AdminEventsClient.tsx`, `ConfirmDialog.tsx`, `(dashboard)/events/page.tsx`, `EventAdminRow.tsx`, `CommunityBoardClient.tsx`, `EventSetupWizard.tsx`, `AdminDonationsClient.tsx`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `updateQuestProgress`, `ranked-season.ts`, `SeriesCompleteClient.tsx`, `getSessionUser`, `DailySpin.tsx`, `series-event-points.ts`, `run-season.ts`, `requireModeratorOrSquadCaptain`, `DailyMessagePanel.tsx`, `new-season/page.tsx`, `notify-dispatch.ts`, `[tacticCardId]/route.ts`, `shop-config.ts`, `clip-contest.ts`, `gameservers.ts`, `community-job-config.ts`, `auth.ts`, `discord-rest.ts`, `BattleLogEntry`, `revert-event-completion.ts`, `dashboard/page.tsx`, `community-job-payout/route.ts`, `ConfirmDialog.tsx`, `send/route.ts`, `JournalistTools.tsx`, `NotificationRulesPanel.tsx`, `recurrence.ts`, `minigames-config.ts`, `points.ts`, `GamePlayersModal.tsx`, `duel-deck.ts`, `include`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1043 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03153988868274583 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.026979368718039146 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10084033613445378 - nodes in this community are weakly interconnected._