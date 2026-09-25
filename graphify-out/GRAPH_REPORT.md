# Graph Report - OMA-Companion  (2026-09-25)

## Corpus Check
- 1016 files · ~3,632,789 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5084 nodes · 13722 edges · 192 communities (168 shown, 24 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2d812a3d`
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
- report-event-facts.ts
- VictoryChestReveal.tsx
- upload/route.ts
- TextsClient.tsx
- duels/[id]/respond/route.ts
- AdminDonationsClient.tsx
- ServerCard.tsx
- notifications/page.tsx
- series/[id]/complete/route.ts
- promotion-request-service.ts
- process-badge-art.ts
- ThemeProvider.tsx
- DashboardChrome.tsx
- series/[id]/complete/route.ts
- widget/events/route.ts
- overlay/[id]/page.tsx
- lobby-cleanup/route.ts
- Product
- GuildHub – Discord Companion
- [tacticCardId]/route.ts
- sharp
- widget/events/route.ts
- sonner
- StarterPickFlow.tsx
- three
- HeroStatValue.tsx
- tank
- preferences/route.ts
- active/route.ts
- @types/three
- middleware.ts
- new-season/page.tsx
- Monster-Artwork — Edelstein-Kampf
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
- `GET()` --indirect_call--> `hex()`  [INFERRED]
  src/app/api/dnd/world-map/route.ts → scripts/build-te-assets.ts
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts
- `main()` --calls--> `createNotification()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/notifications.ts
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts

## Import Cycles
- None detected.

## Communities (192 total, 24 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (67): POST(), DELETE(), GET(), PATCH(), POST(), GET(), PATCH(), DELETE() (+59 more)

### Community 1 - "prisma.ts"
Cohesion: 0.08
Nodes (26): GET(), api(), Idea, IdeasBoardClient(), IdeaList(), api(), GameCard(), GameInfo (+18 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.11
Nodes (25): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), RARITIES, STEP_LABELS (+17 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.12
Nodes (33): POST(), DndCharacterRow, DndLocationRow, formatDuration(), polygonPoints(), TYPE_LABEL, WorldMap(), EVEN_ROW (+25 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.17
Nodes (19): buildSolid(), createGame(), DELTA, Dialog, Dir, facingCell(), Game, GameEvent (+11 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.14
Nodes (8): DashboardLayout(), BackToTop(), GuestBanner(), GuestGateProvider(), PartnerFooter(), Partner, NewsItem, isLinkPreviewBot()

### Community 6 - "app/layout.tsx"
Cohesion: 0.10
Nodes (18): metadata, russoOne, spaceGrotesk, viewport, AnimatedBackground(), Cell, PULSE_COLORS, CursorGlow() (+10 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.05
Nodes (84): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+76 more)

### Community 8 - "interactive.ts"
Cohesion: 0.06
Nodes (89): AvailableAction, LiveSnapshot, LiveBattleAwaiting, LiveBattleSnapshot, activationCellsFor(), areAdjacent(), BoardGrid, BoardResolveResult (+81 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.05
Nodes (59): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+51 more)

### Community 10 - "time.ts"
Cohesion: 0.13
Nodes (19): Interview, InterviewClient(), name(), api(), AreaKey, FoundUser, GameInfo, IdeaForm() (+11 more)

### Community 11 - "getSessionUser"
Cohesion: 0.05
Nodes (61): GET(), POST(), POST(), POST(), DELETE(), PATCH(), GET(), POST() (+53 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (48): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+40 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.17
Nodes (20): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), POST(), POST(), EventSetupWizard(), createPollsForEvent() (+12 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.08
Nodes (43): PATCH(), patchSchema, PATCH(), requestSchema, BattleFigure(), Props, drawFrame(), imageCache (+35 more)

### Community 16 - "ranks.ts"
Cohesion: 0.20
Nodes (16): Props, WanderpocalBadge(), Props, WanderpocalBadgeServer(), ordinalSuffix(), WanderpocalSection(), buildHoldersMap(), CATEGORY_CONFIG (+8 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.04
Nodes (82): POST(), GET(), GET(), GET(), isAuthorized(), formatDate(), SeasonConfigPanel(), toDateInputValue() (+74 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.06
Nodes (33): ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction, DuelAttackType (+25 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.21
Nodes (12): GameserverWidget(), Server, ServerRow(), ServerCard(), Server, ServerList(), latestStatus, LiveStatus (+4 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.04
Nodes (64): ActivityFeed(), cleanReason(), Filter, Tx, txType(), AdminNav(), CATEGORIES, hasRole() (+56 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.18
Nodes (12): EventCardLink(), DiscordLoginButton(), Props, GateButton(), GateLink(), GateOptions, GuestGateContext, GuestGateValue (+4 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.08
Nodes (22): BattleCardsTabsInner(), DND_LINK_TAB, isTabKey(), TabKey, TABS, DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard (+14 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.04
Nodes (62): Badge, CATEGORIES, CATEGORY_LABELS, User, DailyMessagePanel(), defaultForm(), formatDate(), FormState (+54 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.22
Nodes (13): POST(), GET(), positionAlongPath(), stepMinutesOf(), DND_LOCATIONS, DndLocationDef, ensureDndWorldSeeded(), getLocationDef() (+5 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.10
Nodes (24): parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps(), POST(), GET(), POST() (+16 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.14
Nodes (27): GET(), CampaignBoardLevel, computeStars(), getCampaignBoard(), CAMPAIGN_LEVELS, CampaignLevelDef, getCampaignLevel(), AFK_FARMER (+19 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.11
Nodes (25): GEMS_DIFFICULTIES, PATCH(), GET(), average(), GET(), GET(), isAuthorized(), GEMS_DIFFICULTIES (+17 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.10
Nodes (35): POST(), toJson(), ABILITY_LABEL, ABILITY_SCORE_CANDIDATES, ABILITY_STEPS, CharacterCreation(), Phase, RolledCard (+27 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.07
Nodes (36): GET(), PATCH(), POST(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage() (+28 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.06
Nodes (30): buildFfaRanking(), buildMatchRanking(), cornerStyle(), displayName(), ElementContent(), elementPositionStyle(), ElementSlot, formatEntryStats() (+22 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.13
Nodes (21): POST(), POST(), GET(), GET(), GET(), collectNominations(), CommunityNomination, finalizeContest() (+13 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.21
Nodes (19): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+11 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.14
Nodes (18): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, BattleStatsPanel(), isStoredBattleLog(), StoredBattleLog (+10 more)

### Community 36 - "packs.ts"
Cohesion: 0.10
Nodes (31): POST(), serializeDrawResult(), PACK_LABEL, POST(), VALID_KINDS, ShopPage(), CHEST_TABLE, ChestPrize (+23 more)

### Community 37 - "MobaIcon"
Cohesion: 0.24
Nodes (15): LOGO_POSITIONS, StudioEditor(), ImageDown, drawLogo(), drawWatermark(), loadImage(), LogoPosition, prepareUploadImage() (+7 more)

### Community 38 - "types.ts"
Cohesion: 0.05
Nodes (43): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward, PLATFORMS (+35 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.05
Nodes (79): POST(), GET(), PUT(), requestSchema, POST(), POST(), POST(), VALID_DIFFICULTIES (+71 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.10
Nodes (28): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), pickRandom(), aliveUnits(), resolveEffectTargets() (+20 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.08
Nodes (25): BattleLauncher(), Mode, RankRow(), BattleRankBadge(), CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS (+17 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.05
Nodes (79): APPLY, main(), PATCH(), PATCH(), POST(), GET(), GET(), POST() (+71 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.10
Nodes (36): GET(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames() (+28 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.20
Nodes (14): GET(), AdsTarget, ampCall(), AmpInstance, callWithSession(), getBaseUrl(), getInstanceDetails(), getInstanceSummaries() (+6 more)

### Community 45 - "auth.ts"
Cohesion: 0.07
Nodes (29): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), GuideBody() (+21 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.21
Nodes (15): bakeStatic(), drawQuarters(), drawStamp(), loadImage(), loadSheets(), SHEET_FILES, SheetKey, Sheets (+7 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.09
Nodes (26): AssetList(), Thumb(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile (+18 more)

### Community 49 - "amp.ts"
Cohesion: 0.12
Nodes (29): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, LiveBattleView(), cell(), beep() (+21 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.23
Nodes (11): gamedig, gamedig, GET(), GET(), StatusEntry, getInstances(), getInstancesRaw(), toInstanceStatus() (+3 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.15
Nodes (27): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+19 more)

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
Cohesion: 0.11
Nodes (21): DELETE(), PATCH(), POST(), POST(), DELETE(), PATCH(), POST(), DELETE() (+13 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.07
Nodes (40): GET(), POST(), DELETE(), DELETE(), POST(), GET(), POST(), DELETE() (+32 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.03
Nodes (101): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+93 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (23): DELETE(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage(), DominionCfg, DominionChange (+15 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.17
Nodes (14): CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, ThumbVote(), voteUrl() (+6 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.24
Nodes (11): GET(), GameCoverPicker(), PickedGameCover, GameCover(), escapeRegExp(), GAME_MAP, getGameCoverUrl(), getGameFallbackGradient() (+3 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.16
Nodes (15): ANIM_OPTIONS, BODY_RECT, DIRS, HEAD_CATS, HEAD_RECT, Props, sheetSrc(), TeCharacterEditor() (+7 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.08
Nodes (29): CustomBadgeDisplay, Props, formatBirthday(), ProfileEditor(), Props, CustomBadgeDisplay, Props, Tab (+21 more)

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
Cohesion: 0.16
Nodes (15): main(), CATEGORY_LABELS, DAILY_CAPS, POINT_RULES, PointCategory, PointRule, RANK_POINT_CATEGORIES, revokePointsByReason() (+7 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.20
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.07
Nodes (41): GET(), POST(), GET(), DELETE(), PATCH(), DELETE(), POST(), GET() (+33 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.21
Nodes (16): GET(), POST(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), generateBrandedCoverDataUri() (+8 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.17
Nodes (13): GET(), isAuthorized(), metadata, DndHome(), DndMigrationBanner(), formatDeadline(), rollNewCharacterSheet(), DND_FEATURE_LAUNCH_AT (+5 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.04
Nodes (61): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+53 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.07
Nodes (39): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+31 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.16
Nodes (11): StampDef, StampId, TileSheet, BlockRef, Building, elderConfig, GROUND, GroundType (+3 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.23
Nodes (10): metadata, TeQuestPrototype(), CAT, defaultTeConfig(), getTeCategory(), sanitizeTeConfig(), TE_DIR_ROW, TeCatalog (+2 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.10
Nodes (24): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+16 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.22
Nodes (11): api(), Campaign, dueAt(), EventOption, MarketingCampaignsBlock(), MarketingStatsBlock(), PromotionRequestItem, PromotionRequestList() (+3 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.13
Nodes (13): Health, JobTexts, RankTile(), Info, JobIcon(), JOB_ICONS, getJobRing(), isEmployed() (+5 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.10
Nodes (23): PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS, ModerationItemDto, ModerationClient(), AuditClient() (+15 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.08
Nodes (47): GET(), PATCH(), GET(), PATCH(), PATCH(), POST(), GET(), PATCH() (+39 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.04
Nodes (50): MonthlyContests, Props, YearlyContests, SeriesOption, EventsTabs(), EventCard(), COIN_SOURCES, PointsInfoModal() (+42 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.05
Nodes (65): POST(), PUT(), POST(), DELETE(), PATCH(), POST(), POST(), GET() (+57 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.18
Nodes (15): POST(), GET(), DEFAULT_SCENE, getLocationScene(), LOCATION_SCENES, LocationSceneDef, spawnPointFor(), ensureDndStoryContentSeeded() (+7 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.22
Nodes (11): CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS, PokalSection() (+3 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.18
Nodes (6): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap, LifeBuoy

### Community 90 - "useConfirm"
Cohesion: 0.09
Nodes (25): GamePlayer, GET(), CardRow, TacticCardRow, FavoriteGamesSection(), Props, GamePlayersModal(), LoadState (+17 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.10
Nodes (19): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, centeredRect() (+11 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.08
Nodes (30): VfxEvent, LiveDuelHandCard, LiveDuelUnit, UltimateBurst, GemsResultScreen(), GemsReward, computeGemsReward(), describeLogEntry() (+22 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.03
Nodes (74): RULES, BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample() (+66 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.07
Nodes (39): POST(), requestSchema, BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), RANK_STYLE, LeaderboardTabs() (+31 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.21
Nodes (11): BASE_Z, CATALOG_PATH, CATEGORIES, CHAR_PACKS, hex(), main(), OUT, SKIN_SRC (+3 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.23
Nodes (7): SteamGameResult, PollOptionGameInputProps, coverCache, GameNameInput(), GameNameInputProps, highlightMatch(), KNOWN_GAMES

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.07
Nodes (24): Props, WinnerClip, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount, Poll, PollCard() (+16 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.24
Nodes (7): POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, VoteKind, VoteOwnerLookup

### Community 102 - "recurrence.ts"
Cohesion: 0.43
Nodes (6): GET(), POST(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole()

### Community 103 - "isVideoUrl"
Cohesion: 0.13
Nodes (22): GET(), FeedCard(), FeedEntry, IdeaPageClient(), IdeaPage(), ReportPage(), ReportPageClient(), api() (+14 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.44
Nodes (9): GET(), displayName(), getCronRuns(), getJobHealth(), getPayoutOverview(), getVoteAnomalies(), previewPayout(), VoteEvent (+1 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.18
Nodes (20): GET(), isAuthorized(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction() (+12 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.12
Nodes (20): POST(), DELETE(), PUT(), GET(), GET(), POST(), POST(), GET() (+12 more)

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.04
Nodes (53): GET(), GET(), GET(), GET(), GET(), POST(), GET(), GET() (+45 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.21
Nodes (14): POST(), GET(), GET(), POST(), InterviewPage(), answerInterview(), createInterview(), declineInterview() (+6 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.22
Nodes (8): Download, Menu, Share, BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.29
Nodes (10): drawTeFrame(), imageCache, loadTeImage(), loadTeLayers(), Props, TeCharacter(), resolveTeLayers(), TE_ANIMS (+2 more)

### Community 111 - "skins/types.ts"
Cohesion: 0.12
Nodes (18): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+10 more)

### Community 112 - "BadgesSection.tsx"
Cohesion: 0.29
Nodes (8): GET(), GET(), authHeader(), DiscordEmbed, DiscordGuildEmoji, DiscordTextChannel, listGuildEmojis(), listGuildTextChannels()

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.17
Nodes (15): AnimName, ANIMS, CATALOG_PATH, CATEGORIES, CategoryDef, CROP, cropSheet(), EFFECTS (+7 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.05
Nodes (62): POST(), GET(), PATCH(), patchSchema, placementSchema, GET(), PATCH(), patchSchema (+54 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.19
Nodes (14): GET(), isAuthorized(), GET(), POST(), DndQuestDef, generateMonthlyQuests(), QUEST_TYPE_META, QuestType (+6 more)

### Community 118 - "report-event-facts.ts"
Cohesion: 0.53
Nodes (4): GET(), displayName(), EventFacts, getEventFacts()

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "TextsClient.tsx"
Cohesion: 0.33
Nodes (6): CoverBrandBadge(), EventCoverDefault(), EventTileItem, Props, dynamicCache, GameCoverProps

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.33
Nodes (7): DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled(), NotificationType, PREF_KEY

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.14
Nodes (23): GET(), isAuthorized(), POST(), formatStart(), GET(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee() (+15 more)

### Community 124 - "ServerCard.tsx"
Cohesion: 0.29
Nodes (9): POST(), POST(), notifyPvpBattleResolved(), advanceDndQuestObjective(), advanceDndQuestObjectiveForUser(), DND_QUESTS, ensureDndQuestsSeeded(), rewardDndQuest() (+1 more)

### Community 125 - "notifications/page.tsx"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 126 - "series/[id]/complete/route.ts"
Cohesion: 0.38
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.18
Nodes (7): ApplyButton(), Light, LIGHT_COLOR, LIGHT_LABEL, Server, ServerCredentials(), Copy

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "ThemeProvider.tsx"
Cohesion: 0.33
Nodes (6): LogOut, Moon, Sun, MobileTopBar(), ROUTE_TITLES, useTheme()

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.23
Nodes (14): GET(), POST(), GET(), OptionInput, POST(), POST(), createNotificationForUsers(), sendDiscordDMToAll() (+6 more)

### Community 132 - "widget/events/route.ts"
Cohesion: 0.47
Nodes (3): GET(), loadProfileOverlayState(), getJobBadges()

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
Cohesion: 0.17
Nodes (19): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), MessageCircleMore, ShieldCheck (+11 more)

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.04
Nodes (66): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, BracketView(), Match, Participant (+58 more)

### Community 142 - "three"
Cohesion: 0.11
Nodes (24): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+16 more)

### Community 143 - "HeroStatValue.tsx"
Cohesion: 0.70
Nodes (3): HeroStatValue(), useValueDelta(), ValueDeltaBadge()

### Community 148 - "@types/three"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 160 - "preferences/route.ts"
Cohesion: 0.03
Nodes (34): DEFAULTS, calcStreak(), GET(), GET(), POST(), DELETE(), displayNameOf(), PATCH() (+26 more)

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 163 - "HeroStatValue.tsx"
Cohesion: 0.11
Nodes (26): curve(), curvePercent(), STANDARD_CARDS, StandardCardSeed, GET(), isAuthorized(), POST(), toJson() (+18 more)

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
Cohesion: 0.07
Nodes (46): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), GET(), DELETE() (+38 more)

### Community 274 - "HeroStatValue.tsx"
Cohesion: 0.03
Nodes (98): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+90 more)

## Knowledge Gaps
- **1140 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1135 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `report/[id]/page.tsx` to `roles.ts`, `prisma.ts`, `coach-service.ts`, `getSessionUser`, `[contribId]/route.ts`, `duel-live-battle.ts`, `HeroStatValue.tsx`, `MobaIcon.tsx`, `ProfileMobileView.tsx`, `requireModeratorOrEventSquadCaptain`, `packs.ts`, `types.ts`, `community-job-config.ts`, `job-recommendations.ts`, `DailyPollBanner.tsx`, `BattleLogEntry`, `EventEditClient.tsx`, `GameNameInput.tsx`, `formatBerlinTime`, `ClipVotingClient.tsx`, `bot/index.ts`, `community-job-discord-votes.ts`, `admin/community-jobs/disputes/route.ts`, `isVideoUrl`, `studio-templates.ts`, `photo-request-service.ts`, `BadgesSection.tsx`, `report/[id]/page.tsx`, `report-event-facts.ts`, `upload/route.ts`, `AdminDonationsClient.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `DashboardChrome.tsx`, `series/[id]/complete/route.ts`, `[tacticCardId]/route.ts`, `series-event-points.ts`, `duels-live.ts`, `RankedAvatar.tsx`, `duel-live-battle.ts`, `@types/three`, `ProfileMobileView.tsx`, `new-season/page.tsx`, `requireModeratorOrEventSquadCaptain`, `shop-config.ts`, `clip-contest.ts`, `JobBadge.tsx`, `dispatchNotification`, `CoinIcon.tsx`, `revert-event-completion.ts`, `hasMinRole`, `events/series/[id]/page.tsx`, `SeriesIcon.tsx`, `ClipVotingClient.tsx`, `bot/index.ts`, `apply-season-results.ts`, `recurrence.ts`, `photo-request-service.ts`, `report/[id]/page.tsx`, `ThemeProvider.tsx`, `series/[id]/complete/route.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `@vercel/blob`, `scripts`, `dispatchNotification`, `getActiveMembership`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1140 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.027324949541996584 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08258258258258258 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10795454545454546 - nodes in this community are weakly interconnected._