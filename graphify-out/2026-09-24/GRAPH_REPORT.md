# Graph Report - OMA-Companion  (2026-09-24)

## Corpus Check
- 967 files · ~3,130,144 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4994 nodes · 13880 edges · 216 communities (179 shown, 37 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1aabac7f`
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
- branded-cover.ts
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
- TextsClient.tsx
- duels/[id]/respond/route.ts
- AdminDonationsClient.tsx
- ActivityFeed.tsx
- CommunityBoardWidget.tsx
- ServerCard.tsx
- promotion-request-service.ts
- process-badge-art.ts
- athlete
- DashboardChrome.tsx
- series/[id]/complete/route.ts
- giant
- overlay/[id]/page.tsx
- seed-notification-rules.ts
- Product
- GuildHub – Discord Companion
- preferences/route.ts
- birthdays/route.ts
- widget/events/route.ts
- grant-tactic-cards-to-all/route.ts
- StarterPickFlow.tsx
- small
- tank
- requireModeratorOrSquadCaptain
- notifications.ts
- middleware.ts
- discord-roles.ts
- new-season/page.tsx
- Monster-Artwork — Edelstein-Kampf
- [tacticCardId]/route.ts
- GameCover.tsx
- SeasonConfigPanel.tsx
- notifications/page.tsx
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
- lucide-react
- @vercel/blob
- StudioEditor.tsx
- seed-standard-cards/route.ts
- compare/[id]/page.tsx
- postcss.config.mjs
- DailyPollPanel.tsx
- tailwind.config.ts
- vercel.json
- { GET, POST }
- size
- MIN_MATCHES_FOR_RANKING
- SeriesStandingsTable.tsx
- battle-cards-tactic-seed-data.ts
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
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json
- `DailySpin()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/shop/DailySpin.tsx → package.json
- `main()` --calls--> `parseFavoriteGames()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/favorite-games.ts
- `main()` --calls--> `createNotification()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/notifications.ts
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts

## Import Cycles
- None detected.

## Communities (216 total, 37 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (67): POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET(), GET() (+59 more)

### Community 1 - "prisma.ts"
Cohesion: 0.15
Nodes (16): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), MessageCircleMore, ShieldCheck (+8 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.10
Nodes (29): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), CardClassFilter, FILTERS (+21 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.03
Nodes (28): DEFAULTS, GameSuggestion, GET(), POST(), displayNameOf(), POST(), UserLite, userSummary() (+20 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.10
Nodes (26): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+18 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.14
Nodes (35): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog(), beginTrapCheck() (+27 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.06
Nodes (39): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+31 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.08
Nodes (47): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+39 more)

### Community 8 - "interactive.ts"
Cohesion: 0.10
Nodes (56): LiveBattleSnapshot, hasAnyValidMove(), pickEnemyForColumn(), applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate, DecisionTargetKind (+48 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.06
Nodes (57): POST(), PATCH(), GET(), POST(), GET(), POST(), GET(), POST() (+49 more)

### Community 10 - "time.ts"
Cohesion: 0.05
Nodes (45): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+37 more)

### Community 11 - "getSessionUser"
Cohesion: 0.09
Nodes (31): GET(), POST(), GET(), DELETE(), PATCH(), GET(), POST(), GET() (+23 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (59): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+51 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.05
Nodes (71): GET(), GET(), POST(), POST(), POST(), GET(), DELETE(), PATCH() (+63 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.10
Nodes (22): SteamGameResult, GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props (+14 more)

### Community 16 - "ranks.ts"
Cohesion: 0.06
Nodes (48): DesktopProfileTabs(), Tab, PublicProfilePage(), ProfilePage(), COIN_SOURCES, PointsInfoModal(), openSection(), ProfileCompletion() (+40 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.25
Nodes (76): morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets (+68 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (38): VfxEvent, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction (+30 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.06
Nodes (39): GET(), GET(), POST(), GET(), DELETE(), PATCH(), GET(), GET() (+31 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.13
Nodes (25): BracketView(), Match, Participant, roundLabel(), uname(), User, Props, WanderpocalBadge() (+17 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.06
Nodes (29): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardTile(), CardUpgradeAnimationState, CardUpgradeOverlay() (+21 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.08
Nodes (37): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+29 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.20
Nodes (22): LiveBattleView(), beep(), getContext(), noiseBurst(), playCardRevealSound(), playCommunityBonusSound(), playCritSound(), playDamageSound() (+14 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.05
Nodes (53): POST(), CATEGORIES, EventSetupWizard(), FORMATS, inputStyle, PlacementReward, PLATFORMS, PollConfig (+45 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.10
Nodes (35): GET(), GET(), GET(), isAuthorized(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked(), CampaignLevelDef (+27 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.12
Nodes (16): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, centeredRect() (+8 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.05
Nodes (63): APPLY, main(), GET(), POST(), GET(), POST(), GET(), GET() (+55 more)

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
Cohesion: 0.06
Nodes (34): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+26 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.20
Nodes (14): POST(), GET(), GET(), POST(), InterviewPage(), answerInterview(), createInterview(), declineInterview() (+6 more)

### Community 36 - "packs.ts"
Cohesion: 0.11
Nodes (29): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), CHEST_TABLE, ChestPrize, grantGemsPvpVictoryChest(), rollChestPrize() (+21 more)

### Community 37 - "MobaIcon"
Cohesion: 0.14
Nodes (22): GET(), POST(), DELETE(), DELETE(), AuditActor, AUTHOR, AuthorRow, authorSearch() (+14 more)

### Community 38 - "types.ts"
Cohesion: 0.24
Nodes (12): GET(), IdeaPage(), ReportPage(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData, toIdeaFeedEntry(), getSeriesParts() (+4 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.07
Nodes (71): POST(), POST(), POST(), POST(), parseSwaps(), POST(), GET(), POST() (+63 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.20
Nodes (15): POST(), requestSchema, grantGuaranteedPack(), grantStarterPick(), REQUIRED_CLASSES, StarterPickError, findOwnCommunityCardId(), getTutorialProgress() (+7 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.06
Nodes (48): GET(), PUT(), requestSchema, POST(), serializeDrawResult(), GET(), DuelDeckPage(), metadata (+40 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.06
Nodes (69): GET(), PATCH(), PATCH(), GET(), GET(), PATCH(), PATCH(), GET() (+61 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.10
Nodes (36): GET(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames() (+28 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.15
Nodes (19): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), GEMS_DIFFICULTIES, POST(), POST(), POST() (+11 more)

### Community 45 - "auth.ts"
Cohesion: 0.16
Nodes (19): BodyModel(), CharacterBuilder(), GENDER_LABEL, CharacterRig(), PartModel(), bodyOf(), carryConfigOver(), defaultConfigFor() (+11 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.13
Nodes (27): POST(), OptionInput, POST(), POST(), GET(), GET(), authHeader(), DiscordEmbed (+19 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.18
Nodes (22): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), formatStart() (+14 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.08
Nodes (29): AssetList(), Thumb(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile (+21 more)

### Community 49 - "amp.ts"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.22
Nodes (9): DevSkinTestPage(), SkinCanvas, SkinModel(), SkinCanvas, SkinPicker(), SKINS, skinAssetUrl(), SkinClips (+1 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (27): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+19 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.12
Nodes (20): DELETE(), DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES (+12 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.38
Nodes (8): buildSegments(), DailySpin(), PALETTE_BY_TYPE, pt(), rimPath(), segPath(), splitLabel(), useMidnightCountdown()

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.18
Nodes (17): GET(), isAuthorized(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee(), updateEventStatus(), fmtDateDE(), resolveChannelId() (+9 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.09
Nodes (28): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), awardPoints(), parsePlacementPts() (+20 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.33
Nodes (7): DELETE(), PATCH(), POST(), DELETE(), GET(), PATCH(), requireModeratorOrSquadCaptain()

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.47
Nodes (5): DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled()

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.13
Nodes (19): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+11 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.07
Nodes (47): parseBoardSwaps(), POST(), VALID_ACTIONS, BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON (+39 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.07
Nodes (31): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, Mode, RankRow(), BattleRankBadge(), CampaignBoardLevel (+23 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.12
Nodes (16): normal, tank, bodies, genders, female, base, bodyMaterial, label (+8 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.17
Nodes (12): AdminBattleCardsPage(), formatDate(), SeasonConfigPanel(), toDateInputValue(), PLACES, SeasonRewardsPanel(), RARITIES, STEP_LABELS (+4 more)

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): discord.js, gamedig, @google/generative-ai, motion, next, dependencies, discord.js, gamedig (+15 more)

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
Cohesion: 0.20
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.07
Nodes (35): TACTIC_CARDS, TacticCardSeed, BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), BattleStatsPanel(), isStoredBattleLog() (+27 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 73 - "visionaer-service.ts"
Cohesion: 0.17
Nodes (14): Avatar(), EventTippsList(), Tipp, uname(), UserLite, EventWinnerPredictionWidget(), Prediction, uname() (+6 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.05
Nodes (42): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, MonthlyContests, Props, YearlyContests (+34 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.07
Nodes (45): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+37 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.22
Nodes (9): PATCH(), patchSchema, characterConfigSchema, PATCH(), requestSchema, CardCharacterSelection, CardContentError, CardContentPatch (+1 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.14
Nodes (15): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+7 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.10
Nodes (24): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+16 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.23
Nodes (11): GET(), PATCH(), patchSchema, placementSchema, DEFAULT_SEASON_REWARD_CONFIG, getSeasonRewardConfig(), isValidConfig(), isValidPlacement() (+3 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.19
Nodes (13): CustomBadgeDisplay, Props, checkAndAwardBadges(), loadStats(), Badge, BADGE_CATEGORY_LABELS, BADGE_DEFS, BadgeDef (+5 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.05
Nodes (43): Anomalies, AnomaliesClient(), Person, PayoutsClient(), Preview, Run, Week, api() (+35 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.18
Nodes (13): main(), CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), TrendingDown, CATEGORY_LABELS, DAILY_CAPS, POINT_RULES (+5 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.33
Nodes (6): LogOut, Moon, Sun, MobileTopBar(), ROUTE_TITLES, useTheme()

### Community 84 - "bot/index.ts"
Cohesion: 0.15
Nodes (13): api(), AreaKey, FoundUser, GameInfo, IdeaForm(), IdeaPrefill, MediaAsset, Similar (+5 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), StatusEntry, AdsTarget, ampCall(), AmpInstance, callWithSession() (+15 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.12
Nodes (18): clips, file, base, bodyMaterial, label, parts, regions, bear (+10 more)

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.06
Nodes (38): GET(), loadProfileOverlayState(), GameserverWidget(), Server, ServerRow(), Light, LIGHT_COLOR, LIGHT_LABEL (+30 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.16
Nodes (16): MONTH_NAMES, YearReviewPage(), CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, Dices, MessageSquare (+8 more)

### Community 90 - "useConfirm"
Cohesion: 0.60
Nodes (5): isAuthorized(), isOverridden(), POST(), toJson(), getSkillTemplate()

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.47
Nodes (4): POST(), ALL_CATEGORIES, ALL_GENRES, recomputeWanderpocalHolders()

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.08
Nodes (26): blocks, texture, blocks, texture, blocks, materials, texture, blocks (+18 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.12
Nodes (17): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, NewEventPage(), AdminLayout() (+9 more)

### Community 95 - "apply-season-results.ts"
Cohesion: 0.03
Nodes (58): RULES, AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES, AdminUsersPage(), SyncMembersButton(), EventLiveBadge(), Props (+50 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.13
Nodes (9): DisputeKind, DisputeVotesModal(), VoteEntry, Flag, Maximize2, Props, Modal(), ModalProps (+1 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.07
Nodes (28): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+20 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.04
Nodes (58): AdminEventsPage(), CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, ThumbVote() (+50 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.19
Nodes (10): GET(), PATCH(), POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, resolveDispute() (+2 more)

### Community 102 - "recurrence.ts"
Cohesion: 0.20
Nodes (9): GET(), PATCH(), MinigamesConfigPanel(), AdminMinigamesPage(), DEFAULTS, KEYS, MinigameKey, MinigamesConfig (+1 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.20
Nodes (33): defaults, defaults, slim, tall, defaults, Bottom, Eyewear, FacialHair (+25 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.15
Nodes (21): POST(), POST(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction() (+13 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 107 - "card-provisioning.ts"
Cohesion: 0.08
Nodes (36): Interview, InterviewClient(), name(), calcEntryAvg(), Entry, FfaView(), fmtUpTo2(), Match (+28 more)

### Community 108 - "branded-cover.ts"
Cohesion: 0.30
Nodes (10): GET(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), getGradientBackground(), getLogoBadge() (+2 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

### Community 110 - "points.ts"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 111 - "FfaView.tsx"
Cohesion: 0.18
Nodes (9): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+1 more)

### Community 112 - "EventPokalWinners.tsx"
Cohesion: 0.17
Nodes (17): BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), BattleLauncher(), LeaderboardTabs(), Tab, TABS (+9 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "ThemeProvider.tsx"
Cohesion: 0.18
Nodes (21): GET(), PATCH(), patchSchema, GET(), isAuthorized(), softResetRating(), grantDueSeasonRewards(), grantPlacementReward() (+13 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.18
Nodes (12): EventCardLink(), DiscordLoginButton(), Props, GateButton(), GateLink(), GateOptions, GuestGateContext, GuestGateValue (+4 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.15
Nodes (17): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+9 more)

### Community 118 - "AdminNav.tsx"
Cohesion: 0.10
Nodes (24): GET(), GuideBody(), api(), AssetOption, buildEventTemplate(), EventOption, FoundUser, InterviewOption (+16 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.08
Nodes (30): GemsResultScreen(), GemsReward, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue(), getArenaBackgroundStyle() (+22 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "TextsClient.tsx"
Cohesion: 0.21
Nodes (5): Health, JobTexts, Info, JobIcon(), JOB_ICONS

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.36
Nodes (9): applyTierJumpLimit(), computePercentiles(), computeSeasonResults(), hashSeed(), MemberSeasonResult, resolveClass(), TIER_ORDER, TIER_PERCENTILE_CEILING (+1 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.10
Nodes (29): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+21 more)

### Community 124 - "ActivityFeed.tsx"
Cohesion: 0.29
Nodes (8): ActivityFeed(), cleanReason(), Filter, Tx, txType(), formatRelative(), RelativeTime(), RelativeTimeProps

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.20
Nodes (13): POST(), ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, CLASS_BASE_STATS, isOverridden(), runSeasonUpdate(), toJson(), buildSeasonInputs() (+5 more)

### Community 126 - "ServerCard.tsx"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.18
Nodes (6): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap, LifeBuoy

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "athlete"
Cohesion: 0.33
Nodes (6): base, bodyMaterial, label, parts, regions, athlete

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.25
Nodes (4): BackToTop(), GuestBanner(), GuestGateProvider(), NewsItem

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.36
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 132 - "giant"
Cohesion: 0.33
Nodes (6): small, base, bodyMaterial, label, parts, regions

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
Cohesion: 0.13
Nodes (15): metadata, russoOne, spaceGrotesk, viewport, CursorGlow(), ExitAppGuard(), TRAP_STATE, SessionProvider() (+7 more)

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.12
Nodes (21): BattleChallengeWidget(), ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge(), ChallengeUserPicker(), uname() (+13 more)

### Community 142 - "small"
Cohesion: 0.11
Nodes (17): EventsTabs(), CATEGORY_STRIP, EVENT_STATUS, SyncButton(), TabItem, TabPanel(), Tabs(), TabsProps (+9 more)

### Community 144 - "tank"
Cohesion: 0.31
Nodes (9): POST(), POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted(), dispatchNotification() (+1 more)

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.28
Nodes (13): skin, skin, skin, skin, skin, skin, block, row (+5 more)

### Community 146 - "notifications.ts"
Cohesion: 0.07
Nodes (49): GET(), POST(), POST(), POST(), DELETE(), PATCH(), GET(), POST() (+41 more)

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "discord-roles.ts"
Cohesion: 0.11
Nodes (28): RankTile(), cache, flush(), inflight, isFresh(), JobBadgeProps, listeners, pending (+20 more)

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 156 - "[tacticCardId]/route.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 158 - "SeasonConfigPanel.tsx"
Cohesion: 0.10
Nodes (31): GET(), GET(), isAuthorized(), GET(), isAuthorized(), calcStreak(), GET(), GET() (+23 more)

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

### Community 202 - "compare/[id]/page.tsx"
Cohesion: 0.08
Nodes (20): AlbumPage(), CompareProfilePage(), fetchUserData(), UserData, Props, FORMAT_LABELS, STATUS_STYLES, CATEGORY_BG_TINT (+12 more)

### Community 214 - "DailyPollPanel.tsx"
Cohesion: 0.04
Nodes (61): Badge, CATEGORIES, CATEGORY_LABELS, User, DailyMessagePanel(), defaultForm(), formatDate(), FormState (+53 more)

### Community 233 - "SeriesStandingsTable.tsx"
Cohesion: 0.05
Nodes (32): CardRow, AdminTacticCardsPage(), TacticCardRow, TacticCardsAdmin(), inputStyle, Series, FullStandingsToggle(), Props (+24 more)

### Community 243 - "battle-cards-tactic-seed-data.ts"
Cohesion: 0.83
Nodes (3): isAuthorized(), POST(), toJson()

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
Nodes (51): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), DELETE(), GET() (+43 more)

### Community 274 - "HeroStatValue.tsx"
Cohesion: 0.36
Nodes (5): CountUp(), HeroStatValue(), ShoppingBag, useValueDelta(), ValueDeltaBadge()

### Community 277 - "[id]/settings/page.tsx"
Cohesion: 0.12
Nodes (16): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+8 more)

## Knowledge Gaps
- **1143 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1138 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `MobaIcon.tsx` to `roles.ts`, `coach-service.ts`, `getSessionUser`, `duels-live.ts`, `[contribId]/route.ts`, `small`, `ranks.ts`, `notifications.ts`, `HeroStatValue.tsx`, `notify-dispatch.ts`, `community-job-service.ts`, `SeasonConfigPanel.tsx`, `gameservers.ts`, `packs.ts`, `MobaIcon`, `types.ts`, `community-job-config.ts`, `job-recommendations.ts`, `JobBadge.tsx`, `discord-rest.ts`, `DailyPollBanner.tsx`, `BattleLogEntry`, `EventEditClient.tsx`, `formatBerlinTime`, `compare/[id]/page.tsx`, `SeriesIcon.tsx`, `ClipVotingClient.tsx`, `EventAdminRow.tsx`, `JournalistTools.tsx`, `(dashboard)/battle-cards/page.tsx`, `adapters.ts`, `admin/community-jobs/disputes/route.ts`, `SeriesStandingsTable.tsx`, `useServerLiveStatus.ts`, `points.ts`, `getActiveMembership`, `AdminNav.tsx`, `upload/route.ts`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `series/[id]/complete/route.ts`, `series-event-points.ts`, `tank`, `MobaIcon.tsx`, `new-season/page.tsx`, `board-match3.ts`, `[tacticCardId]/route.ts`, `shop-config.ts`, `clip-contest.ts`, `community-job-config.ts`, `JobBadge.tsx`, `discord-rest.ts`, `EventEditClient.tsx`, `revert-event-completion.ts`, `dashboard/page.tsx`, `events/series/[id]/page.tsx`, `SeriesIcon.tsx`, `[id]/settings/SettingsClient.tsx`, `community-job-payout/route.ts`, `CoachTools.tsx`, `DailyPollPanel.tsx`, `CommunityBoardClient.tsx`, `apply-season-results.ts`, `recurrence.ts`, `SeriesStandingsTable.tsx`, `photo-request-service.ts`, `ThemeProvider.tsx`, `sync-discord-roles/route.ts`, `CommunityBoardWidget.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `card-provisioning.ts` to `roles.ts`, `app/layout.tsx`, `time.ts`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `small`, `ranks.ts`, `CommunityJobsAdminPanel.tsx`, `ProfileMobileView.tsx`, `notify-dispatch.ts`, `board-match3.ts`, `SeasonConfigPanel.tsx`, `community-job-service.ts`, `community-job-config.ts`, `FotografTools.tsx`, `formatBerlinTime`, `compare/[id]/page.tsx`, `SeriesIcon.tsx`, `tutorial.ts`, `ProfileOverlayClient.tsx`, `ConfirmDialog.tsx`, `DailyPollPanel.tsx`, `send/route.ts`, `NotificationRulesPanel.tsx`, `(dashboard)/battle-cards/page.tsx`, `adapters.ts`, `FfaView.tsx`, `EventPokalWinners.tsx`, `AdminNav.tsx`, `ActivityFeed.tsx`, `ScoreBreakdownBlock.tsx`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1143 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03325705568268497 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14624505928853754 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._