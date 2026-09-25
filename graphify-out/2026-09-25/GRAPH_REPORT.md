# Graph Report - OMA-Companion  (2026-09-25)

## Corpus Check
- 1014 files · ~3,586,061 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5079 nodes · 13947 edges · 181 communities (164 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.62)
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
- Product
- GuildHub – Discord Companion
- [tacticCardId]/route.ts
- widget/events/route.ts
- StarterPickFlow.tsx
- three
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
- HeroSetup.tsx
- UserRoleManager.tsx
- chroma-key.js
- applyMatchResult.ts
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
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts
- `main()` --calls--> `getCommunityJob()`  [EXTRACTED]
  scripts/fix-community-job-payouts.ts → src/lib/community-jobs.ts

## Import Cycles
- None detected.

## Communities (181 total, 17 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (65): POST(), POST(), DELETE(), GET(), PATCH(), POST(), GET(), PATCH() (+57 more)

### Community 1 - "prisma.ts"
Cohesion: 0.09
Nodes (20): api(), Idea, IdeasBoardClient(), AuditClient(), Entry, IdeaList(), api(), GameCard() (+12 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.05
Nodes (64): POST(), GET(), PATCH(), patchSchema, placementSchema, GET(), PATCH(), patchSchema (+56 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.11
Nodes (33): POST(), DndCharacterRow, DndLocationRow, formatDuration(), polygonPoints(), TYPE_LABEL, WorldMap(), Minus (+25 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.20
Nodes (15): makeRng(), npcLook(), Rect, StampDef, StampId, GroundTheme, BlockRef, Building (+7 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.11
Nodes (24): FORMATS, CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant (+16 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.08
Nodes (44): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, AvailableAction, LiveSnapshot, cell() (+36 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.05
Nodes (85): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+77 more)

### Community 8 - "interactive.ts"
Cohesion: 0.07
Nodes (76): TacticCardSeed, StoredBattleLog, LiveBattleSnapshot, hasAnyValidMove(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage() (+68 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.05
Nodes (65): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+57 more)

### Community 10 - "time.ts"
Cohesion: 0.05
Nodes (65): GET(), GET(), POST(), POST(), GET(), DELETE(), PATCH(), POST() (+57 more)

### Community 11 - "getSessionUser"
Cohesion: 0.05
Nodes (71): GET(), DELETE(), POST(), GET(), GET(), POST(), POST(), POST() (+63 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (40): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+32 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.08
Nodes (42): GET(), GET(), GET(), isAuthorized(), calcStreak(), GET(), formatDate(), SeasonConfigPanel() (+34 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.12
Nodes (20): DELETE(), DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES (+12 more)

### Community 16 - "ranks.ts"
Cohesion: 0.16
Nodes (21): BracketView(), Match, Participant, roundLabel(), uname(), User, Props, WanderpocalBadge() (+13 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.05
Nodes (58): CustomBadgeDisplay, Props, PublicProfilePage(), ProfilePage(), formatBirthday(), ProfileEditor(), Props, CustomBadgeDisplay (+50 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (39): VfxEvent, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction (+31 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.11
Nodes (18): GameserverWidget(), Server, ServerRow(), Light, LIGHT_COLOR, LIGHT_LABEL, Server, ServerCard() (+10 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.06
Nodes (32): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+24 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.07
Nodes (33): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+25 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.14
Nodes (17): main(), DISCORD_REASONS, GET(), isAuthorized(), CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), createNotification() (+9 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.06
Nodes (35): EventUser, Props, SeriesEventItem, STATUS_CFG, StreamingPartner, FORMAT_LABELS, STATUS_STYLES, AppIcon() (+27 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.06
Nodes (64): POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps(), POST(), GET() (+56 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.09
Nodes (25): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+17 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.07
Nodes (28): MonthlyContests, Props, YearlyContests, SeriesOption, EventsTabs(), ConfirmDialog(), TabItem, TabPanel() (+20 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.10
Nodes (38): GET(), GET(), GET(), isAuthorized(), buildCampaignEnemyTeam(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked() (+30 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.22
Nodes (12): GET(), Params, POST(), GET(), appBaseUrl(), buildOverlaySettingsUrl(), buildProfileOverlaySettingsUrl(), ensureOverlayToken() (+4 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.09
Nodes (41): POST(), toJson(), ABILITY_LABEL, ABILITY_SCORE_CANDIDATES, ABILITY_STEPS, CharacterCreation(), Phase, ROLE_BADGE (+33 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.23
Nodes (11): gamedig, gamedig, GET(), GET(), StatusEntry, getInstances(), getInstancesRaw(), toInstanceStatus() (+3 more)

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
Cohesion: 0.27
Nodes (8): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, ArrowLeft, Flame, isStoredBattleLog()

### Community 36 - "packs.ts"
Cohesion: 0.07
Nodes (50): POST(), serializeDrawResult(), PACK_LABEL, POST(), VALID_KINDS, BattleCardsPage(), metadata, userSelect (+42 more)

### Community 37 - "MobaIcon"
Cohesion: 0.24
Nodes (15): LOGO_POSITIONS, StudioEditor(), ImageDown, drawLogo(), drawWatermark(), loadImage(), LogoPosition, prepareUploadImage() (+7 more)

### Community 38 - "types.ts"
Cohesion: 0.04
Nodes (59): Anomalies, AnomaliesClient(), Person, AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel() (+51 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.06
Nodes (62): POST(), GET(), PUT(), requestSchema, POST(), GET(), POST(), requestSchema (+54 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.52
Nodes (5): BattleStatsPanel(), computeBattleStats(), findMvpId(), score(), UnitBattleStats

### Community 41 - "formatBerlinDate"
Cohesion: 0.04
Nodes (74): BattleCardsTabsInner(), DND_LINK_TAB, isTabKey(), TabKey, TABS, COIN_SOURCES, PointsInfoModal(), EventWinnerPredictionWidget() (+66 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.04
Nodes (88): APPLY, main(), PATCH(), GET(), GET(), POST(), GET(), POST() (+80 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.11
Nodes (35): GET(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames() (+27 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.20
Nodes (14): GET(), AdsTarget, ampCall(), AmpInstance, callWithSession(), getBaseUrl(), getInstanceDetails(), getInstanceSummaries() (+6 more)

### Community 45 - "auth.ts"
Cohesion: 0.08
Nodes (25): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), GuideBody() (+17 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.11
Nodes (35): bakeStatic(), drawQuarters(), drawStamp(), loadSheets(), Props, SHEET_FILES, SheetKey, Sheets (+27 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.12
Nodes (17): metadata, russoOne, spaceGrotesk, viewport, CursorGlow(), ExitAppGuard(), TRAP_STATE, Moon (+9 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.09
Nodes (24): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+16 more)

### Community 49 - "amp.ts"
Cohesion: 0.20
Nodes (22): LiveBattleView(), beep(), getContext(), noiseBurst(), playCardRevealSound(), playCommunityBonusSound(), playCritSound(), playDamageSound() (+14 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.05
Nodes (47): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward, PLATFORMS (+39 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.14
Nodes (29): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+21 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.14
Nodes (17): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+9 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.08
Nodes (34): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+26 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.21
Nodes (9): choose(), coastal(), neighbors(), pick(), Baut eine Hex-Weltkarte aus den Assets in ../Hex Map. Aufruf: python build_world, alle Dateien <prefix>NN.png (nur Ziffern hinter dem Prefix), terrain_of(), terrain_of_fixed() (+1 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.09
Nodes (27): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), awardPoints(), parsePlacementPts() (+19 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.14
Nodes (22): GET(), POST(), DELETE(), DELETE(), AuditActor, AUTHOR, AuthorRow, authorSearch() (+14 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.05
Nodes (44): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+36 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (24): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), DominionCfg (+16 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.10
Nodes (25): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+17 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.12
Nodes (24): GET(), GET(), loadProfileOverlayState(), NextEventTile(), GameCoverPicker(), PickedGameCover, CoverBrandBadge(), EventCoverDefault() (+16 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.08
Nodes (40): metadata, BattleFigure(), Props, Crop, drawTeFrame(), FULL, imageCache, loadTeImage() (+32 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

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
Cohesion: 0.24
Nodes (5): SteamGameResult, PollOptionGameInputProps, Gamepad2, GameSuggestion, PollGameSuggestInputProps

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.20
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.06
Nodes (59): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), GET(), DELETE() (+51 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.36
Nodes (9): backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), generateBrandedCoverDataUri(), getGradientBackground(), getLogoBadge() (+1 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.14
Nodes (21): GET(), isAuthorized(), POST(), GET(), positionAlongPath(), stepMinutesOf(), DND_LOCATIONS, DndLocationDef (+13 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.07
Nodes (32): AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES, ClipVotingClient(), Nomination, Props, ClipDesMonatsPage(), MONTH_NAMES (+24 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.04
Nodes (71): POST(), GET(), UserLite, GET(), AdminEventsPage(), DashboardPage(), formatCountdown(), formatFreshness() (+63 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.09
Nodes (29): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+21 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.28
Nodes (19): MapBuilder, Actor, bergpass(), BUILDERS, cache, chatter(), chestTalk(), frostgipfel() (+11 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.10
Nodes (24): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+16 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.22
Nodes (11): api(), Campaign, dueAt(), EventOption, MarketingCampaignsBlock(), MarketingStatsBlock(), PromotionRequestItem, PromotionRequestList() (+3 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.24
Nodes (4): Health, JobTexts, JobIcon(), JOB_ICONS

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.09
Nodes (25): PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS, ModerationItemDto, ModerationClient(), Interview (+17 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.06
Nodes (63): GET(), PATCH(), PATCH(), GET(), GET(), GET(), PATCH(), PATCH() (+55 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.05
Nodes (26): Badge, CATEGORIES, CATEGORY_LABELS, User, LinkedUser, Partner, PartnerManager(), TwitchPreview (+18 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.24
Nodes (10): CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, ThumbVote(), voteUrl() (+2 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.16
Nodes (22): POST(), GET(), POST(), QuestWorld(), advanceDndQuestObjective(), advanceWorldQuestStep(), DND_QUESTS, ensureDndQuestsSeeded() (+14 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.22
Nodes (8): Download, Menu, Share, BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.14
Nodes (9): api(), Coach, CoachRatingSection(), RateableSession, Stats, VisionaerStatsBlock(), GraduationCap, LifeBuoy (+1 more)

### Community 90 - "useConfirm"
Cohesion: 0.21
Nodes (15): GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GamePlayer, GET(), FavoriteGamesSection(), Props (+7 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.12
Nodes (16): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, centeredRect() (+8 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.03
Nodes (17): DEFAULTS, RULES, RuleSeed, GET(), POST(), GET(), isAuthorized(), GameSuggestion (+9 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.12
Nodes (19): GemsResultScreen(), GemsReward, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue(), getArenaBackgroundStyle() (+11 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.05
Nodes (36): DesktopProfileTabs(), Tab, Badge, ProfileJobBadge(), EventLiveBadge(), Props, SpectatorRegisterButton(), AlertTriangle (+28 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.22
Nodes (7): buildSteps(), CardWithId, CLASS_CONFIG, CLASS_ORDER, ClassKey, StarterPickFlow(), StepDef

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.21
Nodes (11): BASE_Z, CATALOG_PATH, CATEGORIES, CHAR_PACKS, hex(), main(), OUT, SKIN_SRC (+3 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.05
Nodes (37): CardRow, CommunityCardsAdmin(), AdminCommunityCardsPage(), TacticCardRow, CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries() (+29 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.10
Nodes (17): DailyMessageBanner(), Message, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount, Poll, PollCard() (+9 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.24
Nodes (7): POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, VoteKind, VoteOwnerLookup

### Community 102 - "recurrence.ts"
Cohesion: 0.33
Nodes (7): DELETE(), PATCH(), POST(), DELETE(), GET(), PATCH(), requireModeratorOrSquadCaptain()

### Community 103 - "isVideoUrl"
Cohesion: 0.05
Nodes (50): GET(), GET(), AlbumPage(), FeedCard(), FeedEntry, IdeaPage(), ReportPage(), ReportPageClient() (+42 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.09
Nodes (30): PATCH(), patchSchema, PATCH(), requestSchema, POST(), requestSchema, BattleCardsLayout(), metamorphous (+22 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.18
Nodes (20): GET(), isAuthorized(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction() (+12 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.05
Nodes (39): GET(), GET(), POST(), GET(), GET(), GET(), GET(), POST() (+31 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.20
Nodes (14): POST(), GET(), GET(), POST(), InterviewPage(), answerInterview(), createInterview(), declineInterview() (+6 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.13
Nodes (15): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, AdminLayout(), DailyPollActionBadge() (+7 more)

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.52
Nodes (6): GET(), OverlayControl, parseControl(), PATCH(), VALID_ELEMENTS, buildOverlayUrl()

### Community 111 - "skins/types.ts"
Cohesion: 0.12
Nodes (17): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+9 more)

### Community 112 - "BadgesSection.tsx"
Cohesion: 0.10
Nodes (33): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), GET(), isAuthorized(), GEMS_DIFFICULTIES, POST() (+25 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.15
Nodes (21): DELETE(), GET(), POST(), GET(), POST(), dispatchNotification(), activeRequesterJob(), closePhotoRequest() (+13 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.18
Nodes (15): ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, runSeasonUpdate(), buildSeasonInputs(), RunSeasonResult, applyTierJumpLimit(), computePercentiles(), computeSeasonResults() (+7 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.17
Nodes (15): GET(), isAuthorized(), MONTH_NAMES, QuestsPage(), QuestRegenerateButton(), DndQuestDef, generateMonthlyQuests(), QUEST_TYPE_META (+7 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.07
Nodes (40): GET(), PATCH(), POST(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage() (+32 more)

### Community 118 - "report-event-facts.ts"
Cohesion: 0.07
Nodes (19): RULES, AdminUsersClient(), formatLastLogin(), Props, Role, UserRow, AdminUsersPage(), SyncMembersButton() (+11 more)

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
Cohesion: 0.47
Nodes (5): DELETE(), displayNameOf(), PATCH(), UserLite, userSummary()

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.47
Nodes (5): displayNameOf(), GET(), USER_SELECT, UserLite, userSummary()

### Community 124 - "ServerCard.tsx"
Cohesion: 0.46
Nodes (5): POST(), POST(), notifyPvpBattleResolved(), advanceDndQuestObjectiveForUser(), updateQuestProgress()

### Community 125 - "notifications/page.tsx"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 126 - "series/[id]/complete/route.ts"
Cohesion: 0.60
Nodes (4): TACTIC_CARDS, isAuthorized(), POST(), toJson()

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.11
Nodes (20): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+12 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "ThemeProvider.tsx"
Cohesion: 0.60
Nodes (4): displayNameOf(), POST(), UserLite, userSummary()

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.09
Nodes (41): GET(), POST(), GET(), OptionInput, POST(), POST(), GET(), GET() (+33 more)

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
Cohesion: 0.06
Nodes (43): EventCardLink(), DashboardLayout(), BackToTop(), BottomNav(), NAV, DiscordLoginButton(), Props, FloatingPill() (+35 more)

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.08
Nodes (35): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, RankTile(), cache, flush() (+27 more)

### Community 142 - "three"
Cohesion: 0.08
Nodes (28): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+20 more)

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
Cohesion: 0.20
Nodes (10): GET(), POST(), DELETE(), POST(), GET(), GET(), POST(), DELETE() (+2 more)

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

### Community 179 - "applyMatchResult.ts"
Cohesion: 0.48
Nodes (6): revokePointsByReason(), applyMatchResult(), ApplyMatchResultInput, finalFinalistReason(), finalWinReason(), loserOf()

### Community 274 - "HeroStatValue.tsx"
Cohesion: 0.14
Nodes (13): ActivityFeed(), cleanReason(), Filter, Tx, txType(), CompareProfilePage(), fetchUserData(), UserData (+5 more)

## Knowledge Gaps
- **1119 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1114 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `report/[id]/page.tsx` to `roles.ts`, `series/[id]/complete/route.ts`, `coach-service.ts`, `time.ts`, `getSessionUser`, `RankedAvatar.tsx`, `duel-live-battle.ts`, `MobaIcon.tsx`, `(dashboard)/leaderboard/page.tsx`, `BattleCardView.tsx`, `notify-dispatch.ts`, `community-job-config.ts`, `job-recommendations.ts`, `dispatchNotification`, `DailyPollBanner.tsx`, `BattleLogEntry`, `EventEditClient.tsx`, `dashboard/page.tsx`, `GameNameInput.tsx`, `formatBerlinTime`, `SeriesIcon.tsx`, `ClipVotingClient.tsx`, `admin/community-jobs/disputes/route.ts`, `recurrence.ts`, `isVideoUrl`, `photo-request-service.ts`, `BadgesSection.tsx`, `GamePlayersModal.tsx`, `report/[id]/page.tsx`, `getActiveMembership`, `upload/route.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `DashboardChrome.tsx`, `series/[id]/complete/route.ts`, `[tacticCardId]/route.ts`, `series-event-points.ts`, `@types/three`, `new-season/page.tsx`, `shop-config.ts`, `clip-contest.ts`, `JobBadge.tsx`, `CoinIcon.tsx`, `revert-event-completion.ts`, `hasMinRole`, `SeriesIcon.tsx`, `[id]/settings/SettingsClient.tsx`, `ClipVotingClient.tsx`, `community-job-discord-votes.ts`, `(dashboard)/battle-cards/page.tsx`, `recurrence.ts`, `studio-templates.ts`, `photo-request-service.ts`, `report/[id]/page.tsx`, `BadgesSection.tsx`, `getActiveMembership`, `report-event-facts.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `types.ts` to `roles.ts`, `prisma.ts`, `StarterPickFlow.tsx`, `duels-live.ts`, `CommunityJobsPanel.tsx`, `duel-live-battle.ts`, `HeroStatValue.tsx`, `MobaIcon.tsx`, `(dashboard)/leaderboard/page.tsx`, `ProfileMobileView.tsx`, `notify-dispatch.ts`, `board-match3.ts`, `packs.ts`, `community-job-config.ts`, `auth.ts`, `FotografTools.tsx`, `dispatchNotification`, `SeriesDetailClient.tsx`, `skill-pool.ts`, `community-board-comment-service.ts`, `SeriesIcon.tsx`, `[id]/settings/SettingsClient.tsx`, `ProfileOverlayClient.tsx`, `community-job-payout/route.ts`, `ConfirmDialog.tsx`, `ClipVotingClient.tsx`, `EventAdminRow.tsx`, `isVideoUrl`, `report/[id]/page.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1119 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.027992277992277992 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08817204301075268 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05126582278481013 - nodes in this community are weakly interconnected._