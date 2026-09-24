# Graph Report - OMA-Companion  (2026-09-24)

## Corpus Check
- 968 files · ~3,142,434 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4988 nodes · 13724 edges · 195 communities (177 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e70ef1bf`
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
- DailySpin.tsx
- StarterPickFlow.tsx
- UserPickerSheet.tsx
- process-rank-art.ts
- requireModeratorOrSquadCaptain
- notifications.ts
- middleware.ts
- new-season/page.tsx
- BadgeIcon.tsx
- Monster-Artwork — Edelstein-Kampf
- [tacticCardId]/route.ts
- GameCover.tsx
- SeasonConfigPanel.tsx
- lineup/route.ts
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- FloatingLobbyChat.tsx
- generate-brand-assets.ts
- widget/events/route.ts
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- UserRoleManager.tsx
- lobby-cleanup/route.ts
- chroma-key.js
- ideas/stats/route.ts
- battle-cards/layout.tsx
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- bot-runner.mjs
- eslint.config.mjs
- next.config.ts
- canvas-confetti
- lucide-react
- seed-standard-cards/route.ts
- @vercel/blob
- postcss.config.mjs
- guardian
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
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts
- `main()` --calls--> `getCommunityJob()`  [EXTRACTED]
  scripts/fix-community-job-payouts.ts → src/lib/community-jobs.ts
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json

## Import Cycles
- None detected.

## Communities (195 total, 18 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (77): POST(), POST(), DELETE(), GET(), PATCH(), POST(), GET(), PATCH() (+69 more)

### Community 1 - "prisma.ts"
Cohesion: 0.13
Nodes (15): metadata, russoOne, spaceGrotesk, viewport, CursorGlow(), ExitAppGuard(), TRAP_STATE, SessionProvider() (+7 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.10
Nodes (30): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), CardClassFilter, FILTERS (+22 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.15
Nodes (22): BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), LeaderboardTabs(), Tab, TABS, getCombinedElo() (+14 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.08
Nodes (31): BracketView(), Match, Participant, roundLabel(), uname(), User, calcEntryAvg(), Entry (+23 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.12
Nodes (38): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog(), beginTrapCheck() (+30 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.07
Nodes (48): GET(), POST(), GET(), DELETE(), PATCH(), GET(), POST(), GET() (+40 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.08
Nodes (45): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, POST(), VALID_DIFFICULTIES (+37 more)

### Community 8 - "interactive.ts"
Cohesion: 0.10
Nodes (55): pickEnemyForColumn(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate, candidateTargetIds(), DecisionTargetKind (+47 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.05
Nodes (59): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+51 more)

### Community 10 - "time.ts"
Cohesion: 0.07
Nodes (45): DELETE(), POST(), GET(), POST(), POST(), POST(), DELETE(), PATCH() (+37 more)

### Community 11 - "getSessionUser"
Cohesion: 0.04
Nodes (53): GET(), GET(), GET(), GET(), GET(), POST(), GET(), GET() (+45 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (58): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+50 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.08
Nodes (17): Anomalies, Person, PayoutsClient(), Preview, Run, Week, api(), GameCard() (+9 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.06
Nodes (35): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, BattleLauncher(), Mode, RankRow(), BattleRankBadge() (+27 more)

### Community 16 - "ranks.ts"
Cohesion: 0.06
Nodes (45): AlbumPage(), IdeaRow(), Item, RoadmapPage(), DesktopProfileTabs(), Tab, PublicProfilePage(), ProfilePage() (+37 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.25
Nodes (76): morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets (+68 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (46): BattleCardData, VfxEvent, DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION (+38 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.09
Nodes (30): AnomaliesClient(), AdminUsersClient(), formatLastLogin(), Props, Role, UserRow, api(), CoachAttendance() (+22 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.06
Nodes (40): GamePlayer, GET(), Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Application (+32 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.10
Nodes (31): CustomBadgeDisplay, Props, Tab, TABS, ProfileQuestEntry, ProfileTournamentParticipationEntry, ProfileRecentEventEntry, ProfileSquad (+23 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.08
Nodes (20): ACTIVITY_TIER_ICON, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardUpgradeAnimationState, CardUpgradeOverlay(), UnitSlot(), LineupStrip() (+12 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.08
Nodes (42): GET(), POST(), PATCH(), loadProfileOverlayState(), LeaderboardPage(), CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage() (+34 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.07
Nodes (42): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+34 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.10
Nodes (36): GemsResultScreen(), GemsReward, AvailableAction, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue() (+28 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.09
Nodes (36): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, SlotRow(), cell(), activationCellsFor() (+28 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.10
Nodes (38): GET(), GET(), GET(), isAuthorized(), buildCampaignEnemyTeam(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked() (+30 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.10
Nodes (18): DonationsPage(), fmt(), MONTH_NAMES, streakBadge(), MEDALS, metadata, PODIUM_CONFIG, BotPreviewShell() (+10 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.05
Nodes (74): APPLY, main(), PATCH(), GET(), POST(), GET(), GET(), POST() (+66 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.10
Nodes (26): GET(), PATCH(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage(), PACK_KIND_INFO (+18 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.06
Nodes (30): buildFfaRanking(), buildMatchRanking(), cornerStyle(), displayName(), ElementContent(), elementPositionStyle(), ElementSlot, formatEntryStats() (+22 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.13
Nodes (21): POST(), POST(), GET(), GET(), GET(), collectNominations(), CommunityNomination, finalizeContest() (+13 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.06
Nodes (39): ActivityFeed(), cleanReason(), Filter, Tx, txType(), Avatar(), computeGroups(), computePlacementMap() (+31 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.22
Nodes (13): POST(), GET(), GET(), POST(), InterviewPage(), answerInterview(), createInterview(), declineInterview() (+5 more)

### Community 36 - "packs.ts"
Cohesion: 0.15
Nodes (17): GET(), api(), Idea, IdeasBoardClient(), IdeaList(), IDEA_CATEGORIES, IDEA_LIFECYCLES, IdeaCategory (+9 more)

### Community 37 - "MobaIcon"
Cohesion: 0.14
Nodes (22): GET(), POST(), DELETE(), DELETE(), AuditActor, AUTHOR, AuthorRow, authorSearch() (+14 more)

### Community 38 - "types.ts"
Cohesion: 0.09
Nodes (28): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleStatsPanel(), StoredBattleLog, computeBattleStats() (+20 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.08
Nodes (51): POST(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps(), POST() (+43 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.10
Nodes (31): POST(), serializeDrawResult(), PACK_LABEL, POST(), VALID_KINDS, ShopPage(), CHEST_TABLE, ChestPrize (+23 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.07
Nodes (50): GET(), PUT(), requestSchema, POST(), POST(), requestSchema, toDbResult(), LineupEditor() (+42 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.08
Nodes (50): GET(), PATCH(), PATCH(), GET(), PATCH(), PATCH(), POST(), GET() (+42 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.10
Nodes (37): GET(), GET(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor() (+29 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.16
Nodes (18): cache, flush(), inflight, isFresh(), JobBadge(), JobBadgeProps, listeners, pending (+10 more)

### Community 45 - "auth.ts"
Cohesion: 0.16
Nodes (19): BodyModel(), CharacterBuilder(), GENDER_LABEL, CharacterRig(), PartModel(), bodyOf(), carryConfigOver(), defaultConfigFor() (+11 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.10
Nodes (31): GET(), POST(), GET(), OptionInput, POST(), POST(), GET(), GET() (+23 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.20
Nodes (20): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), formatStart() (+12 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.07
Nodes (38): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+30 more)

### Community 49 - "amp.ts"
Cohesion: 0.06
Nodes (23): SteamGameResult, FullStandingsToggle(), Props, StandingRow, StandingUser, ArchivedSeason, FORMAT_LABELS, LegacyRow (+15 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.22
Nodes (9): DevSkinTestPage(), SkinCanvas, SkinModel(), SkinCanvas, SkinPicker(), SKINS, skinAssetUrl(), SkinClips (+1 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (28): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+20 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.13
Nodes (18): DELETE(), DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES (+10 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.08
Nodes (36): AdminEventsPage(), CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, ThumbVote() (+28 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.09
Nodes (26): FORMATS, CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant (+18 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.10
Nodes (16): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+8 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.06
Nodes (32): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward, PLATFORMS (+24 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (24): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+16 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.36
Nodes (9): applyTierJumpLimit(), computePercentiles(), computeSeasonResults(), hashSeed(), MemberSeasonResult, resolveClass(), TIER_ORDER, TIER_PERCENTILE_CEILING (+1 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.18
Nodes (16): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), MessageCircleMore, ShieldCheck (+8 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.12
Nodes (16): normal, tank, bodies, genders, female, base, bodyMaterial, label (+8 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.08
Nodes (25): MONTH_NAMES, Avatar(), EventTippsList(), Tipp, uname(), UserLite, EventWinnerPredictionWidget(), Prediction (+17 more)

### Community 65 - "dependencies"
Cohesion: 0.04
Nodes (47): @auth/prisma-adapter, canvas-confetti, discord.js, @google/generative-ai, lucide-react, motion, next, next-auth (+39 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.18
Nodes (13): isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, CLASS_BASE_STATS, CLASS_SPEED_MIDPOINT (+5 more)

### Community 67 - "hasMinRole"
Cohesion: 0.19
Nodes (17): GET(), DuelDeckPage(), metadata, LineupPage(), metadata, metadata, MyCardPage(), CARD_CLASSES (+9 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.47
Nodes (4): POST(), ALL_CATEGORIES, ALL_GENRES, recomputeWanderpocalHolders()

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.20
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.06
Nodes (47): GET(), GET(), GameserverWidget(), Server, ServerRow(), Light, LIGHT_COLOR, LIGHT_LABEL (+39 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.24
Nodes (12): GET(), IdeaPage(), ReportPage(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData, toIdeaFeedEntry(), getSeriesParts() (+4 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.11
Nodes (17): MonthlyContests, Props, YearlyContests, EventsTabs(), TabItem, TabPanel(), Tabs(), TabsProps (+9 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.06
Nodes (49): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+41 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.13
Nodes (15): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+7 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.11
Nodes (20): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+12 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.10
Nodes (23): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+15 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.19
Nodes (14): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), DEFAULT_SEASON_REWARD_CONFIG (+6 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.17
Nodes (11): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+3 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.08
Nodes (32): MODERATION_TYPE_OPTIONS, ModerationItemDto, ModerationClient(), AuditClient(), Entry, Interview, InterviewClient(), name() (+24 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.07
Nodes (32): AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES, ClipVotingClient(), Nomination, Props, ClipDesMonatsPage(), MONTH_NAMES (+24 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.23
Nodes (11): gamedig, gamedig, GET(), GET(), StatusEntry, getInstances(), getInstancesRaw(), toInstanceStatus() (+3 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.18
Nodes (13): EventCardLink(), CATEGORY_STRIP, EVENT_STATUS, GateButton(), GateLink(), GateOptions, GuestGateContext, GuestGateValue (+5 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.17
Nodes (14): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, ArrowLeft, Flame, isStoredBattleLog() (+6 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.05
Nodes (33): DEFAULTS, RULES, RuleSeed, GET(), isAuthorized(), isAuthorized(), POST(), GET() (+25 more)

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.10
Nodes (24): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), DELETE(), displayNameOf() (+16 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.18
Nodes (5): RULES, AnimatedBackground(), Cell, PULSE_COLORS, CheckSquare

### Community 90 - "useConfirm"
Cohesion: 0.22
Nodes (11): CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS, PokalSection() (+3 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.10
Nodes (21): GET(), api(), AssetOption, buildEventTemplate(), EventOption, FoundUser, InterviewOption, PostOption (+13 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.08
Nodes (26): blocks, texture, blocks, texture, blocks, materials, texture, blocks (+18 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.22
Nodes (9): PATCH(), patchSchema, characterConfigSchema, PATCH(), requestSchema, CardCharacterSelection, CardContentError, CardContentPatch (+1 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.22
Nodes (8): Download, Menu, Share, BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.05
Nodes (49): POST(), Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration (+41 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.10
Nodes (25): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+17 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.27
Nodes (5): DashboardLayout(), PartnerFooter(), Partner, NewsItem, isLinkPreviewBot()

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.12
Nodes (17): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+9 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.24
Nodes (7): POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, VoteKind, VoteOwnerLookup

### Community 102 - "recurrence.ts"
Cohesion: 0.33
Nodes (5): centeredRect(), Handle, ImageCropTool(), PRESETS, Rect

### Community 103 - "isVideoUrl"
Cohesion: 0.18
Nodes (9): api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem, PhotoRequestsBlock() (+1 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.20
Nodes (33): defaults, defaults, slim, tall, defaults, Bottom, Eyewear, FacialHair (+25 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.05
Nodes (56): GET(), PATCH(), GET(), isAuthorized(), POST(), POST(), POST(), POST() (+48 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 107 - "card-provisioning.ts"
Cohesion: 0.11
Nodes (21): CustomBadgeDisplay, Props, YearReviewPage(), BadgeIcon(), BadgeIconProps, checkAndAwardBadges(), loadStats(), badgeArt() (+13 more)

### Community 108 - "DailyPollPanel.tsx"
Cohesion: 0.29
Nodes (8): main(), DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled(), NotificationType, PREF_KEY

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.42
Nodes (7): GET(), PATCH(), patchSchema, getSeasonConfig(), KEYS, setEloHardResetAt(), setSeason1StartAt()

### Community 110 - "points.ts"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 111 - "FfaView.tsx"
Cohesion: 0.33
Nodes (7): DELETE(), PATCH(), POST(), DELETE(), GET(), PATCH(), requireModeratorOrSquadCaptain()

### Community 112 - "EventPokalWinners.tsx"
Cohesion: 0.22
Nodes (17): GET(), isAuthorized(), softResetRating(), addMonthsUTC(), getCurrentSeasonNumber(), getSeasonWindow(), grantDueSeasonRewards(), grantPlacementReward() (+9 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.08
Nodes (50): POST(), OPEN_EVENT_STATUS_FILTER, PATCH(), completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward (+42 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "duel-deck.ts"
Cohesion: 0.38
Nodes (8): buildSegments(), DailySpin(), PALETTE_BY_TYPE, pt(), rimPath(), segPath(), splitLabel(), useMidnightCountdown()

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.29
Nodes (3): BackToTop(), GuestBanner(), GuestGateProvider()

### Community 117 - "getActiveMembership"
Cohesion: 0.11
Nodes (23): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), GET(), POST() (+15 more)

### Community 118 - "AdminNav.tsx"
Cohesion: 0.36
Nodes (7): Breakdown, fmt(), ScoreBreakdownBlock(), signed(), StreamResult, Week, Scale

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "branded-cover.ts"
Cohesion: 0.33
Nodes (5): DiscordLoginButton(), Props, GuestLockOverlay(), Props, Lock

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.10
Nodes (22): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, SeriesOption (+14 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.20
Nodes (14): awardPoints(), parsePlacementPts(), PATCH(), BracketMatch, generateBracket(), generateRoundRobin(), POST(), shuffle() (+6 more)

### Community 124 - "SeriesAdminRow.tsx"
Cohesion: 0.03
Nodes (54): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, CardRow, TacticCardRow (+46 more)

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.22
Nodes (12): POST(), ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, isOverridden(), runSeasonUpdate(), toJson(), buildSeasonInputs(), countBy() (+4 more)

### Community 126 - "ServerCard.tsx"
Cohesion: 0.33
Nodes (6): LogOut, Moon, Sun, MobileTopBar(), ROUTE_TITLES, useTheme()

### Community 127 - "include"
Cohesion: 0.33
Nodes (6): base, bodyMaterial, label, parts, regions, athlete

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "applyForJob"
Cohesion: 0.04
Nodes (59): Badge, CATEGORIES, CATEGORY_LABELS, User, DailyMessagePanel(), defaultForm(), formatDate(), FormState (+51 more)

### Community 130 - "updateQuestProgress"
Cohesion: 0.33
Nodes (6): small, base, bodyMaterial, label, parts, regions

### Community 131 - "SeriesCompleteClient.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 132 - "giant"
Cohesion: 0.12
Nodes (18): clips, file, base, bodyMaterial, label, parts, regions, bear (+10 more)

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "requireModeratorOrSquadCaptain"
Cohesion: 0.83
Nodes (3): GET(), isAuthorized(), legacyPollConfigured()

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 137 - "DailyMessagePanel.tsx"
Cohesion: 0.20
Nodes (14): GET(), AdsTarget, ampCall(), AmpInstance, callWithSession(), getBaseUrl(), getInstanceDetails(), getInstanceSummaries() (+6 more)

### Community 140 - "DailySpin.tsx"
Cohesion: 0.38
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.11
Nodes (22): average(), GET(), ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge(), ChallengeUserPicker() (+14 more)

### Community 142 - "UserPickerSheet.tsx"
Cohesion: 0.39
Nodes (6): POST(), requestSchema, grantStarterPick(), REQUIRED_CLASSES, StarterPickError, startOrResetTutorial()

### Community 143 - "process-rank-art.ts"
Cohesion: 0.31
Nodes (8): BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RANKS, RAW_DIR, ringSvg()

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.28
Nodes (13): skin, skin, skin, skin, skin, skin, block, row (+5 more)

### Community 146 - "notifications.ts"
Cohesion: 0.05
Nodes (81): POST(), DELETE(), PATCH(), POST(), GET(), POST(), POST(), GET() (+73 more)

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 152 - "BadgeIcon.tsx"
Cohesion: 0.08
Nodes (20): Props, WinnerClip, DailyMessageBanner(), Message, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount (+12 more)

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 156 - "[tacticCardId]/route.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 157 - "GameCover.tsx"
Cohesion: 0.04
Nodes (4): GameSuggestion, GameSuggestion, DEFAULT_PREFS, { handlers, auth, signIn, signOut }

### Community 158 - "SeasonConfigPanel.tsx"
Cohesion: 0.07
Nodes (41): GET(), GET(), GET(), isAuthorized(), GET(), isAuthorized(), calcStreak(), GET() (+33 more)

### Community 161 - "lineup/route.ts"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

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

### Community 177 - "lobby-cleanup/route.ts"
Cohesion: 0.60
Nodes (5): isAuthorized(), isOverridden(), POST(), toJson(), getSkillTemplate()

### Community 180 - "ideas/stats/route.ts"
Cohesion: 0.20
Nodes (5): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap

### Community 191 - "canvas-confetti"
Cohesion: 0.29
Nodes (7): curvy, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 192 - "lucide-react"
Cohesion: 0.29
Nodes (7): strong, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 199 - "seed-standard-cards/route.ts"
Cohesion: 0.70
Nodes (4): GET(), isAuthorized(), POST(), toJson()

### Community 214 - "guardian"
Cohesion: 0.33
Nodes (6): guardian, base, bodyMaterial, label, parts, regions

## Knowledge Gaps
- **1154 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1149 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `getSessionUser` to `roles.ts`, `app/layout.tsx`, `coach-service.ts`, `time.ts`, `ranks.ts`, `notifications.ts`, `ProfileMobileView.tsx`, `notify-dispatch.ts`, `requireModeratorOrEventSquadCaptain`, `community-job-service.ts`, `SeasonConfigPanel.tsx`, `gameservers.ts`, `packs.ts`, `MobaIcon`, `resolveAvatarsForCards`, `community-job-config.ts`, `job-recommendations.ts`, `discord-rest.ts`, `amp.ts`, `DailyPollBanner.tsx`, `CoinIcon.tsx`, `BattleLogEntry`, `dashboard/page.tsx`, `events/series/[id]/page.tsx`, `SeriesIcon.tsx`, `ClipVotingClient.tsx`, `bot/index.ts`, `send/route.ts`, `CommunityBoardClient.tsx`, `admin/community-jobs/disputes/route.ts`, `minigames-config.ts`, `card-provisioning.ts`, `points.ts`, `FfaView.tsx`, `GamePlayersModal.tsx`, `getActiveMembership`, `upload/route.ts`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `ranks.ts` to `roles.ts`, `applyForJob`, `live-battle.ts`, `fotograf-service.ts`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `CommunityJobsAdminPanel.tsx`, `MobaIcon.tsx`, `notify-dispatch.ts`, `requireModeratorOrEventSquadCaptain`, `SeasonConfigPanel.tsx`, `community-job-service.ts`, `FotografTools.tsx`, `CoinIcon.tsx`, `BattleLogEntry`, `EventEditClient.tsx`, `dashboard/page.tsx`, `GameNameInput.tsx`, `SeriesIcon.tsx`, `tutorial.ts`, `ProfileOverlayClient.tsx`, `AdminEventsClient.tsx`, `ConfirmDialog.tsx`, `bot/index.ts`, `CommunityBoardClient.tsx`, `EventSetupWizard.tsx`, `isVideoUrl`, `AdminNav.tsx`, `duels/[id]/respond/route.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `applyForJob`, `ranked-season.ts`, `SeriesCompleteClient.tsx`, `DailyMessagePanel.tsx`, `getSessionUser`, `DailySpin.tsx`, `series-event-points.ts`, `ProfileMobileView.tsx`, `new-season/page.tsx`, `[tacticCardId]/route.ts`, `shop-config.ts`, `clip-contest.ts`, `community-job-config.ts`, `discord-rest.ts`, `TournamentManager.tsx`, `revert-event-completion.ts`, `admin/events/[id]/complete/route.ts`, `SeriesIcon.tsx`, `community-job-payout/route.ts`, `(dashboard)/events/page.tsx`, `JournalistTools.tsx`, `EventSetupWizard.tsx`, `minigames-config.ts`, `photo-request-service.ts`, `useServerLiveStatus.ts`, `FfaView.tsx`, `GamePlayersModal.tsx`, `CommunityBoardWidget.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1154 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02991763565891473 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13043478260869565 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09871794871794871 - nodes in this community are weakly interconnected._