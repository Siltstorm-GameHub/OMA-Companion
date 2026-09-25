# Graph Report - OMA-Companion  (2026-09-25)

## Corpus Check
- 1015 files · ~3,664,054 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5082 nodes · 13958 edges · 215 communities (180 shown, 35 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f21693e0`
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
- roadmap/page.tsx
- @types/three
- middleware.ts
- DashboardChrome.tsx
- new-season/page.tsx
- ImageCropTool.tsx
- card-content.ts
- series/[id]/complete/route.ts
- Monster-Artwork — Edelstein-Kampf
- GuestLockOverlay.tsx
- MobileTopBar.tsx
- [userId]/page.tsx
- grantPack
- preferences/route.ts
- seed-notification-rules.ts
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- daily-poll/[id]/vote/route.ts
- preferences/route.ts
- backfill-event-notification-flags.ts
- generate-brand-assets.ts
- lobby-cleanup/route.ts
- grant-tactic-cards-to-all/route.ts
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- discord.js
- HeroSetup.tsx
- UserRoleManager.tsx
- lucide-react
- chroma-key.js
- applyMatchResult.ts
- prisma
- @prisma/client
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- react-dom
- bot-runner.mjs
- eslint.config.mjs
- @react-three/drei
- @react-three/postprocessing
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
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts
- `runWeeklyPayout()` --indirect_call--> `member()`  [INFERRED]
  src/lib/community-job-service.ts → src/lib/season/season-engine.test.ts

## Import Cycles
- None detected.

## Communities (215 total, 35 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (59): POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET(), DELETE() (+51 more)

### Community 1 - "prisma.ts"
Cohesion: 0.07
Nodes (44): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+36 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.17
Nodes (17): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), getUpgradeEconomyConfig(), parseTable() (+9 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.11
Nodes (33): POST(), DndCharacterRow, DndLocationRow, formatDuration(), polygonPoints(), TYPE_LABEL, WorldMap(), Minus (+25 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.17
Nodes (17): makeRng(), npcLook(), Rect, StampDef, StampId, TileSheet, CAVE_WALL_TILES, GroundTheme (+9 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.10
Nodes (35): PATCH(), PATCH(), PATCH(), POST(), POST(), PATCH(), GET(), isAuthorized() (+27 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.08
Nodes (44): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, AvailableAction, LiveSnapshot, SlotRow() (+36 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.06
Nodes (83): actionSchema, DUEL_STANCES, POST(), GET(), LiveBattlePage(), metadata, LiveUnit, buildNpcDuelDeckInput() (+75 more)

### Community 8 - "interactive.ts"
Cohesion: 0.11
Nodes (52): hasAnyValidMove(), pickEnemyForColumn(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate, candidateTargetIds() (+44 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.06
Nodes (57): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+49 more)

### Community 10 - "time.ts"
Cohesion: 0.06
Nodes (44): GET(), api(), Idea, IdeasBoardClient(), IdeaList(), api(), GameCard(), GameInfo (+36 more)

### Community 11 - "getSessionUser"
Cohesion: 0.04
Nodes (96): DELETE(), PATCH(), POST(), GET(), POST(), GET(), POST(), PATCH() (+88 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (44): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+36 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.09
Nodes (35): GET(), GET(), isAuthorized(), GET(), isAuthorized(), calcStreak(), GET(), GET() (+27 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.12
Nodes (20): DELETE(), DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES (+12 more)

### Community 16 - "ranks.ts"
Cohesion: 0.12
Nodes (27): BracketView(), Match, Participant, roundLabel(), uname(), User, Props, WanderpocalBadge() (+19 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.07
Nodes (33): DesktopProfileTabs(), Tab, PublicProfilePage(), ProfilePage(), Badge, ProfileJobBadge(), BattleChallengeWidget(), FotografPortfolio() (+25 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.06
Nodes (31): ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction, DuelAttackType (+23 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.08
Nodes (26): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+18 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.06
Nodes (37): ActivityFeed(), cleanReason(), Filter, Tx, txType(), AdminDonationsClient(), Donation, Expense (+29 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.09
Nodes (27): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+19 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.13
Nodes (19): main(), DISCORD_REASONS, GET(), isAuthorized(), CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), createNotification() (+11 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.09
Nodes (26): Anomalies, AnomaliesClient(), Person, api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox() (+18 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.20
Nodes (12): YearReviewPage(), CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS (+4 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.06
Nodes (76): POST(), GET(), POST(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST() (+68 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.10
Nodes (24): MonthlyContests, Props, YearlyContests, TabItem, Tabs(), TabsProps, displayName(), FloatingLobbyChat() (+16 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.26
Nodes (16): CampaignLevelDef, AFK_FARMER, GRIEFER_IMP, LAG_SPIKE, LOOT_GOBLIN, PAY2WIN_TRUHE, RAGE_QUIT_CONTROLLER, SEASON_PASS_DRACHE (+8 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.13
Nodes (28): POST(), toJson(), ABILITY_KEYS, AbilityScores, clampToBaseline(), CLASS_SPEED_MIDPOINT, deriveBaseStats(), DerivedStats (+20 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.17
Nodes (18): GET(), IdeaPage(), ReportPage(), api(), ReportEditor(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData (+10 more)

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
Cohesion: 0.11
Nodes (22): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, Flame, isStoredBattleLog(), applyEloResult() (+14 more)

### Community 36 - "packs.ts"
Cohesion: 0.12
Nodes (24): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), ShoppingBag, asCardResult(), asTacticResult(), awardDrawnCard() (+16 more)

### Community 37 - "MobaIcon"
Cohesion: 0.14
Nodes (19): JobBadgeProps, useJobBadge(), RankedAvatarProps, RankRing(), RankRingProps, BADGE_LEVEL_THRESHOLDS, JOB_BADGE_META, JOB_LEVEL_TITLES (+11 more)

### Community 38 - "types.ts"
Cohesion: 0.04
Nodes (59): EventCard(), EventUser, Props, SeriesEventItem, STATUS_CFG, StreamingPartner, CompareProfilePage(), fetchUserData() (+51 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.06
Nodes (60): GET(), PUT(), requestSchema, PATCH(), requestSchema, POST(), VALID_DIFFICULTIES, POST() (+52 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.08
Nodes (35): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleStatsPanel(), StoredBattleLog, computeBattleStats() (+27 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.05
Nodes (53): BattleCardsTabsInner(), DND_LINK_TAB, isTabKey(), TabKey, TABS, TabPanel(), BattleLauncher(), Mode (+45 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.05
Nodes (63): APPLY, main(), GET(), POST(), GET(), POST(), GET(), GET() (+55 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.11
Nodes (34): berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames(), getDismissedItemKeys() (+26 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.12
Nodes (25): gamedig, gamedig, GET(), GET(), GET(), StatusEntry, AdsTarget, ampCall() (+17 more)

### Community 45 - "auth.ts"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.13
Nodes (33): bakeStatic(), drawQuarters(), drawStamp(), loadSheets(), Props, SHEET_FILES, SheetKey, Sheets (+25 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.19
Nodes (8): metadata, russoOne, spaceGrotesk, viewport, CursorGlow(), ExitAppGuard(), TRAP_STATE, SessionProvider()

### Community 48 - "FotografTools.tsx"
Cohesion: 0.07
Nodes (38): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+30 more)

### Community 49 - "amp.ts"
Cohesion: 0.20
Nodes (22): LiveBattleView(), beep(), getContext(), noiseBurst(), playCardRevealSound(), playCommunityBonusSound(), playCritSound(), playDamageSound() (+14 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.05
Nodes (49): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward, PLATFORMS (+41 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (28): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+20 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.13
Nodes (19): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+11 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.11
Nodes (25): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+17 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.21
Nodes (9): choose(), coastal(), neighbors(), pick(), Baut eine Hex-Weltkarte aus den Assets in ../Hex Map. Aufruf: python build_world, alle Dateien <prefix>NN.png (nur Ziffern hinter dem Prefix), terrain_of(), terrain_of_fixed() (+1 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.16
Nodes (15): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), AdminEventBracketPage(), revokePointsByReason() (+7 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.14
Nodes (22): GET(), POST(), DELETE(), DELETE(), AuditActor, AUTHOR, AuthorRow, authorSearch() (+14 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.03
Nodes (69): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+61 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (25): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+17 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.06
Nodes (37): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+29 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.06
Nodes (40): GET(), loadProfileOverlayState(), GameserverWidget(), Server, ServerRow(), ApplyButton(), Light, LIGHT_COLOR (+32 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.08
Nodes (41): metadata, BattleFigure(), Props, Crop, drawTeFrame(), FULL, imageCache, loadTeImage() (+33 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): @auth/prisma-adapter, canvas-confetti, @google/generative-ai, next, next-auth, dependencies, @auth/prisma-adapter, canvas-confetti (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.16
Nodes (16): GET(), isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, DND_LOCATIONS (+8 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.18
Nodes (15): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), ArrowRight (+7 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.19
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.09
Nodes (28): PATCH(), PATCH(), POST(), GET(), DELETE(), PATCH(), DELETE(), PATCH() (+20 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.17
Nodes (17): GET(), POST(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), generateBrandedCoverDataUri() (+9 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.21
Nodes (14): GET(), isAuthorized(), isAuthorized(), isOverridden(), POST(), toJson(), getSkillTemplate(), rollNewCharacterSheet() (+6 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.07
Nodes (27): ClipVotingClient(), Nomination, Props, ClipDesMonatsPage(), MONTH_NAMES, GalleryEntry, MONTH_NAMES, Nomination (+19 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.04
Nodes (65): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+57 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.05
Nodes (41): GET(), Badge, CATEGORIES, CATEGORY_LABELS, User, DailyMessagePanel(), defaultForm(), formatDate() (+33 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.26
Nodes (20): MapBuilder, Actor, TeMap, bergpass(), BUILDERS, cache, chatter(), chestTalk() (+12 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.12
Nodes (21): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+13 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.07
Nodes (35): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+27 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.21
Nodes (5): Health, JobTexts, Info, JobIcon(), JOB_ICONS

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.09
Nodes (25): PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS, ModerationItemDto, ModerationClient(), AuditClient() (+17 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.10
Nodes (36): GET(), PATCH(), GET(), PATCH(), PATCH(), GET(), PATCH(), GET() (+28 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.19
Nodes (15): DELETE(), POST(), DELETE(), POST(), DELETE(), POST(), handleCommunityJobReaction(), notifyVoteMilestone() (+7 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.22
Nodes (17): GET(), isAuthorized(), softResetRating(), addMonthsUTC(), getCurrentSeasonNumber(), getSeasonWindow(), grantDueSeasonRewards(), grantPlacementReward() (+9 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.17
Nodes (18): POST(), POST(), GET(), positionAlongPath(), stepMinutesOf(), getWorldQuestStep(), ensureDndStoryContentSeeded(), STORY_TEMPLATES (+10 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.18
Nodes (13): CustomBadgeDisplay, Props, checkAndAwardBadges(), loadStats(), Badge, BADGE_CATEGORY_LABELS, BADGE_DEFS, BadgeDef (+5 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.18
Nodes (6): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap, LifeBuoy

### Community 90 - "useConfirm"
Cohesion: 0.14
Nodes (16): SteamGameResult, GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props (+8 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.09
Nodes (26): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, CommunityBoardWidget() (+18 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.04
Nodes (26): GameSuggestion, GET(), POST(), DELETE(), displayNameOf(), PATCH(), UserLite, userSummary() (+18 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.11
Nodes (23): VfxEvent, LiveDuelUnit, UltimateBurst, GemsResultScreen(), GemsReward, computeGemsReward(), describeLogEntry(), EFFECT_COLOR (+15 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.10
Nodes (17): CustomBadgeDisplay, Props, Tab, TABS, ProfileQuestEntry, ProfileTournamentParticipationEntry, Props, ProfileRecentEventEntry (+9 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.22
Nodes (7): buildSteps(), CardWithId, CLASS_CONFIG, CLASS_ORDER, ClassKey, StarterPickFlow(), StepDef

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.21
Nodes (11): BASE_Z, CATALOG_PATH, CATEGORIES, CHAR_PACKS, hex(), main(), OUT, SKIN_SRC (+3 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.10
Nodes (24): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+16 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.10
Nodes (16): ACCENT_CLASSES, PACK_INFO, PACK_ORDER, PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE (+8 more)

### Community 100 - "adapters.ts"
Cohesion: 0.19
Nodes (14): GET(), POST(), POST(), POST(), GET(), POST(), announceAndStore(), ASSET_TYPES (+6 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 102 - "recurrence.ts"
Cohesion: 0.10
Nodes (28): DELETE(), PATCH(), POST(), POST(), CATEGORIES, EventSetupWizard(), inputStyle, PlacementReward (+20 more)

### Community 103 - "isVideoUrl"
Cohesion: 0.09
Nodes (20): GET(), AssetOption, EventOption, FoundUser, InterviewOption, PostOption, ReportEditorInitial, Revision (+12 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.09
Nodes (29): POST(), requestSchema, DndPage(), metadata, ABILITY_LABEL, ABILITY_SCORE_CANDIDATES, ABILITY_STEPS, CharacterCreation() (+21 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.18
Nodes (20): GET(), isAuthorized(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction() (+12 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.16
Nodes (15): POST(), DELETE(), PUT(), GET(), GET(), POST(), AdminServersPage(), AmpSyncResult (+7 more)

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.04
Nodes (61): GET(), GET(), GET(), GET(), GET(), POST(), GET(), GET() (+53 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.31
Nodes (10): POST(), GET(), POST(), answerInterview(), createInterview(), declineInterview(), InterviewResult, listMyInterviews() (+2 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.13
Nodes (15): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, AdminLayout(), DailyPollActionBadge() (+7 more)

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.20
Nodes (14): GET(), GET(), isAuthorized(), findGemsMonsterTemplate(), finalizeDueGemsTournaments(), GemsTournamentSummary, generateGemsTournamentBossTeam(), getCurrentGemsTournament() (+6 more)

### Community 111 - "skins/types.ts"
Cohesion: 0.12
Nodes (16): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+8 more)

### Community 112 - "BadgesSection.tsx"
Cohesion: 0.20
Nodes (15): POST(), OPEN_EVENT_STATUS_FILTER, PATCH(), GEMS_DIFFICULTIES, POST(), POST(), AdminEventEditPage(), AdminSeriesDetailPage() (+7 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.16
Nodes (18): POST(), ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, runSeasonUpdate(), buildSeasonInputs(), runFullSeasonUpdate(), RunSeasonResult, markPreSeasonRan() (+10 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.16
Nodes (13): NORMAL_ATTACK_TARGET_RULE_MAP, tacticCardToDefinition(), activeSkillSchema, effectSchema, effectTargetSchema, InvalidSkillDataError, parseTacticEffects(), parseTacticTriggerCondition() (+5 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.12
Nodes (22): GET(), PATCH(), POST(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage() (+14 more)

### Community 118 - "report-event-facts.ts"
Cohesion: 0.03
Nodes (66): RULES, CardRow, CommunityCardsAdmin(), AdminCommunityCardsPage(), AdminTacticCardsPage(), TacticCardRow, TacticCardsAdmin(), AdminPage() (+58 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "TextsClient.tsx"
Cohesion: 0.43
Nodes (6): eventSelect, FINISHED_STATUSES, GET(), RELEVANT_STATUSES, sortSeriesEvents(), toWidgetEvent()

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.22
Nodes (10): EventCardLink(), GateButton(), GateLink(), GateOptions, GuestGateContext, GuestGateValue, GuestMoreCta(), useGuestGate() (+2 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.23
Nodes (12): GET(), isAuthorized(), formatStart(), GET(), announceEventResults(), fmtDateDE(), eventParticipationCoins(), formatLabel() (+4 more)

### Community 124 - "ServerCard.tsx"
Cohesion: 0.19
Nodes (16): POST(), POST(), POST(), QuestWorld(), notifyPvpBattleResolved(), advanceDndQuestObjective(), advanceDndQuestObjectiveForUser(), advanceWorldQuestStep() (+8 more)

### Community 125 - "notifications/page.tsx"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 126 - "series/[id]/complete/route.ts"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.10
Nodes (21): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+13 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "ThemeProvider.tsx"
Cohesion: 0.31
Nodes (8): awardPoints(), parsePlacementPts(), PATCH(), BracketMatch, generateBracket(), generateRoundRobin(), POST(), shuffle()

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.20
Nodes (13): POST(), POST(), PUT(), GET(), POST(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished() (+5 more)

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.10
Nodes (37): GET(), POST(), GET(), OptionInput, POST(), POST(), GET(), GET() (+29 more)

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "(dashboard)/layout.tsx"
Cohesion: 0.24
Nodes (6): DashboardLayout(), LeaderboardPage(), PartnerFooter(), Partner, NewsItem, isLinkPreviewBot()

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
Cohesion: 0.25
Nodes (6): DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, StatBadges(), TacticCardTileData, MOBA_ICON

### Community 139 - "widget/events/route.ts"
Cohesion: 0.17
Nodes (19): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), MessageCircleMore, ShieldCheck (+11 more)

### Community 140 - "ThemeProvider.tsx"
Cohesion: 0.31
Nodes (7): ThemedToaster(), Theme, ThemeContext, ThemeProvider(), useTheme(), ThemeToggle(), ThemeToggleItem()

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.05
Nodes (55): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, Avatar(), EventTippsList(), Tipp (+47 more)

### Community 142 - "three"
Cohesion: 0.09
Nodes (27): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+19 more)

### Community 143 - "season-config.ts"
Cohesion: 0.42
Nodes (7): GET(), PATCH(), patchSchema, getSeasonConfig(), KEYS, setEloHardResetAt(), setSeason1StartAt()

### Community 144 - "sync-discord-roles/route.ts"
Cohesion: 0.43
Nodes (6): GET(), POST(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole()

### Community 145 - "promotion-request-service.ts"
Cohesion: 0.46
Nodes (6): GET(), POST(), createPromotionRequest(), listOpenPromotionRequests(), PromotionResult, promotionStatusForCoach()

### Community 146 - "FotografGalleries.tsx"
Cohesion: 0.29
Nodes (5): AlbumPage(), AssetGrid(), EventGallerySection(), GridAsset, VISIBLE

### Community 147 - "roadmap/page.tsx"
Cohesion: 0.29
Nodes (6): IdeaRow(), Item, RoadmapPage(), Rocket, getRoadmap(), topIdeasBetween()

### Community 148 - "@types/three"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "DashboardChrome.tsx"
Cohesion: 0.29
Nodes (3): BackToTop(), GuestBanner(), GuestGateProvider()

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 152 - "ImageCropTool.tsx"
Cohesion: 0.29
Nodes (6): centeredRect(), Handle, ImageCropTool(), PRESETS, Rect, Crop

### Community 153 - "card-content.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, CardContentError, CardContentPatch, updateCardContent()

### Community 154 - "series/[id]/complete/route.ts"
Cohesion: 0.38
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 156 - "GuestLockOverlay.tsx"
Cohesion: 0.33
Nodes (5): DiscordLoginButton(), Props, GuestLockOverlay(), Props, Lock

### Community 157 - "MobileTopBar.tsx"
Cohesion: 0.33
Nodes (6): LogOut, Moon, Sun, MobileTopBar(), ROUTE_TITLES, useTheme()

### Community 158 - "[userId]/page.tsx"
Cohesion: 0.40
Nodes (5): ELEMENT_KEYS, parseLayout(), ProfileOverlayPage(), ProfileElementKey, ProfileLayoutPositions

### Community 159 - "grantPack"
Cohesion: 0.53
Nodes (5): CHEST_TABLE, ChestPrize, grantGemsPvpVictoryChest(), rollChestPrize(), grantPack()

### Community 160 - "preferences/route.ts"
Cohesion: 0.40
Nodes (3): RARITIES, STEP_LABELS, UpgradeEconomyPanel()

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

### Community 175 - "HeroSetup.tsx"
Cohesion: 0.33
Nodes (4): BattleCardsLogo(), CardWithId, INTRO, STEPS

## Knowledge Gaps
- **1120 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1115 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `report/[id]/page.tsx` to `roles.ts`, `prisma.ts`, `series/[id]/complete/route.ts`, `journalist-service.ts`, `(dashboard)/layout.tsx`, `coach-service.ts`, `time.ts`, `getSessionUser`, `duels-live.ts`, `RankedAvatar.tsx`, `promotion-request-service.ts`, `FotografGalleries.tsx`, `roadmap/page.tsx`, `MobaIcon.tsx`, `duel-live-battle.ts`, `BattleCardView.tsx`, `notify-dispatch.ts`, `shop-config.ts`, `packs.ts`, `types.ts`, `community-job-config.ts`, `dispatchNotification`, `DailyPollBanner.tsx`, `BattleLogEntry`, `EventEditClient.tsx`, `dashboard/page.tsx`, `GameNameInput.tsx`, `formatBerlinTime`, `SeriesIcon.tsx`, `ClipVotingClient.tsx`, `(dashboard)/events/page.tsx`, `adapters.ts`, `admin/community-jobs/disputes/route.ts`, `recurrence.ts`, `isVideoUrl`, `photo-request-service.ts`, `BadgesSection.tsx`, `GamePlayersModal.tsx`, `upload/route.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `prisma.ts`, `DashboardChrome.tsx`, `ranked-season.ts`, `series/[id]/complete/route.ts`, `[tacticCardId]/route.ts`, `series-event-points.ts`, `season-config.ts`, `sync-discord-roles/route.ts`, `@types/three`, `new-season/page.tsx`, `card-content.ts`, `series/[id]/complete/route.ts`, `clip-contest.ts`, `JobBadge.tsx`, `CoinIcon.tsx`, `revert-event-completion.ts`, `hasMinRole`, `admin/events/[id]/complete/route.ts`, `GameNameInput.tsx`, `events/series/[id]/page.tsx`, `[id]/settings/SettingsClient.tsx`, `ClipVotingClient.tsx`, `recurrence.ts`, `photo-request-service.ts`, `report/[id]/page.tsx`, `BadgesSection.tsx`, `ThemeProvider.tsx`, `getActiveMembership`, `report-event-facts.ts`, `promotion-request-service.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `community-job-payout/route.ts` to `roles.ts`, `prisma.ts`, `journalist-service.ts`, `time.ts`, `StarterPickFlow.tsx`, `duels-live.ts`, `CommunityJobsPanel.tsx`, `duel-live-battle.ts`, `FotografGalleries.tsx`, `CommunityJobsAdminPanel.tsx`, `MobaIcon.tsx`, `roadmap/page.tsx`, `ProfileMobileView.tsx`, `board-match3.ts`, `shop-config.ts`, `types.ts`, `tournament/[id]/page.tsx`, `community-job-config.ts`, `auth.ts`, `FotografTools.tsx`, `dispatchNotification`, `SeriesDetailClient.tsx`, `skill-pool.ts`, `community-board-comment-service.ts`, `SeriesIcon.tsx`, `[id]/settings/SettingsClient.tsx`, `ProfileOverlayClient.tsx`, `ConfirmDialog.tsx`, `apply-season-results.ts`, `recurrence.ts`, `isVideoUrl`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1120 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03026841804683038 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06676342525399129 - nodes in this community are weakly interconnected._
- **Should `live-battle.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11212121212121212 - nodes in this community are weakly interconnected._