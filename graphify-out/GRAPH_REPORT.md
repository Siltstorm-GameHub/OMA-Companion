# Graph Report - OMA-Companion  (2026-09-25)

## Corpus Check
- 1013 files · ~3,586,708 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5083 nodes · 13955 edges · 209 communities (179 shown, 30 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `864d9d2f`
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
- lobby/route.ts
- @types/three
- middleware.ts
- discord-roles.ts
- new-season/page.tsx
- BattleStatsPanel.tsx
- notifications/page.tsx
- canvas-confetti
- Monster-Artwork — Edelstein-Kampf
- lucide-react
- next-auth
- postprocessing
- @prisma/client
- preferences/route.ts
- react
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- react-dom
- sharp
- sonner
- generate-brand-assets.ts
- three
- @types/canvas-confetti
- @types/three
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- web-push
- zod
- HeroSetup.tsx
- UserRoleManager.tsx
- GuestLockOverlay.tsx
- chroma-key.js
- applyMatchResult.ts
- media/[id]/route.ts
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
- ScoreBreakdownBlock.tsx
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
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts
- `main()` --calls--> `createNotification()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/notifications.ts

## Import Cycles
- None detected.

## Communities (209 total, 30 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (56): POST(), POST(), DELETE(), GET(), PATCH(), POST(), GET(), PATCH() (+48 more)

### Community 1 - "prisma.ts"
Cohesion: 0.09
Nodes (20): api(), Idea, IdeasBoardClient(), AuditClient(), Entry, IdeaList(), api(), GameCard() (+12 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.12
Nodes (23): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), RARITIES, STEP_LABELS (+15 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.12
Nodes (32): POST(), DndCharacterRow, DndLocationRow, formatDuration(), polygonPoints(), TYPE_LABEL, WorldMap(), EVEN_ROW (+24 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.16
Nodes (18): randomTeConfig(), makeRng(), npcLook(), Rect, StampDef, StampId, TileSheet, CAVE_WALL_TILES (+10 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.08
Nodes (17): FEATURES, AnimatedBackground(), Cell, PULSE_COLORS, displayName(), FloatingLobbyChat(), LobbyMsg, NOTIF_ICONS (+9 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.09
Nodes (41): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, LiveSnapshot, LiveBattleAwaiting, activationCellsFor() (+33 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.09
Nodes (44): actionSchema, DUEL_STANCES, POST(), GET(), average(), GET(), POST(), VALID_DIFFICULTIES (+36 more)

### Community 8 - "interactive.ts"
Cohesion: 0.09
Nodes (61): LiveBattleSnapshot, generateBoard(), hasAnyValidMove(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate (+53 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.05
Nodes (66): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+58 more)

### Community 10 - "time.ts"
Cohesion: 0.15
Nodes (13): SyncButton(), api(), AreaKey, FoundUser, GameInfo, IdeaPrefill, MediaAsset, Similar (+5 more)

### Community 11 - "getSessionUser"
Cohesion: 0.04
Nodes (117): POST(), POST(), POST(), GET(), IdeaForm(), scoreBreakdown(), collabBonuses(), collabBonusScore() (+109 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (64): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+56 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.05
Nodes (57): GET(), GET(), isAuthorized(), calcStreak(), GET(), POST(), CATEGORIES, EventSetupWizard() (+49 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.17
Nodes (17): PATCH(), patchSchema, PATCH(), requestSchema, CardContentError, CardContentPatch, updateCardContent(), grantGuaranteedPack() (+9 more)

### Community 16 - "ranks.ts"
Cohesion: 0.08
Nodes (39): CustomBadgeDisplay, Props, Tab, TABS, ProfileQuestEntry, ProfileTournamentParticipationEntry, ProfileRecentEventEntry, ProfileSquad (+31 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.05
Nodes (63): POST(), Interview, InterviewClient(), name(), CustomBadgeDisplay, Props, DesktopProfileTabs(), Tab (+55 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (34): ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction, DuelAttackType (+26 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.14
Nodes (16): GameserverWidget(), Server, ServerRow(), Light, LIGHT_COLOR, LIGHT_LABEL, Server, ServerCard() (+8 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.07
Nodes (29): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+21 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.05
Nodes (35): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+27 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.07
Nodes (38): GET(), PUT(), requestSchema, DuelDeckPage(), metadata, DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard (+30 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.11
Nodes (39): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyTacticEffects(), asBattleLog(), beginTrapCheck(), checkDuelTimeout() (+31 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.06
Nodes (42): CompareProfilePage(), fetchUserData(), UserData, Avatar(), EventTippsList(), Tipp, uname(), UserLite (+34 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.16
Nodes (19): parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps(), POST(), GET(), POST() (+11 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.12
Nodes (16): MonthlyContests, Props, YearlyContests, EventsTabs(), TabItem, TabPanel(), Tabs(), TabsProps (+8 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.11
Nodes (34): GET(), GET(), GET(), isAuthorized(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked(), CampaignLevelDef (+26 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.31
Nodes (9): GET(), POST(), rollPrize(), todayStr(), CHEST_TABLE, ChestPrize, grantGemsPvpVictoryChest(), rollChestPrize() (+1 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.14
Nodes (23): ABILITY_KEYS, AbilityScores, clampToBaseline(), CLASS_SPEED_MIDPOINT, deriveBaseStats(), DerivedStats, DND_CLASS_BASE_STATS, roll4d6DropLowest() (+15 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.14
Nodes (10): PACK_KIND_INFO, PACK_KIND_ORDER, TYPE_LABEL, ACCENT_CLASSES, PACK_INFO, PACK_ORDER, Package, PackKind (+2 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.06
Nodes (31): buildFfaRanking(), buildMatchRanking(), cornerStyle(), displayName(), ElementContent(), elementPositionStyle(), ElementSlot, formatEntryStats() (+23 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.13
Nodes (23): POST(), POST(), GET(), GET(), GET(), GET(), collectNominations(), CommunityNomination (+15 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.18
Nodes (22): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), formatStart() (+14 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.31
Nodes (7): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, Flame, isStoredBattleLog()

### Community 36 - "packs.ts"
Cohesion: 0.18
Nodes (18): POST(), serializeDrawResult(), asCardResult(), asTacticResult(), awardDrawnCard(), awardDrawnTacticCard(), COMMUNITY_CHANCE, drawCard() (+10 more)

### Community 37 - "MobaIcon"
Cohesion: 0.24
Nodes (15): LOGO_POSITIONS, StudioEditor(), ImageDown, drawLogo(), drawWatermark(), loadImage(), LogoPosition, prepareUploadImage() (+7 more)

### Community 38 - "types.ts"
Cohesion: 0.06
Nodes (45): EventCard(), EventUser, Props, SeriesEventItem, STATUS_CFG, StreamingPartner, calcEntryAvg(), Entry (+37 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.06
Nodes (71): POST(), POST(), POST(), POST(), VALID_DIFFICULTIES, GET(), POST(), requestSchema (+63 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.09
Nodes (27): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleStatsPanel(), StoredBattleLog, computeBattleStats() (+19 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.05
Nodes (47): BattleCardsTabsInner(), DND_LINK_TAB, isTabKey(), TabKey, TABS, BattleLauncher(), Mode, RankRow() (+39 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.04
Nodes (83): APPLY, main(), PATCH(), GET(), GET(), POST(), GET(), GET() (+75 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.11
Nodes (34): berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames(), getDismissedItemKeys() (+26 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), StatusEntry, AdsTarget, ampCall(), AmpInstance, callWithSession() (+15 more)

### Community 45 - "auth.ts"
Cohesion: 0.06
Nodes (38): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+30 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.12
Nodes (34): bakeStatic(), drawQuarters(), drawStamp(), loadSheets(), Props, SHEET_FILES, SheetKey, Sheets (+26 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.19
Nodes (8): metadata, russoOne, spaceGrotesk, viewport, CursorGlow(), ExitAppGuard(), TRAP_STATE, SessionProvider()

### Community 48 - "FotografTools.tsx"
Cohesion: 0.08
Nodes (26): AssetList(), UploadAssetForm(), ServerCredentials(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile (+18 more)

### Community 49 - "amp.ts"
Cohesion: 0.22
Nodes (21): LiveBattleView(), beep(), getContext(), noiseBurst(), playCardRevealSound(), playCommunityBonusSound(), playCritSound(), playDamageSound() (+13 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.05
Nodes (49): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+41 more)

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
Cohesion: 0.12
Nodes (19): DELETE(), PATCH(), POST(), POST(), DELETE(), PATCH(), POST(), DELETE() (+11 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.06
Nodes (43): GET(), POST(), DELETE(), DELETE(), POST(), GET(), POST(), DELETE() (+35 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.04
Nodes (58): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+50 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (24): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), DominionCfg (+16 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.06
Nodes (34): RULES, Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination (+26 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.13
Nodes (22): GET(), loadProfileOverlayState(), NextEventTile(), GameCoverPicker(), PickedGameCover, CoverBrandBadge(), EventCoverDefault(), dynamicCache (+14 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.09
Nodes (35): BattleFigure(), Props, Crop, drawTeFrame(), FULL, imageCache, loadTeImage(), loadTeLayers() (+27 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.20
Nodes (17): POST(), GET(), PATCH(), patchSchema, GET(), isAuthorized(), hardResetAllElo(), resetAllCampaignProgress() (+9 more)

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): @auth/prisma-adapter, discord.js, gamedig, @google/generative-ai, motion, next, dependencies, @auth/prisma-adapter (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.12
Nodes (28): POST(), toJson(), isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema (+20 more)

### Community 67 - "hasMinRole"
Cohesion: 0.28
Nodes (11): POST(), POST(), POST(), userSelect, getDailyDuelCount(), getDailyWageredTotal(), isExpired(), isPairOnCooldown() (+3 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.18
Nodes (15): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), ArrowRight (+7 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.20
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.13
Nodes (22): DELETE(), POST(), DELETE(), POST(), DELETE(), POST(), DELETE(), POST() (+14 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.30
Nodes (10): GET(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), getGradientBackground(), getLogoBadge() (+2 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.26
Nodes (10): GET(), isAuthorized(), POST(), GET(), positionAlongPath(), commitAllDueArrivals(), locationAtHex(), parseTravelPath() (+2 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.09
Nodes (20): ClipVotingClient(), Nomination, Props, GalleryEntry, MONTH_NAMES, Nomination, Props, MONTH_NAMES (+12 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.07
Nodes (43): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+35 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.13
Nodes (23): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+15 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.29
Nodes (18): MapBuilder, bergpass(), BUILDERS, cache, chatter(), chestTalk(), frostgipfel(), giverTalk() (+10 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.10
Nodes (24): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+16 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.22
Nodes (11): api(), Campaign, dueAt(), EventOption, MarketingCampaignsBlock(), MarketingStatsBlock(), PromotionRequestItem, PromotionRequestList() (+3 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.20
Nodes (13): GET(), POST(), POST(), POST(), GET(), POST(), ASSET_TYPES, createAlbum() (+5 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.07
Nodes (29): Anomalies, AnomaliesClient(), Person, PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS (+21 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.05
Nodes (69): GET(), PATCH(), PATCH(), GET(), PATCH(), PATCH(), POST(), GET() (+61 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.08
Nodes (22): Badge, CATEGORIES, CATEGORY_LABELS, User, CardRow, CommunityCardsAdmin(), AdminCommunityCardsPage(), formatDate() (+14 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.19
Nodes (12): EventCardLink(), GateButton(), GateLink(), GateOptions, GuestBanner(), GuestGateContext, GuestGateProvider(), GuestGateValue (+4 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.23
Nodes (13): POST(), GET(), advanceDndQuestObjective(), getWorldQuestStep(), rewardDndQuest(), ensureDndStoryContentSeeded(), STORY_TEMPLATES, StoryTemplateDef (+5 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 87 - "compilerOptions"
Cohesion: 0.09
Nodes (21): dom, dom.iterable, esnext, node_modules, compilerOptions, allowJs, esModuleInterop, incremental (+13 more)

### Community 88 - "send/route.ts"
Cohesion: 0.12
Nodes (12): api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem, PhotoRequestsBlock() (+4 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.22
Nodes (6): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap, LifeBuoy

### Community 90 - "useConfirm"
Cohesion: 0.14
Nodes (15): SteamGameResult, GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props (+7 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.13
Nodes (15): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, centeredRect() (+7 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.04
Nodes (15): main(), GameSuggestion, DEFAULT_PREFS, POST(), POST(), POST(), PATCH(), POST() (+7 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.09
Nodes (31): VfxEvent, LiveDuelUnit, UltimateBurst, GemsResultScreen(), GemsReward, AvailableAction, computeGemsReward(), describeLogEntry() (+23 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.03
Nodes (65): LinkedUser, Partner, TwitchPreview, AmpSuggestion, EMPTY_FORM, FormState, Light, LIGHT_COLOR (+57 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.24
Nodes (12): BattleCardsPage(), metadata, userSelect, LeaderboardTabs(), Tab, TABS, getCombinedElo(), getBattleCardsLeaderboard() (+4 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.21
Nodes (11): BASE_Z, CATALOG_PATH, CATEGORIES, CHAR_PACKS, hex(), main(), OUT, SKIN_SRC (+3 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.10
Nodes (25): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+17 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.10
Nodes (18): AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES, Props, WinnerClip, coverUrl(), DailyPollBanner(), GameSuggestion (+10 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.24
Nodes (7): POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, VoteKind, VoteOwnerLookup

### Community 102 - "recurrence.ts"
Cohesion: 0.20
Nodes (9): GET(), PATCH(), MinigamesConfigPanel(), AdminMinigamesPage(), DEFAULTS, KEYS, MinigameKey, MinigamesConfig (+1 more)

### Community 103 - "isVideoUrl"
Cohesion: 0.19
Nodes (17): GET(), IdeaPage(), ReportPage(), ReportEditor(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData, toIdeaFeedEntry() (+9 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.08
Nodes (29): POST(), requestSchema, DndPage(), metadata, ABILITY_LABEL, ABILITY_SCORE_CANDIDATES, ABILITY_STEPS, CharacterCreation() (+21 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.17
Nodes (22): GET(), isAuthorized(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction() (+14 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.03
Nodes (83): GET(), GET(), GET(), GET(), GET(), POST(), GET(), GET() (+75 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.22
Nodes (13): POST(), GET(), GET(), POST(), InterviewPage(), answerInterview(), createInterview(), declineInterview() (+5 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.15
Nodes (13): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, DailyPollActionBadge(), EventsActionBadge() (+5 more)

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.10
Nodes (13): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, Avatar(), MEDALS, Props (+5 more)

### Community 111 - "skins/types.ts"
Cohesion: 0.12
Nodes (16): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+8 more)

### Community 112 - "BadgesSection.tsx"
Cohesion: 0.14
Nodes (24): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), GEMS_DIFFICULTIES, POST(), POST(), POST() (+16 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.25
Nodes (12): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), listMyPhotoRequests(), listOpenPhotoRequests() (+4 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.14
Nodes (20): ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, CLASS_BASE_STATS, isOverridden(), runSeasonUpdate(), toJson(), buildSeasonInputs(), countBy() (+12 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.12
Nodes (20): GET(), isAuthorized(), GET(), POST(), Props, MONTH_NAMES, QuestsPage(), QuestRegenerateButton() (+12 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.21
Nodes (12): GET(), PATCH(), POST(), AdminShopPage(), ShopConfigPanel(), DEFAULT_PACK_PRICES, DEFAULT_WHEEL_PRIZES, DEFAULTS (+4 more)

### Community 118 - "report-event-facts.ts"
Cohesion: 0.21
Nodes (10): AdminUsersClient(), formatLastLogin(), Props, Role, UserRow, AdminUsersPage(), SyncMembersButton(), History (+2 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "TextsClient.tsx"
Cohesion: 0.20
Nodes (12): POST(), metadata, LocationState, QuestWorld(), OtherPlayer, advanceWorldQuestStep(), DND_QUESTS, ensureDndQuestsSeeded() (+4 more)

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.27
Nodes (9): GET(), GET(), authHeader(), deleteDiscordMessage(), DiscordEmbed, DiscordGuildEmoji, DiscordTextChannel, listGuildEmojis() (+1 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.22
Nodes (12): GET(), isAuthorized(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee(), updateEventStatus(), fmtDateDE(), eventParticipationCoins() (+4 more)

### Community 124 - "ServerCard.tsx"
Cohesion: 0.46
Nodes (5): POST(), POST(), notifyPvpBattleResolved(), advanceDndQuestObjectiveForUser(), updateQuestProgress()

### Community 125 - "notifications/page.tsx"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 126 - "series/[id]/complete/route.ts"
Cohesion: 0.38
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.07
Nodes (28): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+20 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "ThemeProvider.tsx"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.13
Nodes (27): GET(), POST(), GET(), OptionInput, POST(), POST(), DISCORD_REASONS, GET() (+19 more)

### Community 132 - "widget/events/route.ts"
Cohesion: 0.24
Nodes (9): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), ShoppingBag, communityCardPoolSize(), countPacksPurchasedToday(), PackKind (+1 more)

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "lobby-cleanup/route.ts"
Cohesion: 0.24
Nodes (9): Moon, Sun, ThemedToaster(), Theme, ThemeContext, ThemeProvider(), useTheme(), ThemeToggle() (+1 more)

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 137 - "[tacticCardId]/route.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 138 - "sharp"
Cohesion: 0.05
Nodes (16): DEFAULTS, RULES, RuleSeed, GET(), NOT_ACTIVE_STATUSES, DiscordMember, POST(), GET() (+8 more)

### Community 139 - "widget/events/route.ts"
Cohesion: 0.13
Nodes (20): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), LogOut, MessageCircleMore (+12 more)

### Community 140 - "sonner"
Cohesion: 0.31
Nodes (8): awardPoints(), parsePlacementPts(), PATCH(), BracketMatch, generateBracket(), generateRoundRobin(), POST(), shuffle()

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.09
Nodes (31): Health, RankTile(), cache, flush(), inflight, isFresh(), JobBadgeProps, listeners (+23 more)

### Community 142 - "three"
Cohesion: 0.10
Nodes (23): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+15 more)

### Community 143 - "HeroStatValue.tsx"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 144 - "tank"
Cohesion: 0.35
Nodes (10): softResetRating(), addMonthsUTC(), getCurrentSeasonNumber(), getSeasonWindow(), grantDueSeasonRewards(), grantPlacementReward(), grantSeasonEndRewards(), SeasonWindow (+2 more)

### Community 145 - "preferences/route.ts"
Cohesion: 0.31
Nodes (6): Target, MyPrediction, MyPredictionsList(), uname(), UserLite, PredictionStreakCard()

### Community 146 - "active/route.ts"
Cohesion: 0.43
Nodes (6): GET(), POST(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole()

### Community 147 - "lobby/route.ts"
Cohesion: 0.39
Nodes (6): GET(), parseSteamAppId(), cache, getJson(), getSteamAppInfo(), SteamAppInfo

### Community 148 - "@types/three"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "discord-roles.ts"
Cohesion: 0.29
Nodes (5): formatBirthday(), ProfileEditor(), Props, Cake, ImageUploadFieldProps

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 152 - "BattleStatsPanel.tsx"
Cohesion: 0.29
Nodes (7): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.ts, **/*.tsx, include

### Community 153 - "notifications/page.tsx"
Cohesion: 0.67
Nodes (3): AdminNotificationsPage(), DiscordEmoji, fetchGuildEmojis()

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 160 - "preferences/route.ts"
Cohesion: 0.06
Nodes (49): GET(), Params, POST(), GET(), GET(), POST(), DELETE(), displayNameOf() (+41 more)

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 163 - "HeroStatValue.tsx"
Cohesion: 0.09
Nodes (30): curve(), curvePercent(), STANDARD_CARDS, StandardCardSeed, isAuthorized(), isOverridden(), POST(), toJson() (+22 more)

### Community 167 - "generate-brand-assets.ts"
Cohesion: 0.40
Nodes (3): OUT_DIR, PNG_SIZES, SOURCE

### Community 172 - "Kapitel-Hintergründe — Kampagne"
Cohesion: 0.50
Nodes (3): Benötigte Dateien, Format, Kapitel-Hintergründe — Kampagne

### Community 175 - "HeroSetup.tsx"
Cohesion: 0.33
Nodes (4): BattleCardsLogo(), CardWithId, INTRO, STEPS

### Community 177 - "GuestLockOverlay.tsx"
Cohesion: 0.33
Nodes (5): DiscordLoginButton(), Props, GuestLockOverlay(), Props, Lock

### Community 179 - "applyMatchResult.ts"
Cohesion: 0.53
Nodes (5): applyMatchResult(), ApplyMatchResultInput, finalFinalistReason(), finalWinReason(), loserOf()

### Community 180 - "media/[id]/route.ts"
Cohesion: 0.60
Nodes (4): DELETE(), PATCH(), deleteAsset(), updateAsset()

### Community 254 - "ScoreBreakdownBlock.tsx"
Cohesion: 0.36
Nodes (7): Breakdown, fmt(), ScoreBreakdownBlock(), signed(), StreamResult, Week, Scale

### Community 274 - "HeroStatValue.tsx"
Cohesion: 0.04
Nodes (58): ActivityFeed(), cleanReason(), Filter, Tx, txType(), DashboardPage(), formatCountdown(), formatFreshness() (+50 more)

## Knowledge Gaps
- **1121 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1116 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `report/[id]/page.tsx` to `roles.ts`, `widget/events/route.ts`, `coach-service.ts`, `getSessionUser`, `duel-live-battle.ts`, `HeroStatValue.tsx`, `lobby/route.ts`, `MobaIcon.tsx`, `(dashboard)/leaderboard/page.tsx`, `types.ts`, `community-job-config.ts`, `dispatchNotification`, `DailyPollBanner.tsx`, `media/[id]/route.ts`, `BattleLogEntry`, `EventEditClient.tsx`, `GameNameInput.tsx`, `SeriesIcon.tsx`, `AdminEventsClient.tsx`, `ClipVotingClient.tsx`, `community-job-discord-votes.ts`, `admin/community-jobs/disputes/route.ts`, `isVideoUrl`, `photo-request-service.ts`, `BadgesSection.tsx`, `GamePlayersModal.tsx`, `report/[id]/page.tsx`, `upload/route.ts`, `duels/[id]/respond/route.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `DashboardChrome.tsx`, `series/[id]/complete/route.ts`, `[tacticCardId]/route.ts`, `sharp`, `series-event-points.ts`, `duels-live.ts`, `RankedAvatar.tsx`, `duel-live-battle.ts`, `active/route.ts`, `@types/three`, `new-season/page.tsx`, `notifications/page.tsx`, `clip-contest.ts`, `JobBadge.tsx`, `CoinIcon.tsx`, `revert-event-completion.ts`, `dashboard/page.tsx`, `admin/events/[id]/complete/route.ts`, `SeriesIcon.tsx`, `[id]/settings/SettingsClient.tsx`, `ClipVotingClient.tsx`, `(dashboard)/events/page.tsx`, `recurrence.ts`, `photo-request-service.ts`, `report/[id]/page.tsx`, `BadgesSection.tsx`, `getActiveMembership`, `report-event-facts.ts`, `series/[id]/complete/route.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `duel-live-battle.ts` to `prisma.ts`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `preferences/route.ts`, `HeroStatValue.tsx`, `MobaIcon.tsx`, `(dashboard)/leaderboard/page.tsx`, `board-match3.ts`, `types.ts`, `community-job-config.ts`, `auth.ts`, `FotografTools.tsx`, `dispatchNotification`, `SeriesDetailClient.tsx`, `skill-pool.ts`, `community-board-comment-service.ts`, `SeriesIcon.tsx`, `[id]/settings/SettingsClient.tsx`, `ProfileOverlayClient.tsx`, `community-job-payout/route.ts`, `ConfirmDialog.tsx`, `ClipVotingClient.tsx`, `send/route.ts`, `apply-season-results.ts`, `EventSetupWizard.tsx`, `isVideoUrl`, `report/[id]/page.tsx`, `useServerLiveStatus.ts`, `ScoreBreakdownBlock.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1121 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03286082474226804 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08817204301075268 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11827956989247312 - nodes in this community are weakly interconnected._