# Graph Report - OMA-Companion  (2026-09-25)

## Corpus Check
- 1037 files · ~3,680,828 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5211 nodes · 14418 edges · 210 communities (177 shown, 33 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `23035406`
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
- FfaView.tsx
- middleware.ts
- notifications.ts
- OverlayClient
- [matchId]/route.ts
- new-season/page.tsx
- ImageCropTool.tsx
- Monster-Artwork — Edelstein-Kampf
- ScoreBreakdownBlock.tsx
- MobileTopBar.tsx
- HeroSetup.tsx
- grantPack
- widget/events/[id]/route.ts
- CreateContestForm.tsx
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- daily-poll/[id]/vote/route.ts
- preferences/route.ts
- birthdays/route.ts
- generate-brand-assets.ts
- @react-three/fiber
- recharts
- lucide-react
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- prisma
- @prisma/client
- react-dom
- UserRoleManager.tsx
- @react-three/drei
- chroma-key.js
- sharp
- three
- @types/canvas-confetti
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- @types/three
- bot-runner.mjs
- eslint.config.mjs
- @vercel/blob
- zod
- next.config.ts
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
4. `hasMinRole()` - 111 edges
5. `dispatchNotification()` - 88 edges
6. `Loader2` - 68 edges
7. `getBerlinDateParts()` - 56 edges
8. `X` - 55 edges
9. `JobBadge()` - 43 edges
10. `CoinIcon()` - 37 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --indirect_call--> `hex()`  [INFERRED]
  src/app/api/dnd/world-map/route.ts → scripts/build-te-assets.ts
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts
- `GemsTournamentBanner()` --indirect_call--> `load()`  [INFERRED]
  src/components/battle-cards/GemsTournamentBanner.tsx → src/app/api/dnd/custom-worlds/[id]/route.ts

## Import Cycles
- None detected.

## Communities (210 total, 33 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (62): DELETE(), GET(), PATCH(), DELETE(), PUT(), GET(), DELETE(), OptionInput (+54 more)

### Community 1 - "prisma.ts"
Cohesion: 0.18
Nodes (14): GET(), UserLite, AdminEventCompletePage(), DEFAULT_POLL, DEFAULT_REWARDS, MultiPollConfig, parsePoll(), parseRewards() (+6 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.17
Nodes (17): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), getUpgradeEconomyConfig(), parseTable() (+9 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.11
Nodes (36): POST(), DndCharacterRow, DndLocationRow, formatDuration(), polygonPoints(), TYPE_LABEL, WorldMap(), HexPicker() (+28 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.08
Nodes (44): actionSchema, DUEL_STANCES, POST(), GET(), average(), GET(), POST(), VALID_DIFFICULTIES (+36 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.05
Nodes (30): RULES, TacticCardRow, AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES, api(), Coach, CoachRatingSection() (+22 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.15
Nodes (24): SlotRow(), activationCellsFor(), areAdjacent(), BoardResolveResult, cellCol(), cellRow(), enemySlotForColumn(), findHintMove() (+16 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.12
Nodes (38): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog(), beginTrapCheck() (+30 more)

### Community 8 - "interactive.ts"
Cohesion: 0.09
Nodes (60): generateBoard(), hasAnyValidMove(), pickEnemyForColumn(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate (+52 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.06
Nodes (56): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+48 more)

### Community 10 - "time.ts"
Cohesion: 0.06
Nodes (53): GET(), POST(), POST(), DELETE(), PATCH(), PATCH(), POST(), GET() (+45 more)

### Community 11 - "getSessionUser"
Cohesion: 0.06
Nodes (48): GET(), POST(), GET(), POST(), GET(), DELETE(), PATCH(), DELETE() (+40 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (59): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+51 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.05
Nodes (51): POST(), CATEGORIES, EventSetupWizard(), inputStyle, PlacementReward, PLATFORMS, PollConfig, RECURRENCE_OPTS (+43 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.08
Nodes (38): DELETE(), DELETE(), POST(), GET(), POST(), GET(), IdeaPage(), ReportPage() (+30 more)

### Community 16 - "ranks.ts"
Cohesion: 0.10
Nodes (31): LeaderboardPage(), MEDALS, metadata, PODIUM_CONFIG, BracketView(), Match, Participant, roundLabel() (+23 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.08
Nodes (33): AlbumPage(), Interview, InterviewClient(), name(), PublicProfilePage(), ProfilePage(), AssetGrid(), EventGallerySection() (+25 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (39): VfxEvent, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction (+31 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.09
Nodes (22): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+14 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.07
Nodes (35): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+27 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.07
Nodes (26): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+18 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.29
Nodes (8): CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), CATEGORY_LABELS, DAILY_CAPS, POINT_RULES, PointCategory, RANK_POINT_CATEGORIES

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.13
Nodes (16): EventLiveBadge(), FORMAT_LABELS, STATUS_STYLES, BotPreviewShell(), CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props (+8 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.06
Nodes (73): POST(), GET(), POST(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST() (+65 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.06
Nodes (28): DailyMessageBanner(), Message, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount, Poll, PollCard() (+20 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.26
Nodes (16): CampaignLevelDef, AFK_FARMER, GRIEFER_IMP, LAG_SPIKE, LOOT_GOBLIN, PAY2WIN_TRUHE, RAGE_QUIT_CONTROLLER, SEASON_PASS_DRACHE (+8 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.13
Nodes (30): POST(), toJson(), ABILITY_KEYS, AbilityScores, clampToBaseline(), CLASS_SPEED_MIDPOINT, deriveBaseStats(), DerivedStats (+22 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.24
Nodes (20): docToWorld(), MapBuilder, TeMap, bergpass(), BUILDERS, cache, chatter(), chestTalk() (+12 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (23): buildFfaRanking(), buildMatchRanking(), displayName(), ElementContent(), ElementSlot, formatEntryStats(), IdentityFlipTile(), LayoutEntry (+15 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.11
Nodes (26): POST(), POST(), GET(), PATCH(), POST(), GET(), GET(), GET() (+18 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.19
Nodes (21): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), formatStart() (+13 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.06
Nodes (43): PATCH(), patchSchema, PATCH(), requestSchema, BattleCardsPage(), metadata, userSelect, BattleCardsLogo() (+35 more)

### Community 36 - "packs.ts"
Cohesion: 0.11
Nodes (28): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), CHEST_TABLE, ChestPrize, grantGemsPvpVictoryChest(), rollChestPrize() (+20 more)

### Community 37 - "MobaIcon"
Cohesion: 0.06
Nodes (46): Health, Avatar(), EventTippsList(), Tipp, uname(), UserLite, EventWinnerPredictionWidget(), Prediction (+38 more)

### Community 38 - "types.ts"
Cohesion: 0.08
Nodes (29): CompareProfilePage(), fetchUserData(), UserData, buildStandings(), LigaView(), Match, MEDAL, Participant (+21 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.08
Nodes (42): GET(), PUT(), requestSchema, POST(), requestSchema, toDbResult(), serializeBattleLog(), assertHeroIncluded() (+34 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.07
Nodes (38): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleReplayPage(), metadata, BattleOutcome (+30 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.09
Nodes (25): BattleLauncher(), Mode, RankRow(), BattleRankBadge(), CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS (+17 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.06
Nodes (59): PATCH(), PATCH(), POST(), POST(), GET(), GET(), POST(), POST() (+51 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.16
Nodes (26): GET(), GET(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor() (+18 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.04
Nodes (63): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+55 more)

### Community 45 - "auth.ts"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.08
Nodes (35): GET(), GET(), isAuthorized(), GET(), isAuthorized(), calcStreak(), GET(), GET() (+27 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.07
Nodes (28): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, AdminLayout(), Props (+20 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.10
Nodes (23): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+15 more)

### Community 49 - "amp.ts"
Cohesion: 0.11
Nodes (30): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, LiveBattleView(), cell(), beep() (+22 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.10
Nodes (21): api(), Idea, IdeasBoardClient(), IdeaList(), api(), GameCard(), GameInfo, IdeaBody() (+13 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (27): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+19 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.13
Nodes (30): GROUND_LABEL, MapEditor(), Props, Selection, STAMP_IDS, STAMP_LABELS, Tool, TOOL_BUTTONS (+22 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.11
Nodes (25): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+17 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.21
Nodes (9): choose(), coastal(), neighbors(), pick(), Baut eine Hex-Weltkarte aus den Assets in ../Hex Map. Aufruf: python build_world, alle Dateien <prefix>NN.png (nur Ziffern hinter dem Prefix), terrain_of(), terrain_of_fixed() (+1 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.31
Nodes (8): awardPoints(), parsePlacementPts(), PATCH(), BracketMatch, generateBracket(), generateRoundRobin(), POST(), shuffle()

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.14
Nodes (21): GET(), POST(), DELETE(), DELETE(), AUTHOR, AuthorRow, authorSearch(), contentInfo() (+13 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.06
Nodes (42): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+34 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (24): DELETE(), GEMS_DIFFICULTIES, DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage(), DominionCfg (+16 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.04
Nodes (52): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+44 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.08
Nodes (34): GET(), GET(), SteamGameResult, GET(), loadProfileOverlayState(), GameCoverPicker(), PickedGameCover, CoverBrandBadge() (+26 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.06
Nodes (63): POST(), serializeDrawResult(), GET(), POST(), requestSchema, DuelDeckPage(), metadata, BattleCardsLayout() (+55 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.06
Nodes (36): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+28 more)

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): @auth/prisma-adapter, discord.js, gamedig, @google/generative-ai, motion, next, next-auth, dependencies (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.18
Nodes (15): isAuthorized(), isOverridden(), POST(), toJson(), isAuthorized(), POST(), isAuthorized(), POST() (+7 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.08
Nodes (45): GET(), DELETE(), POST(), requireAdmin(), DELETE(), PATCH(), requireAdmin(), POST() (+37 more)

### Community 69 - "challenge.ts"
Cohesion: 0.21
Nodes (13): POST(), DELETE(), GET(), POST(), ChallengeError, createInstantMatch(), respondToChallenge(), eloWindowFor() (+5 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.14
Nodes (17): JobTexts, EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE (+9 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.06
Nodes (50): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), DELETE(), GET() (+42 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.12
Nodes (20): GET(), api(), AreaKey, FoundUser, GameInfo, IdeaForm(), IdeaPrefill, MediaAsset (+12 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.14
Nodes (21): GET(), isAuthorized(), POST(), GET(), positionAlongPath(), stepMinutesOf(), DND_LOCATIONS, DndLocationDef (+13 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.06
Nodes (34): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, ClipVotingClient(), Nomination, Props (+26 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.09
Nodes (30): AdminEventBracketPage(), Membership, Squad, SquadDetailClient(), User, Squad, ArchivedSeason, FORMAT_LABELS (+22 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.29
Nodes (8): ActivityFeed(), cleanReason(), Filter, Tx, txType(), formatRelative(), RelativeTime(), RelativeTimeProps

### Community 77 - "tutorial.ts"
Cohesion: 0.09
Nodes (39): Crop, drawTeFrame(), FULL, imageCache, layersFor(), loadTeImage(), loadTeLayers(), loadTeLayerSets() (+31 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.12
Nodes (17): ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, PanelPhase, PanelShell(), TopEdge() (+9 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.15
Nodes (17): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+9 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.13
Nodes (22): GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), TournamentDetailPage(), computeEventPoints(), computeLiveLigaPunkte() (+14 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.08
Nodes (26): Anomalies, AnomaliesClient(), Person, PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS (+18 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.05
Nodes (66): APPLY, main(), GET(), PATCH(), PATCH(), GET(), POST(), GET() (+58 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.07
Nodes (46): GET(), POST(), POST(), POST(), GET(), POST(), GET(), guideVoteEvents() (+38 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.12
Nodes (19): GemsResultScreen(), GemsReward, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue(), getArenaBackgroundStyle() (+11 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.12
Nodes (26): POST(), GET(), POST(), LocationState, QuestWorld(), OtherPlayer, getPublishedCustomWorld(), removedSlugs() (+18 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 87 - "compilerOptions"
Cohesion: 0.11
Nodes (17): node_modules, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, module (+9 more)

### Community 88 - "send/route.ts"
Cohesion: 0.11
Nodes (21): CustomBadgeDisplay, Props, YearReviewPage(), BadgeIcon(), BadgeIconProps, checkAndAwardBadges(), loadStats(), badgeArt() (+13 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.14
Nodes (15): EventCardLink(), DiscordLoginButton(), Props, GateButton(), GateLink(), GateOptions, GuestBanner(), GuestGateContext (+7 more)

### Community 90 - "useConfirm"
Cohesion: 0.31
Nodes (10): GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props, FavoriteGame (+2 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.14
Nodes (16): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, Thumb() (+8 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.03
Nodes (16): RULES, RuleSeed, POST(), GameSuggestion, GameSuggestion, DEFAULT_PREFS, POST(), POST() (+8 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.11
Nodes (33): Props, Loaded, STATUS_LABEL, Tab, WorldEditor(), checkPlayable(), CustomWorldDoc, CustomWorldQuest (+25 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.10
Nodes (20): DesktopProfileTabs(), Tab, Badge, ProfileJobBadge(), CustomBadgeDisplay, Props, Tab, TABS (+12 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.20
Nodes (10): GET(), POST(), DELETE(), POST(), GET(), GET(), POST(), DELETE() (+2 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.21
Nodes (11): BASE_Z, CATALOG_PATH, CATEGORIES, CHAR_PACKS, hex(), main(), OUT, SKIN_SRC (+3 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.05
Nodes (43): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+35 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.18
Nodes (6): DashboardLayout(), GuestGateProvider(), PartnerFooter(), Partner, NewsItem, GUEST_ALLOWED_PATHS

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 102 - "recurrence.ts"
Cohesion: 0.19
Nodes (8): metadata, russoOne, spaceGrotesk, viewport, CursorGlow(), ExitAppGuard(), TRAP_STATE, SessionProvider()

### Community 103 - "isVideoUrl"
Cohesion: 0.08
Nodes (22): GET(), AssetOption, buildEventTemplate(), EventOption, FoundUser, InterviewOption, PostOption, ReportEditorInitial (+14 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.23
Nodes (10): client, inviteCache, loginWithRetry(), server, voiceCheckpointed, voiceJoinTimes, findEventByDiscordId(), notifyTournamentStarted() (+2 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.38
Nodes (13): checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction(), trackVoice(), advanceDndQuestObjectiveForDiscordId() (+5 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.05
Nodes (64): GET(), GET(), GET(), PATCH(), PATCH(), DELETE(), PATCH(), POST() (+56 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.07
Nodes (24): CardRow, CommunityCardsAdmin(), AdminCommunityCardsPage(), RARITIES, STEP_LABELS, UpgradeEconomyPanel(), MonthlyContests, Props (+16 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.11
Nodes (16): DndPage(), metadata, ABILITY_LABEL, ABILITY_SCORE_CANDIDATES, ABILITY_STEPS, CharacterCreation(), Phase, ROLE_BADGE (+8 more)

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.18
Nodes (15): GET(), GET(), isAuthorized(), findGemsMonsterTemplate(), GEMS_MONSTER_CATALOG, finalizeDueGemsTournaments(), GemsTournamentSummary, generateGemsTournamentBossTeam() (+7 more)

### Community 111 - "skins/types.ts"
Cohesion: 0.12
Nodes (27): GET(), POST(), GET(), OptionInput, POST(), POST(), GET(), GET() (+19 more)

### Community 112 - "BadgesSection.tsx"
Cohesion: 0.48
Nodes (6): revokePointsByReason(), applyMatchResult(), ApplyMatchResultInput, finalFinalistReason(), finalWinReason(), loserOf()

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.06
Nodes (56): POST(), GET(), PATCH(), patchSchema, placementSchema, GET(), PATCH(), patchSchema (+48 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.22
Nodes (11): DisplayCatalogResponse, fetchProducts(), fetchSigl(), formatPrice(), getXboxFeed(), IMAGE_ORDER, ProductInfo, SIGL (+3 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.11
Nodes (16): AdminShopPage(), PACK_KIND_INFO, PACK_KIND_ORDER, ShopConfigPanel(), TYPE_LABEL, ACCENT_CLASSES, PACK_INFO, PACK_ORDER (+8 more)

### Community 118 - "report-event-facts.ts"
Cohesion: 0.03
Nodes (59): AdminUsersClient(), formatLastLogin(), Props, Role, UserRow, AdminUsersPage(), SyncMembersButton(), inputStyle (+51 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "TextsClient.tsx"
Cohesion: 0.24
Nodes (15): LOGO_POSITIONS, StudioEditor(), ImageDown, drawLogo(), drawWatermark(), loadImage(), LogoPosition, prepareUploadImage() (+7 more)

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.27
Nodes (8): Sun, ThemedToaster(), Theme, ThemeContext, ThemeProvider(), useTheme(), ThemeToggle(), ThemeToggleItem()

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), StatusEntry, AdsTarget, ampCall(), AmpInstance, callWithSession() (+15 more)

### Community 124 - "ServerCard.tsx"
Cohesion: 0.47
Nodes (3): POST(), POST(), advanceDndQuestObjectiveForUser()

### Community 125 - "notifications/page.tsx"
Cohesion: 0.22
Nodes (7): buildSteps(), CardWithId, CLASS_CONFIG, CLASS_ORDER, ClassKey, StarterPickFlow(), StepDef

### Community 126 - "series/[id]/complete/route.ts"
Cohesion: 0.24
Nodes (12): react, react, buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath() (+4 more)

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.07
Nodes (30): Badge, CATEGORIES, CATEGORY_LABELS, User, DailyMessagePanel(), defaultForm(), formatDate(), FormState (+22 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "ThemeProvider.tsx"
Cohesion: 0.22
Nodes (5): Content, Loc, Quest, Row, STATUS

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.14
Nodes (18): POST(), POST(), POST(), requestSchema, userSelect, GET(), POST(), GET() (+10 more)

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.10
Nodes (36): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), GET(), isAuthorized(), GEMS_DIFFICULTIES, POST() (+28 more)

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.18
Nodes (11): Corner, ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage() (+3 more)

### Community 134 - "(dashboard)/layout.tsx"
Cohesion: 0.31
Nodes (10): POST(), GET(), POST(), answerInterview(), createInterview(), declineInterview(), InterviewResult, listMyInterviews() (+2 more)

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 137 - "[tacticCardId]/route.ts"
Cohesion: 0.29
Nodes (7): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.ts, **/*.tsx, include

### Community 138 - "DuelDeckEditor.tsx"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 139 - "widget/events/route.ts"
Cohesion: 0.17
Nodes (19): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), MessageCircleMore, ShieldCheck (+11 more)

### Community 140 - "ThemeProvider.tsx"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.06
Nodes (39): BattleCardsTabsInner(), DND_LINK_TAB, isTabKey(), TabKey, TABS, BattleChallengeWidget(), ChallengeItem, ChallengesList() (+31 more)

### Community 142 - "three"
Cohesion: 0.09
Nodes (29): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+21 more)

### Community 143 - "season-config.ts"
Cohesion: 0.24
Nodes (8): POST(), computeKeptSeriesRankPoints(), PlacementReward, resetAllExceptSeries(), RewardsConfig, SelectiveResetSummary, LegacyStandingRow, SeriesEventForStandings

### Community 144 - "sync-discord-roles/route.ts"
Cohesion: 0.43
Nodes (6): GET(), POST(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole()

### Community 145 - "promotion-request-service.ts"
Cohesion: 0.38
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 146 - "FotografGalleries.tsx"
Cohesion: 0.50
Nodes (4): dom, dom.iterable, esnext, lib

### Community 147 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.10
Nodes (18): ServerCredentials(), ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption (+10 more)

### Community 148 - "FfaView.tsx"
Cohesion: 0.24
Nodes (10): calcEntryAvg(), Entry, FfaView(), fmtUpTo2(), Match, MEDAL, Participant, uname() (+2 more)

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "notifications.ts"
Cohesion: 0.29
Nodes (8): main(), DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled(), NotificationType, PREF_KEY

### Community 151 - "OverlayClient"
Cohesion: 0.19
Nodes (13): combinedElementStyle(), cornerStyle(), elementPositionStyle(), OverlayClient(), panelMotionStyle(), panelWidthFor(), usePanelRotator(), useStackedElements() (+5 more)

### Community 152 - "[matchId]/route.ts"
Cohesion: 0.32
Nodes (6): DELETE(), displayNameOf(), PATCH(), UserLite, userSummary(), ApplyMatchResultError

### Community 153 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 154 - "ImageCropTool.tsx"
Cohesion: 0.29
Nodes (6): centeredRect(), Handle, ImageCropTool(), PRESETS, Rect, Crop

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 156 - "ScoreBreakdownBlock.tsx"
Cohesion: 0.36
Nodes (7): Breakdown, fmt(), ScoreBreakdownBlock(), signed(), StreamResult, Week, Scale

### Community 157 - "MobileTopBar.tsx"
Cohesion: 0.43
Nodes (6): eventSelect, FINISHED_STATUSES, GET(), RELEVANT_STATUSES, sortSeriesEvents(), toWidgetEvent()

### Community 159 - "grantPack"
Cohesion: 0.27
Nodes (10): GET(), PATCH(), POST(), GET(), POST(), rollPrize(), todayStr(), getShopConfig() (+2 more)

### Community 160 - "widget/events/[id]/route.ts"
Cohesion: 0.47
Nodes (5): displayNameOf(), GET(), USER_SELECT, UserLite, userSummary()

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 163 - "HeroStatValue.tsx"
Cohesion: 0.11
Nodes (26): curve(), curvePercent(), STANDARD_CARDS, StandardCardSeed, GET(), isAuthorized(), POST(), toJson() (+18 more)

### Community 165 - "preferences/route.ts"
Cohesion: 0.60
Nodes (4): displayNameOf(), POST(), UserLite, userSummary()

### Community 167 - "generate-brand-assets.ts"
Cohesion: 0.40
Nodes (3): OUT_DIR, PNG_SIZES, SOURCE

### Community 172 - "Kapitel-Hintergründe — Kampagne"
Cohesion: 0.50
Nodes (3): Benötigte Dateien, Format, Kapitel-Hintergründe — Kampagne

## Knowledge Gaps
- **1140 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1135 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `report/[id]/page.tsx` to `roles.ts`, `DashboardChrome.tsx`, `series/[id]/complete/route.ts`, `(dashboard)/layout.tsx`, `coach-service.ts`, `time.ts`, `getSessionUser`, `RankedAvatar.tsx`, `ranks.ts`, `duel-live-battle.ts`, `BattleCardView.tsx`, `notify-dispatch.ts`, `packs.ts`, `community-job-config.ts`, `job-recommendations.ts`, `JobBadge.tsx`, `discord-rest.ts`, `podium/[id]/route.tsx`, `EventEditClient.tsx`, `GameNameInput.tsx`, `events/series/[id]/page.tsx`, `formatBerlinTime`, `SeriesIcon.tsx`, `community-job-payout/route.ts`, `AdminEventsClient.tsx`, `ClipVotingClient.tsx`, `(dashboard)/events/page.tsx`, `send/route.ts`, `community-job-discord-votes.ts`, `admin/community-jobs/disputes/route.ts`, `isVideoUrl`, `skins/types.ts`, `GamePlayersModal.tsx`, `upload/route.ts`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `duel-live-battle.ts` to `roles.ts`, `time.ts`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `RankedAvatar.tsx`, `CommunityJobsAdminPanel.tsx`, `FfaView.tsx`, `(dashboard)/leaderboard/page.tsx`, `ProfileMobileView.tsx`, `notify-dispatch.ts`, `ScoreBreakdownBlock.tsx`, `gameservers.ts`, `types.ts`, `community-job-config.ts`, `JobBadge.tsx`, `auth.ts`, `discord-rest.ts`, `FotografTools.tsx`, `dispatchNotification`, `SeriesDetailClient.tsx`, `skill-pool.ts`, `formatBerlinTime`, `SeriesIcon.tsx`, `[id]/settings/SettingsClient.tsx`, `ProfileOverlayClient.tsx`, `AdminEventsClient.tsx`, `ConfirmDialog.tsx`, `ClipVotingClient.tsx`, `apply-season-results.ts`, `(dashboard)/battle-cards/page.tsx`, `isVideoUrl`, `photo-request-service.ts`, `promotion-request-service.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `DashboardChrome.tsx`, `ranked-season.ts`, `series/[id]/complete/route.ts`, `DuelDeckEditor.tsx`, `ThemeProvider.tsx`, `series-event-points.ts`, `duels-live.ts`, `season-config.ts`, `sync-discord-roles/route.ts`, `promotion-request-service.ts`, `new-season/page.tsx`, `grantPack`, `clip-contest.ts`, `gameservers.ts`, `CoinIcon.tsx`, `revert-event-completion.ts`, `hasMinRole`, `ClipVotingClient.tsx`, `community-job-discord-votes.ts`, `photo-request-service.ts`, `report/[id]/page.tsx`, `photo-request-service.ts`, `skins/types.ts`, `ThemeProvider.tsx`, `getActiveMembership`, `report-event-facts.ts`, `AdminDonationsClient.tsx`, `promotion-request-service.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1140 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02909539763710104 - nodes in this community are weakly interconnected._
- **Should `live-battle.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1096938775510204 - nodes in this community are weakly interconnected._
- **Should `fotograf-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08313725490196078 - nodes in this community are weakly interconnected._