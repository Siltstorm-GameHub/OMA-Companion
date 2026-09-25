# Graph Report - OMA-Companion  (2026-09-25)

## Corpus Check
- 1011 files · ~3,584,517 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5071 nodes · 13896 edges · 207 communities (172 shown, 35 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2a0be7f9`
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
- HeroStatValue.tsx
- tank
- preferences/route.ts
- active/route.ts
- @types/three
- middleware.ts
- new-season/page.tsx
- BattleStatsPanel.tsx
- notifications/page.tsx
- canvas-confetti
- Monster-Artwork — Edelstein-Kampf
- lucide-react
- next-auth
- postprocessing
- @prisma/client
- preferences/route.ts
- react
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- react-dom
- sharp
- sonner
- generate-brand-assets.ts
- three
- @types/canvas-confetti
- @types/three
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- web-push
- zod
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
- `GET()` --indirect_call--> `hex()`  [INFERRED]
  src/app/api/dnd/world-map/route.ts → scripts/build-te-assets.ts
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `TacticCardSeed` --references--> `Effect`  [EXTRACTED]
  prisma/battle-cards-tactic-seed-data.ts → src/lib/battle-engine/types.ts
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts

## Import Cycles
- None detected.

## Communities (207 total, 35 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (70): POST(), POST(), DELETE(), GET(), PATCH(), POST(), GET(), PATCH() (+62 more)

### Community 1 - "prisma.ts"
Cohesion: 0.10
Nodes (22): api(), Idea, IdeasBoardClient(), IdeaList(), api(), GameCard(), GameInfo, IdeaBody() (+14 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.13
Nodes (22): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), RARITIES, STEP_LABELS (+14 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.12
Nodes (32): POST(), DndCharacterRow, DndLocationRow, formatDuration(), polygonPoints(), TYPE_LABEL, WorldMap(), EVEN_ROW (+24 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.12
Nodes (26): buildSolid(), DELTA, Dialog, facingCell(), Game, GameEvent, pickTalk(), makeRng() (+18 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.11
Nodes (14): displayName(), FloatingLobbyChat(), LobbyMsg, NOTIF_ICONS, Notification, PresenceUser, timeAgo(), GuestGateProvider() (+6 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.08
Nodes (44): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, AvailableAction, LiveSnapshot, SlotRow() (+36 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.06
Nodes (83): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+75 more)

### Community 8 - "interactive.ts"
Cohesion: 0.07
Nodes (75): StoredBattleLog, LiveBattleSnapshot, hasAnyValidMove(), pickEnemyForColumn(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage() (+67 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.06
Nodes (57): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+49 more)

### Community 10 - "time.ts"
Cohesion: 0.11
Nodes (20): GET(), api(), AreaKey, FoundUser, GameInfo, IdeaForm(), IdeaPrefill, MediaAsset (+12 more)

### Community 11 - "getSessionUser"
Cohesion: 0.04
Nodes (87): PATCH(), GET(), POST(), GET(), DELETE(), PATCH(), GET(), POST() (+79 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (51): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+43 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.10
Nodes (30): DELETE(), PATCH(), POST(), POST(), CATEGORIES, EventSetupWizard(), FORMATS, inputStyle (+22 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, CardContentError, CardContentPatch, updateCardContent()

### Community 16 - "ranks.ts"
Cohesion: 0.12
Nodes (26): BracketView(), Match, Participant, roundLabel(), uname(), User, Props, WanderpocalBadge() (+18 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.07
Nodes (41): POST(), AlbumPage(), Interview, InterviewClient(), name(), DesktopProfileTabs(), Tab, PublicProfilePage() (+33 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (39): DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst (+31 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.12
Nodes (17): GameserverWidget(), Server, ServerRow(), Light, LIGHT_COLOR, LIGHT_LABEL, Server, ServerCard() (+9 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.07
Nodes (28): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+20 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.06
Nodes (37): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+29 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.33
Nodes (5): BattleCardsTabsInner(), DND_LINK_TAB, isTabKey(), TabKey, TABS

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.05
Nodes (29): Badge, CATEGORIES, CATEGORY_LABELS, User, CreateContestForm(), defaultPeriodEnd(), defaultPeriodStart(), toDateInputValue() (+21 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.08
Nodes (32): GET(), BattleChallengeWidget(), ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge(), ChallengeUserPicker() (+24 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.06
Nodes (55): POST(), POST(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps() (+47 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.18
Nodes (22): GET(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked(), CAMPAIGN_LEVELS, CampaignLevelDef, getCampaignLevel(), AFK_FARMER (+14 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.10
Nodes (28): GEMS_DIFFICULTIES, PATCH(), GET(), GET(), isAuthorized(), GEMS_DIFFICULTIES, buildCampaignEnemyTeam(), findGemsMonsterTemplate() (+20 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.12
Nodes (30): POST(), toJson(), ABILITY_KEYS, AbilityScores, clampToBaseline(), CLASS_SPEED_MIDPOINT, deriveBaseStats(), DerivedStats (+22 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.11
Nodes (17): AdminShopPage(), PACK_KIND_INFO, PACK_KIND_ORDER, ShopConfigPanel(), TYPE_LABEL, ACCENT_CLASSES, PACK_INFO, PACK_ORDER (+9 more)

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
Cohesion: 0.07
Nodes (25): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward, PLATFORMS (+17 more)

### Community 36 - "packs.ts"
Cohesion: 0.18
Nodes (18): POST(), serializeDrawResult(), asCardResult(), asTacticResult(), awardDrawnCard(), awardDrawnTacticCard(), COMMUNITY_CHANCE, drawCard() (+10 more)

### Community 37 - "MobaIcon"
Cohesion: 0.24
Nodes (15): LOGO_POSITIONS, StudioEditor(), ImageDown, drawLogo(), drawWatermark(), loadImage(), LogoPosition, prepareUploadImage() (+7 more)

### Community 38 - "types.ts"
Cohesion: 0.06
Nodes (45): EventCard(), EventUser, Props, SeriesEventItem, STATUS_CFG, StreamingPartner, EventLiveBadge(), calcEntryAvg() (+37 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.06
Nodes (63): GET(), PUT(), requestSchema, GET(), POST(), requestSchema, toDbResult(), DuelDeckPage() (+55 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.39
Nodes (6): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), TrapTriggerCondition

### Community 41 - "formatBerlinDate"
Cohesion: 0.18
Nodes (11): Mode, RankRow(), BattleRankBadge(), RANK_STYLE, MatchmakingWidget(), NpcPuzzleBattleLauncher(), BATTLE_RANKS, BattleRankEntry (+3 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.05
Nodes (68): APPLY, main(), PATCH(), POST(), GET(), POST(), GET(), GET() (+60 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.11
Nodes (35): berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames(), getDismissedItemKeys() (+27 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), StatusEntry, AdsTarget, ampCall(), AmpInstance, callWithSession() (+15 more)

### Community 45 - "auth.ts"
Cohesion: 0.08
Nodes (27): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+19 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.16
Nodes (24): bakeStatic(), drawQuarters(), drawStamp(), loadSheets(), SHEET_FILES, SheetKey, Sheets, TeWorld() (+16 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.07
Nodes (33): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+25 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.09
Nodes (26): AssetList(), Thumb(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile (+18 more)

### Community 49 - "amp.ts"
Cohesion: 0.22
Nodes (21): LiveBattleView(), beep(), getContext(), noiseBurst(), playCardRevealSound(), playCommunityBonusSound(), playCritSound(), playDamageSound() (+13 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.09
Nodes (32): AdminEventBracketPage(), Membership, Squad, SquadDetailClient(), User, Squad, Avatar(), EVENT_STATUS_LABEL (+24 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.15
Nodes (27): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+19 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.14
Nodes (17): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+9 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.10
Nodes (29): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+21 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.21
Nodes (9): choose(), coastal(), neighbors(), pick(), Baut eine Hex-Weltkarte aus den Assets in ../Hex Map. Aufruf: python build_world, alle Dateien <prefix>NN.png (nur Ziffern hinter dem Prefix), terrain_of(), terrain_of_fixed() (+1 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.18
Nodes (14): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), revokePointsByReason(), requireModeratorOrEventSquadCaptain() (+6 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.14
Nodes (22): GET(), POST(), DELETE(), DELETE(), AuditActor, AUTHOR, AuthorRow, authorSearch() (+14 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.04
Nodes (62): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+54 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (23): DELETE(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage(), DominionCfg, DominionChange (+15 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.07
Nodes (26): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, MonthlyContests, Props, YearlyContests (+18 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.13
Nodes (19): GET(), loadProfileOverlayState(), NextEventTile(), CoverBrandBadge(), EventCoverDefault(), dynamicCache, GameCover(), GameCoverProps (+11 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.07
Nodes (41): metadata, BattleFigure(), Props, Crop, drawTeFrame(), FULL, imageCache, loadTeImage() (+33 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.07
Nodes (26): CustomBadgeDisplay, Props, openSection(), ProfileCompletion(), Props, CustomBadgeDisplay, Props, Tab (+18 more)

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): @auth/prisma-adapter, discord.js, gamedig, @google/generative-ai, motion, next, dependencies, @auth/prisma-adapter (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.18
Nodes (15): isAuthorized(), isOverridden(), POST(), toJson(), isAuthorized(), POST(), isAuthorized(), POST() (+7 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.22
Nodes (10): GET(), isAuthorized(), CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), CATEGORY_LABELS, DAILY_CAPS, POINT_RULES (+2 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.19
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.15
Nodes (20): GET(), POST(), DELETE(), POST(), DELETE(), POST(), DELETE(), POST() (+12 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.21
Nodes (16): GET(), POST(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), generateBrandedCoverDataUri() (+8 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.20
Nodes (14): GET(), isAuthorized(), GET(), rollNewCharacterSheet(), DND_LOCATIONS, DndLocationDef, ensureDndWorldSeeded(), getLocationDef() (+6 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.08
Nodes (23): ClipVotingClient(), Nomination, Props, ClipDesMonatsPage(), MONTH_NAMES, GalleryEntry, MONTH_NAMES, Nomination (+15 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.07
Nodes (44): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+36 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.08
Nodes (30): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+22 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.27
Nodes (19): MapBuilder, TeMap, bergpass(), BUILDERS, cache, chatter(), chestTalk(), frostgipfel() (+11 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.10
Nodes (25): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+17 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.22
Nodes (11): api(), Campaign, dueAt(), EventOption, MarketingCampaignsBlock(), MarketingStatsBlock(), PromotionRequestItem, PromotionRequestList() (+3 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.10
Nodes (14): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+6 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.08
Nodes (28): PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS, ModerationItemDto, ModerationClient(), AuditClient() (+20 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.08
Nodes (49): GET(), PATCH(), PATCH(), GET(), PATCH(), GET(), PATCH(), PATCH() (+41 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.07
Nodes (29): CardRow, CommunityCardsAdmin(), AdminCommunityCardsPage(), TacticCardRow, AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES, SeriesOption (+21 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.07
Nodes (51): GET(), average(), GET(), POST(), DELETE(), PATCH(), POST(), GET() (+43 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.17
Nodes (18): POST(), POST(), GET(), positionAlongPath(), stepMinutesOf(), getWorldQuestStep(), ensureDndStoryContentSeeded(), STORY_TEMPLATES (+10 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.22
Nodes (11): CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS, PokalSection() (+3 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.11
Nodes (15): api(), Coach, CoachRatingSection(), RateableSession, EventWinnerPredictionWidget(), Prediction, uname(), UserLite (+7 more)

### Community 90 - "useConfirm"
Cohesion: 0.10
Nodes (23): SteamGameResult, GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props (+15 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.12
Nodes (16): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, centeredRect() (+8 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.08
Nodes (34): BattleCardView(), VfxEvent, CardTile(), LiveDuelUnit, UltimateBurst, UnitSlot(), GemsResultScreen(), GemsReward (+26 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.03
Nodes (62): RULES, AdminUsersClient(), formatLastLogin(), Props, Role, UserRow, AdminUsersPage(), SyncMembersButton() (+54 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.09
Nodes (35): PATCH(), requestSchema, POST(), requestSchema, BattleCardsPage(), metadata, userSelect, BattleCardsLogo() (+27 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.21
Nodes (11): BASE_Z, CATALOG_PATH, CATEGORIES, CHAR_PACKS, hex(), main(), OUT, SKIN_SRC (+3 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.10
Nodes (25): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+17 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.14
Nodes (11): Props, WinnerClip, coverUrl(), GameSuggestion, GameSuggestionCount, Poll, PollCard(), PollOption (+3 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.24
Nodes (7): POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, VoteKind, VoteOwnerLookup

### Community 102 - "recurrence.ts"
Cohesion: 0.13
Nodes (18): DELETE(), DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES (+10 more)

### Community 103 - "isVideoUrl"
Cohesion: 0.18
Nodes (15): GET(), FeedEntry, IdeaPageClient(), IdeaPage(), ReportPage(), ReportPageClient(), AUTHOR, ideaFeedInclude() (+7 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.13
Nodes (16): metadata, ABILITY_LABEL, ABILITY_SCORE_CANDIDATES, ABILITY_STEPS, CharacterCreation(), Phase, RolledCard, RollingReveal() (+8 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.22
Nodes (18): checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction(), trackVoice(), client (+10 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 107 - "report/[id]/page.tsx"
Cohesion: 0.05
Nodes (53): GET(), GET(), GET(), GET(), GET(), POST(), GET(), GET() (+45 more)

### Community 108 - "photo-request-service.ts"
Cohesion: 0.22
Nodes (13): POST(), GET(), GET(), POST(), InterviewPage(), answerInterview(), createInterview(), declineInterview() (+5 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.13
Nodes (15): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, AdminLayout(), DailyPollActionBadge() (+7 more)

### Community 110 - "useServerLiveStatus.ts"
Cohesion: 0.11
Nodes (13): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, Avatar(), MEDALS, Props (+5 more)

### Community 111 - "skins/types.ts"
Cohesion: 0.13
Nodes (16): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+8 more)

### Community 112 - "BadgesSection.tsx"
Cohesion: 0.24
Nodes (11): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), POST(), POST(), DISCORD_COLORS, createPollsForEvent() (+3 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.05
Nodes (63): POST(), GET(), PATCH(), patchSchema, placementSchema, GET(), PATCH(), patchSchema (+55 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.09
Nodes (34): GET(), GET(), GET(), isAuthorized(), GET(), isAuthorized(), calcStreak(), GET() (+26 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.30
Nodes (9): GET(), PATCH(), POST(), GET(), POST(), rollPrize(), todayStr(), getShopConfig() (+1 more)

### Community 118 - "report-event-facts.ts"
Cohesion: 0.08
Nodes (30): GET(), GameCoverPicker(), PickedGameCover, api(), AssetOption, buildEventTemplate(), EventOption, FoundUser (+22 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "TextsClient.tsx"
Cohesion: 0.33
Nodes (10): POST(), QuestWorld(), advanceDndQuestObjective(), advanceWorldQuestStep(), DND_QUESTS, ensureDndQuestsSeeded(), rewardDndQuest(), worldQuestDefs() (+2 more)

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.21
Nodes (11): main(), DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled(), NotificationType, PREF_KEY (+3 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.22
Nodes (14): GET(), isAuthorized(), formatStart(), GET(), announceEventResults(), announceNewEvent(), fmtDateDE(), eventParticipationCoins() (+6 more)

### Community 124 - "ServerCard.tsx"
Cohesion: 0.46
Nodes (5): POST(), POST(), notifyPvpBattleResolved(), advanceDndQuestObjectiveForUser(), updateQuestProgress()

### Community 125 - "notifications/page.tsx"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 126 - "series/[id]/complete/route.ts"
Cohesion: 0.36
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.11
Nodes (19): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+11 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "ThemeProvider.tsx"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.10
Nodes (37): GET(), POST(), GET(), OptionInput, POST(), POST(), GET(), GET() (+29 more)

### Community 132 - "widget/events/route.ts"
Cohesion: 0.24
Nodes (9): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), ShoppingBag, communityCardPoolSize(), countPacksPurchasedToday(), PackKind (+1 more)

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
Cohesion: 0.08
Nodes (35): EventCardLink(), BottomNav(), NAV, DiscordLoginButton(), Props, FloatingPill(), NAV, NavLink (+27 more)

### Community 140 - "sonner"
Cohesion: 0.31
Nodes (8): awardPoints(), parsePlacementPts(), PATCH(), BracketMatch, generateBracket(), generateRoundRobin(), POST(), shuffle()

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.07
Nodes (43): Avatar(), EventTippsList(), Tipp, uname(), UserLite, RankTile(), TournamentData, cache (+35 more)

### Community 142 - "three"
Cohesion: 0.06
Nodes (40): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, LEVEL_BORDER, CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS (+32 more)

### Community 143 - "HeroStatValue.tsx"
Cohesion: 0.29
Nodes (8): ActivityFeed(), cleanReason(), Filter, Tx, txType(), formatRelative(), RelativeTime(), RelativeTimeProps

### Community 146 - "active/route.ts"
Cohesion: 0.43
Nodes (6): eventSelect, FINISHED_STATUSES, GET(), RELEVANT_STATUSES, sortSeriesEvents(), toWidgetEvent()

### Community 148 - "@types/three"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 152 - "BattleStatsPanel.tsx"
Cohesion: 0.52
Nodes (5): BattleStatsPanel(), computeBattleStats(), findMvpId(), score(), UnitBattleStats

### Community 153 - "notifications/page.tsx"
Cohesion: 0.67
Nodes (3): AdminNotificationsPage(), DiscordEmoji, fetchGuildEmojis()

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 160 - "preferences/route.ts"
Cohesion: 0.03
Nodes (29): DEFAULTS, GameSuggestion, isAuthorized(), POST(), GET(), POST(), DELETE(), displayNameOf() (+21 more)

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

### Community 254 - "ScoreBreakdownBlock.tsx"
Cohesion: 0.36
Nodes (7): Breakdown, fmt(), ScoreBreakdownBlock(), signed(), StreamResult, Week, Scale

### Community 270 - "[contribId]/route.ts"
Cohesion: 0.07
Nodes (47): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), GET(), DELETE() (+39 more)

### Community 274 - "HeroStatValue.tsx"
Cohesion: 0.04
Nodes (68): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+60 more)

## Knowledge Gaps
- **1116 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1111 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `report/[id]/page.tsx` to `roles.ts`, `series/[id]/complete/route.ts`, `widget/events/route.ts`, `coach-service.ts`, `time.ts`, `getSessionUser`, `[contribId]/route.ts`, `duels-live.ts`, `duel-live-battle.ts`, `HeroStatValue.tsx`, `MobaIcon.tsx`, `(dashboard)/leaderboard/page.tsx`, `requireModeratorOrEventSquadCaptain`, `types.ts`, `community-job-config.ts`, `dispatchNotification`, `DailyPollBanner.tsx`, `BattleLogEntry`, `EventEditClient.tsx`, `skill-pool.ts`, `admin/events/[id]/complete/route.ts`, `GameNameInput.tsx`, `formatBerlinTime`, `SeriesIcon.tsx`, `ClipVotingClient.tsx`, `bot/index.ts`, `community-job-discord-votes.ts`, `admin/community-jobs/disputes/route.ts`, `recurrence.ts`, `isVideoUrl`, `photo-request-service.ts`, `BadgesSection.tsx`, `GamePlayersModal.tsx`, `report/[id]/page.tsx`, `report-event-facts.ts`, `upload/route.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `DashboardChrome.tsx`, `series/[id]/complete/route.ts`, `[tacticCardId]/route.ts`, `series-event-points.ts`, `duels-live.ts`, `RankedAvatar.tsx`, `duel-live-battle.ts`, `@types/three`, `new-season/page.tsx`, `notifications/page.tsx`, `requireModeratorOrEventSquadCaptain`, `shop-config.ts`, `clip-contest.ts`, `JobBadge.tsx`, `CoinIcon.tsx`, `revert-event-completion.ts`, `hasMinRole`, `events/series/[id]/page.tsx`, `SeriesIcon.tsx`, `[id]/settings/SettingsClient.tsx`, `ClipVotingClient.tsx`, `(dashboard)/events/page.tsx`, `apply-season-results.ts`, `photo-request-service.ts`, `report/[id]/page.tsx`, `BadgesSection.tsx`, `ThemeProvider.tsx`, `getActiveMembership`, `series/[id]/complete/route.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `duel-live-battle.ts` to `prisma.ts`, `coach-service.ts`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `StarterPickFlow.tsx`, `HeroStatValue.tsx`, `HeroStatValue.tsx`, `MobaIcon.tsx`, `(dashboard)/leaderboard/page.tsx`, `board-match3.ts`, `gameservers.ts`, `types.ts`, `community-job-config.ts`, `auth.ts`, `FotografTools.tsx`, `dispatchNotification`, `SeriesDetailClient.tsx`, `skill-pool.ts`, `community-board-comment-service.ts`, `SeriesIcon.tsx`, `[id]/settings/SettingsClient.tsx`, `ProfileOverlayClient.tsx`, `community-job-payout/route.ts`, `AdminEventsClient.tsx`, `ConfirmDialog.tsx`, `ClipVotingClient.tsx`, `(dashboard)/events/page.tsx`, `EventSetupWizard.tsx`, `useServerLiveStatus.ts`, `report/[id]/page.tsx`, `report-event-facts.ts`, `ScoreBreakdownBlock.tsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1116 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.026944806605823556 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0967741935483871 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12561576354679804 - nodes in this community are weakly interconnected._