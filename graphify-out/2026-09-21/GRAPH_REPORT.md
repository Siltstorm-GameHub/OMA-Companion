# Graph Report - OMA-Companion  (2026-09-21)

## Corpus Check
- 914 files · ~3,000,651 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4376 nodes · 10819 edges · 203 communities (182 shown, 21 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.67)
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
- seed-tactic-cards/route.ts
- EventCreateForm.tsx
- grant-tactic-cards-to-all/route.ts
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
1. `getSessionUser()` - 302 edges
2. `requireRole()` - 199 edges
3. `formatBerlinDate()` - 110 edges
4. `hasMinRole()` - 97 edges
5. `dispatchNotification()` - 82 edges
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

## Communities (203 total, 21 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (55): POST(), POST(), DELETE(), GET(), PATCH(), POST(), GET(), PATCH() (+47 more)

### Community 1 - "prisma.ts"
Cohesion: 0.03
Nodes (14): DEFAULTS, RULES, RuleSeed, GET(), isAuthorized(), GameSuggestion, GameSuggestion, DEFAULT_PREFS (+6 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.09
Nodes (31): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), RARITIES, STEP_LABELS (+23 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.06
Nodes (80): POST(), GET(), POST(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST() (+72 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.09
Nodes (33): GET(), POST(), POST(), POST(), DELETE(), PATCH(), DELETE(), POST() (+25 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.06
Nodes (55): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), DELETE(), GET() (+47 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.05
Nodes (38): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+30 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.20
Nodes (10): EventCardLink(), GateButton(), GateOptions, GuestGateContext, GuestGateValue, GuestMoreCta(), useGuestGate(), MobileTopBar() (+2 more)

### Community 8 - "interactive.ts"
Cohesion: 0.09
Nodes (61): CardUpgradeOverlay(), NextLevelPreview(), hasAnyValidMove(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate (+53 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.06
Nodes (56): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+48 more)

### Community 10 - "time.ts"
Cohesion: 0.14
Nodes (17): GET(), isAuthorized(), GET(), POST(), Props, MONTH_NAMES, QuestsPage(), QuestRegenerateButton() (+9 more)

### Community 11 - "getSessionUser"
Cohesion: 0.07
Nodes (26): GET(), GET(), POST(), GET(), GET(), DELETE(), POST(), GET() (+18 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.07
Nodes (42): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, AdminEventCompletePage() (+34 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.05
Nodes (42): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+34 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.11
Nodes (41): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyTacticEffects(), asBattleLog(), beginTrapCheck(), checkDuelTimeout() (+33 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.06
Nodes (32): CompareProfilePage(), fetchUserData(), UserData, Avatar(), EventTippsList(), Tipp, uname(), UserLite (+24 more)

### Community 16 - "ranks.ts"
Cohesion: 0.09
Nodes (32): GET(), POST(), PATCH(), COIN_SOURCES, PointsInfoModal(), RANK_LADDER, PIP_COUNT, RankIcon() (+24 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.07
Nodes (46): actionSchema, DUEL_STANCES, POST(), GET(), average(), GET(), POST(), VALID_DIFFICULTIES (+38 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.06
Nodes (29): ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction, DuelAttackType (+21 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.06
Nodes (34): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+26 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.12
Nodes (20): BattleChallengeWidget(), ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge(), ChallengeUserPicker(), uname() (+12 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.13
Nodes (25): BracketView(), Match, Participant, roundLabel(), uname(), User, Props, WanderpocalBadge() (+17 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.07
Nodes (31): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, VfxEvent, OwnedCardEntry, CardUpgradeAnimationState (+23 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.09
Nodes (20): formatBirthday(), ProfileEditor(), Props, Badge, ProfileJobBadge(), CustomBadgeDisplay, Props, Tab (+12 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.11
Nodes (32): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), GET(), isAuthorized(), formatStart(), GET() (+24 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.08
Nodes (42): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, SwapAnim, swapTranslateFor(), TILE_ICON, computeGemsReward() (+34 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.07
Nodes (34): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+26 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.10
Nodes (35): parseSwaps(), POST(), AvailableAction, LiveSnapshot, LiveBattleAwaiting, activationCellsFor(), areAdjacent(), BoardGrid (+27 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.26
Nodes (16): CampaignLevelDef, AFK_FARMER, GRIEFER_IMP, LAG_SPIKE, LOOT_GOBLIN, PAY2WIN_TRUHE, RAGE_QUIT_CONTROLLER, SEASON_PASS_DRACHE (+8 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.18
Nodes (15): DELETE(), PATCH(), POST(), DELETE(), displayNameOf(), PATCH(), UserLite, userSummary() (+7 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.06
Nodes (59): APPLY, main(), PATCH(), PATCH(), POST(), POST(), GET(), GET() (+51 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.11
Nodes (20): GET(), PATCH(), AdminShopPage(), PACK_KIND_INFO, PACK_KIND_ORDER, ShopConfigPanel(), TYPE_LABEL, ACCENT_CLASSES (+12 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (22): buildFfaRanking(), buildMatchRanking(), displayName(), ElementSlot, formatEntryStats(), IdentityFlipTile(), LayoutEntry, MatchTicker() (+14 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.13
Nodes (23): POST(), POST(), GET(), GET(), GET(), GET(), collectNominations(), CommunityNomination (+15 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.14
Nodes (18): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), countGuideVoteScore(), createGuide() (+10 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 36 - "packs.ts"
Cohesion: 0.05
Nodes (56): GET(), GET(), POST(), POST(), GET(), DELETE(), PATCH(), PATCH() (+48 more)

### Community 37 - "MobaIcon"
Cohesion: 0.13
Nodes (16): CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS, ErrorNotice(), GemsResultScreen(), GemsReward, DIFFICULTY_CONFIG (+8 more)

### Community 38 - "types.ts"
Cohesion: 0.10
Nodes (29): TacticCardSeed, BattleStatsPanel(), LiveUnit, StoredBattleLog, computeBattleStats(), findMvpId(), score(), UnitBattleStats (+21 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.07
Nodes (18): EventUser, GENRE_MAP, Props, SeriesEventItem, STATUS_CFG, StreamingPartner, Props, EventLiveBadge() (+10 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.05
Nodes (58): GET(), PUT(), requestSchema, GET(), POST(), requestSchema, DuelDeckPage(), metadata (+50 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.09
Nodes (26): GET(), POST(), displayNameOf(), POST(), UserLite, userSummary(), DELETE(), POST() (+18 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.12
Nodes (27): GET(), PATCH(), GET(), PATCH(), PATCH(), GET(), PATCH(), GET() (+19 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.13
Nodes (30): GET(), POST(), GET(), GET(), getActiveMembership(), getCommunityJobCatalog(), berlinDateParts(), coachRecommendationsFor() (+22 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.09
Nodes (27): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, cache, flush(), inflight (+19 more)

### Community 45 - "auth.ts"
Cohesion: 0.33
Nodes (7): PATCH(), patchSchema, PATCH(), requestSchema, CardContentError, CardContentPatch, updateCardContent()

### Community 46 - "discord-rest.ts"
Cohesion: 0.13
Nodes (29): GET(), POST(), GET(), OptionInput, POST(), POST(), findEventByDiscordId(), notifyTournamentStarted() (+21 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.21
Nodes (19): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+11 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.10
Nodes (23): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+15 more)

### Community 49 - "amp.ts"
Cohesion: 0.10
Nodes (14): FullStandingsToggle(), Props, StandingRow, StandingUser, ArchivedSeason, FORMAT_LABELS, LegacyRow, Avatar() (+6 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.12
Nodes (26): POST(), GET(), GET(), POST(), DELETE(), GET(), POST(), InterviewPage() (+18 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (27): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+19 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.10
Nodes (18): Props, WinnerClip, DailyMessageBanner(), Message, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount (+10 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.22
Nodes (17): GET(), isAuthorized(), softResetRating(), addMonthsUTC(), getCurrentSeasonNumber(), getSeasonWindow(), grantDueSeasonRewards(), grantPlacementReward() (+9 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.11
Nodes (23): FORMATS, CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant (+15 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.10
Nodes (32): AlbumPage(), IdeaRow(), PointsPage(), DesktopProfileTabs(), Tab, generateMetadata(), PublicProfilePage(), ProfilePage() (+24 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.10
Nodes (25): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, GENRES (+17 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.09
Nodes (19): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, GENRES, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward (+11 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (24): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), DominionCfg (+16 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.14
Nodes (21): curve(), curvePercent(), StandardCardSeed, ACTIVE_POOL, DD_ACTIVE_SKILLS, DD_PASSIVE_KITS, DD_ULTIMATE_SKILLS, PASSIVE_POOL (+13 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.12
Nodes (22): DELETE(), DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES (+14 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.10
Nodes (16): api(), Idea, IdeasBoardClient(), IdeaList(), api(), GameCard(), GameInfo, IdeaBody() (+8 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.11
Nodes (21): CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, CountUp(), CATEGORY_BG_TINT (+13 more)

### Community 65 - "dependencies"
Cohesion: 0.04
Nodes (47): @auth/prisma-adapter, canvas-confetti, discord.js, @google/generative-ai, lucide-react, motion, next, next-auth (+39 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.16
Nodes (20): POST(), serializeDrawResult(), asCardResult(), asTacticResult(), awardDrawnCard(), awardDrawnTacticCard(), COMMUNITY_CHANCE, countUnopenedPacks() (+12 more)

### Community 67 - "hasMinRole"
Cohesion: 0.07
Nodes (38): GET(), GET(), PATCH(), DELETE(), PATCH(), POST(), PATCH(), POST() (+30 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.11
Nodes (25): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+17 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (18): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+10 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.20
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.19
Nodes (15): GET(), NextEventTile(), GameCover(), coverCache, GameNameInput(), GameNameInputProps, highlightMatch(), escapeRegExp() (+7 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.23
Nodes (10): api(), AreaKey, FoundUser, GameInfo, IdeaForm(), IdeaPrefill, MediaAsset, Similar (+2 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.10
Nodes (22): ActivityFeed(), cleanReason(), Filter, Tx, txType(), AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES (+14 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.11
Nodes (22): EventsTabs(), EventCard(), ConfirmDialog(), TabItem, TabPanel(), Tabs(), TabsProps, displayName() (+14 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.14
Nodes (16): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+8 more)

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
Cohesion: 0.15
Nodes (21): GET(), GET(), isAuthorized(), GET(), isAuthorized(), calcStreak(), GET(), formatDate() (+13 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.06
Nodes (37): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, MonthlyContests, Props, YearlyContests (+29 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.10
Nodes (19): ClipVotingClient(), Nomination, Props, ClipDesMonatsPage(), MONTH_NAMES, GalleryEntry, MONTH_NAMES, Nomination (+11 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.18
Nodes (9): CATEGORY_STRIP, EVENT_STATUS, SyncButton(), MyPrediction, MyPredictionsList(), uname(), UserLite, PredictionStreakCard() (+1 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.16
Nodes (11): DonationsPage(), fmt(), MONTH_NAMES, streakBadge(), LeaderboardPage(), MEDALS, metadata, PODIUM_CONFIG (+3 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.20
Nodes (14): GET(), GET(), isAuthorized(), findGemsMonsterTemplate(), finalizeDueGemsTournaments(), GemsTournamentSummary, generateGemsTournamentBossTeam(), getCurrentGemsTournament() (+6 more)

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
Cohesion: 0.14
Nodes (17): CustomBadgeDisplay, Props, BadgeIcon(), BadgeIconProps, checkAndAwardBadges(), loadStats(), badgeArt(), CUSTOM_BADGE_ART (+9 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.11
Nodes (21): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+13 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.08
Nodes (31): PATCH(), GET(), POST(), GET(), DELETE(), PATCH(), DELETE(), POST() (+23 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.18
Nodes (8): api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem, Stats

### Community 95 - "apply-season-results.ts"
Cohesion: 0.36
Nodes (9): applyTierJumpLimit(), computePercentiles(), computeSeasonResults(), hashSeed(), MemberSeasonResult, resolveClass(), TIER_ORDER, TIER_PERCENTILE_CEILING (+1 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.08
Nodes (33): POST(), CATEGORIES, EventSetupWizard(), GENRES, inputStyle, PlacementReward, PLATFORMS, PollConfig (+25 more)

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
Cohesion: 0.07
Nodes (29): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, BattleLauncher(), Mode, RankRow(), BattleRankBadge() (+21 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 102 - "recurrence.ts"
Cohesion: 0.23
Nodes (11): gamedig, gamedig, GET(), GET(), StatusEntry, getInstances(), getInstancesRaw(), toInstanceStatus() (+3 more)

### Community 103 - "isVideoUrl"
Cohesion: 0.11
Nodes (18): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, Thumb() (+10 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.60
Nodes (5): isAuthorized(), isOverridden(), POST(), toJson(), getSkillTemplate()

### Community 105 - "minigames-config.ts"
Cohesion: 0.06
Nodes (47): GET(), PATCH(), POST(), POST(), POST(), POST(), POST(), userSelect (+39 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.23
Nodes (10): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, isStoredBattleLog(), applyAttackerOnlyWinStreak(), applyWinStreak() (+2 more)

### Community 107 - "card-provisioning.ts"
Cohesion: 0.18
Nodes (13): isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, CLASS_BASE_STATS, CLASS_SPEED_MIDPOINT (+5 more)

### Community 108 - "DailyPollPanel.tsx"
Cohesion: 0.14
Nodes (21): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+13 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.21
Nodes (12): GameserverWidget(), Server, ServerRow(), ServerCard(), Server, ServerList(), latestStatus, LiveStatus (+4 more)

### Community 110 - "points.ts"
Cohesion: 0.16
Nodes (8): BackToTop(), GuestBanner(), GuestGateProvider(), ACCENT_COLOR, ICON_MAP, NewsItem, Props, TopNewsFeed()

### Community 111 - "FfaView.tsx"
Cohesion: 0.19
Nodes (7): NAV, FloatingPill(), NAV, NavLink, useTheme(), GateLink(), PollBadge()

### Community 112 - "EventPokalWinners.tsx"
Cohesion: 0.15
Nodes (17): MONTH_NAMES, YearReviewPage(), CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props (+9 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.22
Nodes (13): loadProfileOverlayState(), GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props (+5 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "duel-deck.ts"
Cohesion: 0.27
Nodes (9): GET(), GET(), authHeader(), deleteDiscordMessage(), DiscordEmbed, DiscordGuildEmoji, DiscordTextChannel, listGuildEmojis() (+1 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.19
Nodes (13): POST(), DELETE(), POST(), awardPoints(), parsePlacementPts(), PATCH(), BracketMatch, generateBracket() (+5 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.24
Nodes (9): api(), Campaign, dueAt(), EventOption, MarketingCampaignsBlock(), MarketingStatsBlock(), Stats, STEPS (+1 more)

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
Cohesion: 0.33
Nodes (9): GET(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), getGradientBackground(), getLogoBadge() (+1 more)

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.26
Nodes (6): DashboardLayout(), PartnerFooter(), Partner, GUEST_ALLOWED_PATHS, isGuestAllowedPath(), isLinkPreviewBot()

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.18
Nodes (10): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+2 more)

### Community 124 - "SeriesAdminRow.tsx"
Cohesion: 0.20
Nodes (6): ApplyButton(), Light, LIGHT_COLOR, LIGHT_LABEL, Server, ServerCredentials()

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 126 - "ServerCard.tsx"
Cohesion: 0.29
Nodes (8): main(), DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled(), NotificationType, PREF_KEY

### Community 127 - "include"
Cohesion: 0.31
Nodes (9): GET(), POST(), rollPrize(), todayStr(), CHEST_TABLE, ChestPrize, grantGemsPvpVictoryChest(), rollChestPrize() (+1 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "applyForJob"
Cohesion: 0.27
Nodes (8): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), communityCardPoolSize(), countPacksPurchasedToday(), PackKind, startOfTodayUTC()

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

### Community 134 - "elo.ts"
Cohesion: 0.39
Nodes (5): CoverBrandBadge(), EventCoverDefault(), dynamicCache, GameCoverProps, pickedCoverCache

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
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.13
Nodes (18): GET(), api(), AssetOption, buildEventTemplate(), EventOption, FoundUser, InterviewOption, PostOption (+10 more)

### Community 142 - "GameCover.tsx"
Cohesion: 0.20
Nodes (14): AdminEventsPage(), DashboardPage(), formatCountdown(), formatFreshness(), getGlobalDashboardData, MONTH_NAMES, ROLE_LABEL, ROLE_STYLE (+6 more)

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
Cohesion: 0.18
Nodes (13): CATEGORY_ACCENT, CATEGORY_ICONS, openSection(), ProfileCompletion(), Props, CATEGORY_LABELS, DAILY_CAPS, POINT_RULES (+5 more)

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
Cohesion: 0.11
Nodes (7): Badge, CATEGORIES, CATEGORY_LABELS, User, EmptyState(), EmptyStateProps, ILLUSTRATIONS

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

### Community 157 - "seed-tactic-cards/route.ts"
Cohesion: 0.60
Nodes (4): TACTIC_CARDS, isAuthorized(), POST(), toJson()

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
- **1026 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1021 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `getSessionUser` to `roles.ts`, `applyForJob`, `fotograf-service.ts`, `journalist-service.ts`, `coach-service.ts`, `time.ts`, `series-event-points.ts`, `StarterPickFlow.tsx`, `GameCover.tsx`, `notifications.ts`, `community-job-service.ts`, `coach-guide-service.ts`, `packs.ts`, `tournament/[id]/page.tsx`, `community-job-config.ts`, `job-recommendations.ts`, `amp.ts`, `dispatchNotification`, `BattleLogEntry`, `community-board-comment-service.ts`, `hasMinRole`, `tutorial.ts`, `ClipVotingClient.tsx`, `(dashboard)/events/page.tsx`, `bot/index.ts`, `community-job-discord-votes.ts`, `admin/community-jobs/disputes/route.ts`, `minigames-config.ts`, `EventPokalWinners.tsx`, `duel-deck.ts`, `report/[id]/page.tsx`, `upload/route.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `BattleLogEntry` to `roles.ts`, `series-event-points.ts`, `CommunityJobsPanel.tsx`, `GameCover.tsx`, `RankedAvatar.tsx`, `StarterPickFlow.tsx`, `CommunityJobsAdminPanel.tsx`, `community-job-service.ts`, `packs.ts`, `tournament/[id]/page.tsx`, `resolveAvatarsForCards`, `JobBadge.tsx`, `FotografTools.tsx`, `SeriesDetailClient.tsx`, `EmptyState.tsx`, `hasMinRole`, `GameNameInput.tsx`, `visionaer-service.ts`, `formatBerlinTime`, `SeriesIcon.tsx`, `ProfileOverlayClient.tsx`, `AdminEventsClient.tsx`, `ConfirmDialog.tsx`, `(dashboard)/events/page.tsx`, `bot/index.ts`, `CoachTools.tsx`, `EventAdminRow.tsx`, `CommunityBoardClient.tsx`, `JournalistTools.tsx`, `EventSetupWizard.tsx`, `DailyPollPanel.tsx`, `getActiveMembership`, `AdminDonationsClient.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `prisma.ts`, `updateQuestProgress`, `ranked-season.ts`, `SeriesCompleteClient.tsx`, `series/[id]/complete/page.tsx`, `getSessionUser`, `DailySpin.tsx`, `series-event-points.ts`, `run-season.ts`, `requireModeratorOrSquadCaptain`, `ranks.ts`, `DailyMessagePanel.tsx`, `new-season/page.tsx`, `notify-dispatch.ts`, `[tacticCardId]/route.ts`, `shop-config.ts`, `clip-contest.ts`, `gameservers.ts`, `community-job-config.ts`, `auth.ts`, `discord-rest.ts`, `revert-event-completion.ts`, `hasMinRole`, `admin/events/[id]/complete/route.ts`, `community-job-payout/route.ts`, `send/route.ts`, `EventSetupWizard.tsx`, `NotificationRulesPanel.tsx`, `recurrence.ts`, `minigames-config.ts`, `DailyPollPanel.tsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1026 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03319308087891538 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.025293586269196026 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09080841638981174 - nodes in this community are weakly interconnected._