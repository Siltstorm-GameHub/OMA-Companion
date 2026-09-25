# Graph Report - OMA-Companion  (2026-09-25)

## Corpus Check
- 1003 files · ~3,365,182 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4978 nodes · 13506 edges · 188 communities (167 shown, 21 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.65)
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
- tank
- @types/three
- middleware.ts
- discord-roles.ts
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
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts
- `BoardMatch3()` --indirect_call--> `cell()`  [INFERRED]
  src/components/battle-cards/BoardMatch3.tsx → src/components/community-jobs/ReportEditor.tsx
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json
- `StandardCardSeed` --references--> `ActiveSkillData`  [EXTRACTED]
  prisma/battle-cards-seed-data.ts → src/lib/battle-engine/types.ts

## Import Cycles
- None detected.

## Communities (188 total, 21 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (70): POST(), POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET() (+62 more)

### Community 1 - "prisma.ts"
Cohesion: 0.10
Nodes (29): calcEntryAvg(), Entry, FfaView(), fmtUpTo2(), Match, MEDAL, Participant, uname() (+21 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.08
Nodes (33): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), RARITIES, STEP_LABELS (+25 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.10
Nodes (40): POST(), POST(), DndCharacterRow, DndLocationRow, formatDuration(), polygonPoints(), TYPE_LABEL, WorldMap() (+32 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.04
Nodes (50): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+42 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.11
Nodes (39): applyShieldAbsorption(), allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog() (+31 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.09
Nodes (19): metadata, russoOne, spaceGrotesk, viewport, AnimatedBackground(), Cell, PULSE_COLORS, CursorGlow() (+11 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.08
Nodes (47): actionSchema, DUEL_STANCES, POST(), GET(), average(), GET(), POST(), VALID_DIFFICULTIES (+39 more)

### Community 8 - "interactive.ts"
Cohesion: 0.11
Nodes (51): hasAnyValidMove(), LEVEL_STAT_MULTIPLIER, DamageRoll, rollDamage(), ActionEstimate, DecisionTargetKind, describeAvailableActions(), estimateActionEffect() (+43 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.05
Nodes (69): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+61 more)

### Community 10 - "time.ts"
Cohesion: 0.06
Nodes (41): FeedCard(), Thumb(), PickedGameCover, api(), AreaKey, FoundUser, GameInfo, IdeaForm() (+33 more)

### Community 11 - "getSessionUser"
Cohesion: 0.05
Nodes (69): GET(), POST(), GET(), DELETE(), PATCH(), GET(), POST(), GET() (+61 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (62): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+54 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.26
Nodes (12): POST(), EventSetupWizard(), buildBerlinDate(), calcNextDate(), daysInMonthOf(), describeMonthlyModes(), MonthlyMode, nthWeekdayOfMonth() (+4 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.10
Nodes (35): BattleFigure(), Props, drawFrame(), imageCache, loadLayers(), loadPixelImage(), PixelCharacter(), Props (+27 more)

### Community 16 - "ranks.ts"
Cohesion: 0.12
Nodes (26): BracketView(), Match, Participant, roundLabel(), uname(), User, Props, WanderpocalBadge() (+18 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.07
Nodes (39): AlbumPage(), DesktopProfileTabs(), Tab, PublicProfilePage(), ProfilePage(), Badge, ProfileJobBadge(), ProfileRecentEvents() (+31 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.06
Nodes (33): ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction, DuelAttackType (+25 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.13
Nodes (17): GameserverWidget(), Server, ServerRow(), ServersPage(), Light, LIGHT_COLOR, LIGHT_LABEL, Server (+9 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.12
Nodes (18): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+10 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.04
Nodes (55): ActivityFeed(), cleanReason(), Filter, Tx, txType(), Avatar(), computeGroups(), computePlacementMap() (+47 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.22
Nodes (8): BattleCardData, DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, LiveDuelHandCard, LineupCard, StatBadges(), LiveDuelHandCard

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.05
Nodes (37): Badge, CATEGORIES, CATEGORY_LABELS, User, DailyMessagePanel(), defaultForm(), formatDate(), FormState (+29 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.09
Nodes (30): Membership, Squad, SquadDetailClient(), User, Squad, Avatar(), EVENT_STATUS_LABEL, SquadPublicPage() (+22 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.10
Nodes (44): POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps(), POST(), GET() (+36 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.10
Nodes (38): GET(), GET(), GET(), isAuthorized(), buildCampaignEnemyTeam(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked() (+30 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.22
Nodes (15): GEMS_DIFFICULTIES, POST(), formatStart(), GET(), POST(), generateBrandedCoverDataUri(), announceEventResults(), announceNewEvent() (+7 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.10
Nodes (36): POST(), toJson(), ABILITY_LABEL, ABILITY_SCORE_CANDIDATES, ABILITY_STEPS, CharacterCreation(), Phase, RolledCard (+28 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.09
Nodes (28): GET(), PATCH(), POST(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage() (+20 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (21): buildFfaRanking(), buildMatchRanking(), displayName(), ElementSlot, formatEntryStats(), IdentityFlipTile(), LayoutEntry, MatchTicker() (+13 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.11
Nodes (26): POST(), POST(), GET(), PATCH(), POST(), GET(), GET(), GET() (+18 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.21
Nodes (19): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+11 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.27
Nodes (8): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, Flame, Handshake, isStoredBattleLog()

### Community 36 - "packs.ts"
Cohesion: 0.10
Nodes (31): POST(), serializeDrawResult(), PACK_LABEL, POST(), VALID_KINDS, ShopPage(), CHEST_TABLE, ChestPrize (+23 more)

### Community 37 - "MobaIcon"
Cohesion: 0.07
Nodes (39): DELETE(), POST(), GET(), POST(), DELETE(), GET(), POST(), GET() (+31 more)

### Community 38 - "types.ts"
Cohesion: 0.07
Nodes (26): SteamGameResult, DEFAULT_POLL_ITEM, DEFAULT_REWARDS, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward (+18 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.06
Nodes (64): POST(), GET(), PUT(), requestSchema, POST(), GET(), POST(), requestSchema (+56 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.08
Nodes (38): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleStatsPanel(), LiveUnit, StoredBattleLog (+30 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.07
Nodes (30): BattleCardsTabsInner(), DND_LINK_TAB, isTabKey(), TabKey, TABS, BattleLauncher(), Mode, CampaignBoardLevel (+22 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.05
Nodes (67): APPLY, main(), GET(), POST(), GET(), GET(), POST(), GET() (+59 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.11
Nodes (35): berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames(), getDismissedItemKeys() (+27 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.20
Nodes (14): GET(), AdsTarget, ampCall(), AmpInstance, callWithSession(), getBaseUrl(), getInstanceDetails(), getInstanceSummaries() (+6 more)

### Community 45 - "auth.ts"
Cohesion: 0.06
Nodes (38): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedEntry (+30 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.38
Nodes (8): buildSegments(), DailySpin(), PALETTE_BY_TYPE, pt(), rimPath(), segPath(), splitLabel(), useMidnightCountdown()

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.07
Nodes (39): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+31 more)

### Community 49 - "amp.ts"
Cohesion: 0.22
Nodes (21): LiveBattleView(), beep(), getContext(), noiseBurst(), playCardRevealSound(), playCommunityBonusSound(), playCritSound(), playDamageSound() (+13 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.23
Nodes (11): gamedig, gamedig, GET(), GET(), StatusEntry, getInstances(), getInstancesRaw(), toInstanceStatus() (+3 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.15
Nodes (27): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+19 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.14
Nodes (18): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+10 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.12
Nodes (24): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+16 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.21
Nodes (9): choose(), coastal(), neighbors(), pick(), Baut eine Hex-Weltkarte aus den Assets in ../Hex Map. Aufruf: python build_world, alle Dateien <prefix>NN.png (nur Ziffern hinter dem Prefix), terrain_of(), terrain_of_fixed() (+1 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.16
Nodes (15): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), AdminEventBracketPage(), revokePointsByReason() (+7 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.12
Nodes (24): GET(), POST(), DELETE(), DELETE(), DELETE(), AuditActor, deleteComment(), AUTHOR (+16 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.04
Nodes (56): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+48 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (25): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+17 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.08
Nodes (44): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, LiveSnapshot, LiveBattleAwaiting, activationCellsFor() (+36 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.17
Nodes (14): GET(), loadProfileOverlayState(), NextEventTile(), GameCoverPicker(), GameCover(), GameNameInput(), highlightMatch(), escapeRegExp() (+6 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.07
Nodes (23): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, FullStandingsToggle(), Props, StandingRow (+15 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.11
Nodes (16): CustomBadgeDisplay, Props, Tab, TABS, ProfileQuestEntry, ProfileTournamentParticipationEntry, Props, ProfileRecentEventEntry (+8 more)

### Community 65 - "dependencies"
Cohesion: 0.04
Nodes (47): @auth/prisma-adapter, canvas-confetti, discord.js, @google/generative-ai, lucide-react, motion, next, next-auth (+39 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.10
Nodes (30): GET(), isAuthorized(), GET(), isAuthorized(), isOverridden(), POST(), toJson(), isAuthorized() (+22 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.20
Nodes (11): GET(), isAuthorized(), CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), TrendingDown, CATEGORY_LABELS, DAILY_CAPS (+3 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.19
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.19
Nodes (15): DELETE(), POST(), DELETE(), POST(), DELETE(), POST(), handleCommunityJobReaction(), notifyVoteMilestone() (+7 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.30
Nodes (10): GET(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), getGradientBackground(), getLogoBadge() (+2 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.31
Nodes (5): metadata, DndHome(), DndMigrationBanner(), formatDeadline(), DND_MIGRATION_DEADLINE

### Community 74 - "formatBerlinTime"
Cohesion: 0.08
Nodes (27): ClipVotingClient(), Nomination, Props, ClipDesMonatsPage(), MONTH_NAMES, GalleryEntry, MONTH_NAMES, Nomination (+19 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.06
Nodes (48): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+40 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.13
Nodes (19): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+11 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.19
Nodes (14): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), DEFAULT_SEASON_REWARD_CONFIG (+6 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.10
Nodes (14): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+6 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.05
Nodes (39): PayoutsClient(), Preview, Run, Week, api(), Idea, IdeasBoardClient(), MODERATION_TYPE_OPTIONS (+31 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.08
Nodes (51): GET(), PATCH(), PATCH(), PATCH(), PATCH(), PATCH(), GET(), PATCH() (+43 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.07
Nodes (28): MonthlyContests, Props, YearlyContests, EventsTabs(), CATEGORY_STRIP, EVENT_STATUS, TabItem, TabPanel() (+20 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.05
Nodes (65): GET(), GET(), POST(), POST(), DELETE(), PATCH(), POST(), GET() (+57 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.18
Nodes (15): POST(), GET(), DEFAULT_SCENE, getLocationScene(), LOCATION_SCENES, LocationSceneDef, spawnPointFor(), ensureDndStoryContentSeeded() (+7 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.04
Nodes (12): POST(), requestSchema, GameSuggestion, GameSuggestion, DEFAULT_PREFS, metadata, { handlers, auth, signIn, signOut }, checkAndAwardBadges() (+4 more)

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.08
Nodes (30): CustomBadgeDisplay, Props, MONTH_NAMES, YearReviewPage(), BadgeIcon(), BadgeIconProps, CATEGORY_BADGE_CLASS, EventPokalWinners() (+22 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.11
Nodes (15): api(), Coach, CoachRatingSection(), RateableSession, EventWinnerPredictionWidget(), Prediction, uname(), UserLite (+7 more)

### Community 90 - "useConfirm"
Cohesion: 0.29
Nodes (11): GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props, Users (+3 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.13
Nodes (15): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, centeredRect() (+7 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.15
Nodes (15): main(), DISCORD_REASONS, GET(), isAuthorized(), POST(), POST(), POST(), PATCH() (+7 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.09
Nodes (26): VfxEvent, LiveDuelUnit, UltimateBurst, GemsResultScreen(), GemsReward, AvailableAction, computeGemsReward(), describeLogEntry() (+18 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.03
Nodes (73): RULES, AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, CardRow (+65 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.15
Nodes (22): BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), LeaderboardTabs(), Tab, TABS, getCombinedElo() (+14 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.22
Nodes (9): cornerStyle(), ElementContent(), elementPositionStyle(), OverlayClient(), panelWidthFor(), pickTickerMatch(), usePanelRotator(), useStackedElements() (+1 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.05
Nodes (52): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+44 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.13
Nodes (13): Props, WinnerClip, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount, Poll, PollCard() (+5 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 102 - "recurrence.ts"
Cohesion: 0.43
Nodes (6): GET(), POST(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole()

### Community 103 - "isVideoUrl"
Cohesion: 0.22
Nodes (13): GET(), IdeaPageClient(), IdeaPage(), ReportPage(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData, toIdeaFeedEntry() (+5 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.26
Nodes (9): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), POST(), DISCORD_COLORS, createPollsForEvent(), parsePollsConfigJson() (+1 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.22
Nodes (18): checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction(), trackVoice(), client (+10 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.12
Nodes (21): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+13 more)

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.05
Nodes (62): GET(), GET(), PATCH(), GET(), PATCH(), GET(), GET(), POST() (+54 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.31
Nodes (10): POST(), GET(), POST(), answerInterview(), createInterview(), declineInterview(), InterviewResult, listMyInterviews() (+2 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.40
Nodes (5): ELEMENT_KEYS, parseLayout(), ProfileOverlayPage(), ProfileElementKey, ProfileLayoutPositions

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.24
Nodes (8): RankRow(), BattleRankBadge(), RANK_STYLE, BATTLE_RANKS, BattleRankEntry, getBattleRank(), getBattleRankFullLabel(), computeRankUp()

### Community 111 - "skins/types.ts"
Cohesion: 0.08
Nodes (26): CreateContestForm(), defaultPeriodEnd(), defaultPeriodStart(), toDateInputValue(), ServerCredentials(), ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS (+18 more)

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
Cohesion: 0.16
Nodes (24): GET(), PATCH(), patchSchema, GET(), isAuthorized(), softResetRating(), addMonthsUTC(), getCurrentSeasonNumber() (+16 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.10
Nodes (33): GET(), GET(), isAuthorized(), GET(), isAuthorized(), calcStreak(), GET(), GET() (+25 more)

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
Cohesion: 0.31
Nodes (8): awardPoints(), parsePlacementPts(), PATCH(), BracketMatch, generateBracket(), generateRoundRobin(), POST(), shuffle()

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.13
Nodes (23): POST(), ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, CLASS_BASE_STATS, isOverridden(), runSeasonUpdate(), toJson(), buildSeasonInputs() (+15 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.20
Nodes (15): GET(), isAuthorized(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee(), updateEventStatus(), fmtDateDE(), eventParticipationCoins() (+7 more)

### Community 124 - "ServerCard.tsx"
Cohesion: 0.26
Nodes (9): POST(), POST(), notifyPvpBattleResolved(), advanceDndQuestObjective(), advanceDndQuestObjectiveForUser(), DND_QUESTS, ensureDndQuestsSeeded(), rewardDndQuest() (+1 more)

### Community 125 - "notifications/page.tsx"
Cohesion: 0.33
Nodes (7): PATCH(), patchSchema, PATCH(), requestSchema, CardContentError, CardContentPatch, updateCardContent()

### Community 126 - "series/[id]/complete/route.ts"
Cohesion: 0.31
Nodes (7): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardEventPokal(), awardSeriesPokal()

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.07
Nodes (25): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+17 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "ThemeProvider.tsx"
Cohesion: 0.33
Nodes (7): DELETE(), PATCH(), POST(), DELETE(), GET(), PATCH(), requireModeratorOrSquadCaptain()

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.20
Nodes (16): POST(), resolveChannelId(), createNotificationForUsers(), isTypeEnabled(), NotificationType, PREF_KEY, dispatchDiscordDm(), DispatchOptions (+8 more)

### Community 132 - "widget/events/route.ts"
Cohesion: 0.43
Nodes (6): eventSelect, FINISHED_STATUSES, GET(), RELEVANT_STATUSES, sortSeriesEvents(), toWidgetEvent()

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
Cohesion: 0.05
Nodes (47): EventCardLink(), DashboardLayout(), LeaderboardPage(), MEDALS, metadata, PODIUM_CONFIG, BackToTop(), BottomNav() (+39 more)

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.13
Nodes (19): ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge(), ChallengeUserPicker(), uname(), UserLite (+11 more)

### Community 142 - "three"
Cohesion: 0.08
Nodes (20): ACTIVITY_TIER_ICON, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardUpgradeAnimationState, CardUpgradeOverlay(), UnitSlot(), LineupStrip() (+12 more)

### Community 144 - "tank"
Cohesion: 0.39
Nodes (6): POST(), requestSchema, grantStarterPick(), REQUIRED_CLASSES, StarterPickError, startOrResetTutorial()

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

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 160 - "preferences/route.ts"
Cohesion: 0.06
Nodes (26): DEFAULTS, GET(), POST(), DELETE(), displayNameOf(), PATCH(), UserLite, userSummary() (+18 more)

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
Nodes (43): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), GET(), GET() (+35 more)

### Community 274 - "HeroStatValue.tsx"
Cohesion: 0.05
Nodes (56): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+48 more)

## Knowledge Gaps
- **1111 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1106 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `report/[id]/page.tsx` to `roles.ts`, `ThemeProvider.tsx`, `coach-service.ts`, `getSessionUser`, `widget/events/route.ts`, `[contribId]/route.ts`, `duel-live-battle.ts`, `HeroStatValue.tsx`, `(dashboard)/leaderboard/page.tsx`, `notify-dispatch.ts`, `requireModeratorOrEventSquadCaptain`, `packs.ts`, `MobaIcon`, `community-job-config.ts`, `DailyPollBanner.tsx`, `BattleLogEntry`, `EventEditClient.tsx`, `EmptyState.tsx`, `admin/events/[id]/complete/route.ts`, `GameNameInput.tsx`, `formatBerlinTime`, `SeriesIcon.tsx`, `ClipVotingClient.tsx`, `(dashboard)/events/page.tsx`, `bot/index.ts`, `send/route.ts`, `community-job-discord-votes.ts`, `admin/community-jobs/disputes/route.ts`, `isVideoUrl`, `photo-request-service.ts`, `BadgesSection.tsx`, `report/[id]/page.tsx`, `report-event-facts.ts`, `upload/route.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ThemeProvider.tsx`, `ranked-season.ts`, `DashboardChrome.tsx`, `series/[id]/complete/route.ts`, `[tacticCardId]/route.ts`, `series-event-points.ts`, `duels-live.ts`, `@types/three`, `ProfileMobileView.tsx`, `new-season/page.tsx`, `requireModeratorOrEventSquadCaptain`, `shop-config.ts`, `clip-contest.ts`, `JobBadge.tsx`, `dispatchNotification`, `CoinIcon.tsx`, `revert-event-completion.ts`, `hasMinRole`, `SeriesIcon.tsx`, `community-job-payout/route.ts`, `ClipVotingClient.tsx`, `apply-season-results.ts`, `recurrence.ts`, `studio-templates.ts`, `photo-request-service.ts`, `report/[id]/page.tsx`, `ThemeProvider.tsx`, `duels/[id]/respond/route.ts`, `notifications/page.tsx`, `series/[id]/complete/route.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `@vercel/blob`, `scripts`, `dispatchNotification`, `getActiveMembership`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1111 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02677681241988321 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0962566844919786 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08484848484848485 - nodes in this community are weakly interconnected._