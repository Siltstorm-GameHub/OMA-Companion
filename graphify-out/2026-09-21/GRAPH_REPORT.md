# Graph Report - OMA-Companion  (2026-09-21)

## Corpus Check
- 905 files · ~2,994,817 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4327 nodes · 10666 edges · 199 communities (166 shown, 33 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc1ce470`
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
1. `getSessionUser()` - 290 edges
2. `requireRole()` - 197 edges
3. `formatBerlinDate()` - 107 edges
4. `hasMinRole()` - 93 edges
5. `dispatchNotification()` - 79 edges
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
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts
- `main()` --calls--> `getCommunityJob()`  [EXTRACTED]
  scripts/fix-community-job-payouts.ts → src/lib/community-jobs.ts

## Import Cycles
- None detected.

## Communities (199 total, 33 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (68): POST(), DELETE(), GET(), PATCH(), POST(), GET(), PATCH(), DELETE() (+60 more)

### Community 1 - "prisma.ts"
Cohesion: 0.02
Nodes (39): DEFAULTS, RULES, RuleSeed, GameSuggestion, GameSuggestion, isAuthorized(), POST(), DEFAULT_PREFS (+31 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.10
Nodes (29): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), CardClassFilter, FILTERS (+21 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.06
Nodes (68): GET(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps(), POST() (+60 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.11
Nodes (26): DELETE(), GET(), POST(), POST(), POST(), GET(), POST(), GET() (+18 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.07
Nodes (53): DELETE(), POST(), POST(), POST(), DELETE(), GET(), PATCH(), GET() (+45 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.07
Nodes (31): EventCardLink(), CATEGORY_STRIP, EVENT_STATUS, SyncButton(), BackToTop(), NAV, FloatingPill(), NAV (+23 more)

### Community 8 - "interactive.ts"
Cohesion: 0.12
Nodes (46): AvailableAction, LiveSnapshot, LiveBattleAwaiting, BoardGrid, hasAnyValidMove(), SpecialGrid, SwapMove, ActionEstimate (+38 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.06
Nodes (56): POST(), PATCH(), GET(), POST(), GET(), POST(), GET(), POST() (+48 more)

### Community 10 - "time.ts"
Cohesion: 0.16
Nodes (16): GET(), isAuthorized(), GET(), POST(), MONTH_NAMES, QuestsPage(), QuestRegenerateButton(), generateMonthlyQuests() (+8 more)

### Community 11 - "getSessionUser"
Cohesion: 0.06
Nodes (33): GET(), GET(), POST(), GET(), GET(), DELETE(), PATCH(), GET() (+25 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.07
Nodes (45): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+37 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.05
Nodes (43): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+35 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.09
Nodes (49): applyShieldAbsorption(), DamageRoll, rollDamage(), allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyTacticEffects() (+41 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.07
Nodes (24): DonationsPage(), fmt(), MONTH_NAMES, streakBadge(), DashboardLayout(), LeaderboardPage(), MEDALS, metadata (+16 more)

### Community 16 - "ranks.ts"
Cohesion: 0.08
Nodes (37): GET(), POST(), PATCH(), loadProfileOverlayState(), PointsPage(), generateMetadata(), COIN_SOURCES, PointsInfoModal() (+29 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.08
Nodes (47): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+39 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (37): VfxEvent, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction (+29 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.08
Nodes (27): AdminUsersClient(), formatLastLogin(), Props, Role, UserRow, Interview, InterviewClient(), name() (+19 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.38
Nodes (5): ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge()

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.12
Nodes (26): BracketView(), Match, Participant, roundLabel(), uname(), User, Props, WanderpocalBadge() (+18 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.06
Nodes (29): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardUpgradeAnimationState, CardUpgradeOverlay(), DuelDeckEditor() (+21 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.08
Nodes (23): CustomBadgeDisplay, Props, Badge, ProfileJobBadge(), CustomBadgeDisplay, Props, Tab, TABS (+15 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.10
Nodes (36): POST(), GET(), isAuthorized(), GEMS_DIFFICULTIES, POST(), POST(), POST(), DISCORD_COLORS (+28 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.12
Nodes (34): GemsResultScreen(), GemsReward, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue(), getArenaBackgroundStyle() (+26 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.15
Nodes (22): activationCellsFor(), areAdjacent(), BoardResolveResult, cellCol(), cellRow(), findMatchGroups(), generateBoard(), isHorizontalGroup() (+14 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.12
Nodes (31): GET(), GET(), isAuthorized(), CampaignLevelDef, AFK_FARMER, GRIEFER_IMP, LAG_SPIKE, LOOT_GOBLIN (+23 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.16
Nodes (17): GET(), isAuthorized(), CATEGORY_ACCENT, CATEGORY_ICONS, awardPoints(), CATEGORY_LABELS, DAILY_CAPS, PointCategory (+9 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.07
Nodes (52): APPLY, main(), PATCH(), PATCH(), GET(), POST(), GET(), POST() (+44 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.05
Nodes (60): GET(), PATCH(), POST(), serializeDrawResult(), PACK_LABEL, POST(), VALID_KINDS, GET() (+52 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.06
Nodes (30): buildFfaRanking(), buildMatchRanking(), cornerStyle(), displayName(), ElementContent(), elementPositionStyle(), ElementSlot, formatEntryStats() (+22 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.07
Nodes (44): GET(), GET(), POST(), POST(), GET(), StatusEntry, GET(), GET() (+36 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.18
Nodes (14): DELETE(), POST(), GET(), POST(), countGuideVoteScore(), createGuide(), CreateGuideResult, MutationResult (+6 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.09
Nodes (30): POST(), POST(), POST(), PUT(), DELETE(), PUT(), GET(), GET() (+22 more)

### Community 36 - "packs.ts"
Cohesion: 0.10
Nodes (26): POST(), DELETE(), PATCH(), PATCH(), POST(), GET(), POST(), GET() (+18 more)

### Community 37 - "MobaIcon"
Cohesion: 0.07
Nodes (36): Mode, CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS, ChallengeUserPicker(), uname(), UserLite (+28 more)

### Community 38 - "types.ts"
Cohesion: 0.07
Nodes (38): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleReplayPage(), metadata, BattleOutcome (+30 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.07
Nodes (18): EventCard(), EventUser, GENRE_MAP, Props, SeriesEventItem, STATUS_CFG, StreamingPartner, Props (+10 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.06
Nodes (65): POST(), GET(), PUT(), requestSchema, POST(), GET(), POST(), requestSchema (+57 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.10
Nodes (24): calcEntryAvg(), Entry, FfaView(), fmtUpTo2(), Match, MEDAL, Participant, uname() (+16 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.11
Nodes (29): GET(), PATCH(), PATCH(), PATCH(), GET(), PATCH(), GET(), PATCH() (+21 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.13
Nodes (31): GET(), POST(), GET(), GET(), getActiveMembership(), getCommunityJobCatalog(), getWeekBounds(), berlinDateParts() (+23 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.13
Nodes (21): cache, flush(), inflight, isFresh(), JobBadge(), JobBadgeProps, listeners, pending (+13 more)

### Community 45 - "auth.ts"
Cohesion: 0.11
Nodes (26): PATCH(), patchSchema, PATCH(), requestSchema, POST(), requestSchema, CardContentError, CardContentPatch (+18 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.11
Nodes (31): GET(), POST(), GET(), OptionInput, POST(), POST(), GET(), GET() (+23 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.32
Nodes (13): formatStart(), GET(), STATUS_TEXT, GET(), GET(), Image(), BRAND, OG_SIZE (+5 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.08
Nodes (37): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+29 more)

### Community 49 - "amp.ts"
Cohesion: 0.11
Nodes (14): FullStandingsToggle(), Props, StandingRow, StandingUser, ArchivedSeason, FORMAT_LABELS, LegacyRow, Avatar() (+6 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.22
Nodes (13): POST(), GET(), GET(), POST(), InterviewPage(), answerInterview(), createInterview(), declineInterview() (+5 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (26): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+18 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.09
Nodes (18): Props, WinnerClip, DailyMessageBanner(), Message, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount (+10 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.05
Nodes (62): GET(), PATCH(), patchSchema, placementSchema, GET(), PATCH(), patchSchema, GET() (+54 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.13
Nodes (22): CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant, readViewMode() (+14 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.16
Nodes (18): DesktopProfileTabs(), Tab, PublicProfilePage(), ProfilePage(), BattleChallengeWidget(), FotografPortfolio(), EventMarketingSection(), MarketingPortfolio() (+10 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.10
Nodes (25): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, GENRES (+17 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.06
Nodes (33): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, GENRES, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward (+25 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (25): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+17 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.13
Nodes (22): curve(), curvePercent(), STANDARD_CARDS, StandardCardSeed, ACTIVE_POOL, DD_ACTIVE_SKILLS, DD_PASSIVE_KITS, DD_ULTIMATE_SKILLS (+14 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.14
Nodes (19): DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES, CommentEntityType (+11 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.13
Nodes (15): metadata, russoOne, spaceGrotesk, viewport, CursorGlow(), ExitAppGuard(), TRAP_STATE, SessionProvider() (+7 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.11
Nodes (20): CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, CountUp(), CoverBrandBadge() (+12 more)

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): @auth/prisma-adapter, discord.js, gamedig, @google/generative-ai, motion, next, dependencies, @auth/prisma-adapter (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), everAwarded(), awardProfileCompletionIfNeeded()

### Community 67 - "hasMinRole"
Cohesion: 0.07
Nodes (35): GET(), PATCH(), GET(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), PATCH(), DELETE() (+27 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.09
Nodes (31): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+23 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.09
Nodes (30): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+22 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.15
Nodes (17): GET(), inputStyle, Series, NextEventTile(), GameCover(), coverCache, GameNameInput(), GameNameInputProps (+9 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.16
Nodes (18): IdeaList(), IdeaBody(), api(), IdeaForm(), IdeaPrefill, Similar, IdeaFromButton(), isVisionaer() (+10 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.13
Nodes (13): ActivityFeed(), cleanReason(), Filter, Tx, txType(), AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES (+5 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.12
Nodes (15): MonthlyContests, Props, YearlyContests, EventsTabs(), TabItem, TabPanel(), Tabs(), TabsProps (+7 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.13
Nodes (15): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+7 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.13
Nodes (14): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+6 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.24
Nodes (12): GET(), IdeaPage(), ReportPage(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData, toIdeaFeedEntry(), getSeriesParts() (+4 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.10
Nodes (23): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+15 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.15
Nodes (5): RULES, FEATURES, AnimatedBackground(), Cell, PULSE_COLORS

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.16
Nodes (20): GET(), GET(), GET(), isAuthorized(), calcStreak(), GET(), formatDate(), SeasonConfigPanel() (+12 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.06
Nodes (41): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+33 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.10
Nodes (19): ClipVotingClient(), Nomination, Props, ClipDesMonatsPage(), MONTH_NAMES, GalleryEntry, MONTH_NAMES, Nomination (+11 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.31
Nodes (5): MyPrediction, MyPredictionsList(), uname(), UserLite, PredictionStreakCard()

### Community 84 - "bot/index.ts"
Cohesion: 0.17
Nodes (17): POST(), POST(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction() (+9 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.12
Nodes (23): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+15 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.17
Nodes (14): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+6 more)

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.18
Nodes (10): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, SwapAnim, swapTranslateFor(), TILE_ICON, cell() (+2 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.12
Nodes (15): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+7 more)

### Community 90 - "useConfirm"
Cohesion: 0.33
Nodes (8): checkAndAwardBadges(), loadStats(), BADGE_CATEGORY_LABELS, BADGE_DEFS, BadgeDef, BadgeStats, findNewlyEarnedBadges(), getBadgeDef()

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.14
Nodes (16): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+8 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.09
Nodes (33): GET(), POST(), GET(), DELETE(), PATCH(), DELETE(), POST(), GET() (+25 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.12
Nodes (16): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+8 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.36
Nodes (9): applyTierJumpLimit(), computePercentiles(), computeSeasonResults(), hashSeed(), MemberSeasonResult, resolveClass(), TIER_ORDER, TIER_PERCENTILE_CEILING (+1 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.07
Nodes (34): POST(), CATEGORIES, EventSetupWizard(), FORMATS, GENRES, inputStyle, PlacementReward, PLATFORMS (+26 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.13
Nodes (16): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+8 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.27
Nodes (8): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), getEventPollWinners()

### Community 99 - "PackOpener.tsx"
Cohesion: 0.15
Nodes (11): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+3 more)

### Community 100 - "adapters.ts"
Cohesion: 0.39
Nodes (7): RankRow(), BattleRankBadge(), BATTLE_RANKS, BattleRankEntry, getBattleRank(), getBattleRankFullLabel(), computeRankUp()

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 102 - "recurrence.ts"
Cohesion: 0.33
Nodes (5): centeredRect(), Handle, ImageCropTool(), PRESETS, Rect

### Community 103 - "isVideoUrl"
Cohesion: 0.11
Nodes (18): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, AlbumPage() (+10 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.60
Nodes (5): isAuthorized(), isOverridden(), POST(), toJson(), getSkillTemplate()

### Community 105 - "minigames-config.ts"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.26
Nodes (12): DELETE(), GET(), POST(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), isActiveMember(), listMyPhotoRequests() (+4 more)

### Community 107 - "card-provisioning.ts"
Cohesion: 0.20
Nodes (12): isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, CLASS_SPEED_MIDPOINT, ensureCommunityCard() (+4 more)

### Community 108 - "DailyPollPanel.tsx"
Cohesion: 0.09
Nodes (24): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+16 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.11
Nodes (19): GameserverWidget(), Server, ServerRow(), ApplyButton(), ServersPage(), Light, LIGHT_COLOR, LIGHT_LABEL (+11 more)

### Community 110 - "points.ts"
Cohesion: 0.40
Nodes (4): BattleCardsTabsInner(), isTabKey(), TabKey, TABS

### Community 111 - "FfaView.tsx"
Cohesion: 0.47
Nodes (5): Avatar(), EventTippsList(), Tipp, uname(), UserLite

### Community 112 - "EventPokalWinners.tsx"
Cohesion: 0.16
Nodes (16): MONTH_NAMES, YearReviewPage(), CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props (+8 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.28
Nodes (12): GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props, FavoriteGame (+4 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.10
Nodes (23): DELETE(), PATCH(), POST(), DELETE(), GET(), PATCH(), POST(), DELETE() (+15 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.08
Nodes (24): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+16 more)

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
Cohesion: 0.25
Nodes (12): GET(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), generateBrandedCoverDataUri(), getGradientBackground() (+4 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.18
Nodes (10): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+2 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

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
Cohesion: 0.13
Nodes (19): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+11 more)

### Community 139 - "CoachRatingSection.tsx"
Cohesion: 0.22
Nodes (4): api(), Coach, CoachRatingSection(), RateableSession

### Community 140 - "DailySpin.tsx"
Cohesion: 0.67
Nodes (3): formatBirthday(), ProfileEditor(), Props

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.53
Nodes (4): GET(), displayName(), EventFacts, getEventFacts()

### Community 142 - "GameCover.tsx"
Cohesion: 0.14
Nodes (17): AdminEventsPage(), DashboardPage(), formatCountdown(), formatFreshness(), getGlobalDashboardData, MONTH_NAMES, ROLE_LABEL, ROLE_STYLE (+9 more)

### Community 143 - "process-rank-art.ts"
Cohesion: 0.31
Nodes (8): BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RANKS, RAW_DIR, ringSvg()

### Community 144 - "run-season.ts"
Cohesion: 0.20
Nodes (13): POST(), ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, CLASS_BASE_STATS, isOverridden(), runSeasonUpdate(), toJson(), buildSeasonInputs() (+5 more)

### Community 146 - "notifications.ts"
Cohesion: 0.18
Nodes (12): main(), DISCORD_REASONS, GET(), isAuthorized(), openSection(), ProfileCompletion(), Props, createNotification() (+4 more)

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "BadgesAdminClient.tsx"
Cohesion: 0.16
Nodes (10): Badge, CATEGORIES, CATEGORY_LABELS, User, BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART (+2 more)

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

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
Cohesion: 0.70
Nodes (4): GET(), isAuthorized(), POST(), toJson()

### Community 172 - "Kapitel-Hintergründe — Kampagne"
Cohesion: 0.50
Nodes (3): Benötigte Dateien, Format, Kapitel-Hintergründe — Kampagne

## Knowledge Gaps
- **1015 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1010 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `getSessionUser` to `roles.ts`, `fotograf-service.ts`, `journalist-service.ts`, `GuestGate.tsx`, `coach-service.ts`, `time.ts`, `series-event-points.ts`, `StarterPickFlow.tsx`, `GameCover.tsx`, `RankedAvatar.tsx`, `ranks.ts`, `notify-dispatch.ts`, `requireModeratorOrEventSquadCaptain`, `community-job-service.ts`, `shop-config.ts`, `coach-guide-service.ts`, `packs.ts`, `tournament/[id]/page.tsx`, `community-job-config.ts`, `job-recommendations.ts`, `discord-rest.ts`, `amp.ts`, `dispatchNotification`, `BattleLogEntry`, `SeriesDetailClient.tsx`, `community-board-comment-service.ts`, `awardProfileCompletionIfNeeded`, `hasMinRole`, `tutorial.ts`, `ClipVotingClient.tsx`, `community-job-discord-votes.ts`, `admin/community-jobs/disputes/route.ts`, `isVideoUrl`, `photo-request-service.ts`, `EventPokalWinners.tsx`, `report/[id]/page.tsx`, `upload/route.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `getActiveMembership` to `roles.ts`, `GuestGate.tsx`, `series-event-points.ts`, `CommunityJobsPanel.tsx`, `GameCover.tsx`, `RankedAvatar.tsx`, `CommunityJobsAdminPanel.tsx`, `ProfileMobileView.tsx`, `community-job-service.ts`, `tournament/[id]/page.tsx`, `formatBerlinDate`, `community-job-config.ts`, `FotografTools.tsx`, `CoinIcon.tsx`, `BattleLogEntry`, `SeriesDetailClient.tsx`, `ReportEditor.tsx`, `GameNameInput.tsx`, `events/series/[id]/page.tsx`, `SeriesIcon.tsx`, `ProfileOverlayClient.tsx`, `AdminEventsClient.tsx`, `ConfirmDialog.tsx`, `(dashboard)/events/page.tsx`, `CoachTools.tsx`, `EventAdminRow.tsx`, `CommunityBoardClient.tsx`, `JournalistTools.tsx`, `EventSetupWizard.tsx`, `isVideoUrl`, `DailyPollPanel.tsx`, `AdminDonationsClient.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `series/[id]/complete/page.tsx`, `getSessionUser`, `series-event-points.ts`, `run-season.ts`, `ranks.ts`, `new-season/page.tsx`, `notify-dispatch.ts`, `[tacticCardId]/route.ts`, `shop-config.ts`, `clip-contest.ts`, `gameservers.ts`, `community-job-config.ts`, `auth.ts`, `discord-rest.ts`, `CoinIcon.tsx`, `revert-event-completion.ts`, `hasMinRole`, `admin/events/[id]/complete/route.ts`, `EventSetupWizard.tsx`, `NotificationRulesPanel.tsx`, `minigames-config.ts`, `DailyPollPanel.tsx`, `report/[id]/page.tsx`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1015 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.032758888371370906 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02456140350877193 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09957325746799431 - nodes in this community are weakly interconnected._