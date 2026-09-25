# Graph Report - OMA-Companion  (2026-09-25)

## Corpus Check
- 1015 files · ~3,664,445 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5086 nodes · 13966 edges · 194 communities (160 shown, 34 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `10acbe1c`
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
- (dashboard)/layout.tsx
- Product
- GuildHub – Discord Companion
- [tacticCardId]/route.ts
- DuelDeckEditor.tsx
- widget/events/route.ts
- ThemeProvider.tsx
- StarterPickFlow.tsx
- three
- season-config.ts
- sync-discord-roles/route.ts
- promotion-request-service.ts
- FotografGalleries.tsx
- [id]/settings/SettingsClient.tsx
- middleware.ts
- Monster-Artwork — Edelstein-Kampf
- MobileTopBar.tsx
- grantPack
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- daily-poll/[id]/vote/route.ts
- preferences/route.ts
- generate-brand-assets.ts
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- UserRoleManager.tsx
- lucide-react
- chroma-key.js
- @prisma/client
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- react-dom
- bot-runner.mjs
- eslint.config.mjs
- next.config.ts
- sonner
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
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts

## Import Cycles
- None detected.

## Communities (194 total, 34 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.02
Nodes (77): POST(), POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET() (+69 more)

### Community 1 - "prisma.ts"
Cohesion: 0.08
Nodes (31): POST(), GET(), UserLite, AdminEventCompletePage(), DEFAULT_POLL, DEFAULT_REWARDS, MultiPollConfig, parsePoll() (+23 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.12
Nodes (22): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), AdminBattleCardsPage(), SeasonRewardsPanel() (+14 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.12
Nodes (32): POST(), DndCharacterRow, DndLocationRow, formatDuration(), polygonPoints(), TYPE_LABEL, WorldMap(), EVEN_ROW (+24 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.09
Nodes (39): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+31 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.07
Nodes (22): inputStyle, Series, FullStandingsToggle(), Props, StandingRow, StandingUser, Avatar(), DeltaInfo (+14 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.12
Nodes (32): LiveSnapshot, LiveBattleAwaiting, activationCellsFor(), areAdjacent(), BoardGrid, BoardResolveResult, cellCol(), cellRow() (+24 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.11
Nodes (40): toHandCard(), allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog() (+32 more)

### Community 8 - "interactive.ts"
Cohesion: 0.09
Nodes (60): LiveBattleSnapshot, hasAnyValidMove(), pickEnemyForColumn(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate (+52 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.06
Nodes (58): POST(), PATCH(), GET(), POST(), GET(), POST(), GET(), POST() (+50 more)

### Community 10 - "time.ts"
Cohesion: 0.06
Nodes (54): GET(), GET(), POST(), DELETE(), PATCH(), POST(), GET(), api() (+46 more)

### Community 11 - "getSessionUser"
Cohesion: 0.07
Nodes (46): GET(), POST(), GET(), DELETE(), PATCH(), GET(), POST(), GET() (+38 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (59): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+51 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.07
Nodes (43): GET(), GET(), GET(), isAuthorized(), calcStreak(), GET(), formatDate(), SeasonConfigPanel() (+35 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.08
Nodes (38): DELETE(), DELETE(), POST(), GET(), POST(), GET(), IdeaPage(), ReportPage() (+30 more)

### Community 16 - "ranks.ts"
Cohesion: 0.17
Nodes (19): Props, WanderpocalBadge(), Props, WanderpocalBadgeServer(), ordinalSuffix(), Props, WanderpocalSection(), buildHoldersMap() (+11 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.14
Nodes (18): DesktopProfileTabs(), PublicProfilePage(), ProfilePage(), EventGallerySection(), FotografPortfolio(), GridAsset, VISIBLE, FileText (+10 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (41): VfxEvent, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction (+33 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.11
Nodes (19): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+11 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.05
Nodes (50): ActivityFeed(), cleanReason(), Filter, Tx, txType(), Avatar(), computeGroups(), computePlacementMap() (+42 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.05
Nodes (41): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, AdminDonationsClient(), Donation (+33 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.13
Nodes (19): main(), DISCORD_REASONS, GET(), isAuthorized(), CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), createNotification() (+11 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.12
Nodes (23): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+15 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.22
Nodes (11): CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS, PokalSection() (+3 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.06
Nodes (74): POST(), GET(), POST(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST() (+66 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.08
Nodes (22): Props, WinnerClip, DailyMessageBanner(), Message, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount (+14 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.23
Nodes (18): CampaignLevelDef, AFK_FARMER, GRIEFER_IMP, LAG_SPIKE, LOOT_GOBLIN, PAY2WIN_TRUHE, RAGE_QUIT_CONTROLLER, SEASON_PASS_DRACHE (+10 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.13
Nodes (28): POST(), toJson(), ABILITY_KEYS, AbilityScores, clampToBaseline(), CLASS_SPEED_MIDPOINT, deriveBaseStats(), DerivedStats (+20 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.11
Nodes (18): GameserverWidget(), Server, ServerRow(), ApplyButton(), Light, LIGHT_COLOR, LIGHT_LABEL, Server (+10 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.06
Nodes (31): buildFfaRanking(), buildMatchRanking(), cornerStyle(), displayName(), ELEMENT_SIZE, ElementContent(), elementPositionStyle(), ElementSlot (+23 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.06
Nodes (48): GET(), GET(), POST(), POST(), GET(), PATCH(), POST(), GET() (+40 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.16
Nodes (25): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), formatStart() (+17 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.09
Nodes (23): metadata, userSelect, BattleCardsLogo(), CardWithId, INTRO, STEPS, RANK_STYLE, LeaderboardTabs() (+15 more)

### Community 36 - "packs.ts"
Cohesion: 0.12
Nodes (26): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), asCardResult(), asTacticResult(), awardDrawnCard(), awardDrawnTacticCard() (+18 more)

### Community 37 - "MobaIcon"
Cohesion: 0.12
Nodes (27): RankTile(), cache, flush(), inflight, isFresh(), JobBadgeProps, listeners, pending (+19 more)

### Community 38 - "types.ts"
Cohesion: 0.04
Nodes (57): PLACES, EventCard(), EventUser, Props, SeriesEventItem, STATUS_CFG, StreamingPartner, EventLiveBadge() (+49 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.06
Nodes (50): GET(), PUT(), requestSchema, POST(), serializeDrawResult(), GET(), DuelDeckPage(), metadata (+42 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.08
Nodes (32): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), LineupEditor(), LiveUnit, LiveUnitSnapshot (+24 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.25
Nodes (10): BattleLauncher(), Mode, RankRow(), BattleRankBadge(), MatchmakingWidget(), BATTLE_RANKS, BattleRankEntry, getBattleRank() (+2 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.05
Nodes (72): APPLY, main(), GET(), GET(), GET(), GET(), GET(), POST() (+64 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.11
Nodes (34): berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames(), getDismissedItemKeys() (+26 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.05
Nodes (63): AdminEventsPage(), CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, ThumbVote() (+55 more)

### Community 45 - "auth.ts"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.18
Nodes (15): GET(), isAuthorized(), GET(), POST(), QuestsPage(), DndQuestDef, generateMonthlyQuests(), QUEST_TYPE_META (+7 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.12
Nodes (16): metadata, russoOne, spaceGrotesk, viewport, CursorGlow(), ExitAppGuard(), TRAP_STATE, Sun (+8 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.08
Nodes (36): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+28 more)

### Community 49 - "amp.ts"
Cohesion: 0.07
Nodes (48): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, GemsResultScreen(), GemsReward, AvailableAction (+40 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.09
Nodes (19): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward, PLATFORMS (+11 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (28): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+20 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.16
Nodes (16): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+8 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.09
Nodes (31): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+23 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.21
Nodes (9): choose(), coastal(), neighbors(), pick(), Baut eine Hex-Weltkarte aus den Assets in ../Hex Map. Aufruf: python build_world, alle Dateien <prefix>NN.png (nur Ziffern hinter dem Prefix), terrain_of(), terrain_of_fixed() (+1 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.13
Nodes (18): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), awardPoints(), parsePlacementPts() (+10 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.14
Nodes (22): GET(), POST(), DELETE(), DELETE(), AuditActor, AUTHOR, AuthorRow, authorSearch() (+14 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.12
Nodes (23): FORMATS, CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant (+15 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (25): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+17 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.06
Nodes (41): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+33 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.12
Nodes (21): GET(), loadProfileOverlayState(), Interview, InterviewClient(), name(), GameCoverPicker(), CoverBrandBadge(), EventCoverDefault() (+13 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.09
Nodes (31): PATCH(), patchSchema, PATCH(), requestSchema, BattleCardsLayout(), metamorphous, metadata, MyCardPage() (+23 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): @auth/prisma-adapter, discord.js, gamedig, @google/generative-ai, motion, next, dependencies, @auth/prisma-adapter (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.18
Nodes (15): isAuthorized(), isOverridden(), POST(), toJson(), isAuthorized(), POST(), isAuthorized(), POST() (+7 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.16
Nodes (13): BracketView(), Match, Participant, roundLabel(), uname(), User, AvatarStack(), AvatarUser (+5 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (18): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+10 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.15
Nodes (17): JobTexts, EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE (+9 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.07
Nodes (48): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), GET(), DELETE() (+40 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.08
Nodes (37): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), GET(), GEMS_DIFFICULTIES, POST(), POST() (+29 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.13
Nodes (22): GET(), isAuthorized(), POST(), GET(), rollNewCharacterSheet(), positionAlongPath(), LOCATION_HEXES, DND_LOCATIONS (+14 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.07
Nodes (30): MonthlyContests, Props, YearlyContests, ClipVotingClient(), Nomination, Props, MONTH_NAMES, GalleryEntry (+22 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.06
Nodes (40): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+32 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.05
Nodes (32): Badge, CATEGORIES, CATEGORY_LABELS, User, AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES, CompareProfilePage() (+24 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.05
Nodes (98): Crop, drawTeFrame(), FULL, imageCache, layersFor(), loadTeImage(), loadTeLayers(), loadTeLayerSets() (+90 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.10
Nodes (25): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+17 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.05
Nodes (40): POST(), AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection() (+32 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.32
Nodes (4): Health, Info, JobIcon(), JOB_ICONS

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.06
Nodes (37): Anomalies, AnomaliesClient(), Person, PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS (+29 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.07
Nodes (64): GET(), PATCH(), PATCH(), GET(), PATCH(), PATCH(), PATCH(), POST() (+56 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.07
Nodes (43): DELETE(), POST(), GET(), POST(), POST(), POST(), DELETE(), PATCH() (+35 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.18
Nodes (9): CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS, ErrorNotice(), DIFFICULTY_CONFIG, DIFFICULTY_ORDER, NpcBattleLauncher() (+1 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.18
Nodes (20): POST(), GET(), POST(), advanceDndQuestObjective(), advanceWorldQuestStep(), DND_QUESTS, ensureDndQuestsSeeded(), getWorldQuestStep() (+12 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.23
Nodes (12): YearReviewPage(), checkAndAwardBadges(), loadStats(), BADGE_CATEGORY_LABELS, BADGE_DEFS, BadgeDef, BadgeStats, findNewlyEarnedBadges() (+4 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.18
Nodes (6): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap, LifeBuoy

### Community 90 - "useConfirm"
Cohesion: 0.21
Nodes (15): GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GamePlayer, GET(), FavoriteGamesSection(), Props (+7 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.11
Nodes (18): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, Thumb() (+10 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.03
Nodes (42): DEFAULTS, RULES, RuleSeed, GET(), isAuthorized(), GameSuggestion, isAuthorized(), POST() (+34 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.15
Nodes (16): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), BattleStatsPanel(), isStoredBattleLog(), StoredBattleLog, computeBattleStats() (+8 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.08
Nodes (24): Props, Badge, ProfileJobBadge(), CustomBadgeDisplay, Props, Tab, TABS, ProfileQuestEntry (+16 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.17
Nodes (6): RULES, AnimatedBackground(), Cell, PULSE_COLORS, CheckSquare, ShieldAlert

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.21
Nodes (11): BASE_Z, CATALOG_PATH, CATEGORIES, CHAR_PACKS, hex(), main(), OUT, SKIN_SRC (+3 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.07
Nodes (33): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+25 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.10
Nodes (16): ACCENT_CLASSES, PACK_INFO, PACK_ORDER, PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE (+8 more)

### Community 100 - "adapters.ts"
Cohesion: 0.21
Nodes (10): AdminUsersClient(), formatLastLogin(), Props, Role, UserRow, AdminUsersPage(), SyncMembersButton(), History (+2 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.24
Nodes (7): POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, VoteKind, VoteOwnerLookup

### Community 102 - "recurrence.ts"
Cohesion: 0.33
Nodes (7): DELETE(), PATCH(), POST(), DELETE(), GET(), PATCH(), requireModeratorOrSquadCaptain()

### Community 103 - "isVideoUrl"
Cohesion: 0.06
Nodes (34): GET(), PickedGameCover, api(), AreaKey, FoundUser, GameInfo, IdeaPrefill, MediaAsset (+26 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.09
Nodes (28): POST(), requestSchema, DndPage(), metadata, ABILITY_LABEL, ABILITY_SCORE_CANDIDATES, ABILITY_STEPS, CharacterCreation() (+20 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.18
Nodes (20): GET(), isAuthorized(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction() (+12 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.05
Nodes (50): GET(), GET(), GET(), GET(), GET(), POST(), GET(), DELETE() (+42 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.20
Nodes (5): COIN_SOURCES, PointsInfoModal(), Props, Modal(), PANEL_WIDTH

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.24
Nodes (7): Menu, Share, BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.21
Nodes (12): GET(), GET(), isAuthorized(), findGemsMonsterTemplate(), finalizeDueGemsTournaments(), GemsTournamentSummary, generateGemsTournamentBossTeam(), getCurrentGemsTournament() (+4 more)

### Community 112 - "BadgesSection.tsx"
Cohesion: 0.48
Nodes (6): revokePointsByReason(), applyMatchResult(), ApplyMatchResultInput, finalFinalistReason(), finalWinReason(), loserOf()

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.09
Nodes (34): POST(), GET(), GET(), POST(), DELETE(), GET(), POST(), GET() (+26 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.06
Nodes (54): POST(), GET(), PATCH(), patchSchema, placementSchema, GET(), PATCH(), patchSchema (+46 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.40
Nodes (3): CATEGORIES, DISCORD_DM_CATEGORY, Prefs

### Community 117 - "getActiveMembership"
Cohesion: 0.14
Nodes (18): GET(), PATCH(), POST(), AdminShopPage(), PACK_KIND_INFO, PACK_KIND_ORDER, ShopConfigPanel(), TYPE_LABEL (+10 more)

### Community 118 - "report-event-facts.ts"
Cohesion: 0.03
Nodes (59): CardRow, TacticCardRow, LinkedUser, Partner, PartnerManager(), TwitchPreview, AmpSuggestion, EMPTY_FORM (+51 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.13
Nodes (11): EventCardLink(), BackToTop(), DiscordLoginButton(), Props, GateButton(), GateOptions, GuestBanner(), GuestGateContext (+3 more)

### Community 124 - "ServerCard.tsx"
Cohesion: 0.52
Nodes (4): POST(), POST(), advanceDndQuestObjectiveForUser(), updateQuestProgress()

### Community 125 - "notifications/page.tsx"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 126 - "series/[id]/complete/route.ts"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.04
Nodes (61): SteamGameResult, Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration (+53 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.08
Nodes (45): GET(), POST(), GET(), OptionInput, POST(), POST(), GET(), GET() (+37 more)

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "(dashboard)/layout.tsx"
Cohesion: 0.23
Nodes (7): DashboardLayout(), PartnerFooter(), Partner, NewsItem, GUEST_ALLOWED_PATHS, isGuestAllowedPath(), isLinkPreviewBot()

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 137 - "[tacticCardId]/route.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 138 - "DuelDeckEditor.tsx"
Cohesion: 0.09
Nodes (22): BattleCardsTabsInner(), DND_LINK_TAB, isTabKey(), TabKey, TABS, DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard (+14 more)

### Community 139 - "widget/events/route.ts"
Cohesion: 0.17
Nodes (19): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), MessageCircleMore, ShieldCheck (+11 more)

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.10
Nodes (23): BattleChallengeWidget(), ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge(), ChallengeUserPicker(), uname() (+15 more)

### Community 142 - "three"
Cohesion: 0.09
Nodes (30): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+22 more)

### Community 144 - "sync-discord-roles/route.ts"
Cohesion: 0.43
Nodes (6): GET(), POST(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole()

### Community 147 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.16
Nodes (13): DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, CanvasElementOption, Pos, PositionCanvas(), DEFAULT_POSITIONS, ElementOption (+5 more)

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 157 - "MobileTopBar.tsx"
Cohesion: 0.40
Nodes (5): LogOut, Moon, MobileTopBar(), ROUTE_TITLES, useTheme()

### Community 159 - "grantPack"
Cohesion: 0.31
Nodes (9): GET(), POST(), rollPrize(), todayStr(), CHEST_TABLE, ChestPrize, grantGemsPvpVictoryChest(), rollChestPrize() (+1 more)

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

## Knowledge Gaps
- **1121 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1116 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `report/[id]/page.tsx` to `roles.ts`, `series/[id]/complete/route.ts`, `coach-service.ts`, `time.ts`, `getSessionUser`, `RankedAvatar.tsx`, `duel-live-battle.ts`, `(dashboard)/leaderboard/page.tsx`, `BattleCardView.tsx`, `packs.ts`, `types.ts`, `community-job-config.ts`, `JobBadge.tsx`, `discord-rest.ts`, `DailyPollBanner.tsx`, `BattleLogEntry`, `EventEditClient.tsx`, `dashboard/page.tsx`, `GameNameInput.tsx`, `events/series/[id]/page.tsx`, `formatBerlinTime`, `SeriesIcon.tsx`, `[id]/settings/SettingsClient.tsx`, `community-job-payout/route.ts`, `ClipVotingClient.tsx`, `(dashboard)/events/page.tsx`, `send/route.ts`, `admin/community-jobs/disputes/route.ts`, `recurrence.ts`, `isVideoUrl`, `GamePlayersModal.tsx`, `upload/route.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `prisma.ts`, `ranked-season.ts`, `DashboardChrome.tsx`, `series/[id]/complete/route.ts`, `[tacticCardId]/route.ts`, `series-event-points.ts`, `sync-discord-roles/route.ts`, `clip-contest.ts`, `CoinIcon.tsx`, `revert-event-completion.ts`, `skill-pool.ts`, `EmptyState.tsx`, `hasMinRole`, `events/series/[id]/page.tsx`, `community-job-payout/route.ts`, `ClipVotingClient.tsx`, `adapters.ts`, `recurrence.ts`, `photo-request-service.ts`, `report/[id]/page.tsx`, `ThemeProvider.tsx`, `getActiveMembership`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `community-job-payout/route.ts` to `time.ts`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `RankedAvatar.tsx`, `duel-live-battle.ts`, `CommunityJobsAdminPanel.tsx`, `MobaIcon.tsx`, `(dashboard)/leaderboard/page.tsx`, `ProfileMobileView.tsx`, `gameservers.ts`, `types.ts`, `tournament/[id]/page.tsx`, `community-job-config.ts`, `JobBadge.tsx`, `auth.ts`, `FotografTools.tsx`, `dispatchNotification`, `skill-pool.ts`, `community-board-comment-service.ts`, `SeriesIcon.tsx`, `ProfileOverlayClient.tsx`, `ConfirmDialog.tsx`, `ClipVotingClient.tsx`, `apply-season-results.ts`, `isVideoUrl`, `report/[id]/page.tsx`, `promotion-request-service.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1121 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.024237204724409447 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07957957957957958 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12183908045977011 - nodes in this community are weakly interconnected._