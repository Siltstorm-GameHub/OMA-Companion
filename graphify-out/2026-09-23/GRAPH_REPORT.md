# Graph Report - OMA-Companion  (2026-09-23)

## Corpus Check
- 960 files · ~3,078,489 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4837 nodes · 12510 edges · 232 communities (197 shown, 35 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c1e1f895`
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
- starter-pick.ts
- DailySpin.tsx
- StarterPickFlow.tsx
- UserPickerSheet.tsx
- process-rank-art.ts
- run-season.ts
- requireModeratorOrSquadCaptain
- notifications.ts
- DailyMessagePanel.tsx
- seed-notification-rules.ts
- middleware.ts
- BadgesAdminClient.tsx
- new-season/page.tsx
- BadgeIcon.tsx
- LiveStreamsBanner.tsx
- PwaInstallButton.tsx
- Monster-Artwork — Edelstein-Kampf
- [tacticCardId]/route.ts
- GameCover.tsx
- SeasonConfigPanel.tsx
- requireModeratorOrAnySquadCaptain
- InterviewClient.tsx
- lineup/route.ts
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- EventCreateForm.tsx
- MyPredictionsList.tsx
- FloatingLobbyChat.tsx
- generate-brand-assets.ts
- widget/events/route.ts
- seed-standard-cards/route.ts
- synergy.ts
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- roadmap/page.tsx
- setIdeaInterest
- canvas-confetti
- UserRoleManager.tsx
- genre-icons.ts
- chroma-key.js
- preferences/route.ts
- ideas/stats/route.ts
- battle-cards/layout.tsx
- ParticleBackground.tsx
- next-auth.d.ts
- AGENTS.md
- lobby-cleanup/route.ts
- bot-runner.mjs
- eslint.config.mjs
- next-auth
- @auth/prisma-adapter
- next.config.ts
- canvas-confetti
- lucide-react
- next-auth
- postprocessing
- react
- react-dom
- react
- sonner
- sharp
- @vercel/blob
- sonner
- three
- postcss.config.mjs
- tailwind.config.ts
- vercel.json
- { GET, POST }
- size
- MIN_MATCHES_FOR_RANKING
- @types/canvas-confetti
- @types/three
- web-push
- zod

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
- `main()` --calls--> `getCommunityJob()`  [EXTRACTED]
  scripts/fix-community-job-payouts.ts → src/lib/community-jobs.ts

## Import Cycles
- None detected.

## Communities (232 total, 35 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (69): POST(), DELETE(), GET(), PATCH(), POST(), GET(), PATCH(), DELETE() (+61 more)

### Community 1 - "prisma.ts"
Cohesion: 0.43
Nodes (6): eventSelect, FINISHED_STATUSES, GET(), RELEVANT_STATUSES, sortSeriesEvents(), toWidgetEvent()

### Community 2 - "ranked-season.ts"
Cohesion: 0.08
Nodes (35): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), BattleCardData, CardClassFilter (+27 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.06
Nodes (57): GET(), PUT(), requestSchema, GET(), POST(), requestSchema, DuelDeckPage(), metadata (+49 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.09
Nodes (30): GET(), POST(), GET(), DELETE(), PATCH(), GET(), POST(), GET() (+22 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.06
Nodes (80): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+72 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.05
Nodes (38): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+30 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.23
Nodes (9): EventCardLink(), GateButton(), GateOptions, GuestBanner(), GuestGateContext, GuestGateValue, useGuestGate(), GUEST_ALLOWED_PATHS (+1 more)

### Community 8 - "interactive.ts"
Cohesion: 0.10
Nodes (55): hasAnyValidMove(), applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate, DecisionTargetKind, describeAvailableActions(), estimateActionEffect() (+47 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.06
Nodes (55): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+47 more)

### Community 10 - "time.ts"
Cohesion: 0.07
Nodes (50): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), DELETE(), GET() (+42 more)

### Community 11 - "getSessionUser"
Cohesion: 0.06
Nodes (39): GET(), GET(), POST(), GET(), DELETE(), PATCH(), DELETE(), POST() (+31 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.14
Nodes (21): GET(), POST(), DELETE(), POST(), DELETE(), POST(), DELETE(), POST() (+13 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (57): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+49 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.16
Nodes (17): GET(), isAuthorized(), GET(), POST(), MONTH_NAMES, QuestsPage(), QuestRegenerateButton(), sendDiscordDM() (+9 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.17
Nodes (11): DonationsPage(), fmt(), MONTH_NAMES, streakBadge(), LeaderboardPage(), MEDALS, metadata, PODIUM_CONFIG (+3 more)

### Community 16 - "ranks.ts"
Cohesion: 0.08
Nodes (44): GET(), POST(), loadProfileOverlayState(), GamePlayer, GET(), PointsPage(), FavoriteGamesSection(), Props (+36 more)

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
Cohesion: 0.20
Nodes (6): CardWithId, CLASS_CONFIG, CLASS_ORDER, ClassKey, StepDef, STEPS

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.13
Nodes (25): BracketView(), Match, Participant, roundLabel(), uname(), User, Props, WanderpocalBadge() (+17 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.09
Nodes (30): BattleCardView(), LEVEL_BORDER, VfxEvent, CardTile(), LiveDuelUnit, UltimateBurst, UnitSlot(), LineupStrip() (+22 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.07
Nodes (21): CompareProfilePage(), fetchUserData(), UserData, Props, EventLiveBadge(), buildStandings(), LigaView(), Match (+13 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.18
Nodes (14): GET(), GET(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee(), updateEventStatus(), authHeader(), DiscordEmbed (+6 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.22
Nodes (20): LiveBattleView(), beep(), getContext(), noiseBurst(), playCardRevealSound(), playCommunityBonusSound(), playCritSound(), playDamageSound() (+12 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.07
Nodes (34): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+26 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.08
Nodes (43): parseBoardSwaps(), POST(), VALID_ACTIONS, BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON (+35 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.10
Nodes (35): GEMS_DIFFICULTIES, PATCH(), GET(), GET(), isAuthorized(), GEMS_DIFFICULTIES, POST(), CampaignLevelDef (+27 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.07
Nodes (25): CustomBadgeDisplay, Props, formatBirthday(), ProfileEditor(), Props, Badge, ProfileJobBadge(), CustomBadgeDisplay (+17 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.05
Nodes (72): APPLY, main(), PATCH(), POST(), POST(), POST(), GET(), GET() (+64 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.11
Nodes (17): AdminShopPage(), PACK_KIND_INFO, PACK_KIND_ORDER, ShopConfigPanel(), TYPE_LABEL, ACCENT_CLASSES, PACK_INFO, PACK_ORDER (+9 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (21): buildFfaRanking(), buildMatchRanking(), displayName(), ElementSlot, formatEntryStats(), IdentityFlipTile(), LayoutEntry, MatchTicker() (+13 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.13
Nodes (23): POST(), POST(), GET(), GET(), GET(), GET(), collectNominations(), CommunityNomination (+15 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.14
Nodes (17): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, isStoredBattleLog(), CHEST_TABLE, ChestPrize (+9 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 36 - "packs.ts"
Cohesion: 0.06
Nodes (51): POST(), POST(), POST(), GET(), DELETE(), PATCH(), PATCH(), POST() (+43 more)

### Community 37 - "MobaIcon"
Cohesion: 0.07
Nodes (37): GET(), api(), Idea, IdeasBoardClient(), IdeaList(), api(), GameCard(), GameInfo (+29 more)

### Community 38 - "types.ts"
Cohesion: 0.06
Nodes (47): TACTIC_CARDS, TacticCardSeed, POST(), requestSchema, toDbResult(), isAuthorized(), POST(), toJson() (+39 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.07
Nodes (66): POST(), GET(), POST(), POST(), POST(), parseSwaps(), POST(), GET() (+58 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.16
Nodes (20): POST(), serializeDrawResult(), asCardResult(), asTacticResult(), awardDrawnCard(), awardDrawnTacticCard(), COMMUNITY_CHANCE, countUnopenedPacks() (+12 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.06
Nodes (61): GET(), PATCH(), PATCH(), GET(), GET(), PATCH(), GET(), GET() (+53 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.10
Nodes (38): GET(), POST(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), dismissRecommendation(), EventRecommendation, eventsWithoutReports() (+30 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.13
Nodes (20): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, cache, flush(), inflight (+12 more)

### Community 45 - "auth.ts"
Cohesion: 0.16
Nodes (19): BodyModel(), CharacterBuilder(), GENDER_LABEL, CharacterRig(), PartModel(), bodyOf(), carryConfigOver(), defaultConfigFor() (+11 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.14
Nodes (24): GET(), POST(), GET(), OptionInput, POST(), POST(), createNotificationForUsers(), isTypeEnabled() (+16 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.22
Nodes (18): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+10 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.08
Nodes (37): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+29 more)

### Community 49 - "amp.ts"
Cohesion: 0.09
Nodes (21): EventsPage(), FullStandingsToggle(), Props, StandingRow, StandingUser, ArchivedSeason, FORMAT_LABELS, LegacyRow (+13 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.11
Nodes (18): PATCH(), patchSchema, characterConfigSchema, PATCH(), requestSchema, DevSkinTestPage(), SkinCanvas, SkinModel() (+10 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (27): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+19 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.10
Nodes (18): Props, WinnerClip, DailyMessageBanner(), Message, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount (+10 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.10
Nodes (28): AlbumPage(), DesktopProfileTabs(), Tab, ProfileRecentEventEntry, ProfileRecentEvents(), Props, AssetGrid(), EventGallerySection() (+20 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.13
Nodes (22): CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant, readViewMode() (+14 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.05
Nodes (42): EventCard(), EventUser, GENRE_MAP, Props, SeriesEventItem, STATUS_CFG, StreamingPartner, EventWinnerPredictionWidget() (+34 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.10
Nodes (25): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, GENRES (+17 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.09
Nodes (19): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, GENRES, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward (+11 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (23): DELETE(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage(), DominionCfg, DominionChange (+15 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.12
Nodes (23): curve(), curvePercent(), STANDARD_CARDS, StandardCardSeed, ACTIVE_POOL, DD_ACTIVE_SKILLS, DD_PASSIVE_KITS, DD_ULTIMATE_SKILLS (+15 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.12
Nodes (20): DELETE(), DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES (+12 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.08
Nodes (28): clips, file, base, bodyMaterial, label, parts, regions, athlete (+20 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.12
Nodes (17): GET(), api(), AssetOption, buildEventTemplate(), cell(), EventOption, FoundUser, InterviewOption (+9 more)

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): @auth/prisma-adapter, discord.js, gamedig, @google/generative-ai, motion, next, dependencies, @auth/prisma-adapter (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.13
Nodes (20): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), GET() (+12 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (21): GET(), POST(), DELETE(), DELETE(), AUTHOR, AuthorRow, authorSearch(), contentInfo() (+13 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.12
Nodes (27): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards() (+19 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (18): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+10 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.14
Nodes (17): JobTexts, EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE (+9 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.12
Nodes (21): GET(), inputStyle, Series, NextEventTile(), CoverBrandBadge(), EventCoverDefault(), dynamicCache, GameCover() (+13 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

### Community 73 - "visionaer-service.ts"
Cohesion: 0.14
Nodes (9): AdminEventsPage(), CATEGORY_STRIP, EVENT_STATUS, SyncButton(), MyPrediction, PredictionStreakCard(), ScrollReveal(), StreamRegisterButton() (+1 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.19
Nodes (8): MonthlyContests, Props, YearlyContests, EventsTabs(), TabItem, TabPanel(), Tabs(), TabsProps

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.06
Nodes (41): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+33 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.13
Nodes (14): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+6 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.09
Nodes (31): GET(), api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem() (+23 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.12
Nodes (18): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+10 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.14
Nodes (17): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), RARITIES (+9 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.18
Nodes (10): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+2 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.11
Nodes (19): SeriesOption, ConfirmDialog(), ConfirmDialogProps, ConfirmOptions, ConfirmState, EMPTY_STATE, DisputeKind, DisputeVotesModal() (+11 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.10
Nodes (19): ClipVotingClient(), Nomination, Props, ClipDesMonatsPage(), MONTH_NAMES, GalleryEntry, MONTH_NAMES, Nomination (+11 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.23
Nodes (15): GET(), isAuthorized(), formatStart(), GET(), announceEventResults(), announceNewEvent(), CoverSource, fmtDateDE() (+7 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.31
Nodes (8): awardPoints(), parsePlacementPts(), PATCH(), BracketMatch, generateBracket(), generateRoundRobin(), POST(), shuffle()

### Community 85 - "CoachTools.tsx"
Cohesion: 0.22
Nodes (13): POST(), GET(), GET(), POST(), InterviewPage(), answerInterview(), createInterview(), declineInterview() (+5 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.03
Nodes (30): DEFAULTS, GET(), isAuthorized(), GameSuggestion, DEFAULT_PREFS, GET(), POST(), DELETE() (+22 more)

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), StatusEntry, AdsTarget, ampCall(), AmpInstance, callWithSession() (+15 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.12
Nodes (15): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+7 more)

### Community 90 - "useConfirm"
Cohesion: 0.13
Nodes (19): MONTH_NAMES, YearReviewPage(), CountUp(), CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview() (+11 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.08
Nodes (26): blocks, texture, blocks, texture, blocks, materials, texture, blocks (+18 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.19
Nodes (7): NAV, FloatingPill(), NAV, NavLink, useTheme(), GateLink(), PollBadge()

### Community 95 - "apply-season-results.ts"
Cohesion: 0.31
Nodes (10): applyTierJumpLimit(), computePercentiles(), computeSeasonResults(), hashSeed(), MemberSeasonResult, resolveClass(), TIER_MULTIPLIER, TIER_ORDER (+2 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.07
Nodes (34): POST(), CATEGORIES, EventSetupWizard(), FORMATS, GENRES, inputStyle, PlacementReward, PLATFORMS (+26 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.15
Nodes (13): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+5 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.14
Nodes (21): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+13 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.09
Nodes (17): ACTIVITY_TIER_ICON, BattleCardSkill, PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackVisualKind (+9 more)

### Community 100 - "adapters.ts"
Cohesion: 0.07
Nodes (18): Badge, CATEGORIES, CATEGORY_LABELS, User, LinkedUser, Partner, PartnerManager(), TwitchPreview (+10 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 102 - "recurrence.ts"
Cohesion: 0.10
Nodes (20): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, Thumb() (+12 more)

### Community 103 - "isVideoUrl"
Cohesion: 0.18
Nodes (7): BackToTop(), GuestGateProvider(), ACCENT_COLOR, ICON_MAP, NewsItem, Props, TopNewsFeed()

### Community 104 - "studio-templates.ts"
Cohesion: 0.21
Nodes (32): defaults, defaults, slim, tank, defaults, Bottom, Eyewear, FacialHair (+24 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.44
Nodes (9): GET(), displayName(), getCronRuns(), getJobHealth(), getPayoutOverview(), getVoteAnomalies(), previewPayout(), VoteEvent (+1 more)

### Community 107 - "card-provisioning.ts"
Cohesion: 0.14
Nodes (18): POST(), isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, CLASS_SPEED_MIDPOINT (+10 more)

### Community 108 - "DailyPollPanel.tsx"
Cohesion: 0.31
Nodes (4): DashboardLayout(), PartnerFooter(), Partner, isLinkPreviewBot()

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.11
Nodes (19): GameserverWidget(), Server, ServerRow(), ApplyButton(), ServersPage(), Light, LIGHT_COLOR, LIGHT_LABEL (+11 more)

### Community 110 - "points.ts"
Cohesion: 0.22
Nodes (9): cornerStyle(), ElementContent(), elementPositionStyle(), OverlayClient(), panelWidthFor(), pickTickerMatch(), usePanelRotator(), useStackedElements() (+1 more)

### Community 111 - "FfaView.tsx"
Cohesion: 0.27
Nodes (8): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), communityCardPoolSize(), countPacksPurchasedToday(), PackKind, startOfTodayUTC()

### Community 112 - "EventPokalWinners.tsx"
Cohesion: 0.42
Nodes (7): GET(), PATCH(), patchSchema, getSeasonConfig(), KEYS, setEloHardResetAt(), setSeason1StartAt()

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.09
Nodes (24): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+16 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "duel-deck.ts"
Cohesion: 0.33
Nodes (7): DELETE(), PATCH(), POST(), DELETE(), GET(), PATCH(), requireModeratorOrSquadCaptain()

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.28
Nodes (5): CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS, ErrorNotice()

### Community 117 - "getActiveMembership"
Cohesion: 0.09
Nodes (30): CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, ThumbVote(), voteUrl() (+22 more)

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
Cohesion: 0.21
Nodes (15): GET(), POST(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), generateBrandedCoverDataUri() (+7 more)

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.14
Nodes (15): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+7 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.15
Nodes (8): AdminTacticCardsPage(), TacticCardRow, TacticCardsAdmin(), AdminNotificationsPage(), DiscordEmoji, fetchGuildEmojis(), AdminUsersPage(), SyncMembersButton()

### Community 124 - "SeriesAdminRow.tsx"
Cohesion: 0.24
Nodes (4): SteamGameResult, PollOptionGameInputProps, GameSuggestion, PollGameSuggestInputProps

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.10
Nodes (23): ActivityFeed(), cleanReason(), Filter, Tx, txType(), AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES (+15 more)

### Community 126 - "ServerCard.tsx"
Cohesion: 0.39
Nodes (7): isEventHidden(), computeSidePotPayouts(), resolveEventPredictions(), rollbackResolvedPredictions(), snapshotStreak(), StreakSnapshot, todayStr()

### Community 127 - "include"
Cohesion: 0.40
Nodes (5): ELEMENT_KEYS, parseLayout(), ProfileOverlayPage(), ProfileElementKey, ProfileLayoutPositions

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "applyForJob"
Cohesion: 0.16
Nodes (19): skin, base, bodyMaterial, label, parts, regions, skin, bear (+11 more)

### Community 130 - "updateQuestProgress"
Cohesion: 0.43
Nodes (5): LineupCard, LineupEditor(), applySynergies(), computeSynergies(), SynergyBonus

### Community 131 - "SeriesCompleteClient.tsx"
Cohesion: 0.18
Nodes (13): POST(), POST(), GET(), POST(), checkAndAwardBadges(), loadStats(), findNewlyEarnedBadges(), collectYearlyNominations() (+5 more)

### Community 132 - "giant"
Cohesion: 0.33
Nodes (6): giant, base, bodyMaterial, label, parts, regions

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "requireModeratorOrSquadCaptain"
Cohesion: 0.16
Nodes (15): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), AdminEventBracketPage(), revokePointsByReason() (+7 more)

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 137 - "DailyMessagePanel.tsx"
Cohesion: 0.22
Nodes (17): GET(), isAuthorized(), softResetRating(), addMonthsUTC(), getCurrentSeasonNumber(), getSeasonWindow(), grantDueSeasonRewards(), grantPlacementReward() (+9 more)

### Community 138 - "series/[id]/complete/page.tsx"
Cohesion: 0.12
Nodes (18): COIN_SOURCES, PointsInfoModal(), RANK_LADDER, openSection(), ProfileCompletion(), Props, Avatar(), EventTippsList() (+10 more)

### Community 139 - "starter-pick.ts"
Cohesion: 0.47
Nodes (4): POST(), ALL_CATEGORIES, ALL_GENRES, recomputeWanderpocalHolders()

### Community 140 - "DailySpin.tsx"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.11
Nodes (23): BattleChallengeWidget(), ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge(), ChallengeUserPicker(), uname() (+15 more)

### Community 142 - "UserPickerSheet.tsx"
Cohesion: 0.60
Nodes (4): PickerGrid(), uname(), User, UserPickerSheet()

### Community 143 - "process-rank-art.ts"
Cohesion: 0.31
Nodes (8): BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RANKS, RAW_DIR, ringSvg()

### Community 144 - "run-season.ts"
Cohesion: 0.24
Nodes (11): isAuthorized(), isOverridden(), POST(), toJson(), ACTIVITY_TIER_RANK, getSkillTemplate(), ACTIVITY_TIER_LABEL, CLASS_BASE_STATS (+3 more)

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.36
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 146 - "notifications.ts"
Cohesion: 0.14
Nodes (22): GET(), isAuthorized(), POST(), POST(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite() (+14 more)

### Community 147 - "DailyMessagePanel.tsx"
Cohesion: 0.07
Nodes (48): GET(), POST(), POST(), POST(), DELETE(), PATCH(), GET(), POST() (+40 more)

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "BadgesAdminClient.tsx"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 152 - "BadgeIcon.tsx"
Cohesion: 0.40
Nodes (4): DiscordLoginButton(), Props, GuestLockOverlay(), Props

### Community 153 - "LiveStreamsBanner.tsx"
Cohesion: 0.25
Nodes (4): CommunityStream, KIND_STYLE, PartnerStream, UnifiedStream

### Community 154 - "PwaInstallButton.tsx"
Cohesion: 0.32
Nodes (5): BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 156 - "[tacticCardId]/route.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 157 - "GameCover.tsx"
Cohesion: 0.09
Nodes (25): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, BattleLauncher(), Mode, RankRow(), BattleRankBadge() (+17 more)

### Community 158 - "SeasonConfigPanel.tsx"
Cohesion: 0.16
Nodes (19): GET(), GET(), isAuthorized(), calcStreak(), GET(), formatDate(), SeasonConfigPanel(), toDateInputValue() (+11 more)

### Community 160 - "InterviewClient.tsx"
Cohesion: 0.67
Nodes (3): Interview, InterviewClient(), name()

### Community 161 - "lineup/route.ts"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 163 - "HeroStatValue.tsx"
Cohesion: 0.67
Nodes (3): MobileTopBar(), ROUTE_TITLES, useTheme()

### Community 165 - "MyPredictionsList.tsx"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 166 - "FloatingLobbyChat.tsx"
Cohesion: 0.44
Nodes (11): alwaysOn, alwaysOn, alwaysOn, alwaysOn, alwaysOn, alwaysOn, alwaysOn, alwaysOn (+3 more)

### Community 167 - "generate-brand-assets.ts"
Cohesion: 0.40
Nodes (3): OUT_DIR, PNG_SIZES, SOURCE

### Community 168 - "widget/events/route.ts"
Cohesion: 0.29
Nodes (11): categories, categories, Bottom, Eyewear, FacialHair, Gloves, Hair, Headwear (+3 more)

### Community 169 - "seed-standard-cards/route.ts"
Cohesion: 0.70
Nodes (4): GET(), isAuthorized(), POST(), toJson()

### Community 170 - "synergy.ts"
Cohesion: 0.16
Nodes (15): main(), DISCORD_REASONS, GET(), isAuthorized(), CATEGORY_ACCENT, CATEGORY_ICONS, createNotification(), CATEGORY_LABELS (+7 more)

### Community 172 - "Kapitel-Hintergründe — Kampagne"
Cohesion: 0.50
Nodes (3): Benötigte Dateien, Format, Kapitel-Hintergründe — Kampagne

### Community 173 - "roadmap/page.tsx"
Cohesion: 0.38
Nodes (8): GET(), PATCH(), GET(), POST(), rollPrize(), todayStr(), getShopConfig(), updateShopConfig()

### Community 174 - "setIdeaInterest"
Cohesion: 0.05
Nodes (39): Anomalies, AnomaliesClient(), Person, PayoutsClient(), Preview, Run, Week, AdminApplication (+31 more)

### Community 179 - "preferences/route.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 180 - "ideas/stats/route.ts"
Cohesion: 0.22
Nodes (4): api(), Coach, CoachRatingSection(), RateableSession

### Community 189 - "@auth/prisma-adapter"
Cohesion: 0.29
Nodes (7): tall, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 191 - "canvas-confetti"
Cohesion: 0.29
Nodes (7): curvy, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 192 - "lucide-react"
Cohesion: 0.29
Nodes (7): strong, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 193 - "next-auth"
Cohesion: 0.43
Nodes (6): Breakdown, fmt(), ScoreBreakdownBlock(), signed(), StreamResult, Week

### Community 195 - "react"
Cohesion: 0.33
Nodes (6): guardian, base, bodyMaterial, label, parts, regions

## Knowledge Gaps
- **1148 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1143 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `getSessionUser` to `roles.ts`, `fotograf-service.ts`, `requireModeratorOrSquadCaptain`, `coach-service.ts`, `time.ts`, `series-event-points.ts`, `duels-live.ts`, `RankedAvatar.tsx`, `ranks.ts`, `DailyMessagePanel.tsx`, `ProfileMobileView.tsx`, `notify-dispatch.ts`, `gems-tournament.ts`, `community-job-service.ts`, `gameservers.ts`, `packs.ts`, `MobaIcon`, `community-job-config.ts`, `job-recommendations.ts`, `synergy.ts`, `amp.ts`, `CoinIcon.tsx`, `community-board-comment-service.ts`, `dashboard/page.tsx`, `hasMinRole`, `events/series/[id]/page.tsx`, `visionaer-service.ts`, `SeriesIcon.tsx`, `tutorial.ts`, `ClipVotingClient.tsx`, `CoachTools.tsx`, `useConfirm`, `admin/community-jobs/disputes/route.ts`, `photo-request-service.ts`, `FfaView.tsx`, `GamePlayersModal.tsx`, `duel-deck.ts`, `getActiveMembership`, `upload/route.ts`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `CoinIcon.tsx` to `roles.ts`, `live-battle.ts`, `series/[id]/complete/page.tsx`, `CommunityJobsPanel.tsx`, `RankedAvatar.tsx`, `ranks.ts`, `CommunityJobsAdminPanel.tsx`, `ProfileMobileView.tsx`, `SeasonConfigPanel.tsx`, `community-job-service.ts`, `InterviewClient.tsx`, `packs.ts`, `MobaIcon`, `JobBadge.tsx`, `setIdeaInterest`, `FotografTools.tsx`, `amp.ts`, `BattleLogEntry`, `SeriesDetailClient.tsx`, `dashboard/page.tsx`, `next-auth`, `GameNameInput.tsx`, `visionaer-service.ts`, `SeriesIcon.tsx`, `tutorial.ts`, `ProfileOverlayClient.tsx`, `AdminEventsClient.tsx`, `ConfirmDialog.tsx`, `EventAdminRow.tsx`, `CommunityBoardClient.tsx`, `EventSetupWizard.tsx`, `(dashboard)/battle-cards/page.tsx`, `GamePlayersModal.tsx`, `getActiveMembership`, `duels/[id]/respond/route.ts`, `CommunityBoardWidget.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `SeriesCompleteClient.tsx`, `starter-pick.ts`, `DailySpin.tsx`, `getSessionUser`, `ranks.ts`, `requireModeratorOrSquadCaptain`, `new-season/page.tsx`, `gems-tournament.ts`, `[tacticCardId]/route.ts`, `shop-config.ts`, `clip-contest.ts`, `community-job-config.ts`, `roadmap/page.tsx`, `discord-rest.ts`, `dispatchNotification`, `preferences/route.ts`, `revert-event-completion.ts`, `awardProfileCompletionIfNeeded`, `admin/events/[id]/complete/route.ts`, `SeriesIcon.tsx`, `community-job-payout/route.ts`, `send/route.ts`, `EventSetupWizard.tsx`, `(dashboard)/battle-cards/page.tsx`, `minigames-config.ts`, `card-provisioning.ts`, `EventPokalWinners.tsx`, `duel-deck.ts`, `branded-cover.ts`, `AdminDonationsClient.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1148 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.031932773109243695 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0841813135985199 - nodes in this community are weakly interconnected._
- **Should `live-battle.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06018018018018018 - nodes in this community are weakly interconnected._