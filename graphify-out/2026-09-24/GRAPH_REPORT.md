# Graph Report - OMA-Companion  (2026-09-24)

## Corpus Check
- 971 files · ~3,145,213 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5021 nodes · 13997 edges · 199 communities (178 shown, 21 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bbdb9a98`
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
- SeasonConfigPanel.tsx
- preferences/route.ts
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
- `main()` --calls--> `createNotification()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/notifications.ts
- `main()` --calls--> `getCommunityJob()`  [EXTRACTED]
  scripts/fix-community-job-payouts.ts → src/lib/community-jobs.ts
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json

## Import Cycles
- None detected.

## Communities (199 total, 21 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.02
Nodes (98): POST(), POST(), POST(), DELETE(), POST(), GET(), PATCH(), DELETE() (+90 more)

### Community 1 - "prisma.ts"
Cohesion: 0.03
Nodes (69): ActivityFeed(), cleanReason(), Filter, Tx, txType(), Nomination, Props, CompareProfilePage() (+61 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.13
Nodes (24): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), CardDetailSelection, CardUpgradeBadge() (+16 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.16
Nodes (14): GET(), POST(), displayNameOf(), POST(), UserLite, userSummary(), DELETE(), POST() (+6 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.22
Nodes (9): PATCH(), patchSchema, characterConfigSchema, PATCH(), requestSchema, CardCharacterSelection, CardContentError, CardContentPatch (+1 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.12
Nodes (39): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog(), beginTrapCheck() (+31 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.07
Nodes (33): SeriesOption, EventsTabs(), COIN_SOURCES, PointsInfoModal(), ConfirmDialog(), ConfirmDialogProps, ConfirmOptions, ConfirmState (+25 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.08
Nodes (44): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+36 more)

### Community 8 - "interactive.ts"
Cohesion: 0.10
Nodes (55): LiveBattleSnapshot, hasAnyValidMove(), pickEnemyForColumn(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate (+47 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.04
Nodes (83): GET(), GET(), POST(), GET(), PATCH(), GET(), POST(), DELETE() (+75 more)

### Community 10 - "time.ts"
Cohesion: 0.10
Nodes (26): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+18 more)

### Community 11 - "getSessionUser"
Cohesion: 0.14
Nodes (18): DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES, CommentEntityType (+10 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (49): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+41 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.13
Nodes (18): SteamGameResult, GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props (+10 more)

### Community 16 - "ranks.ts"
Cohesion: 0.04
Nodes (72): CustomBadgeDisplay, Props, DesktopProfileTabs(), Tab, PublicProfilePage(), ProfilePage(), formatBirthday(), ProfileEditor() (+64 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.25
Nodes (76): morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets (+68 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (39): VfxEvent, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction (+31 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.07
Nodes (33): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, AdminDonationsClient(), Donation (+25 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.20
Nodes (16): Props, WanderpocalBadge(), Props, WanderpocalBadgeServer(), ordinalSuffix(), WanderpocalSection(), buildHoldersMap(), CATEGORY_CONFIG (+8 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.07
Nodes (29): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+21 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.11
Nodes (33): APPLY, main(), GET(), GET(), GET(), GET(), isAuthorized(), step() (+25 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.04
Nodes (66): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+58 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.07
Nodes (60): POST(), GET(), POST(), POST(), POST(), parseSwaps(), POST(), GET() (+52 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.19
Nodes (13): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+5 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.13
Nodes (22): GET(), POST(), POST(), POST(), GET(), POST(), GET(), ASSET_TYPES (+14 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.13
Nodes (30): GET(), GET(), isAuthorized(), CampaignLevelDef, AFK_FARMER, GRIEFER_IMP, LAG_SPIKE, LOOT_GOBLIN (+22 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.11
Nodes (19): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+11 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.07
Nodes (51): PATCH(), POST(), POST(), GET(), POST(), POST(), GET(), POST() (+43 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.10
Nodes (25): GET(), PATCH(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage(), PACK_KIND_INFO (+17 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (24): buildFfaRanking(), buildMatchRanking(), displayName(), ELEMENT_SIZE, ElementContent(), ElementSlot, formatEntryStats(), IdentityFlipTile() (+16 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.11
Nodes (26): POST(), POST(), GET(), PATCH(), POST(), GET(), GET(), GET() (+18 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.14
Nodes (12): EventCardLink(), BackToTop(), GateButton(), GateOptions, GuestBanner(), GuestGateContext, GuestGateProvider(), GuestGateValue (+4 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.04
Nodes (64): EventCard(), EventUser, Props, SeriesEventItem, STATUS_CFG, StreamingPartner, LeaderboardPage(), MEDALS (+56 more)

### Community 36 - "packs.ts"
Cohesion: 0.12
Nodes (27): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), CHEST_TABLE, ChestPrize, grantGemsPvpVictoryChest(), rollChestPrize() (+19 more)

### Community 37 - "MobaIcon"
Cohesion: 0.12
Nodes (24): GET(), POST(), DELETE(), DELETE(), DELETE(), AuditActor, deleteComment(), AUTHOR (+16 more)

### Community 38 - "types.ts"
Cohesion: 0.11
Nodes (26): PUT(), DELETE(), GET(), POST(), GET(), POST(), checkAndAwardBadges(), loadStats() (+18 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.07
Nodes (50): GET(), PUT(), requestSchema, GET(), POST(), requestSchema, toDbResult(), LineupCard (+42 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.07
Nodes (38): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleReplayPage(), metadata, BattleOutcome (+30 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.15
Nodes (23): BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), LeaderboardTabs(), Tab, TABS, getCombinedElo() (+15 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.05
Nodes (71): GET(), PATCH(), PATCH(), GET(), GET(), PATCH(), GET(), POST() (+63 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.10
Nodes (36): GET(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames() (+28 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.09
Nodes (19): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward, PLATFORMS (+11 more)

### Community 45 - "auth.ts"
Cohesion: 0.16
Nodes (19): BodyModel(), CharacterBuilder(), GENDER_LABEL, CharacterRig(), PartModel(), bodyOf(), carryConfigOver(), defaultConfigFor() (+11 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.06
Nodes (41): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+33 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.07
Nodes (38): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+30 more)

### Community 49 - "amp.ts"
Cohesion: 0.36
Nodes (4): GET(), GET(), loadProfileOverlayState(), getJobBadges()

### Community 50 - "dispatchNotification"
Cohesion: 0.24
Nodes (8): POST(), computeKeptSeriesRankPoints(), PlacementReward, resetAllExceptSeries(), RewardsConfig, SelectiveResetSummary, LegacyStandingRow, SeriesEventForStandings

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (27): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+19 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.14
Nodes (18): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+10 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.19
Nodes (15): DELETE(), POST(), DELETE(), POST(), DELETE(), POST(), handleCommunityJobReaction(), notifyVoteMilestone() (+7 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.31
Nodes (8): GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), computeStatStandings(), loadSeriesRanking(), SeriesRankingRow

### Community 55 - "BattleLogEntry"
Cohesion: 0.11
Nodes (23): DELETE(), PATCH(), POST(), DELETE(), GET(), PATCH(), POST(), DELETE() (+15 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.32
Nodes (6): DELETE(), displayNameOf(), PATCH(), UserLite, userSummary(), ApplyMatchResultError

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.03
Nodes (93): Badge, CATEGORIES, CATEGORY_LABELS, User, DailyMessagePanel(), defaultForm(), formatDate(), FormState (+85 more)

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
Cohesion: 0.21
Nodes (13): GET(), GameCoverPicker(), GameCover(), GameNameInput(), highlightMatch(), escapeRegExp(), GAME_MAP, getGameCoverUrl() (+5 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.14
Nodes (14): clips, file, normal, animations, bodies, genders, female, animations (+6 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.20
Nodes (14): GET(), AdsTarget, ampCall(), AmpInstance, callWithSession(), getBaseUrl(), getInstanceDetails(), getInstanceSummaries() (+6 more)

### Community 65 - "dependencies"
Cohesion: 0.04
Nodes (47): @auth/prisma-adapter, canvas-confetti, discord.js, @google/generative-ai, lucide-react, motion, next, next-auth (+39 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.20
Nodes (12): isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, CLASS_SPEED_MIDPOINT, ensureCommunityCard() (+4 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.29
Nodes (7): curvy, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (18): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+10 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.19
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.16
Nodes (15): combinedElementStyle(), Corner, cornerStyle(), elementPositionStyle(), OverlayClient(), panelMotionStyle(), panelWidthFor(), usePanelRotator() (+7 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.30
Nodes (10): GET(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), getGradientBackground(), getLogoBadge() (+2 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.23
Nodes (11): gamedig, gamedig, GET(), GET(), StatusEntry, getInstances(), getInstancesRaw(), toInstanceStatus() (+3 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.13
Nodes (14): ClipDesMonatsPage(), MONTH_NAMES, GalleryEntry, MONTH_NAMES, Nomination, ClipWinnerCard(), Props, WinnerNomination (+6 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.11
Nodes (23): GET(), UserLite, AdminEventCompletePage(), DEFAULT_POLL, DEFAULT_REWARDS, MultiPollConfig, parsePoll(), parseRewards() (+15 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.09
Nodes (32): GET(), api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem() (+24 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.11
Nodes (19): ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, PanelPhase, PanelShell(), TopEdge() (+11 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.14
Nodes (17): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), RARITIES (+9 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.22
Nodes (5): DEFAULTS, GET(), isAuthorized(), isAuthorized(), POST()

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.08
Nodes (26): Anomalies, Person, Preview, Run, Week, MODERATION_TYPE_OPTIONS, ModerationItemDto, ModerationClient() (+18 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.47
Nodes (5): DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled()

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.18
Nodes (9): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+1 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.06
Nodes (36): GET(), api(), Idea, IdeasBoardClient(), AuditClient(), Entry, IdeaList(), api() (+28 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.39
Nodes (6): POST(), buildSeasonInputs(), countBy(), runFullSeasonUpdate(), RunSeasonResult, markPreSeasonRan()

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.10
Nodes (20): base, bodyMaterial, label, parts, regions, bear, giant, guardian (+12 more)

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.23
Nodes (11): GameserverWidget(), Server, ServerRow(), ServerCard(), Server, latestStatus, LiveStatus, startPolling() (+3 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.31
Nodes (7): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardEventPokal(), awardSeriesPokal()

### Community 90 - "useConfirm"
Cohesion: 0.25
Nodes (8): tall, alwaysOn, base, bodyMaterial, defaults, label, parts, regions

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.07
Nodes (27): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, AlbumPage() (+19 more)

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
Nodes (78): CardRow, TacticCardRow, AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES, AdminUsersClient(), formatLastLogin(), Props (+70 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.20
Nodes (15): POST(), requestSchema, grantGuaranteedPack(), grantStarterPick(), REQUIRED_CLASSES, StarterPickError, findOwnCommunityCardId(), getTutorialProgress() (+7 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.23
Nodes (6): DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, StatBadges(), TacticCardTileData, MOBA_ICON

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.05
Nodes (64): GET(), GET(), isAuthorized(), calcStreak(), GET(), formatDate(), SeasonConfigPanel(), toDateInputValue() (+56 more)

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
Cohesion: 0.22
Nodes (11): CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS, PokalSection() (+3 more)

### Community 103 - "isVideoUrl"
Cohesion: 0.43
Nodes (6): eventSelect, FINISHED_STATUSES, GET(), RELEVANT_STATUSES, sortSeriesEvents(), toWidgetEvent()

### Community 104 - "studio-templates.ts"
Cohesion: 0.31
Nodes (25): defaults, defaults, slim, defaults, Bottom, Eyewear, FacialHair, Gloves (+17 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.14
Nodes (25): GET(), isAuthorized(), POST(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage() (+17 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.47
Nodes (4): GET(), ServersPage(), ServerList(), getVisibleServers()

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.22
Nodes (13): POST(), GET(), GET(), POST(), InterviewPage(), answerInterview(), createInterview(), declineInterview() (+5 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.24
Nodes (4): Health, JobTexts, JobIcon(), JOB_ICONS

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.20
Nodes (11): main(), POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), PointRule (+3 more)

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.20
Nodes (6): ApplyButton(), Light, LIGHT_COLOR, LIGHT_LABEL, Server, ServerCredentials()

### Community 111 - "skins/types.ts"
Cohesion: 0.22
Nodes (9): DevSkinTestPage(), SkinCanvas, SkinModel(), SkinCanvas, SkinPicker(), SKINS, skinAssetUrl(), SkinClips (+1 more)

### Community 112 - "BadgesSection.tsx"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.27
Nodes (5): DashboardLayout(), PartnerFooter(), Partner, NewsItem, isLinkPreviewBot()

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.22
Nodes (15): GET(), PATCH(), patchSchema, GET(), isAuthorized(), hardResetAllElo(), resetAllCampaignProgress(), resetAllCardOwnership() (+7 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.60
Nodes (5): isAuthorized(), isOverridden(), POST(), toJson(), getSkillTemplate()

### Community 117 - "getActiveMembership"
Cohesion: 0.47
Nodes (5): displayNameOf(), GET(), USER_SELECT, UserLite, userSummary()

### Community 118 - "AdminNav.tsx"
Cohesion: 0.06
Nodes (40): GET(), PickedGameCover, api(), AreaKey, FoundUser, GameInfo, IdeaForm(), IdeaPrefill (+32 more)

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
Cohesion: 0.19
Nodes (16): ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, CLASS_BASE_STATS, isOverridden(), runSeasonUpdate(), toJson(), applyTierJumpLimit(), computePercentiles() (+8 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.04
Nodes (93): GET(), POST(), GET(), OptionInput, POST(), POST(), completeEvent(), DEFAULT_REWARDS (+85 more)

### Community 124 - "ServerCard.tsx"
Cohesion: 0.39
Nodes (7): average(), GET(), estimateMatchupStrength(), MATCHUP_STRENGTH_LABEL, PowerStatUnit, teamPower(), unitPower()

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.43
Nodes (6): GET(), POST(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole()

### Community 126 - "ServerCard.tsx"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.04
Nodes (47): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, MonthlyContests, Props, YearlyContests (+39 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "ThemeProvider.tsx"
Cohesion: 0.48
Nodes (4): CoverBrandBadge(), EventCoverDefault(), dynamicCache, GameCoverProps

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.33
Nodes (6): LogOut, Moon, Sun, MobileTopBar(), ROUTE_TITLES, useTheme()

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.48
Nodes (6): revokePointsByReason(), applyMatchResult(), ApplyMatchResultInput, finalFinalistReason(), finalWinReason(), loserOf()

### Community 132 - "react"
Cohesion: 0.33
Nodes (6): base, bodyMaterial, label, parts, regions, athlete

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "react-dom"
Cohesion: 0.33
Nodes (6): small, base, bodyMaterial, label, parts, regions

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
Cohesion: 0.16
Nodes (20): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), GateLink(), MessageCircleMore (+12 more)

### Community 140 - "sonner"
Cohesion: 0.40
Nodes (4): DiscordLoginButton(), Props, GuestLockOverlay(), Props

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.07
Nodes (32): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, BattleLauncher(), Mode, RankRow(), BattleRankBadge() (+24 more)

### Community 142 - "three"
Cohesion: 0.60
Nodes (4): DELETE(), PATCH(), deleteMarketingPost(), updateMarketingPost()

### Community 143 - "@types/canvas-confetti"
Cohesion: 0.60
Nodes (4): DELETE(), PATCH(), deleteAsset(), updateAsset()

### Community 144 - "tank"
Cohesion: 0.70
Nodes (3): HeroStatValue(), useValueDelta(), ValueDeltaBadge()

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.28
Nodes (13): skin, skin, skin, skin, skin, skin, block, row (+5 more)

### Community 146 - "notifications.ts"
Cohesion: 0.08
Nodes (40): GET(), POST(), GET(), GET(), POST(), GET(), scoreBreakdown(), collabBonuses() (+32 more)

### Community 147 - "bear"
Cohesion: 0.08
Nodes (40): POST(), GET(), DELETE(), PATCH(), POST(), GET(), GET(), RoadmapPage() (+32 more)

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "discord-roles.ts"
Cohesion: 0.14
Nodes (19): JobBadgeProps, useJobBadge(), RankedAvatarProps, RankRing(), RankRingProps, BADGE_LEVEL_THRESHOLDS, JOB_BADGE_META, JOB_LEVEL_TITLES (+11 more)

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 158 - "SeasonConfigPanel.tsx"
Cohesion: 0.16
Nodes (14): GET(), isAuthorized(), POST(), GET(), POST(), generateMonthlyQuests(), QUEST_TYPE_META, QuestType (+6 more)

### Community 160 - "preferences/route.ts"
Cohesion: 0.03
Nodes (20): POST(), requestSchema, POST(), serializeDrawResult(), GameSuggestion, GameSuggestion, DEFAULT_PREFS, DuelDeckPage() (+12 more)

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

### Community 199 - "seed-standard-cards/route.ts"
Cohesion: 0.70
Nodes (4): GET(), isAuthorized(), POST(), toJson()

### Community 254 - "ScoreBreakdownBlock.tsx"
Cohesion: 0.36
Nodes (7): Breakdown, fmt(), ScoreBreakdownBlock(), signed(), StreamResult, Week, Scale

### Community 270 - "[contribId]/route.ts"
Cohesion: 0.07
Nodes (44): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), GET(), GET() (+36 more)

### Community 274 - "HeroStatValue.tsx"
Cohesion: 0.03
Nodes (84): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+76 more)

## Knowledge Gaps
- **1144 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1139 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `coach-service.ts` to `roles.ts`, `getSessionUser`, `three`, `@types/canvas-confetti`, `[contribId]/route.ts`, `ranks.ts`, `notifications.ts`, `bear`, `HeroStatValue.tsx`, `ProfileMobileView.tsx`, `notify-dispatch.ts`, `board-match3.ts`, `community-job-service.ts`, `SeasonConfigPanel.tsx`, `gameservers.ts`, `packs.ts`, `MobaIcon`, `types.ts`, `community-job-config.ts`, `job-recommendations.ts`, `amp.ts`, `DailyPollBanner.tsx`, `CoinIcon.tsx`, `BattleLogEntry`, `formatBerlinTime`, `tutorial.ts`, `bot/index.ts`, `CommunityBoardClient.tsx`, `apply-season-results.ts`, `(dashboard)/battle-cards/page.tsx`, `admin/community-jobs/disputes/route.ts`, `report/[id]/page.tsx`, `useServerLiveStatus.ts`, `AdminNav.tsx`, `upload/route.ts`, `AdminDonationsClient.tsx`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `fotograf-service.ts`, `[tacticCardId]/route.ts`, `coach-service.ts`, `series-event-points.ts`, `new-season/page.tsx`, `shop-config.ts`, `clip-contest.ts`, `types.ts`, `community-job-config.ts`, `dispatchNotification`, `BattleLogEntry`, `revert-event-completion.ts`, `dashboard/page.tsx`, `hasMinRole`, `visionaer-service.ts`, `community-job-payout/route.ts`, `CoachTools.tsx`, `EventAdminRow.tsx`, `apply-season-results.ts`, `ThemeProvider.tsx`, `AdminDonationsClient.tsx`, `CommunityBoardWidget.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `ranks.ts` to `roles.ts`, `prisma.ts`, `app/layout.tsx`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `HeroStatValue.tsx`, `CommunityJobsAdminPanel.tsx`, `MobaIcon.tsx`, `ProfileMobileView.tsx`, `notify-dispatch.ts`, `community-job-service.ts`, `gameservers.ts`, `formatBerlinDate`, `JobBadge.tsx`, `FotografTools.tsx`, `SeriesDetailClient.tsx`, `tutorial.ts`, `ProfileOverlayClient.tsx`, `ConfirmDialog.tsx`, `(dashboard)/events/page.tsx`, `bot/index.ts`, `CommunityBoardClient.tsx`, `apply-season-results.ts`, `(dashboard)/battle-cards/page.tsx`, `AdminNav.tsx`, `ScoreBreakdownBlock.tsx`, `promotion-request-service.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1144 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0244568590937306 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0347505338769171 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12903225806451613 - nodes in this community are weakly interconnected._