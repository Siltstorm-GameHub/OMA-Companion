# Graph Report - OMA-Companion  (2026-09-24)

## Corpus Check
- 968 files · ~3,131,505 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4997 nodes · 13910 edges · 185 communities (165 shown, 20 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `305fe309`
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
- useServerLiveStatus.ts
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
- CommunityBoardWidget.tsx
- ServerCard.tsx
- promotion-request-service.ts
- process-badge-art.ts
- DashboardChrome.tsx
- overlay/[id]/page.tsx
- Product
- GuildHub – Discord Companion
- widget/events/route.ts
- StarterPickFlow.tsx
- tank
- requireModeratorOrSquadCaptain
- notifications.ts
- middleware.ts
- discord-roles.ts
- new-season/page.tsx
- Monster-Artwork — Edelstein-Kampf
- SeasonConfigPanel.tsx
- notifications/page.tsx
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- FloatingLobbyChat.tsx
- generate-brand-assets.ts
- widget/events/route.ts
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
- lucide-react
- @vercel/blob
- StudioEditor.tsx
- seed-standard-cards/route.ts
- postcss.config.mjs
- DailyPollPanel.tsx
- tailwind.config.ts
- vercel.json
- { GET, POST }
- size
- MIN_MATCHES_FOR_RANKING
- SeriesStandingsTable.tsx
- sync-discord-roles/route.ts
- BadgeIcon.tsx
- ScoreBreakdownBlock.tsx
- [contribId]/route.ts
- HeroStatValue.tsx
- [id]/settings/page.tsx

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

## Communities (185 total, 20 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (73): POST(), DELETE(), GET(), PATCH(), POST(), GET(), PATCH(), DELETE() (+65 more)

### Community 1 - "prisma.ts"
Cohesion: 0.18
Nodes (16): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), MessageCircleMore, ShieldCheck (+8 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.09
Nodes (32): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), BattleCardData, CardClassFilter (+24 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.04
Nodes (41): DEFAULTS, RULES, RuleSeed, PATCH(), patchSchema, GET(), isAuthorized(), isAuthorized() (+33 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.07
Nodes (32): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+24 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.12
Nodes (38): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog(), beginTrapCheck() (+30 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.03
Nodes (71): ActivityFeed(), cleanReason(), Filter, Tx, txType(), CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries() (+63 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.07
Nodes (51): actionSchema, DUEL_STANCES, POST(), GET(), average(), GET(), POST(), VALID_DIFFICULTIES (+43 more)

### Community 8 - "interactive.ts"
Cohesion: 0.09
Nodes (60): hasAnyValidMove(), pickEnemyForColumn(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate, candidateTargetIds() (+52 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.05
Nodes (59): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+51 more)

### Community 10 - "time.ts"
Cohesion: 0.07
Nodes (34): CardRow, FORMATS, CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal() (+26 more)

### Community 11 - "getSessionUser"
Cohesion: 0.08
Nodes (42): GET(), POST(), GET(), GET(), POST(), GET(), guideVoteEvents(), scoreBreakdown() (+34 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (56): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+48 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.05
Nodes (64): GET(), GET(), POST(), POST(), GET(), DELETE(), PATCH(), PATCH() (+56 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.06
Nodes (37): SteamGameResult, GamePlayer, GET(), Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult (+29 more)

### Community 16 - "ranks.ts"
Cohesion: 0.03
Nodes (78): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+70 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.25
Nodes (76): morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets (+68 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.06
Nodes (32): ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction, DuelAttackType (+24 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.05
Nodes (57): GET(), GET(), GET(), PATCH(), GET(), GET(), GET(), PATCH() (+49 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.17
Nodes (19): Props, WanderpocalBadge(), Props, WanderpocalBadgeServer(), ordinalSuffix(), Props, WanderpocalSection(), buildHoldersMap() (+11 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.09
Nodes (19): ACTIVITY_TIER_ICON, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardTile(), UnitSlot(), LineupStrip(), GemBeamOverlay() (+11 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.04
Nodes (77): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+69 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.11
Nodes (36): GemsResultScreen(), GemsReward, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue(), getArenaBackgroundStyle() (+28 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.19
Nodes (13): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+5 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.04
Nodes (63): GET(), GET(), GET(), isAuthorized(), calcStreak(), GET(), Event, EventAdminRow() (+55 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.10
Nodes (38): GET(), GET(), GET(), isAuthorized(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked(), CampaignLevelDef (+30 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.12
Nodes (18): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, Thumb() (+10 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.04
Nodes (81): APPLY, main(), PATCH(), PATCH(), GET(), POST(), POST(), POST() (+73 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.12
Nodes (12): AdminShopPage(), PACK_KIND_INFO, PACK_KIND_ORDER, ShopConfigPanel(), TYPE_LABEL, ACCENT_CLASSES, PACK_INFO, PACK_ORDER (+4 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (22): buildFfaRanking(), buildMatchRanking(), displayName(), ELEMENT_SIZE, ElementSlot, formatEntryStats(), IdentityFlipTile(), LayoutEntry (+14 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.13
Nodes (21): POST(), POST(), GET(), GET(), GET(), collectNominations(), CommunityNomination, finalizeContest() (+13 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.10
Nodes (23): api(), Idea, IdeasBoardClient(), IdeaList(), api(), GameCard(), GameInfo, IdeaBody() (+15 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.31
Nodes (10): POST(), GET(), POST(), answerInterview(), createInterview(), declineInterview(), InterviewResult, listMyInterviews() (+2 more)

### Community 36 - "packs.ts"
Cohesion: 0.18
Nodes (18): POST(), serializeDrawResult(), asCardResult(), asTacticResult(), awardDrawnCard(), awardDrawnTacticCard(), COMMUNITY_CHANCE, drawCard() (+10 more)

### Community 37 - "MobaIcon"
Cohesion: 0.16
Nodes (19): GET(), POST(), DELETE(), AUTHOR, AuthorRow, authorSearch(), contentInfo(), HiddenFilter (+11 more)

### Community 38 - "types.ts"
Cohesion: 0.14
Nodes (21): GET(), POST(), DELETE(), POST(), DELETE(), POST(), DELETE(), POST() (+13 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.08
Nodes (59): POST(), POST(), POST(), POST(), parseSwaps(), POST(), GET(), POST() (+51 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.14
Nodes (17): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, isStoredBattleLog(), CHEST_TABLE, ChestPrize (+9 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.05
Nodes (65): GET(), PUT(), requestSchema, GET(), POST(), requestSchema, DuelDeckPage(), metadata (+57 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.09
Nodes (42): GET(), PATCH(), PATCH(), GET(), PATCH(), PATCH(), GET(), PATCH() (+34 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.11
Nodes (35): berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames(), getDismissedItemKeys() (+27 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.10
Nodes (35): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), GET(), isAuthorized(), GEMS_DIFFICULTIES, POST() (+27 more)

### Community 45 - "auth.ts"
Cohesion: 0.16
Nodes (19): BodyModel(), CharacterBuilder(), GENDER_LABEL, CharacterRig(), PartModel(), bodyOf(), carryConfigOver(), defaultConfigFor() (+11 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.07
Nodes (46): main(), GET(), POST(), GET(), OptionInput, POST(), POST(), GET() (+38 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.22
Nodes (18): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+10 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.08
Nodes (25): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+17 more)

### Community 49 - "amp.ts"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.10
Nodes (19): PATCH(), patchSchema, characterConfigSchema, PATCH(), requestSchema, metadata, DevSkinTestPage(), SkinCanvas (+11 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (28): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+20 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.12
Nodes (21): DELETE(), DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES (+13 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.23
Nodes (13): GET(), PATCH(), GET(), POST(), rollPrize(), todayStr(), DEFAULT_PACK_PRICES, DEFAULT_WHEEL_PRIZES (+5 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.10
Nodes (23): DELETE(), PATCH(), POST(), DELETE(), GET(), PATCH(), POST(), DELETE() (+15 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.22
Nodes (12): DELETE(), displayNameOf(), PATCH(), UserLite, userSummary(), revokePointsByReason(), applyMatchResult(), ApplyMatchResultError (+4 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.17
Nodes (13): VfxEvent, LiveDuelHandCard, LiveDuelUnit, UltimateBurst, LineupCard, LineupEditor(), FloatingEffect, GemBeam (+5 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (25): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+17 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.07
Nodes (47): parseBoardSwaps(), POST(), VALID_ACTIONS, BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON (+39 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.06
Nodes (35): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, BattleLauncher(), Mode, RankRow(), BattleRankBadge() (+27 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.08
Nodes (28): clips, file, base, bodyMaterial, label, parts, regions, athlete (+20 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.25
Nodes (11): GET(), PATCH(), patchSchema, formatDate(), SeasonConfigPanel(), toDateInputValue(), getSeasonConfig(), KEYS (+3 more)

### Community 65 - "dependencies"
Cohesion: 0.04
Nodes (47): @auth/prisma-adapter, canvas-confetti, discord.js, @google/generative-ai, lucide-react, motion, next, next-auth (+39 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.20
Nodes (12): isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, CLASS_BASE_STATS, CLASS_SPEED_MIDPOINT (+4 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.29
Nodes (7): curvy, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.19
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.10
Nodes (28): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleStatsPanel(), StoredBattleLog, computeBattleStats() (+20 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.23
Nodes (11): gamedig, gamedig, GET(), GET(), StatusEntry, getInstances(), getInstancesRaw(), toInstanceStatus() (+3 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.15
Nodes (7): RULES, AnimatedBackground(), Cell, PULSE_COLORS, CheckSquare, LogIn, ShieldAlert

### Community 74 - "formatBerlinTime"
Cohesion: 0.10
Nodes (19): ClipVotingClient(), Nomination, Props, MONTH_NAMES, Props, MONTH_NAMES, ClipWinnerCard(), Props (+11 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.07
Nodes (39): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+31 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.22
Nodes (8): Download, Menu, Share, BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 77 - "tutorial.ts"
Cohesion: 0.10
Nodes (20): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+12 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.12
Nodes (20): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+12 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.14
Nodes (17): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), RARITIES (+9 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.28
Nodes (8): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), communityCardPoolSize(), countPacksPurchasedToday(), PackKind, startOfTodayUTC()

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.07
Nodes (29): PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS, ModerationItemDto, ModerationClient(), AuditClient() (+21 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.16
Nodes (14): CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), formatRelative(), RelativeTime(), RelativeTimeProps, CATEGORY_LABELS, DAILY_CAPS (+6 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.22
Nodes (9): cornerStyle(), ElementContent(), elementPositionStyle(), OverlayClient(), panelWidthFor(), pickTickerMatch(), usePanelRotator(), useStackedElements() (+1 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.14
Nodes (16): Interview, InterviewClient(), name(), api(), AreaKey, FoundUser, GameInfo, IdeaForm() (+8 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.20
Nodes (14): GET(), AdsTarget, ampCall(), AmpInstance, callWithSession(), getBaseUrl(), getInstanceDetails(), getInstanceSummaries() (+6 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.33
Nodes (6): giant, base, bodyMaterial, label, parts, regions

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.05
Nodes (46): GET(), GET(), loadProfileOverlayState(), GameserverWidget(), Server, ServerRow(), ApplyButton(), Light (+38 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.22
Nodes (11): CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS, PokalSection() (+3 more)

### Community 90 - "useConfirm"
Cohesion: 0.24
Nodes (11): isAuthorized(), isOverridden(), POST(), toJson(), ACTIVITY_TIER_RANK, getSkillTemplate(), ACTIVITY_TIER_LABEL, isOverridden() (+3 more)

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
Cohesion: 0.29
Nodes (7): tall, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 95 - "apply-season-results.ts"
Cohesion: 0.03
Nodes (90): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, TacticCardRow, AdminPage() (+82 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.40
Nodes (5): ELEMENT_KEYS, parseLayout(), ProfileOverlayPage(), ProfileElementKey, ProfileLayoutPositions

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.05
Nodes (34): MonthlyContests, Props, YearlyContests, SeriesOption, EventsTabs(), COIN_SOURCES, PointsInfoModal(), ConfirmDialog() (+26 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.11
Nodes (20): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+12 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.10
Nodes (14): Props, WinnerClip, DailyMessageBanner(), Message, DailyPollBanner(), ChevronLeft, Megaphone, NewContentPing() (+6 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.21
Nodes (32): defaults, defaults, slim, small, defaults, Bottom, Eyewear, FacialHair (+24 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.19
Nodes (19): GET(), isAuthorized(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction() (+11 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.09
Nodes (30): POST(), POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST() (+22 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.04
Nodes (8): POST(), requestSchema, GameSuggestion, GameSuggestion, DEFAULT_PREFS, { handlers, auth, signIn, signOut }, LineupError, setLineup()

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.22
Nodes (17): GET(), isAuthorized(), softResetRating(), addMonthsUTC(), getCurrentSeasonNumber(), getSeasonWindow(), grantDueSeasonRewards(), grantPlacementReward() (+9 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.10
Nodes (19): EventCardLink(), BackToTop(), DiscordLoginButton(), Props, GateButton(), GateLink(), GateOptions, GuestBanner() (+11 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.14
Nodes (17): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+9 more)

### Community 118 - "AdminNav.tsx"
Cohesion: 0.08
Nodes (34): GET(), GET(), IdeaPage(), ReportPage(), api(), AssetOption, buildEventTemplate(), EventOption (+26 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "TextsClient.tsx"
Cohesion: 0.24
Nodes (4): Health, JobTexts, JobIcon(), JOB_ICONS

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.31
Nodes (10): applyTierJumpLimit(), computePercentiles(), computeSeasonResults(), hashSeed(), MemberSeasonResult, resolveClass(), TIER_MULTIPLIER, TIER_ORDER (+2 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.08
Nodes (35): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+27 more)

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.39
Nodes (6): POST(), buildSeasonInputs(), countBy(), runFullSeasonUpdate(), RunSeasonResult, markPreSeasonRan()

### Community 126 - "ServerCard.tsx"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.18
Nodes (6): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap, LifeBuoy

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.27
Nodes (5): DashboardLayout(), PartnerFooter(), Partner, NewsItem, isLinkPreviewBot()

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 139 - "widget/events/route.ts"
Cohesion: 0.12
Nodes (17): metadata, russoOne, spaceGrotesk, viewport, CursorGlow(), ExitAppGuard(), TRAP_STATE, Moon (+9 more)

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.03
Nodes (97): CompareProfilePage(), fetchUserData(), UserData, BracketView(), Match, Participant, roundLabel(), uname() (+89 more)

### Community 144 - "tank"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.16
Nodes (19): skin, base, bodyMaterial, label, parts, regions, skin, bear (+11 more)

### Community 146 - "notifications.ts"
Cohesion: 0.08
Nodes (36): GET(), POST(), POST(), POST(), GET(), POST(), GET(), DELETE() (+28 more)

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "discord-roles.ts"
Cohesion: 0.14
Nodes (17): RankTile(), JobBadgeProps, RankedAvatarProps, RankRingProps, BADGE_LEVEL_THRESHOLDS, JOB_BADGE_META, JOB_LEVEL_TITLES, JobBadgeData (+9 more)

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 158 - "SeasonConfigPanel.tsx"
Cohesion: 0.16
Nodes (15): GET(), isAuthorized(), POST(), POST(), QuestsPage(), generateMonthlyQuests(), QUEST_TYPE_META, QuestType (+7 more)

### Community 159 - "notifications/page.tsx"
Cohesion: 0.33
Nodes (6): guardian, base, bodyMaterial, label, parts, regions

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 163 - "HeroStatValue.tsx"
Cohesion: 0.14
Nodes (21): curve(), curvePercent(), StandardCardSeed, ACTIVE_POOL, DD_ACTIVE_SKILLS, DD_PASSIVE_KITS, DD_ULTIMATE_SKILLS, PASSIVE_POOL (+13 more)

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
Cohesion: 0.53
Nodes (5): STANDARD_CARDS, GET(), isAuthorized(), POST(), toJson()

### Community 214 - "DailyPollPanel.tsx"
Cohesion: 0.03
Nodes (63): Badge, CATEGORIES, CATEGORY_LABELS, User, DailyMessagePanel(), defaultForm(), formatDate(), FormState (+55 more)

### Community 233 - "SeriesStandingsTable.tsx"
Cohesion: 0.07
Nodes (23): FullStandingsToggle(), Props, StandingRow, StandingUser, Avatar(), DeltaInfo, MEDALS, Props (+15 more)

### Community 248 - "sync-discord-roles/route.ts"
Cohesion: 0.43
Nodes (6): GET(), POST(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole()

### Community 252 - "BadgeIcon.tsx"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 254 - "ScoreBreakdownBlock.tsx"
Cohesion: 0.36
Nodes (7): Breakdown, fmt(), ScoreBreakdownBlock(), signed(), StreamResult, Week, Scale

### Community 270 - "[contribId]/route.ts"
Cohesion: 0.06
Nodes (50): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), DELETE(), GET() (+42 more)

### Community 274 - "HeroStatValue.tsx"
Cohesion: 0.11
Nodes (21): CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, ThumbVote(), voteUrl() (+13 more)

## Knowledge Gaps
- **1144 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1139 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `MobaIcon.tsx` to `roles.ts`, `app/layout.tsx`, `coach-service.ts`, `getSessionUser`, `duels-live.ts`, `[contribId]/route.ts`, `ranks.ts`, `RankedAvatar.tsx`, `notifications.ts`, `HeroStatValue.tsx`, `notify-dispatch.ts`, `community-job-service.ts`, `SeasonConfigPanel.tsx`, `gameservers.ts`, `MobaIcon`, `types.ts`, `community-job-config.ts`, `JobBadge.tsx`, `discord-rest.ts`, `DailyPollBanner.tsx`, `BattleLogEntry`, `formatBerlinTime`, `AdminEventsClient.tsx`, `ClipVotingClient.tsx`, `apply-season-results.ts`, `admin/community-jobs/disputes/route.ts`, `photo-request-service.ts`, `useServerLiveStatus.ts`, `getActiveMembership`, `AdminNav.tsx`, `upload/route.ts`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `live-battle.ts`, `series-event-points.ts`, `tank`, `MobaIcon.tsx`, `new-season/page.tsx`, `shop-config.ts`, `clip-contest.ts`, `community-job-config.ts`, `JobBadge.tsx`, `discord-rest.ts`, `dispatchNotification`, `TournamentManager.tsx`, `BattleLogEntry`, `revert-event-completion.ts`, `dashboard/page.tsx`, `hasMinRole`, `events/series/[id]/page.tsx`, `SeriesIcon.tsx`, `community-job-payout/route.ts`, `CoachTools.tsx`, `DailyPollPanel.tsx`, `photo-request-service.ts`, `sync-discord-roles/route.ts`, `AdminDonationsClient.tsx`, `CommunityBoardWidget.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `ranks.ts` to `roles.ts`, `fotograf-service.ts`, `app/layout.tsx`, `coach-service.ts`, `time.ts`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `RankedAvatar.tsx`, `StarterPickFlow.tsx`, `CommunityJobsAdminPanel.tsx`, `MobaIcon.tsx`, `ProfileMobileView.tsx`, `notify-dispatch.ts`, `board-match3.ts`, `community-job-service.ts`, `coach-guide-service.ts`, `formatBerlinDate`, `FotografTools.tsx`, `tutorial.ts`, `ProfileOverlayClient.tsx`, `ConfirmDialog.tsx`, `ClipVotingClient.tsx`, `bot/index.ts`, `DailyPollPanel.tsx`, `send/route.ts`, `apply-season-results.ts`, `NotificationRulesPanel.tsx`, `(dashboard)/battle-cards/page.tsx`, `AdminNav.tsx`, `ScoreBreakdownBlock.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1144 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.025439286650931026 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09302325581395349 - nodes in this community are weakly interconnected._
- **Should `live-battle.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.039240506329113925 - nodes in this community are weakly interconnected._