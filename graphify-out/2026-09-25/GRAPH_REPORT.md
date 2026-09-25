# Graph Report - OMA-Companion  (2026-09-25)

## Corpus Check
- 1010 files · ~3,230,902 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5211 nodes · 14458 edges · 222 communities (188 shown, 34 thin omitted)
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
- widget/events/route.ts
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
- job-badges.ts
- athlete
- battle-cards/layout.tsx
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- small
- bot-runner.mjs
- eslint.config.mjs
- lineup/route.ts
- recompute-wanderpocal.ts
- next.config.ts
- users/page.tsx
- lucide-react
- @vercel/blob
- [userId]/page.tsx
- backstory.ts
- spin/route.ts
- events/[id]/matches/route.ts
- start-poll/route.ts
- seed-standard-cards/route.ts
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
6. `Loader2` - 68 edges
7. `morphTargets` - 66 edges
8. `morphTargets` - 66 edges
9. `morphTargets` - 66 edges
10. `morphTargets` - 66 edges

## Surprising Connections (you probably didn't know these)
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts
- `StandardCardSeed` --references--> `ActiveSkillData`  [EXTRACTED]
  prisma/battle-cards-seed-data.ts → src/lib/battle-engine/types.ts
- `StandardCardSeed` --references--> `PassiveSkillData`  [EXTRACTED]
  prisma/battle-cards-seed-data.ts → src/lib/battle-engine/types.ts

## Import Cycles
- None detected.

## Communities (222 total, 34 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (66): POST(), DELETE(), GET(), PATCH(), POST(), GET(), PATCH(), DELETE() (+58 more)

