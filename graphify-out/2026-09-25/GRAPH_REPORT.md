# Graph Report - OMA-Companion  (2026-09-25)

## Corpus Check
- 1061 files · ~3,699,898 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5377 nodes · 15041 edges · 194 communities (164 shown, 30 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `31fc6511`
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
- report-event-facts.ts
- VictoryChestReveal.tsx
- upload/route.ts
- TextsClient.tsx
- AdminDonationsClient.tsx
- ServerCard.tsx
- series/[id]/complete/route.ts
- promotion-request-service.ts
- process-badge-art.ts
- ThemeProvider.tsx
- series/[id]/complete/route.ts
- widget/events/route.ts
- overlay/[id]/page.tsx
- Product
- GuildHub – Discord Companion
- DuelDeckEditor.tsx
- widget/events/route.ts
- ThemeProvider.tsx
- StarterPickFlow.tsx
- three
- season-config.ts
- sync-discord-roles/route.ts
- promotion-request-service.ts
- [id]/settings/SettingsClient.tsx
- middleware.ts
- [matchId]/route.ts
- new-season/page.tsx
- ImageCropTool.tsx
- Monster-Artwork — Edelstein-Kampf
- grantPack
- widget/events/[id]/route.ts
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- daily-poll/[id]/vote/route.ts
- generate-brand-assets.ts
- recharts
- lucide-react
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- next-auth
- postprocessing
- @prisma/client
- UserRoleManager.tsx
- react
- chroma-key.js
- react-dom
- sharp
- three
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- @types/canvas-confetti
- bot-runner.mjs
- eslint.config.mjs
- @vercel/blob
- @types/three
- next.config.ts
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
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts

## Import Cycles
- None detected.

## Communities (194 total, 30 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (63): POST(), POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET() (+55 more)

### Community 1 - "prisma.ts"
Cohesion: 0.15
Nodes (18): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), formatDate(), SeasonConfigPanel(), toDateInputValue() (+10 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.15
Nodes (20): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), DuplicateProgress(), NextLevelPreview() (+12 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.11
Nodes (36): POST(), DndCharacterRow, DndLocationRow, formatDuration(), polygonPoints(), TYPE_LABEL, WorldMap(), HexPicker() (+28 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.08
Nodes (54): POST(), GET(), POST(), EMOTES, parseSince(), POST(), OutcomeEditor(), parseFlags() (+46 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.18
Nodes (6): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap, LifeBuoy

### Community 6 - "app/layout.tsx"
Cohesion: 0.09
Nodes (32): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, SlotRow(), cell(), activationCellsFor() (+24 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.06
Nodes (81): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+73 more)

### Community 8 - "interactive.ts"
Cohesion: 0.10
Nodes (59): generateBoard(), hasAnyValidMove(), pickEnemyForColumn(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate (+51 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.05
Nodes (63): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+55 more)

### Community 10 - "time.ts"
Cohesion: 0.04
Nodes (79): GET(), GET(), POST(), POST(), GET(), DELETE(), PATCH(), PATCH() (+71 more)

### Community 11 - "getSessionUser"
Cohesion: 0.06
Nodes (50): PATCH(), GET(), POST(), GET(), DELETE(), PATCH(), DELETE(), POST() (+42 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (59): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+51 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.05
Nodes (52): POST(), CATEGORIES, EventSetupWizard(), inputStyle, PlacementReward, PLATFORMS, PollConfig, RECURRENCE_OPTS (+44 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.13
Nodes (20): DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES, CommentEntityType (+12 more)

### Community 16 - "ranks.ts"
Cohesion: 0.12
Nodes (26): BracketView(), Match, Participant, roundLabel(), uname(), User, Props, WanderpocalBadge() (+18 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.09
Nodes (26): DesktopProfileTabs(), Tab, PublicProfilePage(), ProfilePage(), Badge, ProfileJobBadge(), EventGallerySection(), FotografPortfolio() (+18 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.06
Nodes (55): ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction, DuelAttackType (+47 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.09
Nodes (23): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+15 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.04
Nodes (62): ActivityFeed(), cleanReason(), Filter, Tx, txType(), Event, EventAdminRow(), Match (+54 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.10
Nodes (20): DonationsPage(), fmt(), MONTH_NAMES, streakBadge(), DashboardLayout(), LeaderboardPage(), MEDALS, metadata (+12 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.16
Nodes (14): GET(), isAuthorized(), CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), TrendingDown, CATEGORY_LABELS, DAILY_CAPS (+6 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.22
Nodes (11): CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS, PokalSection() (+3 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.07
Nodes (60): POST(), POST(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps() (+52 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.14
Nodes (13): Avatar(), EventTippsList(), Tipp, uname(), UserLite, Coins, HelpCircle, Target (+5 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.10
Nodes (38): GET(), GET(), GET(), isAuthorized(), buildCampaignEnemyTeam(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked() (+30 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.07
Nodes (47): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), DELETE(), GET() (+39 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.14
Nodes (27): POST(), toJson(), ABILITY_KEYS, AbilityScores, clampToBaseline(), CLASS_SPEED_MIDPOINT, deriveBaseStats(), DerivedStats (+19 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.23
Nodes (22): docToWorld(), makeRng(), MapBuilder, npcLook(), Actor, bergpass(), BUILDERS, cache (+14 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.06
Nodes (30): buildFfaRanking(), buildMatchRanking(), cornerStyle(), displayName(), ElementContent(), elementPositionStyle(), ElementSlot, formatEntryStats() (+22 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.11
Nodes (26): POST(), POST(), GET(), PATCH(), POST(), GET(), GET(), GET() (+18 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.21
Nodes (19): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+11 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.07
Nodes (55): GET(), PATCH(), patchSchema, GET(), isAuthorized(), BattleCardsPage(), metadata, userSelect (+47 more)

### Community 36 - "packs.ts"
Cohesion: 0.11
Nodes (29): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), CHEST_TABLE, ChestPrize, grantGemsPvpVictoryChest(), rollChestPrize() (+21 more)

### Community 37 - "MobaIcon"
Cohesion: 0.09
Nodes (24): CompareProfilePage(), fetchUserData(), UserData, Props, buildStandings(), LigaView(), Match, MEDAL (+16 more)

### Community 38 - "types.ts"
Cohesion: 0.14
Nodes (27): GET(), POST(), EventCards(), EventResult, GmPanel(), PartyPanel(), post(), ShopPanel() (+19 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.06
Nodes (69): GET(), PUT(), requestSchema, POST(), serializeDrawResult(), GET(), POST(), requestSchema (+61 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.09
Nodes (29): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleStatsPanel(), StoredBattleLog, computeBattleStats() (+21 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.06
Nodes (36): CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS, ErrorNotice(), GemsResultScreen(), GemsReward, computeGemsReward() (+28 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.04
Nodes (101): APPLY, main(), GET(), PATCH(), PATCH(), PATCH(), POST(), GET() (+93 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.10
Nodes (36): GET(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames() (+28 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.04
Nodes (57): AdminEventsPage(), DashboardPage(), formatCountdown(), formatFreshness(), getGlobalDashboardData, MONTH_NAMES, ROLE_LABEL, ROLE_STYLE (+49 more)

### Community 45 - "auth.ts"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.10
Nodes (31): GET(), GET(), isAuthorized(), calcStreak(), GET(), GET(), POST(), CreateContestForm() (+23 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.21
Nodes (16): GET(), POST(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), generateBrandedCoverDataUri() (+8 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.09
Nodes (24): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+16 more)

### Community 49 - "amp.ts"
Cohesion: 0.14
Nodes (19): GET(), GET(), POST(), POST(), GET(), POST(), Log, abandonQuest() (+11 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.29
Nodes (8): main(), DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled(), NotificationType, PREF_KEY

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.11
Nodes (34): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+26 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.07
Nodes (62): GROUND_LABEL, MapEditor(), Props, Selection, STAMP_IDS, STAMP_LABELS, Tool, TOOL_BUTTONS (+54 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.14
Nodes (21): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+13 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.21
Nodes (9): choose(), coastal(), neighbors(), pick(), Baut eine Hex-Weltkarte aus den Assets in ../Hex Map. Aufruf: python build_world, alle Dateien <prefix>NN.png (nur Ziffern hinter dem Prefix), terrain_of(), terrain_of_fixed() (+1 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.07
Nodes (33): DELETE(), PATCH(), POST(), DELETE(), GET(), PATCH(), POST(), DELETE() (+25 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.07
Nodes (38): GET(), GET(), GET(), GET(), POST(), DELETE(), PATCH(), POST() (+30 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.18
Nodes (6): Avatar(), MEDALS, Props, StandingRow, StandingUser, uname()

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.08
Nodes (31): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), AdminEventEditPage(), NewEventPage(), AdminSeriesDetailPage(), DeleteEventOptions (+23 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.03
Nodes (74): Badge, CATEGORIES, CATEGORY_LABELS, User, DailyMessagePanel(), defaultForm(), formatDate(), FormState (+66 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.11
Nodes (19): GameserverWidget(), Server, ServerRow(), ServersPage(), Light, LIGHT_COLOR, LIGHT_LABEL, Server (+11 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.07
Nodes (46): PATCH(), patchSchema, PATCH(), requestSchema, BattleFigure(), Props, Crop, FULL (+38 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.27
Nodes (8): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, ArrowLeft, Flame, isStoredBattleLog()

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): @auth/prisma-adapter, discord.js, gamedig, @google/generative-ai, motion, next, dependencies, @auth/prisma-adapter (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.16
Nodes (16): GET(), isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, DND_LOCATIONS (+8 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.09
Nodes (43): GET(), DELETE(), POST(), requireAdmin(), DELETE(), PATCH(), requireAdmin(), GET() (+35 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.19
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.09
Nodes (22): api(), AssetOption, buildEventTemplate(), EventOption, FoundUser, InterviewOption, PostOption, ReportEditor() (+14 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.13
Nodes (20): SyncButton(), GameCoverPicker(), PickedGameCover, api(), AreaKey, FoundUser, GameInfo, IdeaForm() (+12 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.21
Nodes (14): GET(), isAuthorized(), isAuthorized(), isOverridden(), POST(), toJson(), getSkillTemplate(), withDndOverriddenFields() (+6 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.05
Nodes (43): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+35 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.06
Nodes (43): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+35 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.08
Nodes (28): GET(), isAuthorized(), Anomalies, AnomaliesClient(), Person, AlbumPage(), IdeaRow(), Item (+20 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.08
Nodes (57): drawTeFrame(), layersFor(), loadTeLayerSets(), TeLayerSets, bakeStatic(), drawBubble(), drawEmote(), drawQuarters() (+49 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.10
Nodes (24): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+16 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.16
Nodes (15): ABILITY_LABEL, ABILITY_SCORE_CANDIDATES, ABILITY_STEPS, CharacterCreation(), Phase, ROLE_BADGE, RolledCard, RollingReveal() (+7 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.04
Nodes (67): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+59 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.06
Nodes (37): PayoutsClient(), Preview, Run, Week, AdminApplication, AdminDispute, AdminMember, api() (+29 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.24
Nodes (12): GET(), IdeaPage(), ReportPage(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData, toIdeaFeedEntry(), getSeriesParts() (+4 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.07
Nodes (47): GET(), POST(), POST(), POST(), DELETE(), PATCH(), GET(), POST() (+39 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.18
Nodes (12): GET(), loadProfileOverlayState(), NextEventTile(), GameCover(), GameNameInput(), highlightMatch(), escapeRegExp(), GAME_MAP (+4 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.11
Nodes (31): POST(), POST(), GET(), POST(), POST(), POST(), cardAtLocation(), getPublishedCustomWorld() (+23 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.44
Nodes (9): GET(), displayName(), getCronRuns(), getJobHealth(), getPayoutOverview(), getVoteAnomalies(), previewPayout(), VoteEvent (+1 more)

### Community 87 - "compilerOptions"
Cohesion: 0.09
Nodes (21): dom, dom.iterable, esnext, node_modules, compilerOptions, allowJs, esModuleInterop, incremental (+13 more)

### Community 88 - "send/route.ts"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.42
Nodes (7): POST(), positionAlongPath(), stepMinutesOf(), locationAtHex(), parseTravelPath(), PositionCard, resolveCharacterPosition()

### Community 90 - "useConfirm"
Cohesion: 0.07
Nodes (38): FORMATS, CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant (+30 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.08
Nodes (28): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, CommunityBoardWidget() (+20 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.06
Nodes (49): GET(), Params, POST(), GET(), GET(), POST(), DELETE(), displayNameOf() (+41 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.05
Nodes (32): MonthlyContests, Props, YearlyContests, EventsTabs(), TabItem, TabPanel(), Tabs(), TabsProps (+24 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.10
Nodes (19): Props, CustomBadgeDisplay, Props, Tab, TABS, ProfileQuestEntry, ProfileTournamentParticipationEntry, ProfileRecentEventEntry (+11 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.29
Nodes (7): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.ts, **/*.tsx, include

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.21
Nodes (11): BASE_Z, CATALOG_PATH, CATEGORIES, CHAR_PACKS, hex(), main(), OUT, SKIN_SRC (+3 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.07
Nodes (33): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+25 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.10
Nodes (17): ACCENT_CLASSES, PACK_INFO, PACK_ORDER, PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE (+9 more)

### Community 100 - "adapters.ts"
Cohesion: 0.48
Nodes (6): revokePointsByReason(), applyMatchResult(), ApplyMatchResultInput, finalFinalistReason(), finalWinReason(), loserOf()

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 102 - "recurrence.ts"
Cohesion: 0.47
Nodes (4): POST(), ALL_CATEGORIES, ALL_GENRES, recomputeWanderpocalHolders()

### Community 103 - "isVideoUrl"
Cohesion: 0.03
Nodes (76): RULES, AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, CardRow (+68 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.16
Nodes (16): GET(), GET(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee(), updateEventStatus(), authHeader(), DiscordEmbed (+8 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.20
Nodes (20): checkpointVoice(), createStubUser(), findUser(), handleMemberJoin(), provisionCard(), trackInvite(), trackMessage(), trackReaction() (+12 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.12
Nodes (21): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+13 more)

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.05
Nodes (45): GET(), GET(), POST(), GET(), DELETE(), PATCH(), DELETE(), POST() (+37 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.50
Nodes (4): ago(), Chronicle(), Entry, ICON

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.16
Nodes (16): POST(), requestSchema, DndPage(), metadata, DndHome(), CharacterPanel(), getHeroSetup(), HeroSetup (+8 more)

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.08
Nodes (38): EventWinnerPredictionWidget(), Prediction, uname(), UserLite, RankTile(), AvatarUser, cache, flush() (+30 more)

### Community 111 - "skins/types.ts"
Cohesion: 0.21
Nodes (15): GET(), POST(), GET(), OptionInput, POST(), POST(), createNotificationForUsers(), dispatchPush() (+7 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.16
Nodes (18): POST(), ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, runSeasonUpdate(), buildSeasonInputs(), runFullSeasonUpdate(), RunSeasonResult, markPreSeasonRan() (+10 more)

### Community 118 - "report-event-facts.ts"
Cohesion: 0.07
Nodes (26): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+18 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "TextsClient.tsx"
Cohesion: 0.24
Nodes (15): LOGO_POSITIONS, StudioEditor(), ImageDown, drawLogo(), drawWatermark(), loadImage(), LogoPosition, prepareUploadImage() (+7 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), StatusEntry, AdsTarget, ampCall(), AmpInstance, callWithSession() (+15 more)

### Community 124 - "ServerCard.tsx"
Cohesion: 0.29
Nodes (11): POST(), GET(), POST(), answerInterview(), createInterview(), declineInterview(), InterviewResult, listMyInterviews() (+3 more)

### Community 126 - "series/[id]/complete/route.ts"
Cohesion: 0.18
Nodes (13): buildSegments(), DailySpin(), PALETTE_BY_TYPE, pt(), rimPath(), segPath(), splitLabel(), useMidnightCountdown() (+5 more)

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.07
Nodes (29): BattleCardsTabsInner(), DND_LINK_TAB, isTabKey(), TabKey, TABS, BattleLauncher(), Mode, RankRow() (+21 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "ThemeProvider.tsx"
Cohesion: 0.22
Nodes (5): Content, Loc, Quest, Row, STATUS

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.15
Nodes (23): GET(), isAuthorized(), GEMS_DIFFICULTIES, POST(), formatStart(), GET(), announceEventResults(), announceNewEvent() (+15 more)

### Community 132 - "widget/events/route.ts"
Cohesion: 0.24
Nodes (9): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), POST(), DISCORD_COLORS, createPollsForEvent(), parsePollsConfigJson() (+1 more)

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 138 - "DuelDeckEditor.tsx"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 139 - "widget/events/route.ts"
Cohesion: 0.05
Nodes (47): EventCardLink(), metadata, russoOne, spaceGrotesk, viewport, BottomNav(), NAV, CursorGlow() (+39 more)

### Community 140 - "ThemeProvider.tsx"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.08
Nodes (30): average(), GET(), POST(), VALID_DIFFICULTIES, BattleChallengeWidget(), ChallengeItem, ChallengesList(), ChallengeUser (+22 more)

### Community 142 - "three"
Cohesion: 0.06
Nodes (36): BattleCardsLogo(), ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS (+28 more)

### Community 143 - "season-config.ts"
Cohesion: 0.21
Nodes (5): Health, JobTexts, Info, JobIcon(), JOB_ICONS

### Community 144 - "sync-discord-roles/route.ts"
Cohesion: 0.43
Nodes (6): GET(), POST(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole()

### Community 145 - "promotion-request-service.ts"
Cohesion: 0.38
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 147 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.11
Nodes (21): SteamGameResult, GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props (+13 more)

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 152 - "[matchId]/route.ts"
Cohesion: 0.52
Nodes (4): POST(), POST(), advanceDndQuestObjectiveForUser(), updateQuestProgress()

### Community 153 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 154 - "ImageCropTool.tsx"
Cohesion: 0.29
Nodes (6): centeredRect(), Handle, ImageCropTool(), PRESETS, Rect, Crop

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 159 - "grantPack"
Cohesion: 0.12
Nodes (23): GET(), PATCH(), POST(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage() (+15 more)

### Community 160 - "widget/events/[id]/route.ts"
Cohesion: 0.03
Nodes (32): DEFAULTS, RULES, RuleSeed, POST(), POST(), requestSchema, GET(), isAuthorized() (+24 more)

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 163 - "HeroStatValue.tsx"
Cohesion: 0.11
Nodes (26): curve(), curvePercent(), STANDARD_CARDS, StandardCardSeed, GET(), isAuthorized(), POST(), toJson() (+18 more)

### Community 164 - "daily-poll/[id]/vote/route.ts"
Cohesion: 0.12
Nodes (16): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+8 more)

### Community 167 - "generate-brand-assets.ts"
Cohesion: 0.40
Nodes (3): OUT_DIR, PNG_SIZES, SOURCE

### Community 172 - "Kapitel-Hintergründe — Kampagne"
Cohesion: 0.50
Nodes (3): Benötigte Dateien, Format, Kapitel-Hintergründe — Kampagne

## Knowledge Gaps
- **1151 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1146 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `report/[id]/page.tsx` to `roles.ts`, `series/[id]/complete/route.ts`, `coach-service.ts`, `time.ts`, `getSessionUser`, `RankedAvatar.tsx`, `duel-live-battle.ts`, `(dashboard)/leaderboard/page.tsx`, `BattleCardView.tsx`, `requireModeratorOrEventSquadCaptain`, `widget/events/[id]/route.ts`, `packs.ts`, `community-job-config.ts`, `job-recommendations.ts`, `JobBadge.tsx`, `discord-rest.ts`, `BattleLogEntry`, `EventEditClient.tsx`, `revert-event-completion.ts`, `formatBerlinTime`, `SeriesIcon.tsx`, `[id]/settings/SettingsClient.tsx`, `AdminEventsClient.tsx`, `ClipVotingClient.tsx`, `(dashboard)/events/page.tsx`, `MarkdownLite.tsx`, `admin/community-jobs/disputes/route.ts`, `studio-templates.ts`, `GamePlayersModal.tsx`, `upload/route.ts`, `ServerCard.tsx`, `series/[id]/complete/route.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `[id]/settings/SettingsClient.tsx` to `roles.ts`, `time.ts`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `duel-live-battle.ts`, `CommunityJobsAdminPanel.tsx`, `MobaIcon.tsx`, `(dashboard)/leaderboard/page.tsx`, `ProfileMobileView.tsx`, `board-match3.ts`, `gameservers.ts`, `MobaIcon`, `community-job-config.ts`, `JobBadge.tsx`, `auth.ts`, `FotografTools.tsx`, `skill-pool.ts`, `GameNameInput.tsx`, `formatBerlinTime`, `SeriesIcon.tsx`, `ProfileOverlayClient.tsx`, `AdminEventsClient.tsx`, `ConfirmDialog.tsx`, `bot/index.ts`, `useConfirm`, `apply-season-results.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `prisma.ts`, `ranked-season.ts`, `widget/events/route.ts`, `DuelDeckEditor.tsx`, `ThemeProvider.tsx`, `series-event-points.ts`, `duels-live.ts`, `sync-discord-roles/route.ts`, `promotion-request-service.ts`, `new-season/page.tsx`, `grantPack`, `widget/events/[id]/route.ts`, `clip-contest.ts`, `gameservers.ts`, `community-job-config.ts`, `podium/[id]/route.tsx`, `BattleLogEntry`, `EventEditClient.tsx`, `revert-event-completion.ts`, `skill-pool.ts`, `EmptyState.tsx`, `hasMinRole`, `AdminEventsClient.tsx`, `recurrence.ts`, `isVideoUrl`, `photo-request-service.ts`, `report/[id]/page.tsx`, `skins/types.ts`, `ThemeProvider.tsx`, `AdminDonationsClient.tsx`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03474903474903475 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14624505928853754 - nodes in this community are weakly interconnected._
- **Should `live-battle.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1096938775510204 - nodes in this community are weakly interconnected._