# Graph Report - OMA-Companion  (2026-09-24)

## Corpus Check
- 968 files · ~3,131,637 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5000 nodes · 13918 edges · 223 communities (186 shown, 37 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7f5c061c`
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
- starter-pick.ts
- overlay/[id]/page.tsx
- DashboardChrome.tsx
- Product
- GuildHub – Discord Companion
- [tacticCardId]/route.ts
- notification-rules/route.ts
- widget/events/route.ts
- widget/events/route.ts
- StarterPickFlow.tsx
- GameCover.tsx
- MobileTopBar.tsx
- tank
- requireModeratorOrSquadCaptain
- notifications.ts
- bear
- tank
- middleware.ts
- discord-roles.ts
- new-season/page.tsx
- updateQuestProgress
- PollOptionGameInput.tsx
- seed-notification-rules.ts
- Monster-Artwork — Edelstein-Kampf
- daily-poll/[id]/vote/route.ts
- seed-tactic-cards/route.ts
- SeasonConfigPanel.tsx
- notifications/page.tsx
- preferences/route.ts
- lobby-cleanup/route.ts
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- grant-tactic-cards-to-all/route.ts
- FloatingLobbyChat.tsx
- generate-brand-assets.ts
- widget/events/route.ts
- @auth/prisma-adapter
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
- battle-cards/layout.tsx
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- sonner
- bot-runner.mjs
- eslint.config.mjs
- three
- @types/canvas-confetti
- next.config.ts
- @types/three
- lucide-react
- @vercel/blob
- web-push
- StudioEditor.tsx
- zod
- seed-standard-cards/route.ts
- postcss.config.mjs
- DailyPollPanel.tsx
- tailwind.config.ts
- vercel.json
- { GET, POST }
- size
- MIN_MATCHES_FOR_RANKING
- sync-discord-roles/route.ts
- BadgeIcon.tsx
- ScoreBreakdownBlock.tsx
- [contribId]/route.ts
- HeroStatValue.tsx

## God Nodes (most connected - your core abstractions)
1. `getSessionUser()` - 321 edges
2. `requireRole()` - 209 edges
3. `formatBerlinDate()` - 119 edges
4. `hasMinRole()` - 109 edges
5. `dispatchNotification()` - 86 edges
6. `morphTargets` - 66 edges
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
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts
- `main()` --calls--> `getCommunityJob()`  [EXTRACTED]
  scripts/fix-community-job-payouts.ts → src/lib/community-jobs.ts

## Import Cycles
- None detected.

## Communities (223 total, 37 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (60): POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET(), DELETE() (+52 more)

### Community 1 - "prisma.ts"
Cohesion: 0.17
Nodes (19): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), MessageCircleMore, ShieldCheck (+11 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.14
Nodes (21): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), CardTile(), CardUpgradeBadge() (+13 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.03
Nodes (22): DEFAULTS, GameSuggestion, GET(), POST(), displayNameOf(), POST(), UserLite, userSummary() (+14 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.07
Nodes (33): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+25 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.12
Nodes (38): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog(), beginTrapCheck() (+30 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.04
Nodes (63): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+55 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.08
Nodes (45): actionSchema, DUEL_STANCES, POST(), GET(), average(), GET(), POST(), VALID_DIFFICULTIES (+37 more)

### Community 8 - "interactive.ts"
Cohesion: 0.09
Nodes (68): LiveSnapshot, LiveBattleAwaiting, BoardGrid, hasAnyValidMove(), SpecialGrid, SwapMove, LEVEL_STAT_MULTIPLIER, applyShieldAbsorption() (+60 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.06
Nodes (55): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+47 more)

### Community 10 - "time.ts"
Cohesion: 0.07
Nodes (36): CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant, readViewMode() (+28 more)

### Community 11 - "getSessionUser"
Cohesion: 0.06
Nodes (52): GET(), POST(), GET(), DELETE(), PATCH(), GET(), POST(), GET() (+44 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (56): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+48 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.06
Nodes (51): GET(), GET(), POST(), POST(), GET(), DELETE(), PATCH(), POST() (+43 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.21
Nodes (12): GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props, GameSuggestion (+4 more)

### Community 16 - "ranks.ts"
Cohesion: 0.09
Nodes (31): DesktopProfileTabs(), Tab, PublicProfilePage(), ProfilePage(), COIN_SOURCES, PointsInfoModal(), openSection(), ProfileCompletion() (+23 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.25
Nodes (76): morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets (+68 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (58): ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction, DuelAttackType (+50 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.06
Nodes (35): GET(), GET(), GET(), GET(), POST(), GET(), GET(), POST() (+27 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.13
Nodes (25): BracketView(), Match, Participant, roundLabel(), uname(), User, Props, WanderpocalBadge() (+17 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.08
Nodes (28): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+20 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.05
Nodes (45): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+37 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.08
Nodes (32): VfxEvent, LiveDuelHandCard, LiveDuelUnit, UltimateBurst, GemsResultScreen(), GemsReward, LineupCard, LineupEditor() (+24 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.04
Nodes (72): DELETE(), PATCH(), POST(), POST(), Event, EventAdminRow(), Match, MatchEntry (+64 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.11
Nodes (34): GET(), GET(), GET(), isAuthorized(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked(), CampaignLevelDef (+26 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.14
Nodes (16): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, Thumb() (+8 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.04
Nodes (87): APPLY, main(), PATCH(), GET(), POST(), POST(), GET(), POST() (+79 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.09
Nodes (27): GET(), PATCH(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage(), PACK_KIND_INFO (+19 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.06
Nodes (30): buildFfaRanking(), buildMatchRanking(), cornerStyle(), displayName(), ElementContent(), elementPositionStyle(), ElementSlot, formatEntryStats() (+22 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.11
Nodes (26): POST(), POST(), GET(), PATCH(), POST(), GET(), GET(), GET() (+18 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.08
Nodes (23): MonthlyContests, Props, YearlyContests, EventsTabs(), TabItem, TabPanel(), Tabs(), TabsProps (+15 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.09
Nodes (23): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+15 more)

### Community 36 - "packs.ts"
Cohesion: 0.10
Nodes (32): POST(), serializeDrawResult(), PACK_LABEL, POST(), VALID_KINDS, ShopPage(), ShoppingBag, CHEST_TABLE (+24 more)

### Community 37 - "MobaIcon"
Cohesion: 0.14
Nodes (21): GET(), POST(), DELETE(), DELETE(), AUTHOR, AuthorRow, authorSearch(), contentInfo() (+13 more)

### Community 38 - "types.ts"
Cohesion: 0.09
Nodes (20): CustomBadgeDisplay, Props, Tab, TABS, ProfileQuestEntry, ProfileTournamentParticipationEntry, Props, ProfileRecentEventEntry (+12 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.05
Nodes (86): POST(), GET(), PUT(), requestSchema, POST(), POST(), parseBoardSwaps(), POST() (+78 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.21
Nodes (11): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, ArrowLeft, isStoredBattleLog(), applyAttackerOnlyWinStreak() (+3 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.14
Nodes (23): BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), LeaderboardTabs(), Tab, TABS, getCombinedElo() (+15 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.05
Nodes (72): GET(), PATCH(), PATCH(), GET(), GET(), GET(), PATCH(), PATCH() (+64 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.11
Nodes (35): berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames(), getDismissedItemKeys() (+27 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.19
Nodes (17): POST(), OPEN_EVENT_STATUS_FILTER, PATCH(), GEMS_DIFFICULTIES, POST(), formatStart(), GET(), POST() (+9 more)

### Community 45 - "auth.ts"
Cohesion: 0.16
Nodes (19): BodyModel(), CharacterBuilder(), GENDER_LABEL, CharacterRig(), PartModel(), bodyOf(), carryConfigOver(), defaultConfigFor() (+11 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.11
Nodes (29): GET(), GET(), GET(), isAuthorized(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee(), updateEventStatus() (+21 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.21
Nodes (19): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+11 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.10
Nodes (23): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+15 more)

### Community 49 - "amp.ts"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.18
Nodes (11): PATCH(), patchSchema, characterConfigSchema, PATCH(), requestSchema, metadata, MyCardPage(), CardCharacterSelection (+3 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.15
Nodes (27): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+19 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.06
Nodes (41): DELETE(), DELETE(), POST(), GET(), POST(), DELETE(), PATCH(), DELETE() (+33 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.38
Nodes (8): buildSegments(), DailySpin(), PALETTE_BY_TYPE, pt(), rimPath(), segPath(), splitLabel(), useMidnightCountdown()

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.11
Nodes (19): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+11 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.20
Nodes (13): POST(), DELETE(), POST(), awardPoints(), parsePlacementPts(), PATCH(), BracketMatch, generateBracket() (+5 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.18
Nodes (15): DELETE(), PATCH(), POST(), DELETE(), displayNameOf(), PATCH(), UserLite, userSummary() (+7 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.10
Nodes (18): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, formatBirthday(), ProfileEditor(), Props (+10 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (25): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+17 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.09
Nodes (33): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, SlotRow(), activationCellsFor(), areAdjacent() (+25 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.08
Nodes (30): BattleLauncher(), Mode, RankRow(), BattleRankBadge(), CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS (+22 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.08
Nodes (28): clips, file, base, bodyMaterial, label, parts, regions, athlete (+20 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.10
Nodes (20): ActivityFeed(), cleanReason(), Filter, Tx, txType(), formatDate(), SeasonConfigPanel(), toDateInputValue() (+12 more)

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): canvas-confetti, discord.js, gamedig, @google/generative-ai, motion, next, dependencies, canvas-confetti (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.20
Nodes (12): isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, CLASS_SPEED_MIDPOINT, ensureCommunityCard() (+4 more)

### Community 67 - "hasMinRole"
Cohesion: 0.28
Nodes (11): POST(), POST(), POST(), userSelect, getDailyDuelCount(), getDailyWageredTotal(), isExpired(), isPairOnCooldown() (+3 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.29
Nodes (7): curvy, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.14
Nodes (17): JobTexts, EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE (+9 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.10
Nodes (27): TACTIC_CARDS, TacticCardSeed, BattleStatsPanel(), StoredBattleLog, computeBattleStats(), findMvpId(), score(), UnitBattleStats (+19 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.17
Nodes (17): GET(), POST(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), generateBrandedCoverDataUri() (+9 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.13
Nodes (15): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, AdminLayout(), DailyPollActionBadge() (+7 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.09
Nodes (23): ClipVotingClient(), Nomination, Props, ClipDesMonatsPage(), MONTH_NAMES, GalleryEntry, MONTH_NAMES, Nomination (+15 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.06
Nodes (45): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+37 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.22
Nodes (8): Download, Menu, Share, BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 77 - "tutorial.ts"
Cohesion: 0.13
Nodes (14): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+6 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.10
Nodes (24): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+16 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.13
Nodes (18): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), RARITIES (+10 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.13
Nodes (17): NORMAL_ATTACK_TARGET_RULE_MAP, tacticCardToDefinition(), DuelDeckInput, DuelPlayerState, activeSkillSchema, effectSchema, effectTargetSchema, InvalidSkillDataError (+9 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.05
Nodes (45): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+37 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.21
Nodes (11): CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), CATEGORY_LABELS, DAILY_CAPS, POINT_RULES, PointCategory, PointRule (+3 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.21
Nodes (15): GET(), POST(), GET(), OptionInput, POST(), POST(), dispatchDiscordDm(), dispatchPush() (+7 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.14
Nodes (15): api(), AreaKey, FoundUser, GameInfo, IdeaForm(), IdeaPrefill, MediaAsset, Similar (+7 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), StatusEntry, AdsTarget, ampCall(), AmpInstance, callWithSession() (+15 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.33
Nodes (6): giant, base, bodyMaterial, label, parts, regions

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.16
Nodes (16): GET(), loadProfileOverlayState(), NextEventTile(), GameCover(), coverCache, GameNameInput(), GameNameInputProps, highlightMatch() (+8 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.14
Nodes (18): MONTH_NAMES, YearReviewPage(), CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, GiftIcon(), Dices (+10 more)

### Community 90 - "useConfirm"
Cohesion: 0.60
Nodes (5): isAuthorized(), isOverridden(), POST(), toJson(), getSkillTemplate()

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.29
Nodes (6): centeredRect(), Handle, ImageCropTool(), PRESETS, Rect, Crop

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.08
Nodes (26): blocks, texture, blocks, texture, blocks, materials, texture, blocks (+18 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.25
Nodes (8): tall, alwaysOn, base, bodyMaterial, defaults, label, parts, regions

### Community 95 - "apply-season-results.ts"
Cohesion: 0.03
Nodes (67): RULES, Badge, CATEGORIES, CATEGORY_LABELS, User, CardRow, AdminTacticCardsPage(), TacticCardRow (+59 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.14
Nodes (11): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, StatBadges() (+3 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.14
Nodes (17): SeriesOption, ConfirmDialog(), ConfirmDialogProps, ConfirmOptions, ConfirmState, EMPTY_STATE, Settings2, Modal() (+9 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.05
Nodes (36): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+28 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.09
Nodes (22): Props, WinnerClip, DailyMessageBanner(), Message, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount (+14 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.24
Nodes (7): POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, VoteKind, VoteOwnerLookup

### Community 102 - "recurrence.ts"
Cohesion: 0.12
Nodes (17): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+9 more)

### Community 103 - "isVideoUrl"
Cohesion: 0.15
Nodes (16): buildStandings(), LigaView(), Match, MEDAL, Participant, Standing, uname(), User (+8 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.31
Nodes (25): defaults, defaults, slim, defaults, Bottom, Eyewear, FacialHair, Gloves (+17 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.22
Nodes (17): checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction(), trackVoice(), client (+9 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.22
Nodes (13): GET(), IdeaPageClient(), IdeaPage(), ReportPage(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData, toIdeaFeedEntry() (+5 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.21
Nodes (12): GameserverWidget(), Server, ServerRow(), ServerCard(), Server, ServerList(), latestStatus, LiveStatus (+4 more)

### Community 111 - "skins/types.ts"
Cohesion: 0.22
Nodes (9): DevSkinTestPage(), SkinCanvas, SkinModel(), SkinCanvas, SkinPicker(), SKINS, skinAssetUrl(), SkinClips (+1 more)

### Community 112 - "BadgesSection.tsx"
Cohesion: 0.23
Nodes (11): CustomBadgeDisplay, Props, checkAndAwardBadges(), loadStats(), Badge, BADGE_CATEGORY_LABELS, BADGE_DEFS, BadgeDef (+3 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.15
Nodes (25): GET(), PATCH(), patchSchema, GET(), isAuthorized(), softResetRating(), addMonthsUTC(), getCurrentSeasonNumber() (+17 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.15
Nodes (14): EventCardLink(), MEDALS, metadata, PODIUM_CONFIG, BotPreviewShell(), GateButton(), GateLink(), GateOptions (+6 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.20
Nodes (9): GET(), PATCH(), MinigamesConfigPanel(), AdminMinigamesPage(), DEFAULTS, KEYS, MinigameKey, MinigamesConfig (+1 more)

### Community 118 - "AdminNav.tsx"
Cohesion: 0.10
Nodes (23): GET(), api(), AssetOption, buildEventTemplate(), cell(), EventOption, FoundUser, InterviewOption (+15 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.26
Nodes (12): buildScratchGrid(), CANDIDATE_PRIZES, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR, prizeSymbolId() (+4 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "TextsClient.tsx"
Cohesion: 0.32
Nodes (4): Health, Info, JobIcon(), JOB_ICONS

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.19
Nodes (16): ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, CLASS_BASE_STATS, isOverridden(), runSeasonUpdate(), toJson(), applyTierJumpLimit(), computePercentiles() (+8 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.11
Nodes (26): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+18 more)

### Community 124 - "ServerCard.tsx"
Cohesion: 0.16
Nodes (8): ApplyButton(), Light, LIGHT_COLOR, LIGHT_LABEL, Server, ServerCredentials(), Copy, Send

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.39
Nodes (6): POST(), buildSeasonInputs(), countBy(), runFullSeasonUpdate(), RunSeasonResult, markPreSeasonRan()

### Community 126 - "ServerCard.tsx"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.29
Nodes (8): main(), DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled(), NotificationType, PREF_KEY

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "ThemeProvider.tsx"
Cohesion: 0.31
Nodes (7): ThemedToaster(), Theme, ThemeContext, ThemeProvider(), useTheme(), ThemeToggle(), ThemeToggleItem()

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.24
Nodes (6): DashboardLayout(), LeaderboardPage(), PartnerFooter(), Partner, NewsItem, isLinkPreviewBot()

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.36
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 132 - "starter-pick.ts"
Cohesion: 0.39
Nodes (6): POST(), requestSchema, grantStarterPick(), REQUIRED_CLASSES, StarterPickError, startOrResetTutorial()

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "DashboardChrome.tsx"
Cohesion: 0.29
Nodes (3): BackToTop(), GuestBanner(), GuestGateProvider()

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 137 - "[tacticCardId]/route.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 138 - "notification-rules/route.ts"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 139 - "widget/events/route.ts"
Cohesion: 0.13
Nodes (11): metadata, russoOne, spaceGrotesk, viewport, AnimatedBackground(), Cell, PULSE_COLORS, CursorGlow() (+3 more)

### Community 140 - "widget/events/route.ts"
Cohesion: 0.43
Nodes (6): eventSelect, FINISHED_STATUSES, GET(), RELEVANT_STATUSES, sortSeriesEvents(), toWidgetEvent()

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.07
Nodes (37): Avatar(), EventTippsList(), Tipp, uname(), UserLite, EventWinnerPredictionWidget(), Prediction, uname() (+29 more)

### Community 142 - "GameCover.tsx"
Cohesion: 0.48
Nodes (4): CoverBrandBadge(), EventCoverDefault(), dynamicCache, GameCoverProps

### Community 143 - "MobileTopBar.tsx"
Cohesion: 0.33
Nodes (6): LogOut, Moon, Sun, MobileTopBar(), ROUTE_TITLES, useTheme()

### Community 144 - "tank"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.28
Nodes (13): skin, skin, skin, skin, skin, skin, block, row (+5 more)

### Community 146 - "notifications.ts"
Cohesion: 0.07
Nodes (42): DELETE(), POST(), GET(), POST(), POST(), POST(), DELETE(), PATCH() (+34 more)

### Community 147 - "bear"
Cohesion: 0.33
Nodes (6): base, bodyMaterial, label, parts, regions, bear

### Community 148 - "tank"
Cohesion: 0.33
Nodes (6): tank, base, bodyMaterial, label, parts, regions

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "discord-roles.ts"
Cohesion: 0.12
Nodes (27): RankTile(), cache, flush(), inflight, isFresh(), JobBadgeProps, listeners, pending (+19 more)

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 152 - "updateQuestProgress"
Cohesion: 0.47
Nodes (3): POST(), POST(), updateQuestProgress()

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 157 - "seed-tactic-cards/route.ts"
Cohesion: 0.83
Nodes (3): isAuthorized(), POST(), toJson()

### Community 158 - "SeasonConfigPanel.tsx"
Cohesion: 0.09
Nodes (34): GET(), GET(), isAuthorized(), GET(), isAuthorized(), GET(), isAuthorized(), calcStreak() (+26 more)

### Community 159 - "notifications/page.tsx"
Cohesion: 0.33
Nodes (6): guardian, base, bodyMaterial, label, parts, regions

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 163 - "HeroStatValue.tsx"
Cohesion: 0.13
Nodes (22): curve(), curvePercent(), STANDARD_CARDS, StandardCardSeed, ACTIVE_POOL, DD_ACTIVE_SKILLS, DD_PASSIVE_KITS, DD_ULTIMATE_SKILLS (+14 more)

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

### Community 192 - "lucide-react"
Cohesion: 0.29
Nodes (7): strong, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 195 - "StudioEditor.tsx"
Cohesion: 0.24
Nodes (15): LOGO_POSITIONS, StudioEditor(), ImageDown, drawLogo(), drawWatermark(), loadImage(), LogoPosition, prepareUploadImage() (+7 more)

### Community 199 - "seed-standard-cards/route.ts"
Cohesion: 0.70
Nodes (4): GET(), isAuthorized(), POST(), toJson()

### Community 214 - "DailyPollPanel.tsx"
Cohesion: 0.09
Nodes (29): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+21 more)

### Community 248 - "sync-discord-roles/route.ts"
Cohesion: 0.43
Nodes (6): GET(), POST(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole()

### Community 252 - "BadgeIcon.tsx"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 254 - "ScoreBreakdownBlock.tsx"
Cohesion: 0.08
Nodes (24): POST(), AlbumPage(), IdeaRow(), Item, Interview, InterviewClient(), name(), Breakdown (+16 more)

### Community 270 - "[contribId]/route.ts"
Cohesion: 0.06
Nodes (56): POST(), DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), DELETE() (+48 more)

### Community 274 - "HeroStatValue.tsx"
Cohesion: 0.06
Nodes (42): AdminEventsPage(), CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, ThumbVote() (+34 more)

## Knowledge Gaps
- **1145 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1140 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `MobaIcon.tsx` to `roles.ts`, `DashboardChrome.tsx`, `app/layout.tsx`, `coach-service.ts`, `getSessionUser`, `duels-live.ts`, `[contribId]/route.ts`, `ranks.ts`, `notifications.ts`, `HeroStatValue.tsx`, `notify-dispatch.ts`, `board-match3.ts`, `SeasonConfigPanel.tsx`, `community-job-service.ts`, `packs.ts`, `MobaIcon`, `community-job-config.ts`, `JobBadge.tsx`, `discord-rest.ts`, `DailyPollBanner.tsx`, `BattleLogEntry`, `formatBerlinTime`, `SeriesIcon.tsx`, `ClipVotingClient.tsx`, `EventAdminRow.tsx`, `(dashboard)/battle-cards/page.tsx`, `admin/community-jobs/disputes/route.ts`, `report/[id]/page.tsx`, `photo-request-service.ts`, `useServerLiveStatus.ts`, `report/[id]/page.tsx`, `AdminNav.tsx`, `upload/route.ts`, `ScoreBreakdownBlock.tsx`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `series/[id]/complete/route.ts`, `[tacticCardId]/route.ts`, `notification-rules/route.ts`, `series-event-points.ts`, `[contribId]/route.ts`, `tank`, `MobaIcon.tsx`, `new-season/page.tsx`, `board-match3.ts`, `shop-config.ts`, `clip-contest.ts`, `community-job-config.ts`, `JobBadge.tsx`, `dispatchNotification`, `TournamentManager.tsx`, `revert-event-completion.ts`, `events/series/[id]/page.tsx`, `SeriesIcon.tsx`, `community-job-payout/route.ts`, `(dashboard)/events/page.tsx`, `CoachTools.tsx`, `DailyPollPanel.tsx`, `apply-season-results.ts`, `photo-request-service.ts`, `ThemeProvider.tsx`, `getActiveMembership`, `sync-discord-roles/route.ts`, `AdminDonationsClient.tsx`, `CommunityBoardWidget.tsx`, `ScoreBreakdownBlock.tsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `ScoreBreakdownBlock.tsx` to `app/layout.tsx`, `CommunityJobsPanel.tsx`, `ranks.ts`, `HeroStatValue.tsx`, `CommunityJobsAdminPanel.tsx`, `ProfileMobileView.tsx`, `notify-dispatch.ts`, `board-match3.ts`, `SeasonConfigPanel.tsx`, `community-job-service.ts`, `coach-guide-service.ts`, `gameservers.ts`, `types.ts`, `formatBerlinDate`, `FotografTools.tsx`, `SeriesDetailClient.tsx`, `dashboard/page.tsx`, `SeriesIcon.tsx`, `tutorial.ts`, `ProfileOverlayClient.tsx`, `ConfirmDialog.tsx`, `DailyPollPanel.tsx`, `send/route.ts`, `NotificationRulesPanel.tsx`, `(dashboard)/battle-cards/page.tsx`, `isVideoUrl`, `AdminNav.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1145 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.029873039581777446 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1396011396011396 - nodes in this community are weakly interconnected._
- **Should `live-battle.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03207698476343224 - nodes in this community are weakly interconnected._