### Community 1 - "prisma.ts"
Cohesion: 0.04
Nodes (71): LeaderboardPage(), MEDALS, metadata, PODIUM_CONFIG, CompareProfilePage(), fetchUserData(), UserData, Avatar() (+63 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.15
Nodes (20): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), CardUpgradeBadge(), DuplicateProgress() (+12 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.15
Nodes (15): GET(), POST(), DELETE(), displayNameOf(), PATCH(), UserLite, userSummary(), DELETE() (+7 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.20
Nodes (10): PATCH(), patchSchema, characterConfigSchema, PATCH(), requestSchema, metadata, CardCharacterSelection, CardContentError (+2 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.09
Nodes (47): LiveUnit, LiveDuelSnapshot, LiveUnitSnapshot, allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier() (+39 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.05
Nodes (52): POST(), AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection() (+44 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.07
Nodes (47): actionSchema, DUEL_STANCES, POST(), GET(), average(), GET(), POST(), VALID_DIFFICULTIES (+39 more)

### Community 8 - "interactive.ts"
Cohesion: 0.10
Nodes (54): CardUpgradeOverlay(), NextLevelPreview(), hasAnyValidMove(), pickEnemyForColumn(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage() (+46 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.05
Nodes (61): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+53 more)

### Community 10 - "time.ts"
Cohesion: 0.05
Nodes (51): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+43 more)

### Community 11 - "getSessionUser"
Cohesion: 0.08
Nodes (41): GET(), POST(), GET(), GET(), POST(), GET(), guideVoteEvents(), scoreBreakdown() (+33 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (56): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+48 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.13
Nodes (19): BattleCardData, VfxEvent, CardClassFilter, FILTERS, OwnedCardEntry, Selected, CardDetailModal(), CardDetailSelection (+11 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.08
Nodes (39): POST(), metadata, PixelCharacterPage(), DndCharacterRow, DndLocationRow, TYPE_LABEL, WorldMap(), List (+31 more)

### Community 16 - "ranks.ts"
Cohesion: 0.04
Nodes (70): DesktopProfileTabs(), Tab, PublicProfilePage(), ProfilePage(), Badge, ProfileJobBadge(), CustomBadgeDisplay, Props (+62 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.25
Nodes (76): morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets (+68 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.06
Nodes (33): ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction, DuelAttackType (+25 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.20
Nodes (14): GET(), IdeaPageClient(), IdeaPage(), ReportPage(), ReportPageClient(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData (+6 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.05
Nodes (40): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, AdminDonationsClient(), Donation (+32 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.07
Nodes (28): ActivityFeed(), cleanReason(), Filter, Tx, txType(), AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES (+20 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.17
Nodes (8): CardWithId, CLASS_CONFIG, CLASS_ORDER, ClassKey, StepDef, STEPS, CLASS_CONFIG, UnitClassKey

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.09
Nodes (34): api(), Idea, IdeasBoardClient(), IdeaList(), IdeaBody(), api(), AreaKey, FoundUser (+26 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.09
Nodes (28): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+20 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.09
Nodes (41): POST(), POST(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps() (+33 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.19
Nodes (13): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+5 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.08
Nodes (30): Anomalies, AnomaliesClient(), Person, AuditClient(), Entry, api(), CoachAttendance(), CoachAvailability() (+22 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.09
Nodes (41): GET(), GET(), GET(), isAuthorized(), buildCampaignEnemyTeam(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked() (+33 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.12
Nodes (26): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), GEMS_DIFFICULTIES, POST(), POST(), POST() (+18 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.16
Nodes (24): POST(), toJson(), ABILITY_KEYS, AbilityScores, clampToBaseline(), CLASS_SPEED_MIDPOINT, deriveBaseStats(), DerivedStats (+16 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.13
Nodes (11): PACK_KIND_INFO, PACK_KIND_ORDER, ShopConfigPanel(), TYPE_LABEL, ACCENT_CLASSES, PACK_INFO, PACK_ORDER, Package (+3 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (22): buildFfaRanking(), buildMatchRanking(), displayName(), ELEMENT_SIZE, ElementSlot, formatEntryStats(), IdentityFlipTile(), LayoutEntry (+14 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.13
Nodes (23): POST(), POST(), GET(), GET(), GET(), GET(), collectNominations(), CommunityNomination (+15 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.19
Nodes (21): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), formatStart() (+13 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.13
Nodes (20): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, BattleStatsPanel(), isStoredBattleLog(), StoredBattleLog (+12 more)

### Community 36 - "packs.ts"
Cohesion: 0.19
Nodes (16): asCardResult(), asTacticResult(), awardDrawnCard(), awardDrawnTacticCard(), COMMUNITY_CHANCE, drawCard(), drawCardsForPack(), drawExactCard() (+8 more)

### Community 37 - "MobaIcon"
Cohesion: 0.06
Nodes (42): GET(), GET(), PATCH(), GET(), GET(), POST(), PATCH(), POST() (+34 more)

### Community 38 - "types.ts"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.06
Nodes (63): GET(), PUT(), requestSchema, POST(), serializeDrawResult(), GET(), POST(), requestSchema (+55 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.10
Nodes (27): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), pickRandom(), aliveUnits(), resolveEffectTargets() (+19 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.17
Nodes (17): BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), BattleLauncher(), LeaderboardTabs(), Tab, TABS (+9 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.04
Nodes (112): APPLY, main(), GET(), PATCH(), PATCH(), PATCH(), GET(), POST() (+104 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.10
Nodes (36): GET(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames() (+28 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), StatusEntry, AdsTarget, ampCall(), AmpInstance, callWithSession() (+15 more)

### Community 45 - "auth.ts"
Cohesion: 0.16
Nodes (19): BodyModel(), CharacterBuilder(), GENDER_LABEL, CharacterRig(), PartModel(), bodyOf(), carryConfigOver(), defaultConfigFor() (+11 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.08
Nodes (20): RULES, metadata, russoOne, spaceGrotesk, viewport, AnimatedBackground(), Cell, PULSE_COLORS (+12 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.07
Nodes (39): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+31 more)

### Community 49 - "amp.ts"
Cohesion: 0.12
Nodes (21): DELETE(), DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES (+13 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.24
Nodes (8): POST(), computeKeptSeriesRankPoints(), PlacementReward, resetAllExceptSeries(), RewardsConfig, SelectiveResetSummary, LegacyStandingRow, SeriesEventForStandings

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (27): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+19 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.15
Nodes (17): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+9 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.14
Nodes (21): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+13 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.31
Nodes (8): GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), computeStatStandings(), loadSeriesRanking(), SeriesRankingRow

### Community 55 - "BattleLogEntry"
Cohesion: 0.14
Nodes (17): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), awardPoints(), parsePlacementPts() (+9 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.17
Nodes (17): GET(), isAuthorized(), POST(), GET(), withDndOverriddenFields(), DND_LOCATIONS, DndLocationDef, ensureDndWorldSeeded() (+9 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.04
Nodes (60): SteamGameResult, FORMATS, CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal() (+52 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (25): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+17 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.08
Nodes (44): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, AvailableAction, LiveSnapshot, SlotRow() (+36 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.05
Nodes (48): GET(), loadProfileOverlayState(), GamePlayer, GET(), GameserverWidget(), Server, ServerRow(), FavoriteGamesSection() (+40 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.14
Nodes (14): clips, file, normal, animations, bodies, genders, female, animations (+6 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.10
Nodes (18): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward, PLATFORMS (+10 more)

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): canvas-confetti, discord.js, gamedig, @google/generative-ai, motion, next, dependencies, canvas-confetti (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.18
Nodes (15): isAuthorized(), isOverridden(), POST(), toJson(), isAuthorized(), POST(), isAuthorized(), POST() (+7 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.29
Nodes (7): curvy, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (15): POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError, createChallenge() (+7 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.19
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.22
Nodes (9): cornerStyle(), ElementContent(), elementPositionStyle(), OverlayClient(), panelWidthFor(), pickTickerMatch(), usePanelRotator(), useStackedElements() (+1 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.20
Nodes (17): GET(), POST(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), generateBrandedCoverDataUri() (+9 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.12
Nodes (16): metadata, ABILITY_LABEL, ABILITY_SCORE_CANDIDATES, ABILITY_STEPS, CharacterCreation(), Phase, RolledCard, RollingReveal() (+8 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.05
Nodes (35): ClipVotingClient(), Nomination, Props, ClipDesMonatsPage(), MONTH_NAMES, GalleryEntry, MONTH_NAMES, Nomination (+27 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.11
Nodes (25): GET(), UserLite, AdminEventCompletePage(), DEFAULT_POLL, DEFAULT_REWARDS, MultiPollConfig, parsePoll(), parseRewards() (+17 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.08
Nodes (26): SeriesOption, api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem() (+18 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.12
Nodes (20): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+12 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.14
Nodes (17): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), RARITIES (+9 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.11
Nodes (18): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+10 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.06
Nodes (33): PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS, ModerationItemDto, ModerationClient(), AdminUsersClient() (+25 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.15
Nodes (14): DELETE(), PATCH(), POST(), DELETE(), GET(), PATCH(), AdminEventEditPage(), NewEventPage() (+6 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.13
Nodes (13): MonthlyContests, Props, YearlyContests, BattleCardsTabsInner(), DND_LINK_TAB, isTabKey(), TabKey, TABS (+5 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.05
Nodes (58): GET(), GET(), POST(), POST(), POST(), GET(), DELETE(), PATCH() (+50 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.19
Nodes (14): POST(), GET(), DEFAULT_SCENE, getLocationScene(), LOCATION_SCENES, LocationSceneDef, spawnPointFor(), ensureDndStoryContentSeeded() (+6 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.10
Nodes (20): base, bodyMaterial, label, parts, regions, bear, giant, guardian (+12 more)

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.22
Nodes (15): GET(), isAuthorized(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee(), updateEventStatus(), announceEventResults(), fmtDateDE() (+7 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.38
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 90 - "useConfirm"
Cohesion: 0.25
Nodes (8): tall, alwaysOn, base, bodyMaterial, defaults, label, parts, regions

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.09
Nodes (28): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, CommunityBoardWidget() (+20 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.08
Nodes (26): blocks, texture, blocks, texture, blocks, materials, texture, blocks (+18 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.10
Nodes (37): GemsResultScreen(), GemsReward, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue(), getArenaBackgroundStyle() (+29 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.03
Nodes (65): LinkedUser, Partner, PartnerManager(), TwitchPreview, AmpSuggestion, EMPTY_FORM, FormState, Light (+57 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.33
Nodes (10): grantGuaranteedPack(), findOwnCommunityCardId(), getTutorialProgress(), grantCoins(), hasOwnCommunityCard(), markTutorialCampaignLevel1Done(), markTutorialCommunityCardCustomized(), markTutorialNpcBattleDone() (+2 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.29
Nodes (6): centeredRect(), Handle, ImageCropTool(), PRESETS, Rect, Crop

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.05
Nodes (50): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+42 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.18
Nodes (6): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap, LifeBuoy

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 102 - "recurrence.ts"
Cohesion: 0.08
Nodes (28): COIN_SOURCES, PointsInfoModal(), Props, MONTH_NAMES, YearReviewPage(), CoinIcon(), CountUp(), CATEGORY_BADGE_CLASS (+20 more)

### Community 103 - "isVideoUrl"
Cohesion: 0.43
Nodes (6): eventSelect, FINISHED_STATUSES, GET(), RELEVANT_STATUSES, sortSeriesEvents(), toWidgetEvent()

### Community 104 - "studio-templates.ts"
Cohesion: 0.31
Nodes (25): defaults, defaults, slim, defaults, Bottom, Eyewear, FacialHair, Gloves (+17 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.11
Nodes (32): CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage() (+24 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.06
Nodes (40): GET(), GET(), POST(), GET(), GET(), GET(), POST(), GET() (+32 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.28
Nodes (3): Health, JobTexts, JobIcon()

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.26
Nodes (14): GET(), isAuthorized(), softResetRating(), grantDueSeasonRewards(), grantPlacementReward(), grantSeasonEndRewards(), hardResetAllElo(), resetAllCampaignProgress() (+6 more)

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.23
Nodes (11): GET(), PATCH(), POST(), AdminShopPage(), DEFAULT_PACK_PRICES, DEFAULT_WHEEL_PRIZES, DEFAULTS, getShopConfig() (+3 more)

### Community 111 - "skins/types.ts"
Cohesion: 0.22
Nodes (9): DevSkinTestPage(), SkinCanvas, SkinModel(), SkinCanvas, SkinPicker(), SKINS, skinAssetUrl(), SkinClips (+1 more)

### Community 112 - "BadgesSection.tsx"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.21
Nodes (12): ANIMS, CATALOG_PATH, CATEGORIES, CategoryDef, CROP, cropSheet(), main(), OUT_DIR (+4 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.25
Nodes (11): GET(), PATCH(), patchSchema, formatDate(), SeasonConfigPanel(), toDateInputValue(), getSeasonConfig(), KEYS (+3 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.24
Nodes (9): POST(), POST(), GET(), isAuthorized(), GET(), isAuthorized(), respondToChallenge(), dispatchNotification() (+1 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.47
Nodes (5): displayNameOf(), GET(), USER_SELECT, UserLite, userSummary()

### Community 118 - "AdminNav.tsx"
Cohesion: 0.10
Nodes (21): api(), AssetOption, buildEventTemplate(), EventOption, FoundUser, InterviewOption, PostOption, ReportEditor() (+13 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "TextsClient.tsx"
Cohesion: 0.24
Nodes (7): Menu, Share, BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.13
Nodes (23): POST(), ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, CLASS_BASE_STATS, isOverridden(), runSeasonUpdate(), toJson(), buildSeasonInputs() (+15 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.13
Nodes (26): POST(), GET(), GET(), authHeader(), DiscordEmbed, DiscordGuildEmoji, DiscordTextChannel, listGuildEmojis() (+18 more)

### Community 124 - "ServerCard.tsx"
Cohesion: 0.29
Nodes (9): POST(), POST(), notifyPvpBattleResolved(), advanceDndQuestObjective(), advanceDndQuestObjectiveForUser(), DND_QUESTS, ensureDndQuestsSeeded(), rewardDndQuest() (+1 more)

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.43
Nodes (6): GET(), POST(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole()

### Community 126 - "ServerCard.tsx"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.04
Nodes (49): Badge, CATEGORIES, CATEGORY_LABELS, User, CardRow, TacticCardRow, Event, EventAdminRow() (+41 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "ThemeProvider.tsx"
Cohesion: 0.33
Nodes (8): checkAndAwardBadges(), loadStats(), BADGE_CATEGORY_LABELS, BADGE_DEFS, BadgeDef, BadgeStats, findNewlyEarnedBadges(), getBadgeDef()

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.36
Nodes (7): GET(), POST(), GET(), OptionInput, POST(), sendDiscordDMToAll(), sendPushToAll()

### Community 132 - "react"
Cohesion: 0.28
Nodes (8): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), communityCardPoolSize(), countPacksPurchasedToday(), PackKind, startOfTodayUTC()

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "react-dom"
Cohesion: 0.53
Nodes (4): GET(), displayName(), EventFacts, getEventFacts()

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
Cohesion: 0.33
Nodes (6): tank, base, bodyMaterial, label, parts, regions

### Community 139 - "widget/events/route.ts"
Cohesion: 0.06
Nodes (42): EventCardLink(), DashboardLayout(), BackToTop(), BottomNav(), NAV, DiscordLoginButton(), Props, FloatingPill() (+34 more)

### Community 140 - "sonner"
Cohesion: 0.22
Nodes (5): metadata, RouteOption, SceneData, SceneEventLogEntry, ScenePresentCard

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.06
Nodes (42): ACTIVITY_TIER_ICON, BattleCardSkill, LEVEL_BORDER, BattleChallengeWidget(), Mode, CampaignBoardLevel, LevelNode(), offsetFor() (+34 more)

### Community 142 - "three"
Cohesion: 0.39
Nodes (7): RankRow(), BattleRankBadge(), BATTLE_RANKS, BattleRankEntry, getBattleRank(), getBattleRankFullLabel(), computeRankUp()

### Community 143 - "@types/canvas-confetti"
Cohesion: 0.25
Nodes (5): DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, StatBadges(), TacticCardTileData

### Community 144 - "tank"
Cohesion: 0.39
Nodes (6): POST(), requestSchema, grantStarterPick(), REQUIRED_CLASSES, StarterPickError, startOrResetTutorial()

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.28
Nodes (13): skin, skin, skin, skin, skin, skin, block, row (+5 more)

### Community 146 - "notifications.ts"
Cohesion: 0.07
Nodes (44): DELETE(), POST(), GET(), POST(), POST(), POST(), DELETE(), PATCH() (+36 more)

### Community 147 - "bear"
Cohesion: 0.29
Nodes (7): BattleCardView(), CardTile(), UnitSlot(), LineupStrip(), GemBeamOverlay(), UltimateCutsceneOverlay(), getClassConfig()

### Community 148 - "@types/three"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "discord-roles.ts"
Cohesion: 0.18
Nodes (15): RankTile(), JobBadgeProps, useJobBadge(), RankedAvatarProps, RankRing(), RankRingProps, JobBadgeData, JOB_ICONS (+7 more)

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 158 - "SeasonConfigPanel.tsx"
Cohesion: 0.12
Nodes (25): GET(), GET(), isAuthorized(), calcStreak(), GET(), GET(), POST(), CreateContestForm() (+17 more)

### Community 160 - "preferences/route.ts"
Cohesion: 0.03
Nodes (33): DEFAULTS, main(), RULES, RuleSeed, DISCORD_REASONS, GET(), isAuthorized(), GET() (+25 more)

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 163 - "HeroStatValue.tsx"
Cohesion: 0.11
Nodes (26): curve(), curvePercent(), STANDARD_CARDS, StandardCardSeed, GET(), isAuthorized(), POST(), toJson() (+18 more)

### Community 166 - "FloatingLobbyChat.tsx"
Cohesion: 0.44
Nodes (11): alwaysOn, alwaysOn, alwaysOn, alwaysOn, alwaysOn, alwaysOn, alwaysOn, alwaysOn (+3 more)

### Community 167 - "generate-brand-assets.ts"
Cohesion: 0.40
Nodes (3): OUT_DIR, PNG_SIZES, SOURCE

### Community 168 - "widget/events/route.ts"
Cohesion: 0.29
Nodes (11): categories, categories, Bottom, Eyewear, FacialHair, Gloves, Hair, Headwear (+3 more)

### Community 172 - "Kapitel-Hintergründe — Kampagne"
Cohesion: 0.50
Nodes (3): Benötigte Dateien, Format, Kapitel-Hintergründe — Kampagne

### Community 179 - "job-badges.ts"
Cohesion: 0.33
Nodes (6): BADGE_LEVEL_THRESHOLDS, JOB_BADGE_META, JOB_LEVEL_TITLES, LEVEL_RING_COLORS, levelFromPoints(), weeklyBadgePoints()

### Community 180 - "athlete"
Cohesion: 0.33
Nodes (6): base, bodyMaterial, label, parts, regions, athlete

### Community 185 - "small"
Cohesion: 0.33
Nodes (6): small, base, bodyMaterial, label, parts, regions

### Community 188 - "lineup/route.ts"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 189 - "recompute-wanderpocal.ts"
Cohesion: 0.47
Nodes (4): POST(), ALL_CATEGORIES, ALL_GENRES, recomputeWanderpocalHolders()

### Community 191 - "users/page.tsx"
Cohesion: 0.40
Nodes (4): AdminUsersPage(), SyncMembersButton(), LogIn, UserX

### Community 192 - "lucide-react"
Cohesion: 0.29
Nodes (7): strong, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 194 - "[userId]/page.tsx"
Cohesion: 0.40
Nodes (5): ELEMENT_KEYS, parseLayout(), ProfileOverlayPage(), ProfileElementKey, ProfileLayoutPositions

### Community 195 - "backstory.ts"
Cohesion: 0.40
Nodes (5): generateBackstory(), HOOKS, OPENERS, ORIGINS, pick()

### Community 196 - "spin/route.ts"
Cohesion: 0.70
Nodes (4): GET(), POST(), rollPrize(), todayStr()

### Community 197 - "events/[id]/matches/route.ts"
Cohesion: 0.60
Nodes (4): displayNameOf(), POST(), UserLite, userSummary()

### Community 254 - "ScoreBreakdownBlock.tsx"
Cohesion: 0.36
Nodes (7): Breakdown, fmt(), ScoreBreakdownBlock(), signed(), StreamResult, Week, Scale

### Community 270 - "[contribId]/route.ts"
Cohesion: 0.06
Nodes (51): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), DELETE(), GET() (+43 more)

### Community 274 - "HeroStatValue.tsx"
Cohesion: 0.03
Nodes (87): Event, needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES, AdminEventsPage() (+79 more)

## Knowledge Gaps
- **1191 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1186 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `report/[id]/page.tsx` to `roles.ts`, `prisma.ts`, `react`, `react-dom`, `app/layout.tsx`, `coach-service.ts`, `getSessionUser`, `[contribId]/route.ts`, `ranks.ts`, `notifications.ts`, `CommunityJobsAdminPanel.tsx`, `HeroStatValue.tsx`, `requireModeratorOrEventSquadCaptain`, `SeasonConfigPanel.tsx`, `preferences/route.ts`, `MobaIcon`, `types.ts`, `community-job-config.ts`, `job-recommendations.ts`, `amp.ts`, `DailyPollBanner.tsx`, `BattleLogEntry`, `formatBerlinTime`, `SeriesIcon.tsx`, `ClipVotingClient.tsx`, `bot/index.ts`, `admin/community-jobs/disputes/route.ts`, `recurrence.ts`, `minigames-config.ts`, `upload/route.ts`, `AdminDonationsClient.tsx`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `app/layout.tsx` to `prisma.ts`, `time.ts`, `CommunityJobsPanel.tsx`, `ranks.ts`, `HeroStatValue.tsx`, `MobaIcon.tsx`, `ProfileMobileView.tsx`, `board-match3.ts`, `MobaIcon`, `formatBerlinDate`, `community-job-config.ts`, `FotografTools.tsx`, `SeriesDetailClient.tsx`, `dashboard/page.tsx`, `SeriesIcon.tsx`, `tutorial.ts`, `ProfileOverlayClient.tsx`, `AdminEventsClient.tsx`, `ConfirmDialog.tsx`, `apply-season-results.ts`, `(dashboard)/battle-cards/page.tsx`, `report/[id]/page.tsx`, `AdminNav.tsx`, `ScoreBreakdownBlock.tsx`, `promotion-request-service.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `react`, `@vercel/blob`, `react-dom`, `sharp`, `seed-standard-cards/route.ts`, `sonner`, `three`, `@types/canvas-confetti`, `@types/three`, `web-push`, `zod`, `scripts`, `zod`, `next-auth`, `postprocessing`, `@prisma/client`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1191 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03384567613724577 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03969298245614035 - nodes in this community are weakly interconnected._
- **Should `journalist-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09485815602836879 - nodes in this community are weakly interconnected._