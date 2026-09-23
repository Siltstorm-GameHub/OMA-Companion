# Graph Report - OMA-Companion  (2026-09-23)

## Corpus Check
- 962 files · ~3,094,641 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4838 nodes · 12541 edges · 230 communities (197 shown, 33 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8ce7c05f`
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
- tutorial.ts
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
- MyPredictionsList.tsx
- react
- @react-three/drei
- react
- @react-three/postprocessing
- sonner
- @vercel/blob
- @types/three
- web-push
- postcss.config.mjs
- tailwind.config.ts
- vercel.json
- { GET, POST }
- size
- MIN_MATCHES_FOR_RANKING
- zod
- tank

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
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json
- `StandardCardSeed` --references--> `ActiveSkillData`  [EXTRACTED]
  prisma/battle-cards-seed-data.ts → src/lib/battle-engine/types.ts

## Import Cycles
- None detected.

## Communities (230 total, 33 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (59): POST(), POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET() (+51 more)

### Community 1 - "prisma.ts"
Cohesion: 0.06
Nodes (49): GET(), Params, POST(), GET(), GET(), POST(), DELETE(), displayNameOf() (+41 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.10
Nodes (29): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), RARITIES, STEP_LABELS (+21 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.14
Nodes (22): BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), BattleLauncher(), LeaderboardTabs(), Tab, TABS (+14 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.08
Nodes (36): GET(), POST(), GET(), DELETE(), PATCH(), DELETE(), POST(), GET() (+28 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.10
Nodes (39): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+31 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.07
Nodes (20): RULES, metadata, russoOne, spaceGrotesk, viewport, FEATURES, AnimatedBackground(), Cell (+12 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.05
Nodes (34): EventCardLink(), CATEGORY_STRIP, EVENT_STATUS, SyncButton(), BackToTop(), NAV, DiscordLoginButton(), Props (+26 more)

### Community 8 - "interactive.ts"
Cohesion: 0.10
Nodes (54): LiveBattleSnapshot, pickEnemyForColumn(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate, DecisionTargetKind (+46 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.05
Nodes (69): POST(), DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), PATCH() (+61 more)

### Community 10 - "time.ts"
Cohesion: 0.05
Nodes (69): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), DELETE(), GET() (+61 more)

### Community 11 - "getSessionUser"
Cohesion: 0.05
Nodes (36): GET(), GET(), POST(), GET(), GET(), DELETE(), PATCH(), DELETE() (+28 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.12
Nodes (17): GemsResultScreen(), GemsReward, AvailableAction, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue() (+9 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (54): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+46 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.16
Nodes (16): GET(), isAuthorized(), GET(), POST(), MONTH_NAMES, QuestsPage(), QuestRegenerateButton(), generateMonthlyQuests() (+8 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.16
Nodes (16): AdminEventsPage(), DashboardPage(), formatCountdown(), formatFreshness(), getGlobalDashboardData, MONTH_NAMES, ROLE_LABEL, ROLE_STYLE (+8 more)

### Community 16 - "ranks.ts"
Cohesion: 0.10
Nodes (29): COIN_SOURCES, PointsInfoModal(), RANK_LADDER, MONTH_NAMES, YearReviewPage(), PIP_COUNT, RankIcon(), RankIconProps (+21 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.25
Nodes (76): morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets (+68 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (37): VfxEvent, ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction (+29 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.09
Nodes (32): AuditClient(), Entry, AdminUsersClient(), formatLastLogin(), Props, Role, UserRow, api() (+24 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.15
Nodes (11): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, TournamentData, TacticCardTileData, STEP_INFO, STEP_ORDER (+3 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.12
Nodes (26): BracketView(), Match, Participant, roundLabel(), uname(), User, Props, WanderpocalBadge() (+18 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.07
Nodes (29): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+21 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.21
Nodes (14): GET(), PATCH(), POST(), GET(), POST(), rollPrize(), todayStr(), CHEST_TABLE (+6 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.12
Nodes (38): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog(), beginTrapCheck() (+30 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.12
Nodes (28): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, LiveBattleView(), cell(), beep() (+20 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.08
Nodes (47): parseBoardSwaps(), POST(), VALID_ACTIONS, LiveSnapshot, LiveUnit, SlotRow(), LiveBattleAwaiting, LiveUnitSnapshot (+39 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.11
Nodes (34): GET(), GET(), GET(), isAuthorized(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked(), CampaignLevelDef (+26 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.07
Nodes (28): openSection(), ProfileCompletion(), Props, formatBirthday(), ProfileEditor(), Props, Badge, ProfileJobBadge() (+20 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.05
Nodes (70): APPLY, main(), PATCH(), GET(), POST(), POST(), GET(), GET() (+62 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.11
Nodes (16): AdminShopPage(), PACK_KIND_INFO, PACK_KIND_ORDER, ShopConfigPanel(), TYPE_LABEL, ACCENT_CLASSES, PACK_INFO, PACK_ORDER (+8 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (21): buildFfaRanking(), buildMatchRanking(), displayName(), ElementSlot, formatEntryStats(), IdentityFlipTile(), LayoutEntry, MatchTicker() (+13 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.11
Nodes (25): POST(), POST(), GET(), PATCH(), POST(), GET(), GET(), GET() (+17 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.17
Nodes (14): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+6 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 36 - "packs.ts"
Cohesion: 0.05
Nodes (65): GET(), GET(), POST(), POST(), GET(), DELETE(), PATCH(), PATCH() (+57 more)

### Community 37 - "MobaIcon"
Cohesion: 0.10
Nodes (20): api(), Idea, IdeasBoardClient(), IdeaList(), api(), GameCard(), GameInfo, IdeaBody() (+12 more)

### Community 38 - "types.ts"
Cohesion: 0.09
Nodes (27): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleStatsPanel(), StoredBattleLog, computeBattleStats() (+19 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.07
Nodes (69): POST(), POST(), POST(), POST(), parseSwaps(), POST(), GET(), POST() (+61 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.13
Nodes (24): PACK_LABEL, VALID_KINDS, asCardResult(), asTacticResult(), awardDrawnCard(), awardDrawnTacticCard(), COMMUNITY_CHANCE, communityCardPoolSize() (+16 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.06
Nodes (49): GET(), PUT(), requestSchema, POST(), serializeDrawResult(), GET(), DuelDeckPage(), metadata (+41 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.08
Nodes (45): GET(), PATCH(), PATCH(), PATCH(), GET(), PATCH(), PATCH(), GET() (+37 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.10
Nodes (36): GET(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames() (+28 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.10
Nodes (25): Application, ApplicationsManager(), formatDate(), STATUS_LABEL, User, Avatar(), EventTippsList(), Tipp (+17 more)

### Community 45 - "auth.ts"
Cohesion: 0.16
Nodes (19): BodyModel(), CharacterBuilder(), GENDER_LABEL, CharacterRig(), PartModel(), bodyOf(), carryConfigOver(), defaultConfigFor() (+11 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.14
Nodes (24): GET(), POST(), GET(), OptionInput, POST(), POST(), createNotificationForUsers(), isTypeEnabled() (+16 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.21
Nodes (19): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+11 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.08
Nodes (37): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+29 more)

### Community 49 - "amp.ts"
Cohesion: 0.08
Nodes (19): FullStandingsToggle(), Props, StandingRow, StandingUser, ArchivedSeason, FORMAT_LABELS, LegacyRow, SeriesEventItem (+11 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.22
Nodes (9): DevSkinTestPage(), SkinCanvas, SkinModel(), SkinCanvas, SkinPicker(), SKINS, skinAssetUrl(), SkinClips (+1 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (27): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+19 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.10
Nodes (18): Props, WinnerClip, DailyMessageBanner(), Message, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount (+10 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.09
Nodes (34): loadProfileOverlayState(), Interview, InterviewClient(), name(), PointsPage(), DesktopProfileTabs(), Tab, generateMetadata() (+26 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.11
Nodes (23): FORMATS, CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant (+15 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.04
Nodes (49): EventCard(), EventUser, Props, STATUS_CFG, StreamingPartner, CompareProfilePage(), fetchUserData(), UserData (+41 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.09
Nodes (25): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+17 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.09
Nodes (22): DEFAULT_POLL_ITEM, DEFAULT_REWARDS, needsAttention(), NOT_ACTIVE_STATUSES, parsePollConfigs(), parseRewards(), PlacementReward, PLATFORMS (+14 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (24): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), DominionCfg (+16 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.13
Nodes (22): curve(), curvePercent(), STANDARD_CARDS, StandardCardSeed, ACTIVE_POOL, DD_ACTIVE_SKILLS, DD_PASSIVE_KITS, DD_ULTIMATE_SKILLS (+14 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.11
Nodes (26): DELETE(), POST(), GET(), POST(), GET(), POST(), addComment(), AddCommentResult (+18 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.08
Nodes (28): clips, file, base, bodyMaterial, label, parts, regions, athlete (+20 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.15
Nodes (13): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+5 more)

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): @auth/prisma-adapter, canvas-confetti, @google/generative-ai, next, next-auth, dependencies, @auth/prisma-adapter, canvas-confetti (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 67 - "hasMinRole"
Cohesion: 0.13
Nodes (23): GET(), POST(), DELETE(), DELETE(), DELETE(), deleteComment(), AUTHOR, AuthorRow (+15 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.11
Nodes (25): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+17 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.19
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.15
Nodes (17): GET(), inputStyle, Series, NextEventTile(), GameCover(), coverCache, GameNameInput(), GameNameInputProps (+9 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.29
Nodes (7): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded()

### Community 73 - "visionaer-service.ts"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.19
Nodes (8): MonthlyContests, Props, YearlyContests, EventsTabs(), TabItem, TabPanel(), Tabs(), TabsProps

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.07
Nodes (44): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+36 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.13
Nodes (14): ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption, SettingsClient(), CanvasElementOption, Pos (+6 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.08
Nodes (29): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+21 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.12
Nodes (18): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+10 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.19
Nodes (14): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), DEFAULT_SEASON_REWARD_CONFIG (+6 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.18
Nodes (10): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+2 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.06
Nodes (33): Anomalies, AnomaliesClient(), Person, PayoutsClient(), Preview, Run, Week, AdminApplication (+25 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.10
Nodes (17): ClipVotingClient(), Nomination, Props, GalleryEntry, MONTH_NAMES, Nomination, MONTH_NAMES, ClipWinnerCard() (+9 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.16
Nodes (24): POST(), GEMS_DIFFICULTIES, POST(), formatStart(), GET(), POST(), POST(), generateBrandedCoverDataUri() (+16 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.21
Nodes (13): GET(), isAuthorized(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee(), updateEventStatus(), fmtDateDE(), resolveChannelId() (+5 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.29
Nodes (11): POST(), GET(), POST(), answerInterview(), createInterview(), declineInterview(), InterviewResult, listMyInterviews() (+3 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.03
Nodes (12): DEFAULTS, RULES, RuleSeed, GET(), isAuthorized(), GameSuggestion, GameSuggestion, DEFAULT_PREFS (+4 more)

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.24
Nodes (12): GET(), IdeaPage(), ReportPage(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData, toIdeaFeedEntry(), getSeriesParts() (+4 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.12
Nodes (15): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+7 more)

### Community 90 - "useConfirm"
Cohesion: 0.22
Nodes (11): CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS, PokalSection() (+3 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.20
Nodes (12): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, isStoredBattleLog(), finalizePvpChallengeSideEffects(), notifyPvpBattleResolved() (+4 more)

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
Cohesion: 0.07
Nodes (23): DonationsPage(), fmt(), MONTH_NAMES, streakBadge(), DashboardLayout(), LeaderboardPage(), MEDALS, metadata (+15 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.08
Nodes (32): POST(), CATEGORIES, EventSetupWizard(), inputStyle, PlacementReward, PLATFORMS, PollConfig, RECURRENCE_OPTS (+24 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.13
Nodes (18): GET(), api(), AssetOption, buildEventTemplate(), EventOption, FoundUser, InterviewOption, PostOption (+10 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.14
Nodes (21): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+13 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.15
Nodes (11): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+3 more)

### Community 100 - "adapters.ts"
Cohesion: 0.09
Nodes (13): Badge, CATEGORIES, CATEGORY_LABELS, User, BadgeIcon(), BadgeIconProps, EmptyState(), EmptyStateProps (+5 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.24
Nodes (7): POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, VoteKind, VoteOwnerLookup

### Community 102 - "recurrence.ts"
Cohesion: 0.10
Nodes (20): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, Thumb() (+12 more)

### Community 103 - "isVideoUrl"
Cohesion: 0.20
Nodes (12): isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, CLASS_SPEED_MIDPOINT, ensureCommunityCard() (+4 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.31
Nodes (25): defaults, defaults, slim, defaults, Bottom, Eyewear, FacialHair, Gloves (+17 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.23
Nodes (11): CustomBadgeDisplay, Props, checkAndAwardBadges(), loadStats(), Badge, BADGE_CATEGORY_LABELS, BADGE_DEFS, BadgeDef (+3 more)

### Community 107 - "card-provisioning.ts"
Cohesion: 0.19
Nodes (16): ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, CLASS_BASE_STATS, isOverridden(), runSeasonUpdate(), toJson(), applyTierJumpLimit(), computePercentiles() (+8 more)

### Community 108 - "DailyPollPanel.tsx"
Cohesion: 0.31
Nodes (10): GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props, FavoriteGame (+2 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.11
Nodes (18): GameserverWidget(), Server, ServerRow(), ApplyButton(), Light, LIGHT_COLOR, LIGHT_LABEL, Server (+10 more)

### Community 110 - "points.ts"
Cohesion: 0.22
Nodes (9): cornerStyle(), ElementContent(), elementPositionStyle(), OverlayClient(), panelWidthFor(), pickTickerMatch(), usePanelRotator(), useStackedElements() (+1 more)

### Community 111 - "FfaView.tsx"
Cohesion: 0.30
Nodes (9): GET(), POST(), PATCH(), assignCurrentRole(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole() (+1 more)

### Community 112 - "EventPokalWinners.tsx"
Cohesion: 0.16
Nodes (24): GET(), PATCH(), patchSchema, GET(), isAuthorized(), softResetRating(), addMonthsUTC(), getCurrentSeasonNumber() (+16 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.09
Nodes (25): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+17 more)

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 115 - "duel-deck.ts"
Cohesion: 0.30
Nodes (10): buildSegments(), DailySpin(), PALETTE_BY_TYPE, Props, pt(), rimPath(), segPath(), splitLabel() (+2 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.09
Nodes (22): Mode, RankRow(), BattleRankBadge(), CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS, ErrorNotice() (+14 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.26
Nodes (10): GET(), GET(), authHeader(), deleteDiscordMessage(), DiscordEmbed, DiscordGuildEmoji, DiscordTextChannel, listGuildEmojis() (+2 more)

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
Cohesion: 0.08
Nodes (26): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+18 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.31
Nodes (8): awardPoints(), parsePlacementPts(), PATCH(), BracketMatch, generateBracket(), generateRoundRobin(), POST(), shuffle()

### Community 124 - "SeriesAdminRow.tsx"
Cohesion: 0.24
Nodes (4): SteamGameResult, PollOptionGameInputProps, GameSuggestion, PollGameSuggestInputProps

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.21
Nodes (11): ActivityFeed(), cleanReason(), Filter, Tx, txType(), AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES (+3 more)

### Community 126 - "ServerCard.tsx"
Cohesion: 0.14
Nodes (13): JobTexts, api(), AreaKey, FoundUser, GameInfo, IdeaForm(), IdeaPrefill, MediaAsset (+5 more)

### Community 127 - "include"
Cohesion: 0.40
Nodes (5): ELEMENT_KEYS, parseLayout(), ProfileOverlayPage(), ProfileElementKey, ProfileLayoutPositions

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "applyForJob"
Cohesion: 0.16
Nodes (19): skin, skin, giant, skin, base, bodyMaterial, label, parts (+11 more)

### Community 130 - "updateQuestProgress"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 131 - "SeriesCompleteClient.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 132 - "giant"
Cohesion: 0.33
Nodes (6): base, bodyMaterial, label, parts, regions, bear

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "requireModeratorOrSquadCaptain"
Cohesion: 0.06
Nodes (47): GET(), GET(), GET(), PATCH(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), PATCH() (+39 more)

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 137 - "DailyMessagePanel.tsx"
Cohesion: 0.12
Nodes (25): gamedig, gamedig, GET(), GET(), GET(), StatusEntry, AdsTarget, ampCall() (+17 more)

### Community 138 - "series/[id]/complete/page.tsx"
Cohesion: 0.39
Nodes (6): POST(), buildSeasonInputs(), countBy(), runFullSeasonUpdate(), RunSeasonResult, markPreSeasonRan()

### Community 139 - "starter-pick.ts"
Cohesion: 0.16
Nodes (15): main(), DISCORD_REASONS, GET(), isAuthorized(), CATEGORY_ACCENT, CATEGORY_ICONS, createNotification(), CATEGORY_LABELS (+7 more)

### Community 140 - "DailySpin.tsx"
Cohesion: 0.25
Nodes (10): Avatar(), computeGroups(), computePlacementMap(), MEDALS, PlacementReward, Props, RewardsConfig, SeriesCompleteClient() (+2 more)

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.11
Nodes (22): average(), GET(), BattleChallengeWidget(), ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge() (+14 more)

### Community 142 - "UserPickerSheet.tsx"
Cohesion: 0.39
Nodes (6): POST(), requestSchema, grantStarterPick(), REQUIRED_CLASSES, StarterPickError, startOrResetTutorial()

### Community 143 - "process-rank-art.ts"
Cohesion: 0.31
Nodes (8): BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RANKS, RAW_DIR, ringSvg()

### Community 144 - "run-season.ts"
Cohesion: 0.32
Nodes (7): displayName(), FloatingLobbyChat(), LobbyMsg, NOTIF_ICONS, Notification, PresenceUser, timeAgo()

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.36
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 146 - "notifications.ts"
Cohesion: 0.19
Nodes (19): GET(), isAuthorized(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction() (+11 more)

### Community 147 - "DailyMessagePanel.tsx"
Cohesion: 0.09
Nodes (33): GET(), POST(), POST(), POST(), DELETE(), PATCH(), DELETE(), POST() (+25 more)

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "tutorial.ts"
Cohesion: 0.32
Nodes (5): BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 152 - "BadgeIcon.tsx"
Cohesion: 0.13
Nodes (18): CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, ThumbVote(), voteUrl() (+10 more)

### Community 153 - "LiveStreamsBanner.tsx"
Cohesion: 0.25
Nodes (4): CommunityStream, KIND_STYLE, PartnerStream, UnifiedStream

### Community 154 - "PwaInstallButton.tsx"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 156 - "[tacticCardId]/route.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 157 - "GameCover.tsx"
Cohesion: 0.33
Nodes (6): guardian, base, bodyMaterial, label, parts, regions

### Community 158 - "SeasonConfigPanel.tsx"
Cohesion: 0.16
Nodes (20): GET(), GET(), GET(), isAuthorized(), calcStreak(), GET(), formatDate(), SeasonConfigPanel() (+12 more)

### Community 159 - "requireModeratorOrAnySquadCaptain"
Cohesion: 0.60
Nodes (5): isAuthorized(), isOverridden(), POST(), toJson(), getSkillTemplate()

### Community 160 - "InterviewClient.tsx"
Cohesion: 0.47
Nodes (3): POST(), POST(), updateQuestProgress()

### Community 161 - "lineup/route.ts"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 162 - "battle-cards-challenge-cleanup/route.ts"
Cohesion: 0.53
Nodes (4): GET(), isAuthorized(), expireStaleChallenges(), ExpireStaleChallengesResult

### Community 163 - "HeroStatValue.tsx"
Cohesion: 0.70
Nodes (4): GET(), isAuthorized(), POST(), toJson()

### Community 164 - "EventCreateForm.tsx"
Cohesion: 0.16
Nodes (15): SeriesOption, ConfirmDialog(), ConfirmDialogProps, ConfirmOptions, ConfirmState, EMPTY_STATE, Modal(), PANEL_WIDTH (+7 more)

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
Cohesion: 0.60
Nodes (4): PickerGrid(), uname(), User, UserPickerSheet()

### Community 170 - "synergy.ts"
Cohesion: 0.48
Nodes (6): revokePointsByReason(), applyMatchResult(), ApplyMatchResultInput, finalFinalistReason(), finalWinReason(), loserOf()

### Community 172 - "Kapitel-Hintergründe — Kampagne"
Cohesion: 0.50
Nodes (3): Benötigte Dateien, Format, Kapitel-Hintergründe — Kampagne

### Community 173 - "roadmap/page.tsx"
Cohesion: 0.67
Nodes (3): AdminNotificationsPage(), DiscordEmoji, fetchGuildEmojis()

### Community 180 - "ideas/stats/route.ts"
Cohesion: 0.22
Nodes (4): api(), Coach, CoachRatingSection(), RateableSession

### Community 185 - "lobby-cleanup/route.ts"
Cohesion: 0.40
Nodes (3): AdminTacticCardsPage(), TacticCardRow, TacticCardsAdmin()

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
Cohesion: 0.25
Nodes (8): tall, alwaysOn, base, bodyMaterial, defaults, label, parts, regions

### Community 233 - "tank"
Cohesion: 0.33
Nodes (6): tank, base, bodyMaterial, label, parts, regions

## Knowledge Gaps
- **1142 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1137 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `getSessionUser` to `roles.ts`, `fotograf-service.ts`, `requireModeratorOrSquadCaptain`, `GuestGate.tsx`, `coach-service.ts`, `time.ts`, `starter-pick.ts`, `duels-live.ts`, `RankedAvatar.tsx`, `ranks.ts`, `DailyMessagePanel.tsx`, `community-job-service.ts`, `gameservers.ts`, `packs.ts`, `community-job-config.ts`, `job-recommendations.ts`, `amp.ts`, `CoinIcon.tsx`, `BattleLogEntry`, `community-board-comment-service.ts`, `hasMinRole`, `events/series/[id]/page.tsx`, `SeriesIcon.tsx`, `(dashboard)/events/page.tsx`, `CoachTools.tsx`, `send/route.ts`, `apply-season-results.ts`, `NotificationRulesPanel.tsx`, `admin/community-jobs/disputes/route.ts`, `getActiveMembership`, `upload/route.ts`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `CoinIcon.tsx` to `roles.ts`, `live-battle.ts`, `requireModeratorOrSquadCaptain`, `GuestGate.tsx`, `getSessionUser`, `CommunityJobsPanel.tsx`, `RankedAvatar.tsx`, `CommunityJobsAdminPanel.tsx`, `requireModeratorOrEventSquadCaptain`, `SeasonConfigPanel.tsx`, `community-job-service.ts`, `packs.ts`, `MobaIcon`, `EventCreateForm.tsx`, `community-job-config.ts`, `JobBadge.tsx`, `FotografTools.tsx`, `BattleLogEntry`, `SeriesDetailClient.tsx`, `next-auth`, `GameNameInput.tsx`, `SeriesIcon.tsx`, `tutorial.ts`, `ProfileOverlayClient.tsx`, `AdminEventsClient.tsx`, `ConfirmDialog.tsx`, `EventAdminRow.tsx`, `apply-season-results.ts`, `EventSetupWizard.tsx`, `NotificationRulesPanel.tsx`, `(dashboard)/battle-cards/page.tsx`, `GamePlayersModal.tsx`, `duels/[id]/respond/route.ts`, `CommunityBoardWidget.tsx`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `SeriesCompleteClient.tsx`, `updateQuestProgress`, `requireModeratorOrSquadCaptain`, `DailyMessagePanel.tsx`, `series/[id]/complete/page.tsx`, `getSessionUser`, `requireModeratorOrSquadCaptain`, `ProfileMobileView.tsx`, `new-season/page.tsx`, `PwaInstallButton.tsx`, `[tacticCardId]/route.ts`, `shop-config.ts`, `clip-contest.ts`, `community-job-config.ts`, `roadmap/page.tsx`, `discord-rest.ts`, `setIdeaInterest`, `lobby-cleanup/route.ts`, `revert-event-completion.ts`, `awardProfileCompletionIfNeeded`, `admin/events/[id]/complete/route.ts`, `SeriesIcon.tsx`, `community-job-payout/route.ts`, `(dashboard)/events/page.tsx`, `MarkdownLite.tsx`, `JournalistTools.tsx`, `EventSetupWizard.tsx`, `(dashboard)/battle-cards/page.tsx`, `minigames-config.ts`, `FfaView.tsx`, `EventPokalWinners.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1142 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03026841804683038 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05541346973572037 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09986504723346828 - nodes in this community are weakly interconnected._