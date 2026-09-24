# Graph Report - OMA-Companion  (2026-09-24)

## Corpus Check
- 971 files · ~3,145,442 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5026 nodes · 13935 edges · 214 communities (183 shown, 31 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c6022f1a`
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
- card-provisioning.ts
- DailyPollPanel.tsx
- useServerLiveStatus.ts
- points.ts
- FfaView.tsx
- EventPokalWinners.tsx
- GamePlayersModal.tsx
- scripts
- ThemeProvider.tsx
- report/[id]/page.tsx
- getActiveMembership
- AdminNav.tsx
- VictoryChestReveal.tsx
- upload/route.ts
- branded-cover.ts
- duels/[id]/respond/route.ts
- AdminDonationsClient.tsx
- SeriesAdminRow.tsx
- CommunityBoardWidget.tsx
- ServerCard.tsx
- promotion-request-service.ts
- process-badge-art.ts
- applyForJob
- DashboardChrome.tsx
- series/[id]/complete/route.ts
- giant
- overlay/[id]/page.tsx
- requireModeratorOrSquadCaptain
- Product
- GuildHub – Discord Companion
- DailyMessagePanel.tsx
- series/[id]/complete/page.tsx
- widget/events/route.ts
- MobileTopBar.tsx
- StarterPickFlow.tsx
- small
- process-rank-art.ts
- tank
- requireModeratorOrSquadCaptain
- notifications.ts
- seed-notification-rules.ts
- [userId]/page.tsx
- middleware.ts
- discord-roles.ts
- new-season/page.tsx
- BadgeIcon.tsx
- events/[id]/matches/route.ts
- getWeekBounds
- Monster-Artwork — Edelstein-Kampf
- [tacticCardId]/route.ts
- GameCover.tsx
- SeasonConfigPanel.tsx
- notifications/page.tsx
- PwaInstallButton.tsx
- canvas-confetti
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- lucide-react
- next-auth
- FloatingLobbyChat.tsx
- generate-brand-assets.ts
- widget/events/route.ts
- postprocessing
- @prisma/client
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- react
- react-dom
- sharp
- UserRoleManager.tsx
- sonner
- chroma-key.js
- three
- @types/canvas-confetti
- battle-cards/layout.tsx
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- @types/three
- bot-runner.mjs
- eslint.config.mjs
- web-push
- zod
- next.config.ts
- canvas-confetti
- lucide-react
- @vercel/blob
- seed-standard-cards/route.ts
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
- `StandardCardSeed` --references--> `ActiveSkillData`  [EXTRACTED]
  prisma/battle-cards-seed-data.ts → src/lib/battle-engine/types.ts

## Import Cycles
- None detected.

## Communities (214 total, 31 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (60): POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET(), DELETE() (+52 more)

### Community 1 - "prisma.ts"
Cohesion: 0.18
Nodes (16): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), MessageCircleMore, ShieldCheck (+8 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.13
Nodes (22): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), CardUpgradeBadge(), DuplicateProgress() (+14 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.15
Nodes (15): GET(), POST(), DELETE(), displayNameOf(), PATCH(), UserLite, userSummary(), DELETE() (+7 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.05
Nodes (48): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+40 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.12
Nodes (38): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog(), beginTrapCheck() (+30 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.08
Nodes (38): DELETE(), POST(), GET(), POST(), POST(), POST(), DELETE(), POST() (+30 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.07
Nodes (49): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, POST(), VALID_DIFFICULTIES (+41 more)

### Community 8 - "interactive.ts"
Cohesion: 0.11
Nodes (51): LiveBattleSnapshot, hasAnyValidMove(), pickEnemyForColumn(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate (+43 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.05
Nodes (62): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+54 more)

### Community 10 - "time.ts"
Cohesion: 0.13
Nodes (22): CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant, readViewMode() (+14 more)

### Community 11 - "getSessionUser"
Cohesion: 0.05
Nodes (62): GET(), GET(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), PATCH(), DELETE(), PATCH() (+54 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (59): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+51 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.06
Nodes (43): GET(), GET(), POST(), GET(), DELETE(), PATCH(), POST(), GET() (+35 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.07
Nodes (25): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, TournamentData (+17 more)

### Community 16 - "ranks.ts"
Cohesion: 0.07
Nodes (40): Interview, InterviewClient(), name(), PublicProfilePage(), ProfilePage(), COIN_SOURCES, PointsInfoModal(), openSection() (+32 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.25
Nodes (76): morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets (+68 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (40): VfxEvent, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction (+32 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.11
Nodes (30): Avatar(), EventTippsList(), Tipp, uname(), UserLite, cache, flush(), inflight (+22 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.10
Nodes (28): DashboardLayout(), LeaderboardPage(), MEDALS, metadata, PODIUM_CONFIG, PartnerFooter(), Partner, Props (+20 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.10
Nodes (24): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+16 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.07
Nodes (38): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+30 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.11
Nodes (38): GemsResultScreen(), GemsReward, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue(), getArenaBackgroundStyle() (+30 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.06
Nodes (39): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+31 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.12
Nodes (31): GET(), GET(), isAuthorized(), CampaignLevelDef, AFK_FARMER, GRIEFER_IMP, LAG_SPIKE, LOOT_GOBLIN (+23 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.09
Nodes (26): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, CommunityBoardWidget() (+18 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.05
Nodes (86): APPLY, main(), PATCH(), GET(), POST(), POST(), GET(), GET() (+78 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.11
Nodes (21): GET(), PATCH(), AdminShopPage(), PACK_KIND_INFO, PACK_KIND_ORDER, ShopConfigPanel(), TYPE_LABEL, ACCENT_CLASSES (+13 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (21): buildFfaRanking(), buildMatchRanking(), displayName(), ElementSlot, formatEntryStats(), IdentityFlipTile(), LayoutEntry, MatchTicker() (+13 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.11
Nodes (26): POST(), POST(), GET(), PATCH(), POST(), GET(), GET(), GET() (+18 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.13
Nodes (16): ActivityFeed(), cleanReason(), Filter, Tx, txType(), CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage() (+8 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.16
Nodes (18): POST(), POST(), GET(), POST(), GET(), POST(), answerInterview(), createInterview() (+10 more)

### Community 36 - "packs.ts"
Cohesion: 0.12
Nodes (25): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), ShoppingBag, asCardResult(), asTacticResult(), awardDrawnCard() (+17 more)

### Community 37 - "MobaIcon"
Cohesion: 0.14
Nodes (21): GET(), POST(), DELETE(), DELETE(), AUTHOR, AuthorRow, authorSearch(), contentInfo() (+13 more)

### Community 38 - "types.ts"
Cohesion: 0.10
Nodes (27): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), pickRandom(), aliveUnits(), resolveEffectTargets() (+19 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.09
Nodes (49): POST(), GET(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps() (+41 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.20
Nodes (15): POST(), requestSchema, grantGuaranteedPack(), grantStarterPick(), REQUIRED_CLASSES, StarterPickError, findOwnCommunityCardId(), getTutorialProgress() (+7 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.06
Nodes (66): GET(), PUT(), requestSchema, POST(), POST(), serializeDrawResult(), GET(), POST() (+58 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.08
Nodes (44): GET(), PATCH(), PATCH(), PATCH(), GET(), PATCH(), PATCH(), GET() (+36 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.11
Nodes (34): berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames(), getDismissedItemKeys() (+26 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.13
Nodes (30): POST(), GET(), isAuthorized(), GEMS_DIFFICULTIES, POST(), formatStart(), GET(), POST() (+22 more)

### Community 45 - "auth.ts"
Cohesion: 0.16
Nodes (19): BodyModel(), CharacterBuilder(), GENDER_LABEL, CharacterRig(), PartModel(), bodyOf(), carryConfigOver(), defaultConfigFor() (+11 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.09
Nodes (38): GET(), POST(), GET(), OptionInput, POST(), POST(), GET(), GET() (+30 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.21
Nodes (19): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+11 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.07
Nodes (38): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+30 more)

### Community 49 - "amp.ts"
Cohesion: 0.03
Nodes (70): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+62 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.22
Nodes (9): DevSkinTestPage(), SkinCanvas, SkinModel(), SkinCanvas, SkinPicker(), SKINS, skinAssetUrl(), SkinClips (+1 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.15
Nodes (27): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+19 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.12
Nodes (21): DELETE(), DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES (+13 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.11
Nodes (20): Props, Badge, ProfileJobBadge(), CustomBadgeDisplay, Props, Tab, TABS, ProfileQuestEntry (+12 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.08
Nodes (41): GET(), POST(), GET(), GET(), POST(), GET(), guideVoteEvents(), scoreBreakdown() (+33 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.16
Nodes (15): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), AdminEventBracketPage(), revokePointsByReason() (+7 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.07
Nodes (21): MonthlyContests, Props, YearlyContests, SeriesOption, EventsTabs(), ConfirmDialog(), TabItem, TabPanel() (+13 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.05
Nodes (51): AdminEventsPage(), DashboardPage(), formatCountdown(), formatFreshness(), getGlobalDashboardData, MONTH_NAMES, ROLE_LABEL, ROLE_STYLE (+43 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (25): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+17 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.08
Nodes (43): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, AvailableAction, LiveSnapshot, SlotRow() (+35 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.09
Nodes (23): BattleLauncher(), Mode, RankRow(), BattleRankBadge(), CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS (+15 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.08
Nodes (28): clips, file, base, bodyMaterial, label, parts, regions, athlete (+20 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.09
Nodes (16): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+8 more)

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): discord.js, gamedig, @google/generative-ai, motion, next, dependencies, discord.js, gamedig (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.20
Nodes (12): isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, CLASS_SPEED_MIDPOINT, ensureCommunityCard() (+4 more)

### Community 67 - "hasMinRole"
Cohesion: 0.16
Nodes (12): GET(), PATCH(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage(), DEFAULTS, getMinigamesConfig() (+4 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.24
Nodes (12): GET(), IdeaPage(), ReportPage(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData, toIdeaFeedEntry(), getSeriesParts() (+4 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.19
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.13
Nodes (20): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, BattleStatsPanel(), ArrowLeft, isStoredBattleLog() (+12 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 73 - "visionaer-service.ts"
Cohesion: 0.07
Nodes (38): CompareProfilePage(), fetchUserData(), UserData, BracketView(), Match, Participant, roundLabel(), uname() (+30 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.07
Nodes (30): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, ClipVotingClient(), Nomination, Props (+22 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.12
Nodes (26): GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET(), TournamentDetailPage() (+18 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.22
Nodes (9): PATCH(), patchSchema, characterConfigSchema, PATCH(), requestSchema, CardCharacterSelection, CardContentError, CardContentPatch (+1 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.10
Nodes (18): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+10 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.12
Nodes (18): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+10 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.12
Nodes (19): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), formatDate(), SeasonConfigPanel(), toDateInputValue() (+11 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.25
Nodes (10): checkAndAwardBadges(), loadStats(), BADGE_CATEGORY_LABELS, BADGE_DEFS, BadgeDef, BadgeStats, findNewlyEarnedBadges(), getBadgeDef() (+2 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.06
Nodes (33): Anomalies, AnomaliesClient(), Person, PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS (+25 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.24
Nodes (9): main(), DISCORD_REASONS, GET(), isAuthorized(), createNotification(), POINT_RULES, PointRule, PROFILE_COMPLETION_ITEMS (+1 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.24
Nodes (14): GET(), PATCH(), patchSchema, GET(), isAuthorized(), hardResetAllElo(), resetAllCampaignProgress(), resetAllCardOwnership() (+6 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.15
Nodes (14): api(), AreaKey, FoundUser, GameInfo, IdeaForm(), IdeaPrefill, MediaAsset, Similar (+6 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), StatusEntry, AdsTarget, ampCall(), AmpInstance, callWithSession() (+15 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.06
Nodes (38): GET(), loadProfileOverlayState(), GameserverWidget(), Server, ServerRow(), Light, LIGHT_COLOR, LIGHT_LABEL (+30 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.10
Nodes (23): MONTH_NAMES, YearReviewPage(), BadgeIcon(), BadgeIconProps, CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props (+15 more)

### Community 90 - "useConfirm"
Cohesion: 0.24
Nodes (8): POST(), computeKeptSeriesRankPoints(), PlacementReward, resetAllExceptSeries(), RewardsConfig, SelectiveResetSummary, LegacyStandingRow, SeriesEventForStandings

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.03
Nodes (63): RULES, AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, Badge (+55 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.08
Nodes (26): blocks, texture, blocks, texture, blocks, materials, texture, blocks (+18 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.09
Nodes (25): POST(), api(), Idea, IdeasBoardClient(), IdeaList(), api(), GameCard(), GameInfo (+17 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.09
Nodes (24): CreateContestForm(), defaultPeriodEnd(), defaultPeriodStart(), toDateInputValue(), ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS (+16 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.06
Nodes (36): SteamGameResult, GamePlayer, GET(), CardRow, PLACES, SeasonRewardsPanel(), AdminTacticCardsPage(), TacticCardRow (+28 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.03
Nodes (73): POST(), Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration (+65 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.12
Nodes (19): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+11 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.11
Nodes (18): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+10 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 102 - "recurrence.ts"
Cohesion: 0.45
Nodes (8): POST(), POST(), getDailyDuelCount(), getDailyWageredTotal(), isExpired(), isPairOnCooldown(), startOfToday(), isMinigameEnabled()

### Community 103 - "isVideoUrl"
Cohesion: 0.31
Nodes (9): GET(), POST(), rollPrize(), todayStr(), CHEST_TABLE, ChestPrize, grantGemsPvpVictoryChest(), rollChestPrize() (+1 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.21
Nodes (32): defaults, defaults, slim, tank, defaults, Bottom, Eyewear, FacialHair (+24 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.14
Nodes (23): GET(), isAuthorized(), POST(), POST(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite() (+15 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 107 - "card-provisioning.ts"
Cohesion: 0.22
Nodes (10): AdminEventCompletePage(), DEFAULT_POLL, DEFAULT_REWARDS, MultiPollConfig, parsePoll(), parseRewards(), PlacementReward, PollConfig (+2 more)

### Community 108 - "DailyPollPanel.tsx"
Cohesion: 0.30
Nodes (10): GET(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), getGradientBackground(), getLogoBadge() (+2 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

### Community 110 - "points.ts"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 111 - "FfaView.tsx"
Cohesion: 0.31
Nodes (8): awardPoints(), parsePlacementPts(), PATCH(), BracketMatch, generateBracket(), generateRoundRobin(), POST(), shuffle()

### Community 112 - "EventPokalWinners.tsx"
Cohesion: 0.12
Nodes (24): BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), RANK_STYLE, LeaderboardTabs(), Tab, TABS (+16 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.31
Nodes (7): ThemedToaster(), Theme, ThemeContext, ThemeProvider(), useTheme(), ThemeToggle(), ThemeToggleItem()

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.22
Nodes (10): EventCardLink(), GateButton(), GateLink(), GateOptions, GuestGateContext, GuestGateValue, GuestMoreCta(), useGuestGate() (+2 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.16
Nodes (16): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+8 more)

### Community 118 - "AdminNav.tsx"
Cohesion: 0.10
Nodes (23): GET(), api(), AssetOption, buildEventTemplate(), EventOption, FoundUser, InterviewOption, PostOption (+15 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "branded-cover.ts"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.19
Nodes (16): ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, CLASS_BASE_STATS, isOverridden(), runSeasonUpdate(), toJson(), applyTierJumpLimit(), computePercentiles() (+8 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.11
Nodes (25): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+17 more)

### Community 124 - "SeriesAdminRow.tsx"
Cohesion: 0.06
Nodes (26): inputStyle, Series, FullStandingsToggle(), Props, StandingRow, StandingUser, Avatar(), DeltaInfo (+18 more)

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.39
Nodes (6): POST(), buildSeasonInputs(), countBy(), runFullSeasonUpdate(), RunSeasonResult, markPreSeasonRan()

### Community 126 - "ServerCard.tsx"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.22
Nodes (6): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap, LifeBuoy

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "applyForJob"
Cohesion: 0.33
Nodes (5): DiscordLoginButton(), Props, GuestLockOverlay(), Props, Lock

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.25
Nodes (4): BackToTop(), GuestBanner(), GuestGateProvider(), NewsItem

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.38
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 132 - "giant"
Cohesion: 0.33
Nodes (6): giant, base, bodyMaterial, label, parts, regions

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "requireModeratorOrSquadCaptain"
Cohesion: 0.29
Nodes (7): tall, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 137 - "DailyMessagePanel.tsx"
Cohesion: 0.29
Nodes (6): centeredRect(), Handle, ImageCropTool(), PRESETS, Rect, Crop

### Community 138 - "series/[id]/complete/page.tsx"
Cohesion: 0.43
Nodes (6): eventSelect, FINISHED_STATUSES, GET(), RELEVANT_STATUSES, sortSeriesEvents(), toWidgetEvent()

### Community 139 - "widget/events/route.ts"
Cohesion: 0.13
Nodes (11): metadata, russoOne, spaceGrotesk, viewport, AnimatedBackground(), Cell, PULSE_COLORS, CursorGlow() (+3 more)

### Community 140 - "MobileTopBar.tsx"
Cohesion: 0.33
Nodes (6): LogOut, Moon, Sun, MobileTopBar(), ROUTE_TITLES, useTheme()

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.11
Nodes (23): average(), GET(), BattleChallengeWidget(), ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge() (+15 more)

### Community 142 - "small"
Cohesion: 0.24
Nodes (9): displayName(), FloatingLobbyChat(), LobbyMsg, NOTIF_ICONS, Notification, PresenceUser, timeAgo(), MessageCircle (+1 more)

### Community 143 - "process-rank-art.ts"
Cohesion: 0.31
Nodes (8): BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RANKS, RAW_DIR, ringSvg()

### Community 144 - "tank"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.16
Nodes (19): skin, base, bodyMaterial, label, parts, regions, skin, bear (+11 more)

### Community 146 - "notifications.ts"
Cohesion: 0.06
Nodes (56): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), DELETE(), GET() (+48 more)

### Community 147 - "seed-notification-rules.ts"
Cohesion: 0.47
Nodes (5): displayNameOf(), GET(), USER_SELECT, UserLite, userSummary()

### Community 148 - "[userId]/page.tsx"
Cohesion: 0.40
Nodes (5): ELEMENT_KEYS, parseLayout(), ProfileOverlayPage(), ProfileElementKey, ProfileLayoutPositions

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "discord-roles.ts"
Cohesion: 0.10
Nodes (30): GET(), POST(), PATCH(), PIP_COUNT, RankIcon(), RankIconProps, SIZE_PX, DISCORD_COLORS (+22 more)

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 152 - "BadgeIcon.tsx"
Cohesion: 0.13
Nodes (12): Props, WinnerClip, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount, Poll, PollCard() (+4 more)

### Community 153 - "events/[id]/matches/route.ts"
Cohesion: 0.60
Nodes (4): displayNameOf(), POST(), UserLite, userSummary()

### Community 154 - "getWeekBounds"
Cohesion: 0.22
Nodes (9): cornerStyle(), ElementContent(), elementPositionStyle(), OverlayClient(), panelWidthFor(), pickTickerMatch(), usePanelRotator(), useStackedElements() (+1 more)

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 156 - "[tacticCardId]/route.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 157 - "GameCover.tsx"
Cohesion: 0.03
Nodes (14): DEFAULTS, RULES, RuleSeed, GET(), isAuthorized(), GameSuggestion, GameSuggestion, isAuthorized() (+6 more)

### Community 158 - "SeasonConfigPanel.tsx"
Cohesion: 0.11
Nodes (27): GET(), GET(), isAuthorized(), GET(), isAuthorized(), calcStreak(), GET(), Props (+19 more)

### Community 159 - "notifications/page.tsx"
Cohesion: 0.33
Nodes (6): guardian, base, bodyMaterial, label, parts, regions

### Community 160 - "PwaInstallButton.tsx"
Cohesion: 0.60
Nodes (5): isAuthorized(), isOverridden(), POST(), toJson(), getSkillTemplate()

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

### Community 191 - "canvas-confetti"
Cohesion: 0.29
Nodes (7): curvy, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 192 - "lucide-react"
Cohesion: 0.29
Nodes (7): strong, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 199 - "seed-standard-cards/route.ts"
Cohesion: 0.70
Nodes (4): GET(), isAuthorized(), POST(), toJson()

## Knowledge Gaps
- **1156 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1151 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `getSessionUser` to `roles.ts`, `app/layout.tsx`, `coach-service.ts`, `duels-live.ts`, `ranks.ts`, `notifications.ts`, `(dashboard)/leaderboard/page.tsx`, `notify-dispatch.ts`, `community-job-service.ts`, `SeasonConfigPanel.tsx`, `coach-guide-service.ts`, `gameservers.ts`, `packs.ts`, `MobaIcon`, `community-job-config.ts`, `JobBadge.tsx`, `discord-rest.ts`, `DailyPollBanner.tsx`, `TournamentManager.tsx`, `BattleLogEntry`, `SeriesDetailClient.tsx`, `admin/events/[id]/complete/route.ts`, `visionaer-service.ts`, `formatBerlinTime`, `SeriesIcon.tsx`, `EventAdminRow.tsx`, `JournalistTools.tsx`, `admin/community-jobs/disputes/route.ts`, `useServerLiveStatus.ts`, `points.ts`, `getActiveMembership`, `AdminNav.tsx`, `upload/route.ts`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `series/[id]/complete/route.ts`, `getSessionUser`, `series-event-points.ts`, `tank`, `discord-roles.ts`, `new-season/page.tsx`, `[tacticCardId]/route.ts`, `GameCover.tsx`, `shop-config.ts`, `clip-contest.ts`, `gameservers.ts`, `community-job-config.ts`, `JobBadge.tsx`, `discord-rest.ts`, `amp.ts`, `revert-event-completion.ts`, `hasMinRole`, `events/series/[id]/page.tsx`, `[id]/settings/SettingsClient.tsx`, `community-job-payout/route.ts`, `(dashboard)/events/page.tsx`, `CoachTools.tsx`, `useConfirm`, `CommunityBoardClient.tsx`, `EventSetupWizard.tsx`, `NotificationRulesPanel.tsx`, `photo-request-service.ts`, `AdminDonationsClient.tsx`, `CommunityBoardWidget.tsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `ranks.ts` to `roles.ts`, `fotograf-service.ts`, `getSessionUser`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `CommunityJobsAdminPanel.tsx`, `ProfileMobileView.tsx`, `notify-dispatch.ts`, `board-match3.ts`, `SeasonConfigPanel.tsx`, `community-job-service.ts`, `coach-guide-service.ts`, `community-job-config.ts`, `FotografTools.tsx`, `amp.ts`, `CoinIcon.tsx`, `EventEditClient.tsx`, `SeriesDetailClient.tsx`, `dashboard/page.tsx`, `visionaer-service.ts`, `formatBerlinTime`, `SeriesIcon.tsx`, `tutorial.ts`, `ProfileOverlayClient.tsx`, `ConfirmDialog.tsx`, `JournalistTools.tsx`, `NotificationRulesPanel.tsx`, `(dashboard)/battle-cards/page.tsx`, `EventPokalWinners.tsx`, `AdminNav.tsx`, `SeriesAdminRow.tsx`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1156 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.029873039581777446 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1349206349206349 - nodes in this community are weakly interconnected._
- **Should `fotograf-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._