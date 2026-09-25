# Graph Report - OMA-Companion  (2026-09-25)

## Corpus Check
- 1061 files · ~3,701,198 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5391 nodes · 15093 edges · 200 communities (168 shown, 32 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `31fc6511`
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
- InterviewClient.tsx
- buy-pack/route.ts
- report-event-facts.ts
- VictoryChestReveal.tsx
- upload/route.ts
- TextsClient.tsx
- job-ring.ts
- AdminDonationsClient.tsx
- ServerCard.tsx
- UnitClass
- series/[id]/complete/route.ts
- promotion-request-service.ts
- process-badge-art.ts
- ThemeProvider.tsx
- widget/events/route.ts
- series/[id]/complete/route.ts
- widget/events/route.ts
- overlay/[id]/page.tsx
- [userId]/page.tsx
- Product
- GuildHub – Discord Companion
- spin/route.ts
- DuelDeckEditor.tsx
- widget/events/route.ts
- ThemeProvider.tsx
- StarterPickFlow.tsx
- three
- season-config.ts
- sync-discord-roles/route.ts
- promotion-request-service.ts
- discord.js
- [id]/settings/SettingsClient.tsx
- motion
- middleware.ts
- prisma
- @react-three/drei
- [matchId]/route.ts
- new-season/page.tsx
- ImageCropTool.tsx
- Monster-Artwork — Edelstein-Kampf
- @react-three/postprocessing
- recharts
- grantPack
- widget/events/[id]/route.ts
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- daily-poll/[id]/vote/route.ts
- generate-brand-assets.ts
- lucide-react
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- @prisma/client
- UserRoleManager.tsx
- chroma-key.js
- react-dom
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- bot-runner.mjs
- eslint.config.mjs
- @vercel/blob
- @types/three
- next.config.ts
- web-push
- zod
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
4. `hasMinRole()` - 111 edges
5. `dispatchNotification()` - 88 edges
6. `Loader2` - 68 edges
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
- `BoardMatch3()` --indirect_call--> `cell()`  [INFERRED]
  src/components/battle-cards/BoardMatch3.tsx → src/components/community-jobs/ReportEditor.tsx

## Import Cycles
- None detected.

## Communities (200 total, 32 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.02
Nodes (125): DEFAULTS, POST(), POST(), DELETE(), POST(), GET(), PATCH(), DELETE() (+117 more)

### Community 1 - "prisma.ts"
Cohesion: 0.21
Nodes (12): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), DEFAULT_SEASON_REWARD_CONFIG, getSeasonRewardConfig(), isValidConfig() (+4 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.14
Nodes (21): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), CardUpgradeBadge(), DuplicateProgress() (+13 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.11
Nodes (37): POST(), DndCharacterRow, DndLocationRow, formatDuration(), polygonPoints(), TYPE_LABEL, WorldMap(), HexPicker() (+29 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.06
Nodes (74): POST(), GET(), POST(), EMOTES, parseSince(), POST(), OutcomeEditor(), parseFlags() (+66 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.18
Nodes (6): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap, LifeBuoy

### Community 6 - "app/layout.tsx"
Cohesion: 0.10
Nodes (31): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, SlotRow(), activationCellsFor(), areAdjacent() (+23 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.06
Nodes (56): actionSchema, DUEL_STANCES, POST(), GET(), average(), GET(), POST(), VALID_DIFFICULTIES (+48 more)

### Community 8 - "interactive.ts"
Cohesion: 0.08
Nodes (68): CardUpgradeOverlay(), NextLevelPreview(), AvailableAction, LiveSnapshot, LiveBattleAwaiting, LiveBattleSnapshot, BoardGrid, generateBoard() (+60 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.05
Nodes (66): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+58 more)

### Community 10 - "time.ts"
Cohesion: 0.05
Nodes (57): GET(), GET(), POST(), POST(), GET(), DELETE(), PATCH(), POST() (+49 more)

### Community 11 - "getSessionUser"
Cohesion: 0.07
Nodes (40): DELETE(), DELETE(), POST(), GET(), POST(), DELETE(), POST(), DELETE() (+32 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (65): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+57 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.23
Nodes (13): POST(), EventSetupWizard(), SeriesAdminRow(), buildBerlinDate(), calcNextDate(), daysInMonthOf(), describeMonthlyModes(), MonthlyMode (+5 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.12
Nodes (38): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog(), beginTrapCheck() (+30 more)

### Community 16 - "ranks.ts"
Cohesion: 0.10
Nodes (31): CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS, PokalSection() (+23 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.16
Nodes (26): computeGemsReward(), describeLogEntry(), getArenaBackgroundStyle(), LiveBattleBody(), LiveBattleView(), beep(), getContext(), noiseBurst() (+18 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (34): ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction, DuelAttackType (+26 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.11
Nodes (19): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+11 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.07
Nodes (34): ActivityFeed(), cleanReason(), Filter, Tx, txType(), Avatar(), computeGroups(), computePlacementMap() (+26 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.06
Nodes (33): EventCardLink(), CATEGORY_STRIP, EVENT_STATUS, DashboardLayout(), LeaderboardPage(), MEDALS, metadata, PODIUM_CONFIG (+25 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.17
Nodes (13): GET(), isAuthorized(), CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), CATEGORY_LABELS, DAILY_CAPS, POINT_RULES (+5 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.16
Nodes (14): GET(), POST(), displayNameOf(), POST(), UserLite, userSummary(), DELETE(), POST() (+6 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.16
Nodes (19): GET(), UserLite, SeriesDetailPage(), TournamentDetailPage(), applyEventStatOverride(), computeEventPoints(), computeLiveLigaPunkte(), computeStatStandings() (+11 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.07
Nodes (65): POST(), POST(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps() (+57 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.19
Nodes (13): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+5 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.23
Nodes (16): GET(), isAuthorized(), softResetRating(), addMonthsUTC(), getSeasonWindow(), grantDueSeasonRewards(), grantPlacementReward(), grantSeasonEndRewards() (+8 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.09
Nodes (40): GET(), GET(), GET(), isAuthorized(), CampaignBoardLevel, getCampaignBoard(), CAMPAIGN_LEVELS, CampaignLevelDef (+32 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.07
Nodes (47): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), DELETE(), GET() (+39 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.13
Nodes (28): POST(), toJson(), ABILITY_KEYS, AbilityScores, clampToBaseline(), CLASS_SPEED_MIDPOINT, deriveBaseStats(), DerivedStats (+20 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.14
Nodes (38): CustomWorldDoc, docToWorld(), worldToDoc(), makeRng(), MapBuilder, npcLook(), Rect, StampDef (+30 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (22): buildFfaRanking(), buildMatchRanking(), displayName(), ELEMENT_SIZE, ElementSlot, formatEntryStats(), IdentityFlipTile(), LayoutEntry (+14 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.06
Nodes (50): gamedig, gamedig, GET(), GET(), POST(), POST(), GET(), PATCH() (+42 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.21
Nodes (19): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+11 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.06
Nodes (53): PATCH(), patchSchema, PATCH(), requestSchema, GET(), DuelDeckPage(), metadata, BattleCardsLayout() (+45 more)

### Community 36 - "packs.ts"
Cohesion: 0.16
Nodes (20): POST(), serializeDrawResult(), asCardResult(), asTacticResult(), awardDrawnCard(), awardDrawnTacticCard(), COMMUNITY_CHANCE, countUnopenedPacks() (+12 more)

### Community 37 - "MobaIcon"
Cohesion: 0.19
Nodes (14): GET(), isAuthorized(), MONTH_NAMES, QuestsPage(), QuestRegenerateButton(), generateMonthlyQuests(), QUEST_TYPE_META, QuestType (+6 more)

### Community 38 - "types.ts"
Cohesion: 0.12
Nodes (12): AdminShopPage(), PACK_KIND_INFO, PACK_KIND_ORDER, ShopConfigPanel(), TYPE_LABEL, ACCENT_CLASSES, PACK_INFO, PACK_ORDER (+4 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.09
Nodes (27): GET(), PUT(), requestSchema, assertHeroIncluded(), assertOwnership(), DuelDeckSelection, getActiveDuelDeck(), requireActiveDuelDeck() (+19 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.06
Nodes (42): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleReplayPage(), metadata, BattleOutcome (+34 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.09
Nodes (19): Props, WinnerClip, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount, Poll, PollCard() (+11 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.04
Nodes (91): APPLY, main(), PATCH(), GET(), GET(), POST(), POST(), POST() (+83 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.10
Nodes (36): GET(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames() (+28 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.06
Nodes (40): AdminEventsPage(), DashboardPage(), formatCountdown(), formatFreshness(), getGlobalDashboardData, MONTH_NAMES, ROLE_LABEL, ROLE_STYLE (+32 more)

### Community 45 - "auth.ts"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.03
Nodes (97): GET(), GET(), GET(), isAuthorized(), calcStreak(), GET(), PLACES, AdminDonationsClient() (+89 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.30
Nodes (10): GET(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), getGradientBackground(), getLogoBadge() (+2 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.08
Nodes (27): GalleryEntry, MONTH_NAMES, Nomination, AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect() (+19 more)

### Community 49 - "amp.ts"
Cohesion: 0.11
Nodes (31): GET(), POST(), GET(), POST(), POST(), GET(), POST(), POST() (+23 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.29
Nodes (8): main(), DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled(), NotificationType, PREF_KEY

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (28): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+20 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.10
Nodes (37): GROUND_LABEL, MapEditor(), Props, Selection, STAMP_IDS, STAMP_LABELS, Tool, TOOL_BUTTONS (+29 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.11
Nodes (25): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+17 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.21
Nodes (9): choose(), coastal(), neighbors(), pick(), Baut eine Hex-Weltkarte aus den Assets in ../Hex Map. Aufruf: python build_world, alle Dateien <prefix>NN.png (nur Ziffern hinter dem Prefix), terrain_of(), terrain_of_fixed() (+1 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.31
Nodes (8): awardPoints(), parsePlacementPts(), PATCH(), BracketMatch, generateBracket(), generateRoundRobin(), POST(), shuffle()

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.07
Nodes (43): GET(), POST(), DELETE(), DELETE(), POST(), GET(), POST(), DELETE() (+35 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.18
Nodes (15): BottomNav(), NAV, FloatingPill(), useTheme(), getActiveNavIndex(), InkStrokes(), maskStyle(), matches() (+7 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.12
Nodes (16): DominionCfg, DominionChange, recomputeSeriesDominionBonus(), SeriesStandings, SeriesStatConfigForDominion, StandingsRaw, CompletionData, DEFAULT_REWARDS (+8 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.05
Nodes (29): Badge, CATEGORIES, CATEGORY_LABELS, User, LinkedUser, Partner, PartnerManager(), TwitchPreview (+21 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.05
Nodes (42): GET(), GET(), loadProfileOverlayState(), GET(), GameserverWidget(), Server, ServerRow(), ApplyButton() (+34 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.08
Nodes (41): BattleFigure(), Props, Crop, drawTeFrame(), FULL, imageCache, loadTeImage(), loadTeLayers() (+33 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.16
Nodes (13): api(), Campaign, dueAt(), EventOption, MarketingCampaignsBlock(), MarketingStatsBlock(), PromotionRequestItem, PromotionRequestList() (+5 more)

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): @auth/prisma-adapter, canvas-confetti, @google/generative-ai, next, next-auth, dependencies, @auth/prisma-adapter, canvas-confetti (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.18
Nodes (15): isAuthorized(), isOverridden(), POST(), toJson(), isAuthorized(), POST(), isAuthorized(), POST() (+7 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.07
Nodes (57): GET(), DELETE(), POST(), requireAdmin(), DELETE(), PATCH(), requireAdmin(), POST() (+49 more)

### Community 69 - "challenge.ts"
Cohesion: 0.10
Nodes (28): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+20 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.19
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.08
Nodes (28): GET(), api(), AssetOption, buildEventTemplate(), cell(), EventOption, FoundUser, InterviewOption (+20 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.09
Nodes (30): api(), Idea, IdeasBoardClient(), IdeaList(), IdeaBody(), api(), AreaKey, FoundUser (+22 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.14
Nodes (22): GET(), isAuthorized(), POST(), GET(), rollNewCharacterSheet(), positionAlongPath(), stepMinutesOf(), DND_LOCATIONS (+14 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.04
Nodes (54): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, MonthlyContests, Props, YearlyContests (+46 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.04
Nodes (57): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+49 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.36
Nodes (7): Breakdown, fmt(), ScoreBreakdownBlock(), signed(), StreamResult, Week, Scale

### Community 77 - "tutorial.ts"
Cohesion: 0.08
Nodes (58): layersFor(), TeLayerSets, LocationState, bakeStatic(), drawBubble(), drawEmote(), drawQuarters(), drawStamp() (+50 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.12
Nodes (20): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+12 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.09
Nodes (20): ABILITY_LABEL, ABILITY_SCORE_CANDIDATES, ABILITY_STEPS, CharacterCreation(), Phase, ROLE_BADGE, RolledCard, ago() (+12 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.05
Nodes (41): EventCard(), EventUser, Props, SeriesEventItem, STATUS_CFG, StreamingPartner, Props, EventLiveBadge() (+33 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.07
Nodes (27): PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS, ModerationItemDto, ModerationClient(), api() (+19 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.24
Nodes (12): GET(), IdeaPage(), ReportPage(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData, toIdeaFeedEntry(), getSeriesParts() (+4 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.05
Nodes (75): GET(), POST(), GET(), DELETE(), GET(), POST(), GET(), GET() (+67 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.21
Nodes (10): AdminUsersClient(), formatLastLogin(), Props, Role, UserRow, AdminUsersPage(), SyncMembersButton(), History (+2 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.11
Nodes (30): POST(), GET(), GET(), ChronicleKind, logChronicle(), recentChronicle(), getPublishedCustomWorld(), removedSlugs() (+22 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.23
Nodes (8): formatDate(), SeasonConfigPanel(), toDateInputValue(), SeasonRewardsPanel(), RARITIES, STEP_LABELS, UpgradeEconomyPanel(), SeasonConfig

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.24
Nodes (8): POST(), computeKeptSeriesRankPoints(), PlacementReward, resetAllExceptSeries(), RewardsConfig, SelectiveResetSummary, LegacyStandingRow, SeriesEventForStandings

### Community 90 - "useConfirm"
Cohesion: 0.02
Nodes (119): SteamGameResult, DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue() (+111 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.07
Nodes (35): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, CommunityBoardWidget() (+27 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.24
Nodes (7): Menu, Share, BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 95 - "apply-season-results.ts"
Cohesion: 0.05
Nodes (60): GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props, PublicProfilePage() (+52 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.31
Nodes (8): GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), StatConfig, loadSeriesRanking(), SeriesRankingRow

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.21
Nodes (11): BASE_Z, CATALOG_PATH, CATEGORIES, CHAR_PACKS, hex(), main(), OUT, SKIN_SRC (+3 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.08
Nodes (32): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+24 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.48
Nodes (6): revokePointsByReason(), applyMatchResult(), ApplyMatchResultInput, finalFinalistReason(), finalWinReason(), loserOf()

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.24
Nodes (7): POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, VoteKind, VoteOwnerLookup

### Community 102 - "recurrence.ts"
Cohesion: 0.22
Nodes (10): AdminEventCompletePage(), DEFAULT_POLL, DEFAULT_REWARDS, MultiPollConfig, parsePoll(), parseRewards(), PlacementReward, PollConfig (+2 more)

### Community 103 - "isVideoUrl"
Cohesion: 0.03
Nodes (64): RULES, AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, CardRow (+56 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.19
Nodes (16): GET(), GET(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee(), updateEventStatus(), authHeader(), deleteDiscordMessage() (+8 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.20
Nodes (20): checkpointVoice(), createStubUser(), findUser(), handleMemberJoin(), provisionCard(), trackInvite(), trackMessage(), trackReaction() (+12 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.07
Nodes (40): POST(), PUT(), POST(), GET(), POST(), DELETE(), GET(), POST() (+32 more)

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.04
Nodes (86): GET(), PATCH(), PATCH(), GET(), GET(), GET(), PATCH(), PATCH() (+78 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.29
Nodes (7): CountdownBadge(), EndsCountdown(), Poll, PollAnswer, Props, PollCountdown(), usePollCountdown()

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.17
Nodes (16): POST(), requestSchema, DndPage(), metadata, getHeroSetup(), HeroSetup, HeroSetupStep, heroStepOf() (+8 more)

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.04
Nodes (68): Avatar(), MEDALS, Props, StandingRow, StandingUser, uname(), BracketView(), Match (+60 more)

### Community 111 - "skins/types.ts"
Cohesion: 0.16
Nodes (22): GET(), POST(), GET(), OptionInput, POST(), POST(), DiscordEmbed, createNotificationForUsers() (+14 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.42
Nodes (7): GET(), PATCH(), patchSchema, getSeasonConfig(), KEYS, setEloHardResetAt(), setSeason1StartAt()

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.16
Nodes (18): POST(), ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, runSeasonUpdate(), buildSeasonInputs(), runFullSeasonUpdate(), RunSeasonResult, markPreSeasonRan() (+10 more)

### Community 116 - "InterviewClient.tsx"
Cohesion: 0.33
Nodes (7): GET(), isAuthorized(), POST(), toJson(), Interview, InterviewClient(), name()

### Community 117 - "buy-pack/route.ts"
Cohesion: 0.28
Nodes (8): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), communityCardPoolSize(), countPacksPurchasedToday(), PackKind, startOfTodayUTC()

### Community 118 - "report-event-facts.ts"
Cohesion: 0.22
Nodes (9): cornerStyle(), ElementContent(), elementPositionStyle(), OverlayClient(), panelWidthFor(), pickTickerMatch(), usePanelRotator(), useStackedElements() (+1 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "TextsClient.tsx"
Cohesion: 0.24
Nodes (15): LOGO_POSITIONS, StudioEditor(), ImageDown, drawLogo(), drawWatermark(), loadImage(), LogoPosition, prepareUploadImage() (+7 more)

### Community 122 - "job-ring.ts"
Cohesion: 0.33
Nodes (8): RankTile(), getJobRing(), isEmployed(), jobColor(), JOBLESS_RING, LEVEL_FX, mix(), TIER_CLASS

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.25
Nodes (5): DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, StatBadges(), TacticCardTileData

### Community 124 - "ServerCard.tsx"
Cohesion: 0.32
Nodes (6): DELETE(), displayNameOf(), PATCH(), UserLite, userSummary(), ApplyMatchResultError

### Community 125 - "UnitClass"
Cohesion: 0.25
Nodes (8): VfxEvent, LiveDuelHandCard, LiveDuelUnit, UltimateBurst, FloatingEffect, GemBeam, LiveDuelHandCard, UnitClass

### Community 126 - "series/[id]/complete/route.ts"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.39
Nodes (7): RankRow(), BattleRankBadge(), BATTLE_RANKS, BattleRankEntry, getBattleRank(), getBattleRankFullLabel(), computeRankUp()

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "ThemeProvider.tsx"
Cohesion: 0.22
Nodes (5): Content, Loc, Quest, Row, STATUS

### Community 130 - "widget/events/route.ts"
Cohesion: 0.43
Nodes (6): eventSelect, FINISHED_STATUSES, GET(), RELEVANT_STATUSES, sortSeriesEvents(), toWidgetEvent()

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.12
Nodes (29): POST(), GET(), isAuthorized(), GEMS_DIFFICULTIES, POST(), formatStart(), GET(), POST() (+21 more)

### Community 132 - "widget/events/route.ts"
Cohesion: 0.47
Nodes (5): displayNameOf(), GET(), USER_SELECT, UserLite, userSummary()

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "[userId]/page.tsx"
Cohesion: 0.40
Nodes (5): ELEMENT_KEYS, parseLayout(), ProfileOverlayPage(), ProfileElementKey, ProfileLayoutPositions

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 137 - "spin/route.ts"
Cohesion: 0.70
Nodes (4): GET(), POST(), rollPrize(), todayStr()

### Community 138 - "DuelDeckEditor.tsx"
Cohesion: 0.13
Nodes (11): RULES, RuleSeed, PATCH(), patchSchema, GET(), isAuthorized(), isAuthorized(), POST() (+3 more)

### Community 139 - "widget/events/route.ts"
Cohesion: 0.10
Nodes (18): metadata, russoOne, spaceGrotesk, viewport, AnimatedBackground(), Cell, PULSE_COLORS, CursorGlow() (+10 more)

### Community 140 - "ThemeProvider.tsx"
Cohesion: 0.70
Nodes (3): HeroStatValue(), useValueDelta(), ValueDeltaBadge()

### Community 142 - "three"
Cohesion: 0.04
Nodes (71): BattleCardsTabsInner(), DND_LINK_TAB, isTabKey(), TabKey, TABS, ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill (+63 more)

### Community 143 - "season-config.ts"
Cohesion: 0.11
Nodes (14): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+6 more)

### Community 145 - "promotion-request-service.ts"
Cohesion: 0.38
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 147 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 152 - "[matchId]/route.ts"
Cohesion: 0.52
Nodes (4): POST(), POST(), advanceDndQuestObjectiveForUser(), updateQuestProgress()

### Community 153 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 154 - "ImageCropTool.tsx"
Cohesion: 0.29
Nodes (6): centeredRect(), Handle, ImageCropTool(), PRESETS, Rect, Crop

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 159 - "grantPack"
Cohesion: 0.26
Nodes (10): GET(), PATCH(), POST(), DEFAULT_PACK_PRICES, DEFAULT_WHEEL_PRIZES, DEFAULTS, getShopConfig(), KEYS (+2 more)

### Community 160 - "widget/events/[id]/route.ts"
Cohesion: 0.04
Nodes (9): POST(), requestSchema, GameSuggestion, GameSuggestion, DEFAULT_PREFS, metadata, { handlers, auth, signIn, signOut }, LineupError (+1 more)

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 163 - "HeroStatValue.tsx"
Cohesion: 0.13
Nodes (22): curve(), curvePercent(), STANDARD_CARDS, StandardCardSeed, ACTIVE_POOL, DD_ACTIVE_SKILLS, DD_PASSIVE_KITS, DD_ULTIMATE_SKILLS (+14 more)

### Community 167 - "generate-brand-assets.ts"
Cohesion: 0.40
Nodes (3): OUT_DIR, PNG_SIZES, SOURCE

### Community 172 - "Kapitel-Hintergründe — Kampagne"
Cohesion: 0.50
Nodes (3): Benötigte Dateien, Format, Kapitel-Hintergründe — Kampagne

## Knowledge Gaps
- **1151 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1146 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `report/[id]/page.tsx` to `roles.ts`, `series/[id]/complete/route.ts`, `coach-service.ts`, `time.ts`, `getSessionUser`, `three`, `[id]/settings/SettingsClient.tsx`, `(dashboard)/leaderboard/page.tsx`, `BattleCardView.tsx`, `notify-dispatch.ts`, `requireModeratorOrEventSquadCaptain`, `MobaIcon`, `community-job-config.ts`, `job-recommendations.ts`, `JobBadge.tsx`, `discord-rest.ts`, `EventEditClient.tsx`, `GameNameInput.tsx`, `formatBerlinTime`, `SeriesIcon.tsx`, `AdminEventsClient.tsx`, `ClipVotingClient.tsx`, `(dashboard)/events/page.tsx`, `apply-season-results.ts`, `admin/community-jobs/disputes/route.ts`, `studio-templates.ts`, `photo-request-service.ts`, `buy-pack/route.ts`, `upload/route.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `discord-rest.ts` to `roles.ts`, `coach-service.ts`, `time.ts`, `CommunityJobsPanel.tsx`, `season-config.ts`, `CommunityJobsAdminPanel.tsx`, `(dashboard)/leaderboard/page.tsx`, `notify-dispatch.ts`, `gameservers.ts`, `community-job-config.ts`, `JobBadge.tsx`, `auth.ts`, `FotografTools.tsx`, `dashboard/page.tsx`, `GameNameInput.tsx`, `events/series/[id]/page.tsx`, `formatBerlinTime`, `SeriesIcon.tsx`, `[id]/settings/SettingsClient.tsx`, `ProfileOverlayClient.tsx`, `AdminEventsClient.tsx`, `ConfirmDialog.tsx`, `useConfirm`, `apply-season-results.ts`, `isVideoUrl`, `report/[id]/page.tsx`, `InterviewClient.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `prisma.ts`, `ranked-season.ts`, `series/[id]/complete/route.ts`, `DuelDeckEditor.tsx`, `series-event-points.ts`, `duels-live.ts`, `promotion-request-service.ts`, `new-season/page.tsx`, `grantPack`, `clip-contest.ts`, `gameservers.ts`, `types.ts`, `community-job-config.ts`, `CoinIcon.tsx`, `hasMinRole`, `bot/index.ts`, `MarkdownLite.tsx`, `EventAdminRow.tsx`, `photo-request-service.ts`, `report/[id]/page.tsx`, `skins/types.ts`, `GamePlayersModal.tsx`, `ThemeProvider.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02048131080389145 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14153846153846153 - nodes in this community are weakly interconnected._
- **Should `live-battle.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10612244897959183 - nodes in this community are weakly interconnected._