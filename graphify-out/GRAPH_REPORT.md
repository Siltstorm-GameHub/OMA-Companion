# Graph Report - OMA-Companion  (2026-09-21)

## Corpus Check
- 893 files · ~2,989,358 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4268 nodes · 10466 edges · 210 communities (187 shown, 23 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4f499e37`
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
- clip-des-monats/page.tsx
- overlay/[id]/page.tsx
- elo.ts
- Product
- GuildHub – Discord Companion
- PollGameSuggestInput.tsx
- series/[id]/complete/page.tsx
- CoachRatingSection.tsx
- DailySpin.tsx
- StarterPickFlow.tsx
- GameCover.tsx
- process-rank-art.ts
- run-season.ts
- requireModeratorOrSquadCaptain
- notifications.ts
- DailyMessagePanel.tsx
- OverlayClient
- middleware.ts
- BadgesAdminClient.tsx
- new-season/page.tsx
- BadgeIcon.tsx
- LiveStreamsBanner.tsx
- PwaInstallButton.tsx
- Monster-Artwork — Edelstein-Kampf
- [tacticCardId]/route.ts
- notification-rules/route.ts
- series/[id]/complete/route.ts
- widget/events/route.ts
- ImageCropTool.tsx
- lineup/route.ts
- battle-cards-challenge-cleanup/route.ts
- getSkillTemplate
- cards/page.tsx
- tactic-cards/page.tsx
- [userId]/page.tsx
- generate-brand-assets.ts
- matchup/route.ts
- seed-standard-cards/route.ts
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- UserRoleManager.tsx
- genre-icons.ts
- chroma-key.js
- grant-tactic-cards-to-all/route.ts
- battle-cards/layout.tsx
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

## God Nodes (most connected - your core abstractions)
1. `getSessionUser()` - 282 edges
2. `requireRole()` - 197 edges
3. `formatBerlinDate()` - 101 edges
4. `hasMinRole()` - 91 edges
5. `dispatchNotification()` - 74 edges
6. `getBerlinDateParts()` - 56 edges
7. `requireWidgetKey()` - 36 edges
8. `CoinIcon()` - 35 edges
9. `RankedAvatar()` - 35 edges
10. `useConfirm()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json
- `StandardCardSeed` --references--> `ActiveSkillData`  [EXTRACTED]
  prisma/battle-cards-seed-data.ts → src/lib/battle-engine/types.ts

## Import Cycles
- None detected.

## Communities (210 total, 23 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.04
Nodes (51): POST(), POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET() (+43 more)

### Community 1 - "prisma.ts"
Cohesion: 0.03
Nodes (9): DEFAULTS, RULES, RuleSeed, GET(), isAuthorized(), GameSuggestion, GameSuggestion, DEFAULT_PREFS (+1 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.11
Nodes (25): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), RARITIES, STEP_LABELS (+17 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.07
Nodes (53): POST(), GET(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps() (+45 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.08
Nodes (36): DELETE(), GET(), POST(), POST(), POST(), DELETE(), PATCH(), DELETE() (+28 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.06
Nodes (56): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), DELETE(), GET() (+48 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.05
Nodes (38): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+30 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.14
Nodes (16): EventCardLink(), CATEGORY_STRIP, EVENT_STATUS, SyncButton(), GateButton(), GateLink(), GateOptions, GuestBanner() (+8 more)

### Community 8 - "interactive.ts"
Cohesion: 0.16
Nodes (35): generateBoard(), hasAnyValidMove(), LEVEL_STAT_MULTIPLIER, candidateTargetIds(), tickStatModifierDurations(), checkWinner(), defaultDecideAction(), grantRage() (+27 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.06
Nodes (55): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+47 more)

### Community 10 - "time.ts"
Cohesion: 0.16
Nodes (17): GET(), isAuthorized(), GET(), POST(), MONTH_NAMES, QuestsPage(), QuestRegenerateButton(), sendDiscordDM() (+9 more)

### Community 11 - "getSessionUser"
Cohesion: 0.06
Nodes (39): GET(), GET(), POST(), GET(), GET(), POST(), DELETE(), PATCH() (+31 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.06
Nodes (46): POST(), GET(), UserLite, EventsPage(), FullStandingsToggle(), Props, StandingRow, StandingUser (+38 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.05
Nodes (42): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+34 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.13
Nodes (35): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyTacticEffects(), asBattleLog(), beginTrapCheck(), checkDuelWinner() (+27 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.07
Nodes (24): DonationsPage(), fmt(), MONTH_NAMES, streakBadge(), DashboardLayout(), LeaderboardPage(), MEDALS, metadata (+16 more)

### Community 16 - "ranks.ts"
Cohesion: 0.06
Nodes (64): POST(), GET(), POST(), PATCH(), loadProfileOverlayState(), CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage() (+56 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.09
Nodes (42): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+34 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (37): VfxEvent, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction (+29 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.07
Nodes (34): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+26 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.12
Nodes (20): BattleChallengeWidget(), ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge(), ChallengeUserPicker(), uname() (+12 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.13
Nodes (25): BracketView(), Match, Participant, roundLabel(), uname(), User, Props, WanderpocalBadge() (+17 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.06
Nodes (43): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView() (+35 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.07
Nodes (30): openSection(), ProfileCompletion(), Props, Badge, ProfileJobBadge(), CustomBadgeDisplay, Props, Tab (+22 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.13
Nodes (30): POST(), GET(), isAuthorized(), GEMS_DIFFICULTIES, POST(), formatStart(), GET(), POST() (+22 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.10
Nodes (36): GemsResultScreen(), GemsReward, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue(), getArenaBackgroundStyle() (+28 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.05
Nodes (44): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+36 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.10
Nodes (31): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, SwapAnim, swapTranslateFor(), TILE_ICON, cell() (+23 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.12
Nodes (31): GET(), GET(), isAuthorized(), CampaignLevelDef, AFK_FARMER, GRIEFER_IMP, LAG_SPIKE, LOOT_GOBLIN (+23 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.24
Nodes (10): DELETE(), PATCH(), POST(), revokePointsByReason(), applyMatchResult(), ApplyMatchResultError, ApplyMatchResultInput, finalFinalistReason() (+2 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.05
Nodes (63): APPLY, main(), PATCH(), PATCH(), GET(), POST(), POST(), GET() (+55 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.08
Nodes (34): GET(), PATCH(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage(), PACK_KIND_INFO (+26 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (21): buildFfaRanking(), buildMatchRanking(), displayName(), ElementSlot, formatEntryStats(), IdentityFlipTile(), LayoutEntry, MatchTicker() (+13 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.11
Nodes (26): POST(), POST(), GET(), PATCH(), POST(), GET(), GET(), GET() (+18 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.12
Nodes (23): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), GET(), POST() (+15 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 36 - "packs.ts"
Cohesion: 0.10
Nodes (31): POST(), serializeDrawResult(), PACK_LABEL, POST(), VALID_KINDS, ShopPage(), CHEST_TABLE, ChestPrize (+23 more)

### Community 37 - "MobaIcon"
Cohesion: 0.09
Nodes (23): BattleLauncher(), Mode, RankRow(), BattleRankBadge(), CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS (+15 more)

### Community 38 - "types.ts"
Cohesion: 0.10
Nodes (31): applyShieldAbsorption(), DamageRoll, rollDamage(), DuelFieldSlot, applyDamageToUnit(), EffectContext, executeEffect(), runPassive() (+23 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.04
Nodes (42): AlbumPage(), EventCard(), EventUser, GENRE_MAP, Props, SeriesEventItem, STATUS_CFG, StreamingPartner (+34 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.08
Nodes (38): POST(), average(), GET(), POST(), VALID_DIFFICULTIES, POST(), requestSchema, toDbResult() (+30 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.08
Nodes (31): GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), POST(), DELETE(), displayNameOf() (+23 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.12
Nodes (27): GET(), PATCH(), PATCH(), PATCH(), GET(), PATCH(), GET(), PATCH() (+19 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.12
Nodes (31): GET(), POST(), GET(), GET(), getActiveMembership(), getCommunityJobCatalog(), getWeekBounds(), berlinDateParts() (+23 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.10
Nodes (24): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, calcEntryAvg(), Entry, FfaView() (+16 more)

### Community 45 - "auth.ts"
Cohesion: 0.08
Nodes (43): GET(), POST(), requestSchema, DuelDeckPage(), metadata, LineupPage(), metadata, metadata (+35 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.19
Nodes (15): GET(), GET(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee(), updateEventStatus(), authHeader(), DiscordEmbed (+7 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.21
Nodes (19): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+11 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.09
Nodes (24): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+16 more)

### Community 49 - "amp.ts"
Cohesion: 0.20
Nodes (14): GET(), AdsTarget, ampCall(), AmpInstance, callWithSession(), getBaseUrl(), getInstanceDetails(), getInstanceSummaries() (+6 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.29
Nodes (11): POST(), GET(), POST(), answerInterview(), createInterview(), declineInterview(), InterviewResult, listMyInterviews() (+3 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (26): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+18 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.10
Nodes (18): Props, WinnerClip, DailyMessageBanner(), Message, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount (+10 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.22
Nodes (17): GET(), isAuthorized(), softResetRating(), addMonthsUTC(), getCurrentSeasonNumber(), getSeasonWindow(), grantDueSeasonRewards(), grantPlacementReward() (+9 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.12
Nodes (23): FORMATS, CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant (+15 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.29
Nodes (7): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, isStoredBattleLog(), winStreakBonusFor()

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.10
Nodes (25): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, GENRES (+17 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.10
Nodes (18): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, GENRES, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward (+10 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (24): DELETE(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage(), DominionCfg, DominionChange (+16 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.14
Nodes (21): curve(), curvePercent(), StandardCardSeed, ACTIVE_POOL, DD_ACTIVE_SKILLS, DD_PASSIVE_KITS, DD_ULTIMATE_SKILLS, PASSIVE_POOL (+13 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.10
Nodes (28): DELETE(), DELETE(), POST(), GET(), POST(), GET(), ReportPage(), addComment() (+20 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.09
Nodes (14): LinkedUser, Partner, PartnerManager(), TwitchPreview, AmpSuggestion, EMPTY_FORM, FormState, Light (+6 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.06
Nodes (46): GET(), GET(), isAuthorized(), calcStreak(), GET(), AdminEventsPage(), CreateContestForm(), defaultPeriodEnd() (+38 more)

### Community 65 - "dependencies"
Cohesion: 0.04
Nodes (47): @auth/prisma-adapter, canvas-confetti, discord.js, @google/generative-ai, lucide-react, motion, next, next-auth (+39 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

### Community 67 - "hasMinRole"
Cohesion: 0.07
Nodes (41): GET(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), GEMS_DIFFICULTIES, PATCH(), PATCH(), DELETE() (+33 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.11
Nodes (24): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+16 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.17
Nodes (14): api(), AssetOption, buildEventTemplate(), EventOption, FoundUser, InterviewOption, PostOption, ReportEditor() (+6 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.15
Nodes (19): GET(), NextEventTile(), CoverBrandBadge(), EventCoverDefault(), dynamicCache, GameCover(), GameCoverProps, coverCache (+11 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.19
Nodes (14): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), DEFAULT_SEASON_REWARD_CONFIG (+6 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.22
Nodes (17): AvailableAction, LiveSnapshot, LiveUnit, LiveDuelSnapshot, LiveBattleAwaiting, BoardGrid, SpecialGrid, SwapMove (+9 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.19
Nodes (8): MonthlyContests, Props, YearlyContests, EventsTabs(), TabItem, TabPanel(), Tabs(), TabsProps

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.09
Nodes (20): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+12 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.13
Nodes (14): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+6 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.33
Nodes (7): PATCH(), patchSchema, PATCH(), requestSchema, CardContentError, CardContentPatch, updateCardContent()

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.12
Nodes (18): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+10 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.23
Nodes (11): gamedig, gamedig, GET(), GET(), StatusEntry, getInstances(), getInstancesRaw(), toInstanceStatus() (+3 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.25
Nodes (11): GET(), PATCH(), patchSchema, formatDate(), SeasonConfigPanel(), toDateInputValue(), getSeasonConfig(), KEYS (+3 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.12
Nodes (19): AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES, SeriesOption, ConfirmDialog(), ConfirmDialogProps, ConfirmOptions, ConfirmState (+11 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.12
Nodes (16): ClipVotingClient(), Nomination, Props, ClipDesMonatsPage(), MONTH_NAMES, GalleryEntry, MONTH_NAMES, Nomination (+8 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.22
Nodes (17): checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction(), trackVoice(), client (+9 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.15
Nodes (20): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+12 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.30
Nodes (10): Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite(), parseBlocks(), renderInline(), safeHref() (+2 more)

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.16
Nodes (22): GET(), POST(), GET(), OptionInput, POST(), POST(), createNotificationForUsers(), dispatchDiscordDm() (+14 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.06
Nodes (35): ActivityFeed(), cleanReason(), Filter, Tx, txType(), Event, EventAdminRow(), Match (+27 more)

### Community 90 - "useConfirm"
Cohesion: 0.14
Nodes (15): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+7 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.15
Nodes (14): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+6 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.08
Nodes (36): PATCH(), DELETE(), GET(), POST(), GET(), DELETE(), PATCH(), DELETE() (+28 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.20
Nodes (7): api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), PhotoRequestItem, Stats

### Community 95 - "apply-season-results.ts"
Cohesion: 0.19
Nodes (16): ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, CLASS_BASE_STATS, isOverridden(), runSeasonUpdate(), toJson(), applyTierJumpLimit(), computePercentiles() (+8 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.11
Nodes (13): CATEGORIES, GENRES, inputStyle, PlacementReward, PLATFORMS, PollConfig, RECURRENCE_OPTS, SeasonPrefill (+5 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.13
Nodes (16): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+8 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.18
Nodes (7): BackToTop(), GuestGateProvider(), ACCENT_COLOR, ICON_MAP, NewsItem, Props, TopNewsFeed()

### Community 99 - "PackOpener.tsx"
Cohesion: 0.15
Nodes (11): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+3 more)

### Community 100 - "adapters.ts"
Cohesion: 0.19
Nodes (6): NAV, FloatingPill(), NAV, NavLink, useTheme(), PollBadge()

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 102 - "recurrence.ts"
Cohesion: 0.26
Nodes (12): POST(), EventSetupWizard(), buildBerlinDate(), calcNextDate(), daysInMonthOf(), describeMonthlyModes(), MonthlyMode, nthWeekdayOfMonth() (+4 more)

### Community 103 - "isVideoUrl"
Cohesion: 0.13
Nodes (14): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, centeredRect() (+6 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.26
Nodes (14): LOGO_POSITIONS, StudioEditor(), drawLogo(), drawWatermark(), loadImage(), LogoPosition, prepareUploadImage(), renderStudioCanvas() (+6 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.26
Nodes (12): DELETE(), GET(), POST(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), isActiveMember(), listMyPhotoRequests() (+4 more)

### Community 107 - "card-provisioning.ts"
Cohesion: 0.15
Nodes (17): isAuthorized(), isOverridden(), POST(), toJson(), isAuthorized(), POST(), isAuthorized(), POST() (+9 more)

### Community 108 - "DailyPollPanel.tsx"
Cohesion: 0.23
Nodes (12): DailyPollPanel(), defaultForm(), formatDate(), formatDateTime(), FormOption, FormState, isCurrentlyActive(), Option (+4 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.21
Nodes (12): GameserverWidget(), Server, ServerRow(), ServerCard(), Server, ServerList(), latestStatus, LiveStatus (+4 more)

### Community 110 - "points.ts"
Cohesion: 0.21
Nodes (9): GET(), isAuthorized(), CATEGORY_LABELS, DAILY_CAPS, PointCategory, PointRule, RANK_POINT_CATEGORIES, PROFILE_COMPLETION_ITEMS (+1 more)

### Community 111 - "FfaView.tsx"
Cohesion: 0.29
Nodes (10): BattleStatsPanel(), StoredBattleLog, computeBattleStats(), findMvpId(), score(), UnitBattleStats, LiveBattleSnapshot, BattleLogEntry (+2 more)

### Community 112 - "EventPokalWinners.tsx"
Cohesion: 0.09
Nodes (28): CustomBadgeDisplay, Props, MONTH_NAMES, YearReviewPage(), CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props (+20 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.31
Nodes (10): GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props, FavoriteGame (+2 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "duel-deck.ts"
Cohesion: 0.23
Nodes (13): GET(), PUT(), requestSchema, assertOwnership(), DuelDeckSelection, getActiveDuelDeck(), requireActiveDuelDeck(), setActiveDuelDeck() (+5 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.31
Nodes (8): awardPoints(), parsePlacementPts(), PATCH(), BracketMatch, generateBracket(), generateRoundRobin(), POST(), shuffle()

### Community 117 - "getActiveMembership"
Cohesion: 0.24
Nodes (9): api(), Campaign, dueAt(), EventOption, MarketingCampaignsBlock(), MarketingStatsBlock(), Stats, STEPS (+1 more)

### Community 118 - "AdminNav.tsx"
Cohesion: 0.22
Nodes (9): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, DailyPollActionBadge(), EventsActionBadge() (+1 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.26
Nodes (12): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+4 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "branded-cover.ts"
Cohesion: 0.30
Nodes (10): GET(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), getGradientBackground(), getLogoBadge() (+2 more)

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.36
Nodes (7): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), Effect, TrapTriggerCondition

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.18
Nodes (10): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+2 more)

### Community 124 - "SeriesAdminRow.tsx"
Cohesion: 0.20
Nodes (8): LegacyRow, SeriesAdminRow(), SeriesEvent, User, StatRow, LEGACY_LIGA_OPTION, TOURNAMENT_FORMATS, TournamentFormatValue

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 126 - "ServerCard.tsx"
Cohesion: 0.20
Nodes (6): ApplyButton(), Light, LIGHT_COLOR, LIGHT_LABEL, Server, ServerCredentials()

### Community 127 - "include"
Cohesion: 0.43
Nodes (6): EmojiPanel(), Props, UNICODE_GROUPS, CustomEmoji, customEmojiToken(), customEmojiUrl()

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "applyForJob"
Cohesion: 0.32
Nodes (7): displayName(), FloatingLobbyChat(), LobbyMsg, NOTIF_ICONS, Notification, PresenceUser, timeAgo()

### Community 130 - "updateQuestProgress"
Cohesion: 0.47
Nodes (3): POST(), POST(), updateQuestProgress()

### Community 131 - "SeriesCompleteClient.tsx"
Cohesion: 0.39
Nodes (7): ActionEstimate, DecisionTargetKind, describeAvailableActions(), estimateActionEffect(), primaryTargetKind(), getLevelValue(), normalAttackEffects()

### Community 132 - "clip-des-monats/page.tsx"
Cohesion: 0.25
Nodes (4): TournamentData, MONTH_NAMES, CountdownBadge(), useCountdown()

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "elo.ts"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 137 - "PollGameSuggestInput.tsx"
Cohesion: 0.24
Nodes (4): SteamGameResult, PollOptionGameInputProps, GameSuggestion, PollGameSuggestInputProps

### Community 138 - "series/[id]/complete/page.tsx"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 139 - "CoachRatingSection.tsx"
Cohesion: 0.22
Nodes (4): api(), Coach, CoachRatingSection(), RateableSession

### Community 140 - "DailySpin.tsx"
Cohesion: 0.33
Nodes (4): formatBirthday(), ProfileEditor(), Props, ImageUploadFieldProps

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.53
Nodes (4): GET(), displayName(), EventFacts, getEventFacts()

### Community 142 - "GameCover.tsx"
Cohesion: 0.40
Nodes (4): DiscordLoginButton(), Props, GuestLockOverlay(), Props

### Community 143 - "process-rank-art.ts"
Cohesion: 0.31
Nodes (8): BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RANKS, RAW_DIR, ringSvg()

### Community 144 - "run-season.ts"
Cohesion: 0.39
Nodes (6): POST(), buildSeasonInputs(), countBy(), runFullSeasonUpdate(), RunSeasonResult, markPreSeasonRan()

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.60
Nodes (4): PickerGrid(), uname(), User, UserPickerSheet()

### Community 146 - "notifications.ts"
Cohesion: 0.29
Nodes (8): main(), DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled(), NotificationType, PREF_KEY

### Community 147 - "DailyMessagePanel.tsx"
Cohesion: 0.29
Nodes (9): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyMessageAdminPage() (+1 more)

### Community 148 - "OverlayClient"
Cohesion: 0.22
Nodes (9): cornerStyle(), ElementContent(), elementPositionStyle(), OverlayClient(), panelWidthFor(), pickTickerMatch(), usePanelRotator(), useStackedElements() (+1 more)

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "BadgesAdminClient.tsx"
Cohesion: 0.25
Nodes (4): Badge, CATEGORIES, CATEGORY_LABELS, User

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 152 - "BadgeIcon.tsx"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 153 - "LiveStreamsBanner.tsx"
Cohesion: 0.25
Nodes (4): CommunityStream, KIND_STYLE, PartnerStream, UnifiedStream

### Community 154 - "PwaInstallButton.tsx"
Cohesion: 0.21
Nodes (8): MobileTopBar(), ROUTE_TITLES, useTheme(), BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 156 - "[tacticCardId]/route.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 157 - "notification-rules/route.ts"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 158 - "series/[id]/complete/route.ts"
Cohesion: 0.38
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 159 - "widget/events/route.ts"
Cohesion: 0.43
Nodes (6): eventSelect, FINISHED_STATUSES, GET(), RELEVANT_STATUSES, sortSeriesEvents(), toWidgetEvent()

### Community 161 - "lineup/route.ts"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 164 - "cards/page.tsx"
Cohesion: 0.40
Nodes (3): CardRow, CommunityCardsAdmin(), AdminCommunityCardsPage()

### Community 165 - "tactic-cards/page.tsx"
Cohesion: 0.40
Nodes (3): AdminTacticCardsPage(), TacticCardRow, TacticCardsAdmin()

### Community 166 - "[userId]/page.tsx"
Cohesion: 0.40
Nodes (5): ELEMENT_KEYS, parseLayout(), ProfileOverlayPage(), ProfileElementKey, ProfileLayoutPositions

### Community 167 - "generate-brand-assets.ts"
Cohesion: 0.40
Nodes (3): OUT_DIR, PNG_SIZES, SOURCE

### Community 169 - "seed-standard-cards/route.ts"
Cohesion: 0.53
Nodes (5): STANDARD_CARDS, GET(), isAuthorized(), POST(), toJson()

### Community 172 - "Kapitel-Hintergründe — Kampagne"
Cohesion: 0.50
Nodes (3): Benötigte Dateien, Format, Kapitel-Hintergründe — Kampagne

## Knowledge Gaps
- **1005 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1000 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `getSessionUser` to `roles.ts`, `fotograf-service.ts`, `journalist-service.ts`, `GuestGate.tsx`, `coach-service.ts`, `time.ts`, `series-event-points.ts`, `StarterPickFlow.tsx`, `RankedAvatar.tsx`, `ranks.ts`, `notify-dispatch.ts`, `community-job-service.ts`, `coach-guide-service.ts`, `packs.ts`, `tournament/[id]/page.tsx`, `community-job-config.ts`, `job-recommendations.ts`, `discord-rest.ts`, `dispatchNotification`, `community-board-comment-service.ts`, `dashboard/page.tsx`, `awardProfileCompletionIfNeeded`, `hasMinRole`, `ClipVotingClient.tsx`, `community-job-discord-votes.ts`, `admin/community-jobs/disputes/route.ts`, `photo-request-service.ts`, `EventPokalWinners.tsx`, `upload/route.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `ranks.ts` to `journalist-service.ts`, `GuestGate.tsx`, `series-event-points.ts`, `CommunityJobsPanel.tsx`, `RankedAvatar.tsx`, `CommunityJobsAdminPanel.tsx`, `DailyMessagePanel.tsx`, `ProfileMobileView.tsx`, `community-job-service.ts`, `tournament/[id]/page.tsx`, `JobBadge.tsx`, `auth.ts`, `FotografTools.tsx`, `SeriesDetailClient.tsx`, `dashboard/page.tsx`, `hasMinRole`, `ReportEditor.tsx`, `GameNameInput.tsx`, `SeriesIcon.tsx`, `ProfileOverlayClient.tsx`, `ConfirmDialog.tsx`, `CoachTools.tsx`, `EventAdminRow.tsx`, `useConfirm`, `CommunityBoardClient.tsx`, `JournalistTools.tsx`, `EventSetupWizard.tsx`, `DailyPollPanel.tsx`, `getActiveMembership`, `AdminDonationsClient.tsx`, `SeriesAdminRow.tsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `series/[id]/complete/page.tsx`, `getSessionUser`, `series-event-points.ts`, `run-season.ts`, `ranks.ts`, `DailyMessagePanel.tsx`, `new-season/page.tsx`, `notify-dispatch.ts`, `[tacticCardId]/route.ts`, `notification-rules/route.ts`, `series/[id]/complete/route.ts`, `shop-config.ts`, `ImageCropTool.tsx`, `clip-contest.ts`, `gameservers.ts`, `cards/page.tsx`, `tactic-cards/page.tsx`, `community-job-config.ts`, `amp.ts`, `revert-event-completion.ts`, `hasMinRole`, `admin/events/[id]/complete/route.ts`, `events/series/[id]/page.tsx`, `tutorial.ts`, `community-job-payout/route.ts`, `AdminEventsClient.tsx`, `send/route.ts`, `NotificationRulesPanel.tsx`, `recurrence.ts`, `minigames-config.ts`, `CommunityBoardWidget.tsx`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1005 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03556771545827633 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.028169014084507043 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10795454545454546 - nodes in this community are weakly interconnected._