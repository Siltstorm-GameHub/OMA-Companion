# Graph Report - OMA-Companion  (2026-09-21)

## Corpus Check
- 886 files · ~2,984,611 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4226 nodes · 10346 edges · 228 communities (192 shown, 36 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4f499e37`
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
- elo.ts
- Product
- GuildHub – Discord Companion
- PollGameSuggestInput.tsx
- series/[id]/complete/page.tsx
- CoachRatingSection.tsx
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
- notification-rules/route.ts
- series/[id]/complete/route.ts
- widget/events/route.ts
- ImageCropTool.tsx
- lineup/route.ts
- battle-cards-challenge-cleanup/route.ts
- getSkillTemplate
- cards/page.tsx
- tactic-cards/page.tsx
- [userId]/page.tsx
- generate-brand-assets.ts
- matchup/route.ts
- seed-standard-cards/route.ts
- requireModeratorOrAnySquadCaptain
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- seed-notification-rules.ts
- daily-poll/[id]/vote/route.ts
- notifications/page.tsx
- UserRoleManager.tsx
- genre-icons.ts
- chroma-key.js
- lobby-cleanup/route.ts
- grant-tactic-cards-to-all/route.ts
- battle-cards/layout.tsx
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- @auth/prisma-adapter
- bot-runner.mjs
- eslint.config.mjs
- lucide-react
- next-auth
- next.config.ts
- postprocessing
- @prisma/client
- react
- react-dom
- sharp
- sonner
- three
- @types/canvas-confetti
- @types/three
- @vercel/blob
- web-push
- zod
- postcss.config.mjs
- tailwind.config.ts
- vercel.json
- { GET, POST }
- size
- MIN_MATCHES_FOR_RANKING

## God Nodes (most connected - your core abstractions)
1. `getSessionUser()` - 273 edges
2. `requireRole()` - 197 edges
3. `formatBerlinDate()` - 94 edges
4. `hasMinRole()` - 89 edges
5. `dispatchNotification()` - 71 edges
6. `getBerlinDateParts()` - 56 edges
7. `requireWidgetKey()` - 36 edges
8. `CoinIcon()` - 35 edges
9. `RankedAvatar()` - 35 edges
10. `useConfirm()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts
- `main()` --calls--> `createNotification()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/notifications.ts
- `main()` --calls--> `computeWeeklyPayout()`  [EXTRACTED]
  scripts/fix-community-job-payouts.ts → src/lib/community-job-service.ts

## Import Cycles
- None detected.

## Communities (228 total, 36 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.04
Nodes (58): POST(), POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET() (+50 more)

### Community 1 - "prisma.ts"
Cohesion: 0.03
Nodes (23): DEFAULTS, GameSuggestion, DEFAULT_PREFS, GET(), POST(), displayNameOf(), POST(), UserLite (+15 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.05
Nodes (63): GET(), PATCH(), patchSchema, placementSchema, GET(), PATCH(), patchSchema, GET() (+55 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.07
Nodes (57): GET(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps(), POST() (+49 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.06
Nodes (49): APPLY, main(), DELETE(), PATCH(), GET(), POST(), DELETE(), GET() (+41 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.06
Nodes (50): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), GET(), DELETE() (+42 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.05
Nodes (38): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+30 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.05
Nodes (35): EventCardLink(), DashboardLayout(), BackToTop(), NAV, DiscordLoginButton(), Props, FloatingPill(), NAV (+27 more)

### Community 8 - "interactive.ts"
Cohesion: 0.11
Nodes (50): hasAnyValidMove(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate, candidateTargetIds(), DecisionTargetKind (+42 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.08
Nodes (46): POST(), PATCH(), GET(), POST(), GET(), POST(), GET(), POST() (+38 more)

### Community 10 - "time.ts"
Cohesion: 0.08
Nodes (41): GET(), GET(), isAuthorized(), GET(), isAuthorized(), GET(), isAuthorized(), calcStreak() (+33 more)

### Community 11 - "getSessionUser"
Cohesion: 0.06
Nodes (32): GET(), GET(), GET(), GET(), GET(), DELETE(), PATCH(), GET() (+24 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.07
Nodes (44): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+36 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.05
Nodes (33): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+25 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.09
Nodes (48): LiveUnit, LiveDuelSnapshot, LiveUnitSnapshot, allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyTacticEffects() (+40 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.06
Nodes (33): DonationsPage(), fmt(), MONTH_NAMES, streakBadge(), CompareProfilePage(), fetchUserData(), UserData, Avatar() (+25 more)

### Community 16 - "ranks.ts"
Cohesion: 0.08
Nodes (37): GET(), POST(), loadProfileOverlayState(), PointsPage(), generateMetadata(), COIN_SOURCES, PointsInfoModal(), RANK_LADDER (+29 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.10
Nodes (39): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+31 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (37): VfxEvent, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction (+29 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.07
Nodes (33): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+25 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.08
Nodes (28): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, BattleChallengeWidget(), ChallengeItem, ChallengesList(), ChallengeUser (+20 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.09
Nodes (30): LeaderboardPage(), MEDALS, metadata, PODIUM_CONFIG, BracketView(), Match, Participant, roundLabel() (+22 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.08
Nodes (27): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+19 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.07
Nodes (29): CustomBadgeDisplay, Props, formatBirthday(), ProfileEditor(), Props, Badge, ProfileJobBadge(), CustomBadgeDisplay (+21 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.12
Nodes (32): POST(), GEMS_DIFFICULTIES, POST(), POST(), POST(), generateGemsTournamentBossTeam(), sampleWithoutReplacement(), generateBrandedCoverDataUri() (+24 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.11
Nodes (36): AvailableAction, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue(), getArenaBackgroundStyle(), hpBarColor() (+28 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.07
Nodes (34): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+26 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.09
Nodes (32): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, SwapAnim, swapTranslateFor(), TILE_ICON, cell() (+24 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.12
Nodes (30): GET(), GET(), isAuthorized(), CampaignLevelDef, AFK_FARMER, GRIEFER_IMP, LAG_SPIKE, LOOT_GOBLIN (+22 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.09
Nodes (28): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), awardPoints(), parsePlacementPts() (+20 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.09
Nodes (32): GET(), POST(), GET(), GET(), POST(), getPayoutTiers(), resolveTier(), resolveVoteBonusMultiplier() (+24 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.09
Nodes (27): GET(), PATCH(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage(), PACK_KIND_INFO (+19 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (21): buildFfaRanking(), buildMatchRanking(), displayName(), ElementSlot, formatEntryStats(), IdentityFlipTile(), LayoutEntry, MatchTicker() (+13 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.11
Nodes (26): POST(), POST(), GET(), PATCH(), POST(), GET(), GET(), GET() (+18 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.10
Nodes (28): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), GET(), POST() (+20 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 36 - "packs.ts"
Cohesion: 0.11
Nodes (30): POST(), serializeDrawResult(), PACK_LABEL, POST(), VALID_KINDS, CHEST_TABLE, ChestPrize, grantGemsPvpVictoryChest() (+22 more)

### Community 37 - "MobaIcon"
Cohesion: 0.10
Nodes (21): BattleLauncher(), Mode, RankRow(), BattleRankBadge(), ErrorNotice(), TournamentData, RANK_STYLE, MatchmakingWidget() (+13 more)

### Community 38 - "types.ts"
Cohesion: 0.10
Nodes (28): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), pickRandom(), aliveUnits(), resolveEffectTargets() (+20 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.07
Nodes (18): EventCard(), EventUser, GENRE_MAP, Props, SeriesEventItem, STATUS_CFG, StreamingPartner, Props (+10 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.16
Nodes (24): POST(), POST(), POST(), requestSchema, toDbResult(), LineupEditor(), resolveAvatarsForCards(), buildDuelDeckInput() (+16 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.14
Nodes (22): AlbumPage(), DesktopProfileTabs(), Tab, PublicProfilePage(), ProfilePage(), ProfileRecentEvents(), Props, AssetGrid() (+14 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.14
Nodes (24): GET(), PATCH(), PATCH(), PATCH(), GET(), PATCH(), AdminCommunityJobsPage(), DEFAULT_TIERS (+16 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.15
Nodes (26): GET(), GET(), getWeekBounds(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports() (+18 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.10
Nodes (26): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, cache, flush(), inflight (+18 more)

### Community 45 - "auth.ts"
Cohesion: 0.14
Nodes (20): GET(), POST(), requestSchema, DuelDeckPage(), metadata, LineupPage(), metadata, metadata (+12 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), isAuthorized(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee(), updateEventStatus() (+15 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.19
Nodes (21): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), formatStart() (+13 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.09
Nodes (24): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+16 more)

### Community 49 - "amp.ts"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), StatusEntry, AdsTarget, ampCall(), AmpInstance, callWithSession() (+15 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.15
Nodes (20): POST(), POST(), GET(), GET(), POST(), GET(), InterviewPage(), collectYearlyNominations() (+12 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.17
Nodes (25): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+17 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.10
Nodes (18): Props, WinnerClip, DailyMessageBanner(), Message, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount (+10 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.10
Nodes (19): ActivityFeed(), cleanReason(), Filter, Tx, txType(), AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES (+11 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.13
Nodes (22): CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant, readViewMode() (+14 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.13
Nodes (20): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, BattleStatsPanel(), isStoredBattleLog(), StoredBattleLog (+12 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.10
Nodes (24): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, GENRES (+16 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.09
Nodes (19): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, GENRES, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward (+11 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (23): DominionCfg, DominionChange, recomputeSeriesDominionBonus(), SeriesStandings, SeriesStatConfigForDominion, StandingsRaw, computeSidePotPayouts(), resolveEventPredictions() (+15 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.13
Nodes (22): curve(), curvePercent(), STANDARD_CARDS, StandardCardSeed, ACTIVE_POOL, DD_ACTIVE_SKILLS, DD_PASSIVE_KITS, DD_ULTIMATE_SKILLS (+14 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.13
Nodes (20): DELETE(), DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES (+12 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.09
Nodes (14): LinkedUser, Partner, PartnerManager(), TwitchPreview, AmpSuggestion, EMPTY_FORM, FormState, Light (+6 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.16
Nodes (17): AdminEventsPage(), DashboardPage(), formatCountdown(), formatFreshness(), getGlobalDashboardData, MONTH_NAMES, ROLE_LABEL, ROLE_STYLE (+9 more)

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): canvas-confetti, discord.js, gamedig, @google/generative-ai, motion, next, dependencies, canvas-confetti (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.16
Nodes (14): main(), POST(), POST(), POST(), PATCH(), POST(), openSection(), ProfileCompletion() (+6 more)

### Community 67 - "hasMinRole"
Cohesion: 0.17
Nodes (16): PATCH(), OPEN_EVENT_STATUS_FILTER, PATCH(), DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), AdminEventEditPage() (+8 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.14
Nodes (18): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+10 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.13
Nodes (18): GET(), api(), AssetOption, buildEventTemplate(), EventOption, FoundUser, InterviewOption, PostOption (+10 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.15
Nodes (17): GET(), inputStyle, Series, NextEventTile(), GameCover(), coverCache, GameNameInput(), GameNameInputProps (+9 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.11
Nodes (14): FullStandingsToggle(), Props, StandingRow, StandingUser, ArchivedSeason, FORMAT_LABELS, LegacyRow, Avatar() (+6 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.14
Nodes (17): POST(), DELETE(), PATCH(), POST(), GET(), POST(), countCommentVoteScore(), registerScoreResolver() (+9 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.12
Nodes (16): MonthlyContests, Props, YearlyContests, EventsTabs(), TabItem, TabPanel(), Tabs(), TabsProps (+8 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.15
Nodes (14): Membership, Squad, SquadDetailClient(), User, Squad, Avatar(), EVENT_STATUS_LABEL, SquadPublicPage() (+6 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.13
Nodes (14): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+6 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.17
Nodes (17): PATCH(), patchSchema, PATCH(), requestSchema, CardContentError, CardContentPatch, updateCardContent(), grantGuaranteedPack() (+9 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.12
Nodes (18): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+10 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.19
Nodes (17): PATCH(), PATCH(), GET(), isAuthorized(), step(), activateApplication(), addDays(), adminReassignJob() (+9 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.13
Nodes (15): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+7 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.16
Nodes (15): SeriesOption, ConfirmDialog(), ConfirmDialogProps, ConfirmOptions, ConfirmState, EMPTY_STATE, Modal(), PANEL_WIDTH (+7 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.14
Nodes (14): ClipVotingClient(), Nomination, Props, GalleryEntry, MONTH_NAMES, Nomination, ClipWinnerCard(), Props (+6 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.14
Nodes (10): CATEGORY_STRIP, EVENT_STATUS, SyncButton(), MyPrediction, MyPredictionsList(), uname(), UserLite, PredictionStreakCard() (+2 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.22
Nodes (17): checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction(), trackVoice(), client (+9 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.19
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 87 - "compilerOptions"
Cohesion: 0.11
Nodes (19): dom, dom.iterable, esnext, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules (+11 more)

### Community 88 - "send/route.ts"
Cohesion: 0.21
Nodes (15): GET(), POST(), GET(), OptionInput, POST(), POST(), createNotificationForUsers(), dispatchPush() (+7 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.12
Nodes (15): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+7 more)

### Community 90 - "useConfirm"
Cohesion: 0.14
Nodes (15): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+7 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.17
Nodes (13): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+5 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.21
Nodes (14): DELETE(), POST(), DELETE(), POST(), DELETE(), POST(), handleCommunityJobReaction(), notifyVoteMilestone() (+6 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.14
Nodes (13): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+5 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.19
Nodes (16): ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, CLASS_BASE_STATS, isOverridden(), runSeasonUpdate(), toJson(), applyTierJumpLimit(), computePercentiles() (+8 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.12
Nodes (14): CATEGORIES, FORMATS, GENRES, inputStyle, PlacementReward, PLATFORMS, PollConfig, RECURRENCE_OPTS (+6 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.15
Nodes (13): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+5 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.21
Nodes (13): BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), LeaderboardTabs(), Tab, TABS, getCombinedElo() (+5 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.15
Nodes (11): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+3 more)

### Community 100 - "adapters.ts"
Cohesion: 0.16
Nodes (14): NORMAL_ATTACK_TARGET_RULE_MAP, tacticCardToDefinition(), activeSkillSchema, effectSchema, effectTargetSchema, InvalidSkillDataError, parseActiveSkill(), parsePassiveSkill() (+6 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 102 - "recurrence.ts"
Cohesion: 0.25
Nodes (13): POST(), EventSetupWizard(), buildBerlinDate(), calcNextDate(), daysInMonthOf(), describeMonthlyModes(), MonthlyMode, nthWeekdayOfMonth() (+5 more)

### Community 103 - "isVideoUrl"
Cohesion: 0.18
Nodes (12): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, Thumb() (+4 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.26
Nodes (14): LOGO_POSITIONS, StudioEditor(), drawLogo(), drawWatermark(), loadImage(), LogoPosition, prepareUploadImage(), renderStudioCanvas() (+6 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.23
Nodes (10): GET(), PATCH(), MinigamesConfigPanel(), AdminMinigamesPage(), DEFAULTS, getMinigamesConfig(), KEYS, MinigameKey (+2 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.26
Nodes (12): DELETE(), GET(), POST(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), isActiveMember(), listMyPhotoRequests() (+4 more)

### Community 107 - "card-provisioning.ts"
Cohesion: 0.20
Nodes (12): isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, CLASS_SPEED_MIDPOINT, ensureCommunityCard() (+4 more)

### Community 108 - "DailyPollPanel.tsx"
Cohesion: 0.20
Nodes (13): DailyPollPanel(), defaultForm(), formatDate(), formatDateTime(), FormOption, FormState, isCurrentlyActive(), Option (+5 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.22
Nodes (12): GameserverWidget(), Server, ServerRow(), ServerCard(), Server, ServerList(), latestStatus, LiveStatus (+4 more)

### Community 110 - "points.ts"
Cohesion: 0.20
Nodes (11): CATEGORY_ACCENT, CATEGORY_ICONS, CountUp(), formatRelative(), RelativeTime(), RelativeTimeProps, CATEGORY_LABELS, DAILY_CAPS (+3 more)

### Community 111 - "FfaView.tsx"
Cohesion: 0.18
Nodes (11): Props, calcEntryAvg(), Entry, FfaView(), fmtUpTo2(), Match, MEDAL, Participant (+3 more)

### Community 112 - "EventPokalWinners.tsx"
Cohesion: 0.22
Nodes (11): CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS, PokalSection() (+3 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.31
Nodes (10): GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props, FavoriteGame (+2 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "duel-deck.ts"
Cohesion: 0.26
Nodes (10): GET(), PUT(), requestSchema, assertOwnership(), DuelDeckError, DuelDeckSelection, getActiveDuelDeck(), requireActiveDuelDeck() (+2 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.28
Nodes (9): GET(), FeedEntry, ReportPage(), ReportPageClient(), getSeriesParts(), AUTHOR, reportFeedInclude(), ReportWithFeedData (+1 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.23
Nodes (9): POST(), GET(), POST(), GET(), getActiveMembership(), getCommunityJobCatalog(), getProfileJobBadge(), handoffJob() (+1 more)

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

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.45
Nodes (8): POST(), POST(), getDailyDuelCount(), getDailyWageredTotal(), isExpired(), isPairOnCooldown(), startOfToday(), isMinigameEnabled()

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.18
Nodes (10): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+2 more)

### Community 124 - "SeriesAdminRow.tsx"
Cohesion: 0.20
Nodes (8): LegacyRow, SeriesAdminRow(), SeriesEvent, User, StatRow, LEGACY_LIGA_OPTION, TOURNAMENT_FORMATS, TournamentFormatValue

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.24
Nodes (10): CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, EventsTile(), acc() (+2 more)

### Community 126 - "ServerCard.tsx"
Cohesion: 0.20
Nodes (6): ApplyButton(), Light, LIGHT_COLOR, LIGHT_LABEL, Server, ServerCredentials()

### Community 127 - "include"
Cohesion: 0.18
Nodes (9): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx, exclude (+1 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "applyForJob"
Cohesion: 0.27
Nodes (8): GET(), PATCH(), POST(), POST(), getTestModeEnabled(), setTestModeEnabled(), applyForJob(), quitCommunityJob()

### Community 130 - "updateQuestProgress"
Cohesion: 0.24
Nodes (5): POST(), POST(), POST(), userSelect, updateQuestProgress()

### Community 131 - "SeriesCompleteClient.tsx"
Cohesion: 0.25
Nodes (10): Avatar(), computeGroups(), computePlacementMap(), MEDALS, PlacementReward, Props, RewardsConfig, SeriesCompleteClient() (+2 more)

### Community 132 - "clip-des-monats/page.tsx"
Cohesion: 0.25
Nodes (5): ClipDesMonatsPage(), MONTH_NAMES, MONTH_NAMES, CountdownBadge(), useCountdown()

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "elo.ts"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 137 - "PollGameSuggestInput.tsx"
Cohesion: 0.24
Nodes (4): SteamGameResult, PollOptionGameInputProps, GameSuggestion, PollGameSuggestInputProps

### Community 138 - "series/[id]/complete/page.tsx"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 139 - "CoachRatingSection.tsx"
Cohesion: 0.22
Nodes (4): api(), Coach, CoachRatingSection(), RateableSession

### Community 140 - "DailySpin.tsx"
Cohesion: 0.38
Nodes (8): buildSegments(), DailySpin(), PALETTE_BY_TYPE, pt(), rimPath(), segPath(), splitLabel(), useMidnightCountdown()

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.20
Nodes (6): CardWithId, CLASS_CONFIG, CLASS_ORDER, ClassKey, StepDef, STEPS

### Community 142 - "GameCover.tsx"
Cohesion: 0.33
Nodes (6): CoverBrandBadge(), EventCoverDefault(), EventTileItem, Props, dynamicCache, GameCoverProps

### Community 143 - "process-rank-art.ts"
Cohesion: 0.31
Nodes (8): BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RANKS, RAW_DIR, ringSvg()

### Community 144 - "run-season.ts"
Cohesion: 0.39
Nodes (6): POST(), buildSeasonInputs(), countBy(), runFullSeasonUpdate(), RunSeasonResult, markPreSeasonRan()

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.33
Nodes (7): DELETE(), PATCH(), POST(), DELETE(), GET(), PATCH(), requireModeratorOrSquadCaptain()

### Community 146 - "notifications.ts"
Cohesion: 0.33
Nodes (7): DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled(), NotificationType, PREF_KEY

### Community 147 - "DailyMessagePanel.tsx"
Cohesion: 0.36
Nodes (8): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), toDatetimeLocalBerlin()

### Community 148 - "OverlayClient"
Cohesion: 0.22
Nodes (9): cornerStyle(), ElementContent(), elementPositionStyle(), OverlayClient(), panelWidthFor(), pickTickerMatch(), usePanelRotator(), useStackedElements() (+1 more)

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "BadgesAdminClient.tsx"
Cohesion: 0.25
Nodes (4): Badge, CATEGORIES, CATEGORY_LABELS, User

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 152 - "BadgeIcon.tsx"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

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

### Community 157 - "notification-rules/route.ts"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 158 - "series/[id]/complete/route.ts"
Cohesion: 0.38
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 159 - "widget/events/route.ts"
Cohesion: 0.43
Nodes (6): eventSelect, FINISHED_STATUSES, GET(), RELEVANT_STATUSES, sortSeriesEvents(), toWidgetEvent()

### Community 160 - "ImageCropTool.tsx"
Cohesion: 0.33
Nodes (5): centeredRect(), Handle, ImageCropTool(), PRESETS, Rect

### Community 161 - "lineup/route.ts"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 163 - "getSkillTemplate"
Cohesion: 0.60
Nodes (5): isAuthorized(), isOverridden(), POST(), toJson(), getSkillTemplate()

### Community 164 - "cards/page.tsx"
Cohesion: 0.40
Nodes (3): CardRow, CommunityCardsAdmin(), AdminCommunityCardsPage()

### Community 165 - "tactic-cards/page.tsx"
Cohesion: 0.40
Nodes (3): AdminTacticCardsPage(), TacticCardRow, TacticCardsAdmin()

### Community 166 - "[userId]/page.tsx"
Cohesion: 0.40
Nodes (5): ELEMENT_KEYS, parseLayout(), ProfileOverlayPage(), ProfileElementKey, ProfileLayoutPositions

### Community 167 - "generate-brand-assets.ts"
Cohesion: 0.40
Nodes (3): OUT_DIR, PNG_SIZES, SOURCE

### Community 168 - "matchup/route.ts"
Cohesion: 0.60
Nodes (4): average(), GET(), estimateMatchupStrength(), PowerStatUnit

### Community 169 - "seed-standard-cards/route.ts"
Cohesion: 0.70
Nodes (4): GET(), isAuthorized(), POST(), toJson()

### Community 170 - "requireModeratorOrAnySquadCaptain"
Cohesion: 0.60
Nodes (3): NewEventPage(), AdminLayout(), requireModeratorOrAnySquadCaptain()

### Community 172 - "Kapitel-Hintergründe — Kampagne"
Cohesion: 0.50
Nodes (3): Benötigte Dateien, Format, Kapitel-Hintergründe — Kampagne

### Community 175 - "notifications/page.tsx"
Cohesion: 0.67
Nodes (3): AdminNotificationsPage(), DiscordEmoji, fetchGuildEmojis()

## Knowledge Gaps
- **996 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+991 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `formatBerlinDate()` connect `formatBerlinDate` to `roles.ts`, `applyForJob`, `time.ts`, `series-event-points.ts`, `CommunityJobsPanel.tsx`, `RankedAvatar.tsx`, `CommunityJobsAdminPanel.tsx`, `DailyMessagePanel.tsx`, `community-job-service.ts`, `tournament/[id]/page.tsx`, `JobBadge.tsx`, `FotografTools.tsx`, `SeriesDetailClient.tsx`, `dashboard/page.tsx`, `ReportEditor.tsx`, `GameNameInput.tsx`, `SeriesIcon.tsx`, `ProfileOverlayClient.tsx`, `community-job-payout/route.ts`, `AdminEventsClient.tsx`, `ConfirmDialog.tsx`, `(dashboard)/events/page.tsx`, `CoachTools.tsx`, `EventAdminRow.tsx`, `useConfirm`, `CommunityBoardClient.tsx`, `JournalistTools.tsx`, `EventSetupWizard.tsx`, `(dashboard)/battle-cards/page.tsx`, `DailyPollPanel.tsx`, `points.ts`, `FfaView.tsx`, `AdminDonationsClient.tsx`, `SeriesAdminRow.tsx`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `getSessionUser()` connect `getSessionUser` to `roles.ts`, `applyForJob`, `fotograf-service.ts`, `journalist-service.ts`, `clip-des-monats/page.tsx`, `coach-service.ts`, `time.ts`, `series-event-points.ts`, `ranks.ts`, `requireModeratorOrSquadCaptain`, `(dashboard)/leaderboard/page.tsx`, `notify-dispatch.ts`, `requireModeratorOrEventSquadCaptain`, `community-job-service.ts`, `shop-config.ts`, `coach-guide-service.ts`, `tournament/[id]/page.tsx`, `formatBerlinDate`, `community-job-config.ts`, `job-recommendations.ts`, `requireModeratorOrAnySquadCaptain`, `discord-rest.ts`, `dispatchNotification`, `community-board-comment-service.ts`, `dashboard/page.tsx`, `awardProfileCompletionIfNeeded`, `hasMinRole`, `ReportEditor.tsx`, `events/series/[id]/page.tsx`, `visionaer-service.ts`, `SeriesIcon.tsx`, `community-job-payout/route.ts`, `(dashboard)/events/page.tsx`, `community-job-discord-votes.ts`, `admin/community-jobs/disputes/route.ts`, `photo-request-service.ts`, `points.ts`, `report/[id]/page.tsx`, `getActiveMembership`, `upload/route.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `@prisma/client`, `react`, `react-dom`, `sharp`, `sonner`, `three`, `@types/canvas-confetti`, `@types/three`, `@vercel/blob`, `web-push`, `zod`, `scripts`, `@auth/prisma-adapter`, `lucide-react`, `next-auth`, `postprocessing`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _996 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03813646670789528 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03028083028083028 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05258033106134372 - nodes in this community are weakly interconnected._