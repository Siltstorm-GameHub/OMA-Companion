# Graph Report - OMA-Companion  (2026-09-25)

## Corpus Check
- 994 files · ~3,173,424 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4920 nodes · 13328 edges · 210 communities (174 shown, 36 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b0dbb46e`
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
- AdminNav.tsx
- VictoryChestReveal.tsx
- upload/route.ts
- TextsClient.tsx
- duels/[id]/respond/route.ts
- AdminDonationsClient.tsx
- ServerCard.tsx
- CommunityBoardWidget.tsx
- ServerCard.tsx
- promotion-request-service.ts
- process-badge-art.ts
- ThemeProvider.tsx
- DashboardChrome.tsx
- series/[id]/complete/route.ts
- react
- overlay/[id]/page.tsx
- react-dom
- Product
- GuildHub – Discord Companion
- [tacticCardId]/route.ts
- sharp
- widget/events/route.ts
- sonner
- StarterPickFlow.tsx
- three
- @types/canvas-confetti
- tank
- requireModeratorOrSquadCaptain
- notifications.ts
- bear
- @types/three
- middleware.ts
- discord-roles.ts
- new-season/page.tsx
- updateQuestProgress
- PollOptionGameInput.tsx
- zod
- Monster-Artwork — Edelstein-Kampf
- next-auth
- postprocessing
- SeasonConfigPanel.tsx
- @prisma/client
- preferences/route.ts
- react
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- react-dom
- sharp
- FloatingLobbyChat.tsx
- generate-brand-assets.ts
- sonner
- three
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- @types/canvas-confetti
- @types/three
- web-push
- UserRoleManager.tsx
- zod
- chroma-key.js
- battle-cards/layout.tsx
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- bot-runner.mjs
- eslint.config.mjs
- lineup/route.ts
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
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts
- `StandardCardSeed` --references--> `ActiveSkillData`  [EXTRACTED]
  prisma/battle-cards-seed-data.ts → src/lib/battle-engine/types.ts

## Import Cycles
- None detected.

## Communities (210 total, 36 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (62): POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET(), DELETE() (+54 more)

### Community 1 - "prisma.ts"
Cohesion: 0.04
Nodes (82): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+74 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.08
Nodes (38): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), COIN_SOURCES, PointsInfoModal() (+30 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.19
Nodes (14): DELETE(), PATCH(), DELETE(), displayNameOf(), PATCH(), UserLite, userSummary(), revokePointsByReason() (+6 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.05
Nodes (40): Badge, CATEGORIES, CATEGORY_LABELS, User, Contest, ContestManager(), MONTH_NAMES, Nomination (+32 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.12
Nodes (38): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog(), beginTrapCheck() (+30 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.12
Nodes (27): POST(), PublicProfilePage(), ProfilePage(), FotografPortfolio(), Clock, MessageSquare, IdeaPortfolio(), EventReportsSection() (+19 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.08
Nodes (47): actionSchema, DUEL_STANCES, POST(), GET(), average(), GET(), POST(), VALID_DIFFICULTIES (+39 more)

### Community 8 - "interactive.ts"
Cohesion: 0.10
Nodes (61): AvailableAction, LiveSnapshot, LiveBattleAwaiting, LiveBattleSnapshot, BoardGrid, SpecialGrid, SwapMove, LEVEL_STAT_MULTIPLIER (+53 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.05
Nodes (62): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+54 more)

### Community 10 - "time.ts"
Cohesion: 0.09
Nodes (29): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+21 more)

### Community 11 - "getSessionUser"
Cohesion: 0.10
Nodes (31): GET(), POST(), GET(), DELETE(), PATCH(), DELETE(), POST(), GET() (+23 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (59): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+51 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.10
Nodes (28): DELETE(), PATCH(), POST(), POST(), CATEGORIES, EventSetupWizard(), inputStyle, PlacementReward (+20 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.07
Nodes (43): PATCH(), patchSchema, PATCH(), requestSchema, DndCharacterRow, DndLocationRow, TYPE_LABEL, WorldMap() (+35 more)

### Community 16 - "ranks.ts"
Cohesion: 0.12
Nodes (26): BracketView(), Match, Participant, roundLabel(), uname(), User, Props, WanderpocalBadge() (+18 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.08
Nodes (20): Badge, ProfileJobBadge(), CustomBadgeDisplay, Props, Tab, TABS, ProfileQuestEntry, ProfileTournamentParticipationEntry (+12 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (41): VfxEvent, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction (+33 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.11
Nodes (18): GameserverWidget(), Server, ServerRow(), Light, LIGHT_COLOR, LIGHT_LABEL, Server, ServerCard() (+10 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.09
Nodes (24): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+16 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.11
Nodes (17): ActivityFeed(), cleanReason(), Filter, Tx, txType(), AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES (+9 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.09
Nodes (18): ACTIVITY_TIER_ICON, BattleCardSkill, BattleCardView(), LEVEL_BORDER, UnitSlot(), LineupStrip(), GemBeamOverlay(), CardWithId (+10 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.12
Nodes (21): GET(), api(), AreaKey, FoundUser, GameInfo, IdeaForm(), IdeaPrefill, MediaAsset (+13 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.16
Nodes (20): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), LogOut, MessageCircleMore (+12 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.07
Nodes (69): POST(), GET(), POST(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST() (+61 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.26
Nodes (16): CampaignLevelDef, AFK_FARMER, GRIEFER_IMP, LAG_SPIKE, LOOT_GOBLIN, PAY2WIN_TRUHE, RAGE_QUIT_CONTROLLER, SEASON_PASS_DRACHE (+8 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.11
Nodes (36): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), GET(), isAuthorized(), GEMS_DIFFICULTIES, POST() (+28 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.16
Nodes (24): POST(), toJson(), ABILITY_KEYS, AbilityScores, clampToBaseline(), CLASS_SPEED_MIDPOINT, deriveBaseStats(), DerivedStats (+16 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.12
Nodes (15): PACK_KIND_INFO, PACK_KIND_ORDER, ShopConfigPanel(), TYPE_LABEL, ACCENT_CLASSES, PACK_INFO, PACK_ORDER, Package (+7 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.06
Nodes (31): buildFfaRanking(), buildMatchRanking(), cornerStyle(), displayName(), ElementContent(), elementPositionStyle(), ElementSlot, formatEntryStats() (+23 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.11
Nodes (25): POST(), POST(), GET(), PATCH(), POST(), GET(), GET(), GET() (+17 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.20
Nodes (20): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), formatStart() (+12 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.19
Nodes (11): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, GemsResultScreen(), GemsReward, Flame (+3 more)

### Community 36 - "packs.ts"
Cohesion: 0.11
Nodes (28): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), ShoppingBag, CHEST_TABLE, ChestPrize, grantGemsPvpVictoryChest() (+20 more)

### Community 37 - "MobaIcon"
Cohesion: 0.12
Nodes (24): GET(), POST(), DELETE(), DELETE(), DELETE(), AuditActor, deleteComment(), AUTHOR (+16 more)

### Community 38 - "types.ts"
Cohesion: 0.25
Nodes (12): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), listMyPhotoRequests(), listOpenPhotoRequests() (+4 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.07
Nodes (45): GET(), PUT(), requestSchema, POST(), serializeDrawResult(), GET(), DuelDeckPage(), metadata (+37 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.08
Nodes (33): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleStatsPanel(), StoredBattleLog, computeBattleStats() (+25 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.23
Nodes (7): RANK_STYLE, LeaderboardTabs(), Tab, TABS, getCombinedElo(), getBattleCardsLeaderboard(), LeaderboardRow

### Community 42 - "community-job-config.ts"
Cohesion: 0.04
Nodes (91): APPLY, main(), PATCH(), GET(), GET(), POST(), GET(), GET() (+83 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.11
Nodes (35): berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames(), getDismissedItemKeys() (+27 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), StatusEntry, AdsTarget, ampCall(), AmpInstance, callWithSession() (+15 more)

### Community 45 - "auth.ts"
Cohesion: 0.14
Nodes (17): SeriesOption, ConfirmDialog(), ConfirmDialogProps, ConfirmOptions, ConfirmState, EMPTY_STATE, Settings2, Modal() (+9 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.06
Nodes (38): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+30 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.07
Nodes (38): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+30 more)

### Community 49 - "amp.ts"
Cohesion: 0.06
Nodes (43): DELETE(), POST(), GET(), POST(), GET(), GET(), IdeaPage(), ReportPage() (+35 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.13
Nodes (15): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, AdminLayout(), DailyPollActionBadge() (+7 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.15
Nodes (27): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+19 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.14
Nodes (18): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+10 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.11
Nodes (25): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+17 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.13
Nodes (13): Props, WinnerClip, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount, Poll, PollCard() (+5 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.10
Nodes (24): POST(), POST(), DELETE(), POST(), awardPoints(), parsePlacementPts(), PATCH(), BracketMatch (+16 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.17
Nodes (17): GET(), isAuthorized(), POST(), GET(), withDndOverriddenFields(), DND_LOCATIONS, DndLocationDef, ensureDndWorldSeeded() (+9 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.04
Nodes (61): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+53 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (25): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+17 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.08
Nodes (37): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, SlotRow(), cell(), activationCellsFor() (+29 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.13
Nodes (22): GET(), loadProfileOverlayState(), NextEventTile(), GameCoverPicker(), PickedGameCover, CoverBrandBadge(), EventCoverDefault(), dynamicCache (+14 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.20
Nodes (14): GET(), GET(), isAuthorized(), findGemsMonsterTemplate(), finalizeDueGemsTournaments(), GemsTournamentSummary, generateGemsTournamentBossTeam(), getCurrentGemsTournament() (+6 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.05
Nodes (45): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward, PLATFORMS (+37 more)

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): @auth/prisma-adapter, discord.js, gamedig, @google/generative-ai, motion, next, dependencies, @auth/prisma-adapter (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.18
Nodes (15): isAuthorized(), isOverridden(), POST(), toJson(), isAuthorized(), POST(), isAuthorized(), POST() (+7 more)

### Community 67 - "hasMinRole"
Cohesion: 0.16
Nodes (12): GET(), PATCH(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage(), DEFAULTS, getMinigamesConfig() (+4 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.17
Nodes (13): GET(), isAuthorized(), CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), CATEGORY_LABELS, DAILY_CAPS, POINT_RULES (+5 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (18): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+10 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.19
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.17
Nodes (14): Avatar(), EventTippsList(), Tipp, uname(), UserLite, EventWinnerPredictionWidget(), Prediction, uname() (+6 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.28
Nodes (11): GET(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), generateBrandedCoverDataUri(), getGradientBackground() (+3 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.11
Nodes (17): metadata, ABILITY_LABEL, ABILITY_SCORE_CANDIDATES, ABILITY_STEPS, CharacterCreation(), Phase, RolledCard, RollingReveal() (+9 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.07
Nodes (28): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, ClipVotingClient(), Nomination, Props (+20 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.09
Nodes (32): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, TournamentDetailPage() (+24 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.07
Nodes (29): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+21 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.10
Nodes (24): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+16 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.19
Nodes (14): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), DEFAULT_SEASON_REWARD_CONFIG (+6 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.31
Nodes (10): POST(), GET(), POST(), answerInterview(), createInterview(), declineInterview(), InterviewResult, listMyInterviews() (+2 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.06
Nodes (38): PayoutsClient(), Preview, Run, Week, AdminApplication, AdminDispute, AdminMember, api() (+30 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.07
Nodes (52): GET(), PATCH(), PATCH(), GET(), PATCH(), PATCH(), POST(), GET() (+44 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.12
Nodes (16): MonthlyContests, Props, YearlyContests, TabItem, TabPanel(), Tabs(), TabsProps, displayName() (+8 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.08
Nodes (28): api(), Idea, IdeasBoardClient(), AuditClient(), Entry, IdeaList(), api(), GameCard() (+20 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.19
Nodes (14): POST(), GET(), DEFAULT_SCENE, getLocationScene(), LOCATION_SCENES, LocationSceneDef, spawnPointFor(), ensureDndStoryContentSeeded() (+6 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.45
Nodes (8): POST(), POST(), getDailyDuelCount(), getDailyWageredTotal(), isExpired(), isPairOnCooldown(), startOfToday(), isMinigameEnabled()

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.38
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 90 - "useConfirm"
Cohesion: 0.29
Nodes (8): main(), DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled(), NotificationType, PREF_KEY

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.08
Nodes (29): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, CommunityBoardWidget() (+21 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.22
Nodes (7): CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS, ErrorNotice(), AlertCircle, Star

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.11
Nodes (35): computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue(), getArenaBackgroundStyle(), hpBarColor(), LiveBattleBody() (+27 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.03
Nodes (66): RULES, BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample() (+58 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.19
Nodes (17): BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), countUnopenedPacks(), grantGuaranteedPack(), peekNextPackKind(), findOwnCommunityCardId() (+9 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.29
Nodes (6): centeredRect(), Handle, ImageCropTool(), PRESETS, Rect, Crop

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.10
Nodes (24): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+16 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.22
Nodes (6): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap, LifeBuoy

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.24
Nodes (7): POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, VoteKind, VoteOwnerLookup

### Community 102 - "recurrence.ts"
Cohesion: 0.07
Nodes (30): FullStandingsToggle(), Props, StandingRow, StandingUser, ArchivedSeason, FORMAT_LABELS, LegacyRow, Avatar() (+22 more)

### Community 103 - "isVideoUrl"
Cohesion: 0.43
Nodes (6): eventSelect, FINISHED_STATUSES, GET(), RELEVANT_STATUSES, sortSeriesEvents(), toWidgetEvent()

### Community 104 - "studio-templates.ts"
Cohesion: 0.31
Nodes (10): applyTierJumpLimit(), computePercentiles(), computeSeasonResults(), hashSeed(), MemberSeasonResult, resolveClass(), TIER_MULTIPLIER, TIER_ORDER (+2 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.22
Nodes (18): checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction(), trackVoice(), client (+10 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.13
Nodes (21): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), GET() (+13 more)

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.04
Nodes (60): GET(), GET(), GET(), GET(), GET(), POST(), GET(), GET() (+52 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.24
Nodes (4): Health, JobTexts, JobIcon(), JOB_ICONS

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.35
Nodes (10): softResetRating(), addMonthsUTC(), getCurrentSeasonNumber(), getSeasonWindow(), grantDueSeasonRewards(), grantPlacementReward(), grantSeasonEndRewards(), SeasonWindow (+2 more)

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.24
Nodes (11): GET(), PATCH(), POST(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage() (+3 more)

### Community 111 - "skins/types.ts"
Cohesion: 0.29
Nodes (5): AlbumPage(), AssetGrid(), EventGallerySection(), GridAsset, VISIBLE

### Community 112 - "BadgesSection.tsx"
Cohesion: 0.20
Nodes (10): CustomBadgeDisplay, Props, BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART (+2 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.21
Nodes (12): ANIMS, CATALOG_PATH, CATEGORIES, CategoryDef, CROP, cropSheet(), main(), OUT_DIR (+4 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.24
Nodes (14): GET(), PATCH(), patchSchema, GET(), isAuthorized(), hardResetAllElo(), resetAllCampaignProgress(), resetAllCardOwnership() (+6 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.12
Nodes (18): GET(), GET(), isAuthorized(), formatDate(), SeasonConfigPanel(), toDateInputValue(), Interview, InterviewClient() (+10 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.48
Nodes (5): finalizePvpChallengeSideEffects(), applyAttackerOnlyWinStreak(), applyWinStreak(), winStreakBonusFor(), WinStreakUpdate

### Community 118 - "AdminNav.tsx"
Cohesion: 0.09
Nodes (20): GET(), AssetOption, buildEventTemplate(), EventOption, FoundUser, InterviewOption, PostOption, ReportEditorInitial (+12 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "TextsClient.tsx"
Cohesion: 0.22
Nodes (8): Download, Menu, Share, BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.20
Nodes (13): POST(), ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, CLASS_BASE_STATS, isOverridden(), runSeasonUpdate(), toJson(), buildSeasonInputs() (+5 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.20
Nodes (15): GET(), GET(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee(), updateEventStatus(), authHeader(), DiscordEmbed (+7 more)

### Community 124 - "ServerCard.tsx"
Cohesion: 0.29
Nodes (9): POST(), POST(), notifyPvpBattleResolved(), advanceDndQuestObjective(), advanceDndQuestObjectiveForUser(), DND_QUESTS, ensureDndQuestsSeeded(), rewardDndQuest() (+1 more)

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.43
Nodes (6): GET(), POST(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole()

### Community 126 - "ServerCard.tsx"
Cohesion: 0.33
Nodes (3): Anomalies, AnomaliesClient(), Person

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.06
Nodes (29): SteamGameResult, GamePlayer, GET(), CardRow, AdminTacticCardsPage(), TacticCardRow, TacticCardsAdmin(), RARITIES (+21 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "ThemeProvider.tsx"
Cohesion: 0.25
Nodes (11): YearReviewPage(), checkAndAwardBadges(), loadStats(), BADGE_DEFS, BadgeDef, BadgeStats, findNewlyEarnedBadges(), getBadgeDef() (+3 more)

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.16
Nodes (16): POST(), POST(), GET(), POST(), GET(), POST(), collectYearlyNominations(), finalizeYearlyContest() (+8 more)

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.22
Nodes (15): GET(), POST(), GET(), OptionInput, POST(), POST(), createNotificationForUsers(), dispatchDiscordDm() (+7 more)

### Community 132 - "react"
Cohesion: 0.40
Nodes (4): DesktopProfileTabs(), Tab, Briefcase, LayoutGrid

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "react-dom"
Cohesion: 0.60
Nodes (4): PickerGrid(), uname(), User, UserPickerSheet()

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
Cohesion: 0.08
Nodes (25): EventCardLink(), DashboardLayout(), DiscordLoginButton(), Props, GateButton(), GateLink(), GateOptions, GuestBanner() (+17 more)

### Community 140 - "sonner"
Cohesion: 0.20
Nodes (6): metadata, RouteOption, SceneData, SceneEventLogEntry, ScenePresentCard, ArrowLeft

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.09
Nodes (25): BattleChallengeWidget(), ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge(), ChallengeUserPicker(), uname() (+17 more)

### Community 142 - "three"
Cohesion: 0.07
Nodes (32): BattleCardsTabsInner(), DND_LINK_TAB, isTabKey(), TabKey, TABS, BattleLauncher(), Mode, RankRow() (+24 more)

### Community 144 - "tank"
Cohesion: 0.18
Nodes (13): POST(), requestSchema, LineupPage(), metadata, LineupEditor(), grantStarterPick(), hasStarterDeck(), REQUIRED_CLASSES (+5 more)

### Community 146 - "notifications.ts"
Cohesion: 0.08
Nodes (40): GET(), POST(), POST(), POST(), DELETE(), PATCH(), DELETE(), POST() (+32 more)

### Community 148 - "@types/three"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "discord-roles.ts"
Cohesion: 0.12
Nodes (28): RankTile(), cache, flush(), inflight, isFresh(), JobBadge(), JobBadgeProps, listeners (+20 more)

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 152 - "updateQuestProgress"
Cohesion: 0.12
Nodes (16): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+8 more)

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 158 - "SeasonConfigPanel.tsx"
Cohesion: 0.14
Nodes (21): GET(), GET(), isAuthorized(), calcStreak(), GET(), GET(), POST(), MONTH_NAMES (+13 more)

### Community 160 - "preferences/route.ts"
Cohesion: 0.03
Nodes (23): GameSuggestion, DEFAULT_PREFS, GET(), POST(), displayNameOf(), POST(), UserLite, userSummary() (+15 more)

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

### Community 188 - "lineup/route.ts"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 195 - "backstory.ts"
Cohesion: 0.40
Nodes (5): generateBackstory(), HOOKS, OPENERS, ORIGINS, pick()

### Community 254 - "ScoreBreakdownBlock.tsx"
Cohesion: 0.36
Nodes (7): Breakdown, fmt(), ScoreBreakdownBlock(), signed(), StreamResult, Week, Scale

### Community 270 - "[contribId]/route.ts"
Cohesion: 0.05
Nodes (80): DELETE(), PATCH(), POST(), GET(), POST(), POST(), POST(), DELETE() (+72 more)

### Community 274 - "HeroStatValue.tsx"
Cohesion: 0.05
Nodes (57): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+49 more)

## Knowledge Gaps
- **1105 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1100 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `report/[id]/page.tsx` to `roles.ts`, `ThemeProvider.tsx`, `DashboardChrome.tsx`, `prisma.ts`, `app/layout.tsx`, `coach-service.ts`, `getSessionUser`, `[contribId]/route.ts`, `duels-live.ts`, `notifications.ts`, `HeroStatValue.tsx`, `MobaIcon.tsx`, `ProfileMobileView.tsx`, `requireModeratorOrEventSquadCaptain`, `SeasonConfigPanel.tsx`, `packs.ts`, `MobaIcon`, `types.ts`, `community-job-config.ts`, `amp.ts`, `DailyPollBanner.tsx`, `BattleLogEntry`, `dashboard/page.tsx`, `admin/events/[id]/complete/route.ts`, `formatBerlinTime`, `SeriesIcon.tsx`, `AdminEventsClient.tsx`, `ClipVotingClient.tsx`, `MarkdownLite.tsx`, `admin/community-jobs/disputes/route.ts`, `recurrence.ts`, `skins/types.ts`, `AdminNav.tsx`, `upload/route.ts`, `AdminDonationsClient.tsx`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `DashboardChrome.tsx`, `ranked-season.ts`, `series/[id]/complete/route.ts`, `app/layout.tsx`, `[tacticCardId]/route.ts`, `time.ts`, `series-event-points.ts`, `duels-live.ts`, `RankedAvatar.tsx`, `@types/three`, `new-season/page.tsx`, `requireModeratorOrEventSquadCaptain`, `shop-config.ts`, `clip-contest.ts`, `JobBadge.tsx`, `CoinIcon.tsx`, `revert-event-completion.ts`, `hasMinRole`, `SeriesIcon.tsx`, `community-job-payout/route.ts`, `ClipVotingClient.tsx`, `EventAdminRow.tsx`, `apply-season-results.ts`, `photo-request-service.ts`, `report/[id]/page.tsx`, `useServerLiveStatus.ts`, `ThemeProvider.tsx`, `duels/[id]/respond/route.ts`, `CommunityBoardWidget.tsx`, `promotion-request-service.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `app/layout.tsx` to `prisma.ts`, `fotograf-service.ts`, `coach-service.ts`, `time.ts`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `duel-live-battle.ts`, `HeroStatValue.tsx`, `MobaIcon.tsx`, `board-match3.ts`, `community-job-config.ts`, `auth.ts`, `FotografTools.tsx`, `amp.ts`, `SeriesDetailClient.tsx`, `community-board-comment-service.ts`, `dashboard/page.tsx`, `formatBerlinTime`, `SeriesIcon.tsx`, `tutorial.ts`, `ProfileOverlayClient.tsx`, `ConfirmDialog.tsx`, `bot/index.ts`, `EventSetupWizard.tsx`, `skins/types.ts`, `report/[id]/page.tsx`, `AdminNav.tsx`, `ScoreBreakdownBlock.tsx`, `ServerCard.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1105 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02909539763710104 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0351008215085885 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._