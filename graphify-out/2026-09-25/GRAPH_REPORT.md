# Graph Report - OMA-Companion  (2026-09-25)

## Corpus Check
- 1029 files · ~3,676,365 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5174 nodes · 14288 edges · 199 communities (180 shown, 19 thin omitted)
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
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- UserRoleManager.tsx
- chroma-key.js
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- bot-runner.mjs
- eslint.config.mjs
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
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts
- `main()` --calls--> `createNotification()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/notifications.ts
- `main()` --calls--> `getCommunityJob()`  [EXTRACTED]
  scripts/fix-community-job-payouts.ts → src/lib/community-jobs.ts

## Import Cycles
- None detected.

## Communities (199 total, 19 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (74): POST(), POST(), DELETE(), GET(), PATCH(), POST(), GET(), PATCH() (+66 more)

### Community 1 - "prisma.ts"
Cohesion: 0.18
Nodes (14): GET(), UserLite, AdminEventCompletePage(), DEFAULT_POLL, DEFAULT_REWARDS, MultiPollConfig, parsePoll(), parseRewards() (+6 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.08
Nodes (34): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), RARITIES, STEP_LABELS (+26 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.11
Nodes (33): POST(), DndCharacterRow, DndLocationRow, formatDuration(), polygonPoints(), TYPE_LABEL, WorldMap(), EVEN_ROW (+25 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.07
Nodes (48): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+40 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.05
Nodes (32): Badge, CATEGORIES, CATEGORY_LABELS, User, CardRow, CommunityCardsAdmin(), AdminCommunityCardsPage(), TacticCardRow (+24 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.15
Nodes (24): activationCellsFor(), areAdjacent(), BoardResolveResult, cellCol(), cellRow(), enemySlotForColumn(), findHintMove(), findMatchGroups() (+16 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.12
Nodes (39): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog(), beginTrapCheck() (+31 more)

### Community 8 - "interactive.ts"
Cohesion: 0.10
Nodes (57): generateBoard(), hasAnyValidMove(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate, candidateTargetIds() (+49 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.05
Nodes (60): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+52 more)

### Community 10 - "time.ts"
Cohesion: 0.06
Nodes (58): GET(), POST(), DELETE(), PATCH(), POST(), GET(), POST(), GET() (+50 more)

### Community 11 - "getSessionUser"
Cohesion: 0.05
Nodes (61): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), GET(), POST() (+53 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (40): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+32 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.05
Nodes (55): GET(), isAuthorized(), Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant (+47 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.06
Nodes (43): DELETE(), DELETE(), POST(), GET(), POST(), GET(), FeedCard(), FeedEntry (+35 more)

### Community 16 - "ranks.ts"
Cohesion: 0.10
Nodes (28): DashboardLayout(), LeaderboardPage(), MEDALS, metadata, PODIUM_CONFIG, PartnerFooter(), Partner, Props (+20 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.09
Nodes (32): AlbumPage(), DesktopProfileTabs(), Tab, PublicProfilePage(), ProfilePage(), Badge, ProfileJobBadge(), BattleChallengeWidget() (+24 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (36): DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst (+28 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.11
Nodes (15): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), GuideBody() (+7 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.09
Nodes (27): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+19 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.10
Nodes (23): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+15 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.13
Nodes (18): main(), POST(), POST(), POST(), POST(), CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage() (+10 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.14
Nodes (18): MONTH_NAMES, YearReviewPage(), CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, GiftIcon(), MessageSquare (+10 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.06
Nodes (63): POST(), GET(), POST(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST() (+55 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.05
Nodes (32): formatBirthday(), ProfileEditor(), Props, Props, WinnerClip, DailyMessageBanner(), Message, coverUrl() (+24 more)

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
Cohesion: 0.26
Nodes (19): MapBuilder, Talk, bergpass(), BUILDERS, cache, chatter(), chestTalk(), frostgipfel() (+11 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (21): buildFfaRanking(), buildMatchRanking(), displayName(), ElementSlot, formatEntryStats(), IdentityFlipTile(), LayoutEntry, MatchTicker() (+13 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.13
Nodes (23): POST(), POST(), GET(), GET(), GET(), GET(), collectNominations(), CommunityNomination (+15 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.08
Nodes (36): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+28 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.13
Nodes (21): BattleCardsPage(), metadata, userSelect, RANK_STYLE, LeaderboardTabs(), Tab, TABS, getCombinedElo() (+13 more)

### Community 36 - "packs.ts"
Cohesion: 0.12
Nodes (25): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), ShoppingBag, asCardResult(), asTacticResult(), awardDrawnCard() (+17 more)

### Community 37 - "MobaIcon"
Cohesion: 0.09
Nodes (34): EventWinnerPredictionWidget(), Prediction, uname(), UserLite, RankTile(), cache, flush(), inflight (+26 more)

### Community 38 - "types.ts"
Cohesion: 0.06
Nodes (39): CompareProfilePage(), fetchUserData(), UserData, BracketView(), Match, Participant, roundLabel(), uname() (+31 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.07
Nodes (64): GET(), PUT(), requestSchema, POST(), serializeDrawResult(), GET(), POST(), requestSchema (+56 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.06
Nodes (38): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleReplayPage(), metadata, BattleOutcome (+30 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.11
Nodes (23): BattleCardsTabsInner(), DND_LINK_TAB, isTabKey(), TabKey, TABS, BattleLauncher(), Mode, RankRow() (+15 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.05
Nodes (72): APPLY, main(), PATCH(), POST(), GET(), POST(), GET(), POST() (+64 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.11
Nodes (35): GET(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames() (+27 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.05
Nodes (51): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+43 more)

### Community 45 - "auth.ts"
Cohesion: 0.11
Nodes (17): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+9 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.14
Nodes (21): GET(), GET(), isAuthorized(), calcStreak(), GET(), GET(), POST(), MONTH_NAMES (+13 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.08
Nodes (20): SteamGameResult, AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, AdminLayout() (+12 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.09
Nodes (24): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+16 more)

### Community 49 - "amp.ts"
Cohesion: 0.11
Nodes (30): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, LiveBattleView(), cell(), beep() (+22 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.09
Nodes (20): api(), Idea, IdeasBoardClient(), AuditClient(), Entry, IdeaList(), api(), GameCard() (+12 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (26): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+18 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.14
Nodes (27): GROUND_LABEL, MapEditor(), Props, Selection, STAMP_IDS, STAMP_LABELS, Tool, TOOL_BUTTONS (+19 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.07
Nodes (38): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+30 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.21
Nodes (9): choose(), coastal(), neighbors(), pick(), Baut eine Hex-Weltkarte aus den Assets in ../Hex Map. Aufruf: python build_world, alle Dateien <prefix>NN.png (nur Ziffern hinter dem Prefix), terrain_of(), terrain_of_fixed() (+1 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.15
Nodes (16): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), awardPoints(), parsePlacementPts() (+8 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.14
Nodes (21): GET(), POST(), DELETE(), DELETE(), AUTHOR, AuthorRow, authorSearch(), contentInfo() (+13 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.09
Nodes (26): CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant, readViewMode() (+18 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.13
Nodes (19): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+11 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.06
Nodes (37): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+29 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.05
Nodes (51): GET(), GET(), GET(), GameserverWidget(), Server, ServerRow(), ServersPage(), Light (+43 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.07
Nodes (40): BattleFigure(), Props, Crop, drawTeFrame(), FULL, imageCache, layersFor(), loadTeImage() (+32 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.13
Nodes (21): GET(), POST(), DELETE(), POST(), DELETE(), POST(), DELETE(), POST() (+13 more)

### Community 65 - "dependencies"
Cohesion: 0.04
Nodes (45): @auth/prisma-adapter, canvas-confetti, discord.js, @google/generative-ai, lucide-react, motion, next, next-auth (+37 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.18
Nodes (15): isAuthorized(), isOverridden(), POST(), toJson(), isAuthorized(), POST(), isAuthorized(), POST() (+7 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (21): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+13 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.07
Nodes (44): POST(), DELETE(), editable(), GET(), load(), PUT(), POST(), GET() (+36 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (18): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+10 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.20
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.07
Nodes (44): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), GET(), GET() (+36 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.10
Nodes (24): GET(), GET(), GET(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), PATCH(), GET() (+16 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.21
Nodes (13): POST(), GET(), LOCATION_HEXES, stepMinutesOf(), DND_LOCATIONS, DndLocationDef, ensureDndWorldSeeded(), getLocationDef() (+5 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.05
Nodes (39): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, ClipVotingClient(), Nomination, Props (+31 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.08
Nodes (31): Membership, Squad, SquadDetailClient(), User, Squad, ReportPageClient(), ArchivedSeason, FORMAT_LABELS (+23 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.19
Nodes (12): ActivityFeed(), cleanReason(), Filter, Tx, txType(), AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES (+4 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.13
Nodes (32): bakeStatic(), drawQuarters(), drawStamp(), SHEET_FILES, SheetKey, TeWorld(), groundQuarters(), Quarter (+24 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.13
Nodes (19): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+11 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.11
Nodes (13): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+5 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.13
Nodes (22): GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), TournamentDetailPage(), computeEventPoints(), computeLiveLigaPunkte() (+14 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.08
Nodes (24): Anomalies, AnomaliesClient(), Person, PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS (+16 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.08
Nodes (47): GET(), PATCH(), PATCH(), PATCH(), PATCH(), PATCH(), GET(), PATCH() (+39 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.08
Nodes (39): GET(), POST(), POST(), POST(), DELETE(), PATCH(), GET(), POST() (+31 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.08
Nodes (29): CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS, ErrorNotice(), GemsResultScreen(), GemsReward, AvailableAction (+21 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.16
Nodes (22): POST(), GET(), POST(), QuestWorld(), getPublishedCustomWorld(), resolveWorld(), advanceDndQuestObjective(), advanceWorldQuestStep() (+14 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.14
Nodes (17): CustomBadgeDisplay, Props, BadgeIcon(), BadgeIconProps, checkAndAwardBadges(), loadStats(), badgeArt(), CUSTOM_BADGE_ART (+9 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.22
Nodes (6): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap, LifeBuoy

### Community 90 - "useConfirm"
Cohesion: 0.20
Nodes (14): loadProfileOverlayState(), PATCH(), GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState (+6 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.09
Nodes (22): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, CommunityBoardWidget() (+14 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.03
Nodes (16): DEFAULTS, RULES, RuleSeed, PATCH(), patchSchema, GET(), isAuthorized(), GameSuggestion (+8 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.14
Nodes (19): metadata, LocationState, OtherPlayer, Props, randomTeConfig(), TeCharacterConfig, makeRng(), npcLook() (+11 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.09
Nodes (20): CustomBadgeDisplay, Props, Tab, TABS, ProfileQuestEntry, ProfileTournamentParticipationEntry, Props, ProfileRecentEventEntry (+12 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.20
Nodes (10): GET(), POST(), DELETE(), POST(), GET(), GET(), POST(), DELETE() (+2 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.21
Nodes (11): BASE_Z, CATALOG_PATH, CATEGORIES, CHAR_PACKS, hex(), main(), OUT, SKIN_SRC (+3 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.04
Nodes (63): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+55 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.19
Nodes (14): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), DEFAULT_SEASON_REWARD_CONFIG (+6 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 102 - "recurrence.ts"
Cohesion: 0.33
Nodes (7): DELETE(), PATCH(), POST(), DELETE(), GET(), PATCH(), requireModeratorOrSquadCaptain()

### Community 103 - "isVideoUrl"
Cohesion: 0.53
Nodes (4): GET(), displayName(), EventFacts, getEventFacts()

### Community 104 - "studio-templates.ts"
Cohesion: 0.17
Nodes (16): POST(), requestSchema, DndPage(), metadata, getHeroSetup(), HeroSetup, HeroSetupStep, heroStepOf() (+8 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.22
Nodes (18): checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction(), trackVoice(), client (+10 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.13
Nodes (20): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+12 more)

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.07
Nodes (30): GET(), GET(), POST(), GET(), POST(), GET(), GET(), GET() (+22 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.06
Nodes (34): MonthlyContests, Props, YearlyContests, SeriesOption, EventsTabs(), COIN_SOURCES, PointsInfoModal(), ConfirmDialog() (+26 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.15
Nodes (14): ABILITY_LABEL, ABILITY_SCORE_CANDIDATES, ABILITY_STEPS, CharacterCreation(), Phase, ROLE_BADGE, RolledCard, RollingReveal() (+6 more)

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.19
Nodes (15): GET(), GET(), isAuthorized(), findGemsMonsterTemplate(), finalizeDueGemsTournaments(), GemsTournamentSummary, generateGemsTournamentBossTeam(), getCurrentGemsTournament() (+7 more)

### Community 111 - "skins/types.ts"
Cohesion: 0.25
Nodes (13): GET(), POST(), GET(), OptionInput, POST(), POST(), dispatchDiscordDm(), sendDiscordDMToAll() (+5 more)

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
Cohesion: 0.16
Nodes (18): POST(), ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, runSeasonUpdate(), buildSeasonInputs(), runFullSeasonUpdate(), RunSeasonResult, markPreSeasonRan() (+10 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.17
Nodes (12): Avatar(), EventTippsList(), Tipp, uname(), UserLite, Coins, Target, MyPrediction (+4 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.10
Nodes (22): GET(), PATCH(), POST(), AdminShopPage(), PACK_KIND_INFO, PACK_KIND_ORDER, ShopConfigPanel(), TYPE_LABEL (+14 more)

### Community 118 - "report-event-facts.ts"
Cohesion: 0.03
Nodes (69): RULES, AdminUsersClient(), formatLastLogin(), Props, Role, UserRow, AdminUsersPage(), SyncMembersButton() (+61 more)

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
Cohesion: 0.26
Nodes (14): GET(), isAuthorized(), softResetRating(), grantDueSeasonRewards(), grantPlacementReward(), grantSeasonEndRewards(), hardResetAllElo(), resetAllCampaignProgress() (+6 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.21
Nodes (13): GET(), AdsTarget, ampCall(), AmpInstance, callWithSession(), getBaseUrl(), getInstanceDetails(), getSessionId() (+5 more)

### Community 124 - "ServerCard.tsx"
Cohesion: 0.46
Nodes (5): POST(), POST(), notifyPvpBattleResolved(), advanceDndQuestObjectiveForUser(), updateQuestProgress()

### Community 125 - "notifications/page.tsx"
Cohesion: 0.23
Nodes (11): gamedig, gamedig, GET(), GET(), StatusEntry, getInstances(), getInstancesRaw(), toInstanceStatus() (+3 more)

### Community 126 - "series/[id]/complete/route.ts"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.04
Nodes (50): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+42 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "ThemeProvider.tsx"
Cohesion: 0.25
Nodes (11): GET(), PATCH(), patchSchema, formatDate(), SeasonConfigPanel(), toDateInputValue(), getSeasonConfig(), KEYS (+3 more)

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.07
Nodes (55): POST(), GET(), GET(), GET(), isAuthorized(), GEMS_DIFFICULTIES, POST(), POST() (+47 more)

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

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
Cohesion: 0.22
Nodes (11): api(), Campaign, dueAt(), EventOption, MarketingCampaignsBlock(), MarketingStatsBlock(), PromotionRequestItem, PromotionRequestList() (+3 more)

### Community 138 - "DuelDeckEditor.tsx"
Cohesion: 0.27
Nodes (9): PATCH(), patchSchema, PATCH(), requestSchema, CardContentError, CardContentPatch, updateCardContent(), grantCoins() (+1 more)

### Community 139 - "widget/events/route.ts"
Cohesion: 0.07
Nodes (38): EventCardLink(), BackToTop(), BottomNav(), NAV, DiscordLoginButton(), Props, FloatingPill(), NAV (+30 more)

### Community 140 - "ThemeProvider.tsx"
Cohesion: 0.44
Nodes (9): GET(), displayName(), getCronRuns(), getJobHealth(), getPayoutOverview(), getVoteAnomalies(), previewPayout(), VoteEvent (+1 more)

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.08
Nodes (32): average(), GET(), GET(), ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge() (+24 more)

### Community 142 - "three"
Cohesion: 0.06
Nodes (35): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, VfxEvent, OwnedCardEntry, CardUpgradeAnimationState (+27 more)

### Community 143 - "season-config.ts"
Cohesion: 0.24
Nodes (8): POST(), computeKeptSeriesRankPoints(), PlacementReward, resetAllExceptSeries(), RewardsConfig, SelectiveResetSummary, LegacyStandingRow, SeriesEventForStandings

### Community 144 - "sync-discord-roles/route.ts"
Cohesion: 0.43
Nodes (6): GET(), POST(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole()

### Community 145 - "promotion-request-service.ts"
Cohesion: 0.31
Nodes (9): GET(), isAuthorized(), rollNewCharacterSheet(), DND_FEATURE_LAUNCH_AT, DND_MIGRATION_DEADLINE, isMigrationDeadlinePassed(), runAutoMigrationIfDeadlinePassed(), toJson() (+1 more)

### Community 146 - "FotografGalleries.tsx"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 147 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.10
Nodes (19): ServerCredentials(), ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption (+11 more)

### Community 148 - "FfaView.tsx"
Cohesion: 0.27
Nodes (9): calcEntryAvg(), Entry, FfaView(), fmtUpTo2(), Match, MEDAL, Participant, uname() (+1 more)

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "notifications.ts"
Cohesion: 0.33
Nodes (7): DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled(), NotificationType, PREF_KEY

### Community 151 - "OverlayClient"
Cohesion: 0.22
Nodes (9): cornerStyle(), ElementContent(), elementPositionStyle(), OverlayClient(), panelWidthFor(), pickTickerMatch(), usePanelRotator(), useStackedElements() (+1 more)

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

### Community 158 - "HeroSetup.tsx"
Cohesion: 0.33
Nodes (4): BattleCardsLogo(), CardWithId, INTRO, STEPS

### Community 159 - "grantPack"
Cohesion: 0.31
Nodes (9): GET(), POST(), rollPrize(), todayStr(), CHEST_TABLE, ChestPrize, grantGemsPvpVictoryChest(), rollChestPrize() (+1 more)

### Community 160 - "widget/events/[id]/route.ts"
Cohesion: 0.47
Nodes (5): displayNameOf(), GET(), USER_SELECT, UserLite, userSummary()

### Community 161 - "CreateContestForm.tsx"
Cohesion: 0.53
Nodes (5): CreateContestForm(), defaultPeriodEnd(), defaultPeriodStart(), toDateInputValue(), Sparkles

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 163 - "HeroStatValue.tsx"
Cohesion: 0.11
Nodes (26): curve(), curvePercent(), STANDARD_CARDS, StandardCardSeed, GET(), isAuthorized(), POST(), toJson() (+18 more)

### Community 164 - "daily-poll/[id]/vote/route.ts"
Cohesion: 0.40
Nodes (5): ELEMENT_KEYS, parseLayout(), ProfileOverlayPage(), ProfileElementKey, ProfileLayoutPositions

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
- **1136 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1131 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `report/[id]/page.tsx` to `roles.ts`, `series/[id]/complete/route.ts`, `(dashboard)/layout.tsx`, `coach-service.ts`, `time.ts`, `getSessionUser`, `ThemeProvider.tsx`, `StarterPickFlow.tsx`, `RankedAvatar.tsx`, `ranks.ts`, `duel-live-battle.ts`, `BattleCardView.tsx`, `notify-dispatch.ts`, `packs.ts`, `types.ts`, `community-job-config.ts`, `job-recommendations.ts`, `JobBadge.tsx`, `discord-rest.ts`, `BattleLogEntry`, `EventEditClient.tsx`, `dashboard/page.tsx`, `GameNameInput.tsx`, `events/series/[id]/page.tsx`, `formatBerlinTime`, `SeriesIcon.tsx`, `AdminEventsClient.tsx`, `ClipVotingClient.tsx`, `(dashboard)/events/page.tsx`, `admin/community-jobs/disputes/route.ts`, `recurrence.ts`, `isVideoUrl`, `GamePlayersModal.tsx`, `upload/route.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ThemeProvider.tsx`, `ranked-season.ts`, `DashboardChrome.tsx`, `series/[id]/complete/route.ts`, `journalist-service.ts`, `DuelDeckEditor.tsx`, `series-event-points.ts`, `season-config.ts`, `sync-discord-roles/route.ts`, `new-season/page.tsx`, `clip-contest.ts`, `CoinIcon.tsx`, `revert-event-completion.ts`, `hasMinRole`, `events/series/[id]/page.tsx`, `ClipVotingClient.tsx`, `community-job-discord-votes.ts`, `adapters.ts`, `recurrence.ts`, `photo-request-service.ts`, `report/[id]/page.tsx`, `skins/types.ts`, `ThemeProvider.tsx`, `getActiveMembership`, `report-event-facts.ts`, `AdminDonationsClient.tsx`, `notifications/page.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `duel-live-battle.ts` to `roles.ts`, `[tacticCardId]/route.ts`, `getSessionUser`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `RankedAvatar.tsx`, `CommunityJobsAdminPanel.tsx`, `FfaView.tsx`, `(dashboard)/leaderboard/page.tsx`, `ProfileMobileView.tsx`, `ScoreBreakdownBlock.tsx`, `gameservers.ts`, `types.ts`, `community-job-config.ts`, `JobBadge.tsx`, `auth.ts`, `FotografTools.tsx`, `dispatchNotification`, `skill-pool.ts`, `community-board-comment-service.ts`, `formatBerlinTime`, `SeriesIcon.tsx`, `[id]/settings/SettingsClient.tsx`, `ProfileOverlayClient.tsx`, `community-job-payout/route.ts`, `AdminEventsClient.tsx`, `ConfirmDialog.tsx`, `apply-season-results.ts`, `(dashboard)/battle-cards/page.tsx`, `photo-request-service.ts`, `report/[id]/page.tsx`, `report-event-facts.ts`, `promotion-request-service.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1136 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.030857142857142857 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0824829931972789 - nodes in this community are weakly interconnected._
- **Should `live-battle.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11313131313131314 - nodes in this community are weakly interconnected._