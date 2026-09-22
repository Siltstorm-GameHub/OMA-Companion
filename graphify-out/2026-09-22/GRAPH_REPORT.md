# Graph Report - OMA-Companion  (2026-09-21)

## Corpus Check
- 945 files · ~3,017,785 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4529 nodes · 11337 edges · 230 communities (191 shown, 39 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `18c958a8`
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
- requireModeratorOrSquadCaptain
- Product
- GuildHub – Discord Companion
- DailyMessagePanel.tsx
- series/[id]/complete/page.tsx
- starter-pick.ts
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
- GameCover.tsx
- SeasonConfigPanel.tsx
- requireModeratorOrAnySquadCaptain
- recharts
- lineup/route.ts
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- EventCreateForm.tsx
- MyPredictionsList.tsx
- FloatingLobbyChat.tsx
- generate-brand-assets.ts
- widget/events/route.ts
- seed-standard-cards/route.ts
- synergy.ts
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- roadmap/page.tsx
- setIdeaInterest
- seed-notification-rules.ts
- UserRoleManager.tsx
- genre-icons.ts
- chroma-key.js
- preferences/route.ts
- ideas/stats/route.ts
- battle-cards/layout.tsx
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- lobby-cleanup/route.ts
- bot-runner.mjs
- eslint.config.mjs
- grant-tactic-cards-to-all/route.ts
- @auth/prisma-adapter
- next.config.ts
- canvas-confetti
- lucide-react
- next-auth
- postprocessing
- react
- react-dom
- sharp
- sonner
- three
- @vercel/blob
- @types/canvas-confetti
- @types/three
- postcss.config.mjs
- tailwind.config.ts
- vercel.json
- { GET, POST }
- size
- MIN_MATCHES_FOR_RANKING
- web-push
- zod

## God Nodes (most connected - your core abstractions)
1. `getSessionUser()` - 321 edges
2. `requireRole()` - 209 edges
3. `formatBerlinDate()` - 119 edges
4. `hasMinRole()` - 109 edges
5. `dispatchNotification()` - 88 edges
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
- `main()` --calls--> `computeWeeklyPayout()`  [EXTRACTED]
  scripts/fix-community-job-payouts.ts → src/lib/community-job-service.ts
- `StandardCardSeed` --references--> `ActiveSkillData`  [EXTRACTED]
  prisma/battle-cards-seed-data.ts → src/lib/battle-engine/types.ts

## Import Cycles
- None detected.

## Communities (230 total, 39 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (58): POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET(), DELETE() (+50 more)

### Community 1 - "prisma.ts"
Cohesion: 0.03
Nodes (22): DEFAULTS, GameSuggestion, GET(), POST(), displayNameOf(), POST(), UserLite, userSummary() (+14 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.14
Nodes (21): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), CardUpgradeBadge(), DuplicateProgress() (+13 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.11
Nodes (39): GET(), POST(), requestSchema, toDbResult(), metadata, MyCardPage(), CARD_CLASSES, isCardClass() (+31 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.05
Nodes (73): GET(), POST(), GET(), GET(), POST(), GET(), GET(), POST() (+65 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.06
Nodes (51): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), DELETE(), GET() (+43 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.05
Nodes (38): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+30 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.19
Nodes (7): EventCardLink(), CATEGORY_STRIP, EVENT_STATUS, SyncButton(), ScrollReveal(), StreamRegisterButton(), isGuestAllowedPath()

### Community 8 - "interactive.ts"
Cohesion: 0.12
Nodes (45): applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate, DecisionTargetKind, describeAvailableActions(), estimateActionEffect(), primaryTargetKind() (+37 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.06
Nodes (60): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+52 more)

### Community 10 - "time.ts"
Cohesion: 0.13
Nodes (23): GET(), GET(), isAuthorized(), calcStreak(), GET(), GET(), POST(), CreateContestForm() (+15 more)

### Community 11 - "getSessionUser"
Cohesion: 0.05
Nodes (62): GET(), GET(), GET(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), PATCH(), GET() (+54 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.09
Nodes (31): GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET(), AdminEventCompletePage() (+23 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (58): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+50 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.11
Nodes (44): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyTacticEffects(), asBattleLog(), beginTrapCheck(), checkDuelTimeout() (+36 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.06
Nodes (39): DonationsPage(), fmt(), MONTH_NAMES, streakBadge(), CompareProfilePage(), fetchUserData(), UserData, BracketView() (+31 more)

### Community 16 - "ranks.ts"
Cohesion: 0.09
Nodes (33): GET(), POST(), PATCH(), COIN_SOURCES, PointsInfoModal(), RANK_LADDER, PIP_COUNT, RankIcon() (+25 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.10
Nodes (37): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+29 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (37): VfxEvent, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction (+29 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.04
Nodes (46): Anomalies, Person, PayoutsClient(), Preview, Run, Week, api(), Idea (+38 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.06
Nodes (32): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, BattleLauncher(), Mode, RankRow(), BattleRankBadge() (+24 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.17
Nodes (19): Props, WanderpocalBadge(), Props, WanderpocalBadgeServer(), ordinalSuffix(), Props, WanderpocalSection(), buildHoldersMap() (+11 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.10
Nodes (21): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+13 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.07
Nodes (23): AlbumPage(), Props, EventLiveBadge(), FORMAT_LABELS, GENRE_MAP, STATUS_STYLES, TournamentDetailPage(), Props (+15 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.22
Nodes (14): POST(), POST(), POST(), generateBrandedCoverDataUri(), DISCORD_COLORS, hexToInt(), rankUpColor(), CoverSource (+6 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.12
Nodes (34): GemsResultScreen(), GemsReward, AvailableAction, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue() (+26 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.09
Nodes (35): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, SwapAnim, swapTranslateFor(), TILE_ICON, cell() (+27 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.23
Nodes (18): CampaignLevelDef, AFK_FARMER, GRIEFER_IMP, LAG_SPIKE, LOOT_GOBLIN, PAY2WIN_TRUHE, RAGE_QUIT_CONTROLLER, SEASON_PASS_DRACHE (+10 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.07
Nodes (25): formatBirthday(), ProfileEditor(), Props, Badge, ProfileJobBadge(), CustomBadgeDisplay, Props, Tab (+17 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.05
Nodes (67): PATCH(), POST(), POST(), POST(), GET(), GET(), POST(), GET() (+59 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.08
Nodes (34): GET(), PATCH(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage(), PACK_KIND_INFO (+26 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (21): buildFfaRanking(), buildMatchRanking(), displayName(), ElementSlot, formatEntryStats(), IdentityFlipTile(), LayoutEntry, MatchTicker() (+13 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.10
Nodes (30): POST(), POST(), GET(), PATCH(), POST(), GET(), GET(), isAuthorized() (+22 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.15
Nodes (17): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+9 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.11
Nodes (24): POST(), POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST() (+16 more)

### Community 36 - "packs.ts"
Cohesion: 0.09
Nodes (33): POST(), GET(), DELETE(), PATCH(), POST(), GET(), POST(), GET() (+25 more)

### Community 37 - "MobaIcon"
Cohesion: 0.12
Nodes (24): GET(), IdeaList(), IdeaBody(), api(), AreaKey, FoundUser, GameInfo, IdeaForm() (+16 more)

### Community 38 - "types.ts"
Cohesion: 0.08
Nodes (32): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleStatsPanel(), StoredBattleLog, computeBattleStats() (+24 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.08
Nodes (51): POST(), GET(), POST(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST() (+43 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.10
Nodes (31): POST(), serializeDrawResult(), PACK_LABEL, POST(), VALID_KINDS, ShopPage(), CHEST_TABLE, ChestPrize (+23 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.15
Nodes (23): BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), LeaderboardTabs(), Tab, TABS, getCombinedElo() (+15 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.07
Nodes (51): APPLY, main(), GET(), PATCH(), PATCH(), PATCH(), GET(), PATCH() (+43 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.19
Nodes (23): berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames(), getDismissedItemKeys() (+15 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.08
Nodes (25): api(), Coach, CoachRatingSection(), RateableSession, cache, flush(), inflight, isFresh() (+17 more)

### Community 45 - "auth.ts"
Cohesion: 0.18
Nodes (16): PATCH(), patchSchema, PATCH(), requestSchema, CardContentError, CardContentPatch, updateCardContent(), grantGuaranteedPack() (+8 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.18
Nodes (20): GET(), POST(), GET(), OptionInput, POST(), POST(), resolveChannelId(), createNotificationForUsers() (+12 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.21
Nodes (19): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+11 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.08
Nodes (37): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+29 more)

### Community 49 - "amp.ts"
Cohesion: 0.13
Nodes (11): FullStandingsToggle(), Props, StandingRow, StandingUser, Avatar(), DeltaInfo, MEDALS, Props (+3 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (26): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+18 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.09
Nodes (18): Props, WinnerClip, DailyMessageBanner(), Message, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount (+10 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.18
Nodes (19): loadProfileOverlayState(), PointsPage(), DesktopProfileTabs(), Tab, generateMetadata(), PublicProfilePage(), ProfilePage(), FotografPortfolio() (+11 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.13
Nodes (22): CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant, readViewMode() (+14 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.04
Nodes (58): POST(), AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection() (+50 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.10
Nodes (25): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, GENRES (+17 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.07
Nodes (28): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, GENRES, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward (+20 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (24): DELETE(), PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage(), DominionCfg (+16 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.12
Nodes (23): curve(), curvePercent(), STANDARD_CARDS, StandardCardSeed, ACTIVE_POOL, DD_ACTIVE_SKILLS, DD_PASSIVE_KITS, DD_ULTIMATE_SKILLS (+15 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.12
Nodes (20): DELETE(), DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES (+12 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.12
Nodes (24): AnomaliesClient(), api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers() (+16 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.14
Nodes (19): GEMS_DIFFICULTIES, GET(), GET(), isAuthorized(), GEMS_DIFFICULTIES, POST(), findGemsMonsterTemplate(), finalizeDueGemsTournaments() (+11 more)

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): discord.js, gamedig, @google/generative-ai, motion, next, dependencies, discord.js, gamedig (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.17
Nodes (14): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+6 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (21): GET(), POST(), DELETE(), DELETE(), AUTHOR, AuthorRow, authorSearch(), contentInfo() (+13 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.11
Nodes (25): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+17 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.19
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.22
Nodes (13): GET(), GameCover(), coverCache, GameNameInput(), GameNameInputProps, highlightMatch(), escapeRegExp(), GAME_MAP (+5 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.18
Nodes (7): BackToTop(), GuestGateProvider(), ACCENT_COLOR, ICON_MAP, NewsItem, Props, TopNewsFeed()

### Community 73 - "visionaer-service.ts"
Cohesion: 0.19
Nodes (10): ActivityFeed(), cleanReason(), Filter, Tx, txType(), AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES (+2 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.19
Nodes (8): MonthlyContests, Props, YearlyContests, EventsTabs(), TabItem, TabPanel(), Tabs(), TabsProps

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.13
Nodes (21): AdminEventsPage(), DashboardPage(), formatCountdown(), formatFreshness(), getGlobalDashboardData, MONTH_NAMES, ROLE_LABEL, ROLE_STYLE (+13 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.13
Nodes (14): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+6 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.21
Nodes (15): GET(), IdeaPage(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData, toIdeaFeedEntry(), summarizeStars(), AUTHOR (+7 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.12
Nodes (18): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+10 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.14
Nodes (17): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), RARITIES (+9 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.18
Nodes (10): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+2 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.08
Nodes (31): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+23 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.10
Nodes (19): ClipVotingClient(), Nomination, Props, ClipDesMonatsPage(), MONTH_NAMES, GalleryEntry, MONTH_NAMES, Nomination (+11 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.15
Nodes (22): GET(), isAuthorized(), formatStart(), GET(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee(), updateEventStatus() (+14 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.16
Nodes (15): POST(), DELETE(), POST(), DELETE(), POST(), awardPoints(), parsePlacementPts(), PATCH() (+7 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.31
Nodes (10): POST(), GET(), POST(), answerInterview(), createInterview(), declineInterview(), InterviewResult, listMyInterviews() (+2 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.11
Nodes (21): main(), DISCORD_REASONS, GET(), isAuthorized(), POST(), POST(), POST(), PATCH() (+13 more)

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), StatusEntry, AdsTarget, ampCall(), AmpInstance, callWithSession() (+15 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.12
Nodes (15): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+7 more)

### Community 90 - "useConfirm"
Cohesion: 0.22
Nodes (11): CustomBadgeDisplay, Props, checkAndAwardBadges(), loadStats(), Badge, BADGE_CATEGORY_LABELS, BADGE_DEFS, BadgeDef (+3 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.07
Nodes (32): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+24 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.19
Nodes (15): DELETE(), POST(), DELETE(), POST(), DELETE(), POST(), handleCommunityJobReaction(), notifyVoteMilestone() (+7 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.15
Nodes (14): NAV, FloatingPill(), NAV, NavLink, useTheme(), GateButton(), GateLink(), GateOptions (+6 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.36
Nodes (9): applyTierJumpLimit(), computePercentiles(), computeSeasonResults(), hashSeed(), MemberSeasonResult, resolveClass(), TIER_ORDER, TIER_PERCENTILE_CEILING (+1 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.12
Nodes (15): CATEGORIES, EventSetupWizard(), FORMATS, GENRES, inputStyle, PlacementReward, PLATFORMS, PollConfig (+7 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.13
Nodes (16): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+8 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.14
Nodes (21): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+13 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.15
Nodes (11): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+3 more)

### Community 100 - "adapters.ts"
Cohesion: 0.09
Nodes (14): LinkedUser, Partner, PartnerManager(), TwitchPreview, AmpSuggestion, EMPTY_FORM, FormState, Light (+6 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 102 - "recurrence.ts"
Cohesion: 0.13
Nodes (16): GET(), api(), AssetOption, buildEventTemplate(), EventOption, FoundUser, InterviewOption, PostOption (+8 more)

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
Cohesion: 0.20
Nodes (12): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, isStoredBattleLog(), finalizePvpChallengeSideEffects(), notifyPvpBattleResolved() (+4 more)

### Community 107 - "card-provisioning.ts"
Cohesion: 0.18
Nodes (13): isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, CLASS_BASE_STATS, CLASS_SPEED_MIDPOINT (+5 more)

### Community 108 - "DailyPollPanel.tsx"
Cohesion: 0.12
Nodes (12): DashboardLayout(), LeaderboardPage(), MEDALS, metadata, PODIUM_CONFIG, BotPreviewShell(), CountUp(), PartnerFooter() (+4 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.21
Nodes (12): GameserverWidget(), Server, ServerRow(), ServerCard(), Server, ServerList(), latestStatus, LiveStatus (+4 more)

### Community 110 - "points.ts"
Cohesion: 0.13
Nodes (19): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+11 more)

### Community 111 - "FfaView.tsx"
Cohesion: 0.20
Nodes (6): ApplyButton(), Light, LIGHT_COLOR, LIGHT_LABEL, Server, ServerCredentials()

### Community 112 - "EventPokalWinners.tsx"
Cohesion: 0.16
Nodes (16): MONTH_NAMES, YearReviewPage(), CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props (+8 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.13
Nodes (13): Event, needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES, ActionCountBadge() (+5 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "duel-deck.ts"
Cohesion: 0.40
Nodes (3): CardRow, CommunityCardsAdmin(), AdminCommunityCardsPage()

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.21
Nodes (13): PATCH(), DELETE(), displayNameOf(), PATCH(), UserLite, userSummary(), revokePointsByReason(), applyMatchResult() (+5 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.18
Nodes (14): CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, ThumbVote(), voteUrl() (+6 more)

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
Cohesion: 0.27
Nodes (15): LiveSnapshot, LiveUnit, LiveBattleAwaiting, LiveUnitSnapshot, BoardGrid, SpecialGrid, SwapMove, AvailableAction (+7 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 124 - "SeriesAdminRow.tsx"
Cohesion: 0.24
Nodes (4): SteamGameResult, PollOptionGameInputProps, GameSuggestion, PollGameSuggestInputProps

### Community 126 - "ServerCard.tsx"
Cohesion: 0.31
Nodes (10): GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props, FavoriteGame (+2 more)

### Community 127 - "include"
Cohesion: 0.24
Nodes (10): GET(), GET(), authHeader(), DiscordEmbed, DiscordGuildEmoji, DiscordTextChannel, listGuildEmojis(), listGuildTextChannels() (+2 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "applyForJob"
Cohesion: 0.19
Nodes (9): LegacyRow, SeriesAdminRow(), SeriesEvent, User, StatRow, describeMonthlyModes(), LEGACY_LIGA_OPTION, TOURNAMENT_FORMATS (+1 more)

### Community 130 - "updateQuestProgress"
Cohesion: 0.24
Nodes (14): GET(), PATCH(), patchSchema, GET(), isAuthorized(), hardResetAllElo(), resetAllCampaignProgress(), resetAllCardOwnership() (+6 more)

### Community 131 - "SeriesCompleteClient.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 132 - "clip-des-monats/page.tsx"
Cohesion: 0.22
Nodes (9): cornerStyle(), ElementContent(), elementPositionStyle(), OverlayClient(), panelWidthFor(), pickTickerMatch(), usePanelRotator(), useStackedElements() (+1 more)

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "requireModeratorOrSquadCaptain"
Cohesion: 0.21
Nodes (14): DELETE(), PATCH(), POST(), POST(), buildBerlinDate(), calcNextDate(), daysInMonthOf(), MonthlyMode (+6 more)

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 137 - "DailyMessagePanel.tsx"
Cohesion: 0.44
Nodes (9): GET(), displayName(), getCronRuns(), getJobHealth(), getPayoutOverview(), getVoteAnomalies(), previewPayout(), VoteEvent (+1 more)

### Community 138 - "series/[id]/complete/page.tsx"
Cohesion: 0.14
Nodes (13): CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS, ErrorNotice(), DIFFICULTY_CONFIG, DIFFICULTY_ORDER, NpcBattleLauncher() (+5 more)

### Community 139 - "starter-pick.ts"
Cohesion: 0.14
Nodes (14): POST(), VALID_DIFFICULTIES, POST(), requestSchema, DuelDeckPage(), metadata, LineupPage(), metadata (+6 more)

### Community 140 - "DailySpin.tsx"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.11
Nodes (22): average(), GET(), BattleChallengeWidget(), ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge() (+14 more)

### Community 142 - "GameCover.tsx"
Cohesion: 0.24
Nodes (8): POST(), computeKeptSeriesRankPoints(), PlacementReward, resetAllExceptSeries(), RewardsConfig, SelectiveResetSummary, LegacyStandingRow, SeriesEventForStandings

### Community 143 - "process-rank-art.ts"
Cohesion: 0.31
Nodes (8): BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RANKS, RAW_DIR, ringSvg()

### Community 144 - "run-season.ts"
Cohesion: 0.22
Nodes (12): POST(), ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, isOverridden(), runSeasonUpdate(), toJson(), buildSeasonInputs(), countBy() (+4 more)

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.38
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 146 - "notifications.ts"
Cohesion: 0.11
Nodes (29): GET(), isAuthorized(), POST(), POST(), CATEGORY_ACCENT, CATEGORY_ICONS, checkpointVoice(), findUser() (+21 more)

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
Cohesion: 0.21
Nodes (8): MobileTopBar(), ROUTE_TITLES, useTheme(), BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 156 - "[tacticCardId]/route.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 157 - "GameCover.tsx"
Cohesion: 0.39
Nodes (5): CoverBrandBadge(), EventCoverDefault(), dynamicCache, GameCoverProps, pickedCoverCache

### Community 158 - "SeasonConfigPanel.tsx"
Cohesion: 0.60
Nodes (4): formatDate(), SeasonConfigPanel(), toDateInputValue(), SeasonConfig

### Community 159 - "requireModeratorOrAnySquadCaptain"
Cohesion: 0.24
Nodes (8): CardUpgradeOverlay(), DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, NextLevelPreview(), StatBadges(), levelMultiplier(), scaleStatsForLevel()

### Community 160 - "recharts"
Cohesion: 0.28
Nodes (8): GET(), PUT(), requestSchema, assertOwnership(), DuelDeckError, getActiveDuelDeck(), setActiveDuelDeck(), validateSelection()

### Community 161 - "lineup/route.ts"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 163 - "HeroStatValue.tsx"
Cohesion: 0.70
Nodes (3): HeroStatValue(), useValueDelta(), ValueDeltaBadge()

### Community 165 - "MyPredictionsList.tsx"
Cohesion: 0.31
Nodes (5): MyPrediction, MyPredictionsList(), uname(), UserLite, PredictionStreakCard()

### Community 166 - "FloatingLobbyChat.tsx"
Cohesion: 0.32
Nodes (7): displayName(), FloatingLobbyChat(), LobbyMsg, NOTIF_ICONS, Notification, PresenceUser, timeAgo()

### Community 167 - "generate-brand-assets.ts"
Cohesion: 0.40
Nodes (3): OUT_DIR, PNG_SIZES, SOURCE

### Community 168 - "widget/events/route.ts"
Cohesion: 0.43
Nodes (6): eventSelect, FINISHED_STATUSES, GET(), RELEVANT_STATUSES, sortSeriesEvents(), toWidgetEvent()

### Community 169 - "seed-standard-cards/route.ts"
Cohesion: 0.70
Nodes (4): GET(), isAuthorized(), POST(), toJson()

### Community 170 - "synergy.ts"
Cohesion: 0.43
Nodes (5): LineupCard, LineupEditor(), applySynergies(), computeSynergies(), SynergyBonus

### Community 172 - "Kapitel-Hintergründe — Kampagne"
Cohesion: 0.50
Nodes (3): Benötigte Dateien, Format, Kapitel-Hintergründe — Kampagne

### Community 173 - "roadmap/page.tsx"
Cohesion: 0.40
Nodes (4): IdeaRow(), Item, RoadmapPage(), getRoadmap()

### Community 174 - "setIdeaInterest"
Cohesion: 0.60
Nodes (4): POST(), IDEA_INTEREST_KINDS, isIdeaInterestKind(), setIdeaInterest()

## Knowledge Gaps
- **1055 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1050 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `getSessionUser` to `roles.ts`, `fotograf-service.ts`, `journalist-service.ts`, `requireModeratorOrSquadCaptain`, `GuestGate.tsx`, `DailyMessagePanel.tsx`, `coach-service.ts`, `time.ts`, `notifications.ts`, `ProfileMobileView.tsx`, `community-job-service.ts`, `coach-guide-service.ts`, `packs.ts`, `MobaIcon`, `resolveAvatarsForCards`, `community-job-config.ts`, `roadmap/page.tsx`, `setIdeaInterest`, `dispatchNotification`, `ideas/stats/route.ts`, `CoinIcon.tsx`, `BattleLogEntry`, `community-board-comment-service.ts`, `dashboard/page.tsx`, `hasMinRole`, `SeriesIcon.tsx`, `tutorial.ts`, `ClipVotingClient.tsx`, `bot/index.ts`, `CoachTools.tsx`, `MarkdownLite.tsx`, `community-job-discord-votes.ts`, `admin/community-jobs/disputes/route.ts`, `recurrence.ts`, `DailyPollPanel.tsx`, `EventPokalWinners.tsx`, `upload/route.ts`, `include`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `BattleLogEntry` to `applyForJob`, `GuestGate.tsx`, `CommunityJobsPanel.tsx`, `RankedAvatar.tsx`, `CommunityJobsAdminPanel.tsx`, `ProfileMobileView.tsx`, `requireModeratorOrEventSquadCaptain`, `community-job-service.ts`, `clip-contest.ts`, `MobaIcon`, `MyPredictionsList.tsx`, `formatBerlinDate`, `roadmap/page.tsx`, `FotografTools.tsx`, `CoinIcon.tsx`, `SeriesDetailClient.tsx`, `EmptyState.tsx`, `SeriesIcon.tsx`, `ProfileOverlayClient.tsx`, `AdminEventsClient.tsx`, `ConfirmDialog.tsx`, `EventAdminRow.tsx`, `CommunityBoardClient.tsx`, `EventSetupWizard.tsx`, `(dashboard)/battle-cards/page.tsx`, `recurrence.ts`, `GamePlayersModal.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `updateQuestProgress`, `ranked-season.ts`, `SeriesCompleteClient.tsx`, `requireModeratorOrSquadCaptain`, `getSessionUser`, `DailySpin.tsx`, `GameCover.tsx`, `run-season.ts`, `requireModeratorOrSquadCaptain`, `ranks.ts`, `DailyMessagePanel.tsx`, `new-season/page.tsx`, `notify-dispatch.ts`, `[tacticCardId]/route.ts`, `shop-config.ts`, `clip-contest.ts`, `gameservers.ts`, `community-job-config.ts`, `auth.ts`, `discord-rest.ts`, `BattleLogEntry`, `revert-event-completion.ts`, `dashboard/page.tsx`, `admin/events/[id]/complete/route.ts`, `community-job-payout/route.ts`, `send/route.ts`, `NotificationRulesPanel.tsx`, `(dashboard)/battle-cards/page.tsx`, `minigames-config.ts`, `points.ts`, `duel-deck.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1055 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.030673655600854204 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03207698476343224 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14245014245014245 - nodes in this community are weakly interconnected._