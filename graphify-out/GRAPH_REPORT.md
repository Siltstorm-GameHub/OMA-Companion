# Graph Report - OMA-Companion  (2026-09-24)

## Corpus Check
- 970 files · ~3,145,929 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5022 nodes · 13948 edges · 214 communities (192 shown, 22 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `20b612e1`
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
- duel-deck.ts
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
- include
- process-badge-art.ts
- applyForJob
- updateQuestProgress
- SeriesCompleteClient.tsx
- giant
- overlay/[id]/page.tsx
- requireModeratorOrSquadCaptain
- Product
- GuildHub – Discord Companion
- DailyMessagePanel.tsx
- series/[id]/complete/page.tsx
- widget/events/route.ts
- DailySpin.tsx
- StarterPickFlow.tsx
- UserPickerSheet.tsx
- process-rank-art.ts
- [userId]/page.tsx
- requireModeratorOrSquadCaptain
- notifications.ts
- seed-notification-rules.ts
- app/layout.tsx
- middleware.ts
- discord-roles.ts
- new-season/page.tsx
- BadgeIcon.tsx
- ThemeProvider.tsx
- getWeekBounds
- Monster-Artwork — Edelstein-Kampf
- [tacticCardId]/route.ts
- GameCover.tsx
- SeasonConfigPanel.tsx
- events/[id]/complete/page.tsx
- PwaInstallButton.tsx
- season-config.ts
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- postprocessing
- notifications.ts
- FloatingLobbyChat.tsx
- generate-brand-assets.ts
- widget/events/route.ts
- widget/events/route.ts
- DashboardChrome.tsx
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- GameCover.tsx
- EventCategoryBadge.tsx
- MobileTopBar.tsx
- UserRoleManager.tsx
- lobby-cleanup/route.ts
- chroma-key.js
- gems-pvp.ts
- seed-notification-rules.ts
- battle-cards/layout.tsx
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- daily-poll/[id]/vote/route.ts
- bot-runner.mjs
- eslint.config.mjs
- active/route.ts
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
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts
- `main()` --calls--> `createNotification()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/notifications.ts
- `main()` --calls--> `getCommunityJob()`  [EXTRACTED]
  scripts/fix-community-job-payouts.ts → src/lib/community-jobs.ts
- `BoardMatch3()` --indirect_call--> `cell()`  [INFERRED]
  src/components/battle-cards/BoardMatch3.tsx → src/components/community-jobs/ReportEditor.tsx

## Import Cycles
- None detected.

## Communities (214 total, 22 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (71): POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET(), GET() (+63 more)

### Community 1 - "prisma.ts"
Cohesion: 0.15
Nodes (16): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), MessageCircleMore, ShieldCheck (+8 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.12
Nodes (25): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), RARITIES, STEP_LABELS (+17 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.10
Nodes (26): GET(), POST(), DELETE(), displayNameOf(), PATCH(), UserLite, userSummary(), displayNameOf() (+18 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.05
Nodes (55): EventCard(), EventUser, Props, SeriesEventItem, STATUS_CFG, StreamingPartner, CompareProfilePage(), fetchUserData() (+47 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.12
Nodes (38): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog(), beginTrapCheck() (+30 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.19
Nodes (15): DELETE(), POST(), DELETE(), POST(), DELETE(), POST(), handleCommunityJobReaction(), notifyVoteMilestone() (+7 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.07
Nodes (48): actionSchema, DUEL_STANCES, POST(), GET(), average(), GET(), POST(), VALID_DIFFICULTIES (+40 more)

### Community 8 - "interactive.ts"
Cohesion: 0.11
Nodes (52): hasAnyValidMove(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate, candidateTargetIds(), DecisionTargetKind (+44 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.05
Nodes (60): POST(), PATCH(), GET(), POST(), GET(), POST(), GET(), POST() (+52 more)

### Community 10 - "time.ts"
Cohesion: 0.10
Nodes (32): GET(), POST(), POST(), POST(), GET(), POST(), GET(), getAnnouncementChannel() (+24 more)

### Community 11 - "getSessionUser"
Cohesion: 0.06
Nodes (31): GET(), GET(), GET(), GET(), GET(), POST(), GET(), GET() (+23 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (59): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+51 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.06
Nodes (51): GET(), POST(), POST(), POST(), GET(), DELETE(), PATCH(), PATCH() (+43 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.08
Nodes (24): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, MobaIcon() (+16 more)

### Community 16 - "ranks.ts"
Cohesion: 0.06
Nodes (55): GET(), loadStreamer(), loadProfileOverlayState(), PointsPage(), generateMetadata(), PublicProfilePage(), ProfilePage(), COIN_SOURCES (+47 more)

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
Cohesion: 0.17
Nodes (7): Props, SpectatorRegisterButton(), Eye, CommunityStream, KIND_STYLE, PartnerStream, UnifiedStream

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.09
Nodes (30): DashboardLayout(), LeaderboardPage(), MEDALS, metadata, PODIUM_CONFIG, BotPreviewShell(), PartnerFooter(), Partner (+22 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.10
Nodes (23): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+15 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.05
Nodes (52): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+44 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.10
Nodes (40): GemsResultScreen(), GemsReward, AvailableAction, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue() (+32 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.09
Nodes (25): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+17 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.10
Nodes (32): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, activationCellsFor(), areAdjacent(), BoardAnimationStep (+24 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.10
Nodes (38): GET(), GET(), GET(), isAuthorized(), buildCampaignEnemyTeam(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked() (+30 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.14
Nodes (16): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, Thumb() (+8 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.05
Nodes (68): APPLY, main(), PATCH(), POST(), POST(), POST(), GET(), GET() (+60 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.11
Nodes (17): AdminShopPage(), PACK_KIND_INFO, PACK_KIND_ORDER, ShopConfigPanel(), TYPE_LABEL, ACCENT_CLASSES, PACK_INFO, PACK_ORDER (+9 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.06
Nodes (34): buildFfaRanking(), buildMatchRanking(), cornerStyle(), displayName(), ELEMENT_SIZE, ElementContent(), ElementKey, elementPositionStyle() (+26 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.11
Nodes (25): POST(), POST(), GET(), PATCH(), POST(), GET(), GET(), GET() (+17 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.10
Nodes (23): ActivityFeed(), cleanReason(), Filter, Tx, txType(), CATEGORY_ACCENT, CATEGORY_ICONS, EventWinnerPredictionWidget() (+15 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.08
Nodes (35): PATCH(), POST(), GET(), GET(), POST(), DELETE(), PATCH(), DELETE() (+27 more)

### Community 36 - "packs.ts"
Cohesion: 0.10
Nodes (21): Badge, ProfileJobBadge(), CustomBadgeDisplay, Props, Tab, TABS, ProfileQuestEntry, ProfileTournamentParticipationEntry (+13 more)

### Community 37 - "MobaIcon"
Cohesion: 0.14
Nodes (22): GET(), POST(), DELETE(), DELETE(), AuditActor, AUTHOR, AuthorRow, authorSearch() (+14 more)

### Community 38 - "types.ts"
Cohesion: 0.08
Nodes (35): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleStatsPanel(), StoredBattleLog, computeBattleStats() (+27 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.06
Nodes (67): POST(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps(), POST() (+59 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.17
Nodes (19): asCardResult(), asTacticResult(), awardDrawnCard(), awardDrawnTacticCard(), COMMUNITY_CHANCE, communityCardPoolSize(), countUnopenedPacks(), drawCard() (+11 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.06
Nodes (64): POST(), GET(), PUT(), requestSchema, POST(), serializeDrawResult(), GET(), POST() (+56 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.10
Nodes (40): GET(), PATCH(), PATCH(), PATCH(), GET(), PATCH(), PATCH(), GET() (+32 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.10
Nodes (36): GET(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames() (+28 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.15
Nodes (23): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), GEMS_DIFFICULTIES, POST(), formatStart(), GET() (+15 more)

### Community 45 - "auth.ts"
Cohesion: 0.16
Nodes (19): BodyModel(), CharacterBuilder(), GENDER_LABEL, CharacterRig(), PartModel(), bodyOf(), carryConfigOver(), defaultConfigFor() (+11 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.09
Nodes (45): POST(), POST(), OptionInput, POST(), POST(), GET(), GET(), GET() (+37 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.21
Nodes (19): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+11 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.10
Nodes (23): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+15 more)

### Community 49 - "amp.ts"
Cohesion: 0.05
Nodes (46): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+38 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.11
Nodes (18): PATCH(), patchSchema, characterConfigSchema, PATCH(), requestSchema, DevSkinTestPage(), SkinCanvas, SkinModel() (+10 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (26): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+18 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.12
Nodes (21): DELETE(), DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES (+13 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.09
Nodes (18): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, FullStandingsToggle(), Props, StandingRow (+10 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.07
Nodes (47): GET(), POST(), GET(), GET(), POST(), GET(), GET(), POST() (+39 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.15
Nodes (16): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), awardPoints(), parsePlacementPts() (+8 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.27
Nodes (8): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, ArrowLeft, Skull, isStoredBattleLog()

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.11
Nodes (13): SteamGameResult, PollOptionGameInputProps, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount, Poll, PollCard() (+5 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (25): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+17 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.31
Nodes (10): applyTierJumpLimit(), computePercentiles(), computeSeasonResults(), hashSeed(), MemberSeasonResult, resolveClass(), TIER_MULTIPLIER, TIER_ORDER (+2 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.12
Nodes (19): metadata, userSelect, BattleCardsLogo(), BattleLauncher(), Mode, RankRow(), BattleRankBadge(), RANK_STYLE (+11 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.14
Nodes (14): clips, file, normal, animations, bodies, genders, female, animations (+6 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.12
Nodes (18): Health, cache, flush(), inflight, isFresh(), JobBadge(), listeners, pending (+10 more)

### Community 65 - "dependencies"
Cohesion: 0.04
Nodes (47): @auth/prisma-adapter, canvas-confetti, discord.js, @google/generative-ai, lucide-react, motion, next, next-auth (+39 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.22
Nodes (11): isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, CLASS_SPEED_MIDPOINT, ensureCommunityCard() (+3 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.11
Nodes (16): CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS, ErrorNotice(), TournamentData, DIFFICULTY_CONFIG, DIFFICULTY_ORDER (+8 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.14
Nodes (17): JobTexts, EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE (+9 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.12
Nodes (18): GameserverWidget(), Server, ServerRow(), ApplyButton(), Light, LIGHT_COLOR, LIGHT_LABEL, Server (+10 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.12
Nodes (13): CardRow, PLACES, SeasonRewardsPanel(), TacticCardRow, SyncButton(), Save, Search, Upload (+5 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.36
Nodes (6): openSection(), ProfileCompletion(), Props, PointRule, PROFILE_COMPLETION_ITEMS, ProfileCompletionItem

### Community 74 - "formatBerlinTime"
Cohesion: 0.06
Nodes (35): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+27 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.08
Nodes (37): POST(), loadOverlayState(), parseOverlayControl(), GET(), UserLite, EventsPage(), ArchivedSeason, FORMAT_LABELS (+29 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.07
Nodes (27): formatBirthday(), ProfileEditor(), Props, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient() (+19 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.15
Nodes (15): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+7 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.10
Nodes (24): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+16 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.23
Nodes (11): GET(), PATCH(), patchSchema, placementSchema, DEFAULT_SEASON_REWARD_CONFIG, getSeasonRewardConfig(), isValidConfig(), isValidPlacement() (+3 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.26
Nodes (8): ShopPage(), CountUp(), HeroStatValue(), ShoppingBag, useValueDelta(), ValueDeltaBadge(), countPacksPurchasedToday(), startOfTodayUTC()

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.08
Nodes (30): PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS, ModerationItemDto, ModerationClient(), AuditClient() (+22 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.07
Nodes (28): AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES, ClipVotingClient(), Nomination, Props, ClipDesMonatsPage(), MONTH_NAMES (+20 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.11
Nodes (25): GET(), GET(), GET(), isAuthorized(), calcStreak(), GET(), formatDate(), SeasonConfigPanel() (+17 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.12
Nodes (21): GET(), api(), AreaKey, FoundUser, GameInfo, IdeaForm(), IdeaPrefill, MediaAsset (+13 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.20
Nodes (14): GET(), AdsTarget, ampCall(), AmpInstance, callWithSession(), getBaseUrl(), getInstanceDetails(), getInstanceSummaries() (+6 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.17
Nodes (17): GET(), GET(), NextEventTile(), GameCover(), coverCache, GameNameInput(), GameNameInputProps, highlightMatch() (+9 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.22
Nodes (11): CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS, PokalSection() (+3 more)

### Community 90 - "useConfirm"
Cohesion: 0.23
Nodes (11): gamedig, gamedig, GET(), GET(), StatusEntry, getInstances(), getInstancesRaw(), toInstanceStatus() (+3 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.04
Nodes (47): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, AdminLayout(), EventsTabs() (+39 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.08
Nodes (26): blocks, texture, blocks, texture, blocks, materials, texture, blocks (+18 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.10
Nodes (22): api(), Idea, IdeasBoardClient(), IdeaList(), api(), GameCard(), GameInfo, IdeaBody() (+14 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.29
Nodes (11): GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props, Users (+3 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.04
Nodes (60): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+52 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.10
Nodes (25): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+17 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.12
Nodes (19): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+11 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.08
Nodes (23): MonthlyContests, Props, YearlyContests, AdminUsersClient(), formatLastLogin(), Props, Role, UserRow (+15 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 102 - "recurrence.ts"
Cohesion: 0.33
Nodes (6): base, bodyMaterial, label, parts, regions, athlete

### Community 103 - "isVideoUrl"
Cohesion: 0.33
Nodes (6): small, base, bodyMaterial, label, parts, regions

### Community 104 - "studio-templates.ts"
Cohesion: 0.31
Nodes (25): defaults, defaults, slim, defaults, Bottom, Eyewear, FacialHair, Gloves (+17 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.18
Nodes (20): GET(), isAuthorized(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction() (+12 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 107 - "card-provisioning.ts"
Cohesion: 0.14
Nodes (17): CustomBadgeDisplay, Props, BadgeIcon(), BadgeIconProps, checkAndAwardBadges(), loadStats(), badgeArt(), CUSTOM_BADGE_ART (+9 more)

### Community 108 - "DailyPollPanel.tsx"
Cohesion: 0.39
Nodes (8): backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), getGradientBackground(), getLogoBadge(), vignetteSvg()

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.26
Nodes (8): main(), POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

### Community 110 - "points.ts"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 111 - "FfaView.tsx"
Cohesion: 0.09
Nodes (31): DELETE(), PATCH(), POST(), DELETE(), GET(), PATCH(), POST(), CATEGORIES (+23 more)

### Community 112 - "EventPokalWinners.tsx"
Cohesion: 0.22
Nodes (17): GET(), isAuthorized(), softResetRating(), addMonthsUTC(), getCurrentSeasonNumber(), getSeasonWindow(), grantDueSeasonRewards(), grantPlacementReward() (+9 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "duel-deck.ts"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.18
Nodes (14): EventCardLink(), CATEGORY_STRIP, EVENT_STATUS, GateButton(), GateLink(), GateOptions, GuestBanner(), GuestGateContext (+6 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.15
Nodes (17): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+9 more)

### Community 118 - "AdminNav.tsx"
Cohesion: 0.10
Nodes (20): api(), AssetOption, buildEventTemplate(), cell(), EventOption, FoundUser, InterviewOption, PostOption (+12 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "branded-cover.ts"
Cohesion: 0.06
Nodes (38): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+30 more)

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.18
Nodes (6): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap, LifeBuoy

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.09
Nodes (31): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+23 more)

### Community 124 - "SeriesAdminRow.tsx"
Cohesion: 0.06
Nodes (38): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+30 more)

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.20
Nodes (13): POST(), ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, CLASS_BASE_STATS, isOverridden(), runSeasonUpdate(), toJson(), buildSeasonInputs() (+5 more)

### Community 126 - "ServerCard.tsx"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 127 - "include"
Cohesion: 0.15
Nodes (16): CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, ThumbVote(), voteUrl() (+8 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "applyForJob"
Cohesion: 0.07
Nodes (17): Badge, CATEGORIES, CATEGORY_LABELS, User, MONTH_NAMES, QuestsPage(), QuestRegenerateButton(), DiscordLoginButton() (+9 more)

### Community 130 - "updateQuestProgress"
Cohesion: 0.22
Nodes (13): GET(), IdeaPageClient(), IdeaPage(), ReportPage(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData, toIdeaFeedEntry() (+5 more)

### Community 131 - "SeriesCompleteClient.tsx"
Cohesion: 0.15
Nodes (20): POST(), requestSchema, LineupPage(), metadata, BattleCardsPage(), grantGuaranteedPack(), grantStarterPick(), hasStarterDeck() (+12 more)

### Community 132 - "giant"
Cohesion: 0.10
Nodes (20): base, bodyMaterial, label, parts, regions, bear, giant, guardian (+12 more)

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.29
Nodes (7): LayoutPositions, CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS, PanelKey, parseLayout()

### Community 134 - "requireModeratorOrSquadCaptain"
Cohesion: 0.25
Nodes (8): tall, alwaysOn, base, bodyMaterial, defaults, label, parts, regions

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
Cohesion: 0.33
Nodes (7): revokePointsByReason(), applyMatchResult(), ApplyMatchResultError, ApplyMatchResultInput, finalFinalistReason(), finalWinReason(), loserOf()

### Community 139 - "widget/events/route.ts"
Cohesion: 0.12
Nodes (8): RULES, FEATURES, AnimatedBackground(), Cell, PULSE_COLORS, CheckSquare, Scroll, ShieldAlert

### Community 140 - "DailySpin.tsx"
Cohesion: 0.33
Nodes (6): tank, base, bodyMaterial, label, parts, regions

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.11
Nodes (22): ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge(), ChallengeUserPicker(), uname(), UserLite (+14 more)

### Community 142 - "UserPickerSheet.tsx"
Cohesion: 0.24
Nodes (15): LOGO_POSITIONS, StudioEditor(), ImageDown, drawLogo(), drawWatermark(), loadImage(), LogoPosition, prepareUploadImage() (+7 more)

### Community 143 - "process-rank-art.ts"
Cohesion: 0.31
Nodes (8): BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RANKS, RAW_DIR, ringSvg()

### Community 144 - "[userId]/page.tsx"
Cohesion: 0.23
Nodes (13): GET(), PATCH(), PACK_LABEL, POST(), VALID_KINDS, GET(), POST(), rollPrize() (+5 more)

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.28
Nodes (13): skin, skin, skin, skin, skin, skin, block, row (+5 more)

### Community 146 - "notifications.ts"
Cohesion: 0.06
Nodes (47): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), GET(), PATCH() (+39 more)

### Community 148 - "app/layout.tsx"
Cohesion: 0.19
Nodes (8): metadata, russoOne, spaceGrotesk, viewport, CursorGlow(), ExitAppGuard(), TRAP_STATE, SessionProvider()

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "discord-roles.ts"
Cohesion: 0.30
Nodes (9): GET(), POST(), PATCH(), assignCurrentRole(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole() (+1 more)

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 152 - "BadgeIcon.tsx"
Cohesion: 0.13
Nodes (19): DashboardPage(), formatCountdown(), formatFreshness(), getGlobalDashboardData, MONTH_NAMES, ROLE_LABEL, ROLE_STYLE, AnimatedBar() (+11 more)

### Community 153 - "ThemeProvider.tsx"
Cohesion: 0.24
Nodes (9): Moon, Sun, ThemedToaster(), Theme, ThemeContext, ThemeProvider(), useTheme(), ThemeToggle() (+1 more)

### Community 154 - "getWeekBounds"
Cohesion: 0.44
Nodes (9): GET(), displayName(), getCronRuns(), getJobHealth(), getPayoutOverview(), getVoteAnomalies(), previewPayout(), VoteEvent (+1 more)

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 156 - "[tacticCardId]/route.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 157 - "GameCover.tsx"
Cohesion: 0.03
Nodes (9): DEFAULTS, GET(), isAuthorized(), isAuthorized(), POST(), DEFAULT_PREFS, AdminEventsPage(), syncDueEventActivations() (+1 more)

### Community 158 - "SeasonConfigPanel.tsx"
Cohesion: 0.17
Nodes (14): GET(), isAuthorized(), POST(), POST(), GET(), POST(), onCommunityJobVoteCast(), generateMonthlyQuests() (+6 more)

### Community 159 - "events/[id]/complete/page.tsx"
Cohesion: 0.22
Nodes (10): AdminEventCompletePage(), DEFAULT_POLL, DEFAULT_REWARDS, MultiPollConfig, parsePoll(), parseRewards(), PlacementReward, PollConfig (+2 more)

### Community 160 - "PwaInstallButton.tsx"
Cohesion: 0.22
Nodes (8): Download, Menu, Share, BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 161 - "season-config.ts"
Cohesion: 0.36
Nodes (8): GET(), PATCH(), patchSchema, AdminBattleCardsPage(), getSeasonConfig(), KEYS, setEloHardResetAt(), setSeason1StartAt()

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 163 - "HeroStatValue.tsx"
Cohesion: 0.14
Nodes (21): curve(), curvePercent(), StandardCardSeed, ACTIVE_POOL, DD_ACTIVE_SKILLS, DD_PASSIVE_KITS, DD_ULTIMATE_SKILLS, PASSIVE_POOL (+13 more)

### Community 164 - "postprocessing"
Cohesion: 0.27
Nodes (5): Props, WinnerClip, Play, NewContentPing(), playNotifySound()

### Community 165 - "notifications.ts"
Cohesion: 0.33
Nodes (7): DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled(), NotificationType, PREF_KEY

### Community 166 - "FloatingLobbyChat.tsx"
Cohesion: 0.44
Nodes (11): alwaysOn, alwaysOn, alwaysOn, alwaysOn, alwaysOn, alwaysOn, alwaysOn, alwaysOn (+3 more)

### Community 167 - "generate-brand-assets.ts"
Cohesion: 0.40
Nodes (3): OUT_DIR, PNG_SIZES, SOURCE

### Community 168 - "widget/events/route.ts"
Cohesion: 0.29
Nodes (11): categories, categories, Bottom, Eyewear, FacialHair, Gloves, Hair, Headwear (+3 more)

### Community 169 - "widget/events/route.ts"
Cohesion: 0.43
Nodes (6): eventSelect, FINISHED_STATUSES, GET(), RELEVANT_STATUSES, sortSeriesEvents(), toWidgetEvent()

### Community 172 - "Kapitel-Hintergründe — Kampagne"
Cohesion: 0.50
Nodes (3): Benötigte Dateien, Format, Kapitel-Hintergründe — Kampagne

### Community 173 - "GameCover.tsx"
Cohesion: 0.48
Nodes (4): CoverBrandBadge(), EventCoverDefault(), dynamicCache, GameCoverProps

### Community 174 - "EventCategoryBadge.tsx"
Cohesion: 0.33
Nodes (5): CATEGORY_BG_TINT, CATEGORY_BORDER, CATEGORY_CONFIG, EventCategoryBadge(), Props

### Community 175 - "MobileTopBar.tsx"
Cohesion: 0.50
Nodes (4): LogOut, MobileTopBar(), ROUTE_TITLES, useTheme()

### Community 177 - "lobby-cleanup/route.ts"
Cohesion: 0.60
Nodes (5): isAuthorized(), isOverridden(), POST(), toJson(), getSkillTemplate()

### Community 179 - "gems-pvp.ts"
Cohesion: 0.60
Nodes (4): CHEST_TABLE, ChestPrize, grantGemsPvpVictoryChest(), rollChestPrize()

### Community 191 - "canvas-confetti"
Cohesion: 0.29
Nodes (7): curvy, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 192 - "lucide-react"
Cohesion: 0.29
Nodes (7): strong, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 199 - "seed-standard-cards/route.ts"
Cohesion: 0.53
Nodes (5): STANDARD_CARDS, GET(), isAuthorized(), POST(), toJson()

## Knowledge Gaps
- **1155 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1150 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `getSessionUser` to `roles.ts`, `applyForJob`, `updateQuestProgress`, `fotograf-service.ts`, `app/layout.tsx`, `coach-service.ts`, `time.ts`, `duels-live.ts`, `ranks.ts`, `notifications.ts`, `(dashboard)/leaderboard/page.tsx`, `BadgeIcon.tsx`, `getWeekBounds`, `community-job-service.ts`, `SeasonConfigPanel.tsx`, `coach-guide-service.ts`, `gameservers.ts`, `MobaIcon`, `community-job-config.ts`, `job-recommendations.ts`, `JobBadge.tsx`, `discord-rest.ts`, `DailyPollBanner.tsx`, `TournamentManager.tsx`, `BattleLogEntry`, `dashboard/page.tsx`, `SeriesIcon.tsx`, `AdminEventsClient.tsx`, `ClipVotingClient.tsx`, `bot/index.ts`, `CommunityBoardClient.tsx`, `admin/community-jobs/disputes/route.ts`, `useServerLiveStatus.ts`, `points.ts`, `FfaView.tsx`, `report/[id]/page.tsx`, `getActiveMembership`, `upload/route.ts`, `SeriesAdminRow.tsx`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `SeriesAdminRow.tsx` to `roles.ts`, `SeriesCompleteClient.tsx`, `fotograf-service.ts`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `ranks.ts`, `CommunityJobsAdminPanel.tsx`, `ProfileMobileView.tsx`, `BadgeIcon.tsx`, `notify-dispatch.ts`, `community-job-service.ts`, `coach-guide-service.ts`, `packs.ts`, `FotografTools.tsx`, `amp.ts`, `CoinIcon.tsx`, `community-board-comment-service.ts`, `formatBerlinTime`, `SeriesIcon.tsx`, `tutorial.ts`, `ProfileOverlayClient.tsx`, `ConfirmDialog.tsx`, `(dashboard)/events/page.tsx`, `send/route.ts`, `JournalistTools.tsx`, `EventSetupWizard.tsx`, `(dashboard)/battle-cards/page.tsx`, `adapters.ts`, `FfaView.tsx`, `report/[id]/page.tsx`, `AdminNav.tsx`, `branded-cover.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `getSessionUser`, `series-event-points.ts`, `[userId]/page.tsx`, `discord-roles.ts`, `new-season/page.tsx`, `[tacticCardId]/route.ts`, `shop-config.ts`, `season-config.ts`, `clip-contest.ts`, `gameservers.ts`, `community-job-config.ts`, `JobBadge.tsx`, `discord-rest.ts`, `amp.ts`, `dispatchNotification`, `revert-event-completion.ts`, `hasMinRole`, `SeriesIcon.tsx`, `community-job-payout/route.ts`, `CoachTools.tsx`, `MarkdownLite.tsx`, `useConfirm`, `adapters.ts`, `photo-request-service.ts`, `FfaView.tsx`, `AdminDonationsClient.tsx`, `CommunityBoardWidget.tsx`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1155 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03218914684517875 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14624505928853754 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11586452762923351 - nodes in this community are weakly interconnected._