# Graph Report - OMA-Companion  (2026-09-24)

## Corpus Check
- 970 files · ~3,144,592 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4998 nodes · 13826 edges · 195 communities (176 shown, 19 thin omitted)
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
- middleware.ts
- new-season/page.tsx
- BadgeIcon.tsx
- Monster-Artwork — Edelstein-Kampf
- [tacticCardId]/route.ts
- GameCover.tsx
- SeasonConfigPanel.tsx
- battle-cards-challenge-cleanup/route.ts
- HeroStatValue.tsx
- postprocessing
- FloatingLobbyChat.tsx
- generate-brand-assets.ts
- widget/events/route.ts
- PointsChart.tsx
- Kapitel-Hintergründe — Kampagne
- UserRoleManager.tsx
- lobby-cleanup/route.ts
- chroma-key.js
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
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts
- `main()` --calls--> `getCommunityJob()`  [EXTRACTED]
  scripts/fix-community-job-payouts.ts → src/lib/community-jobs.ts

## Import Cycles
- None detected.

## Communities (195 total, 19 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (77): POST(), POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET() (+69 more)

### Community 1 - "prisma.ts"
Cohesion: 0.05
Nodes (39): RULES, metadata, russoOne, spaceGrotesk, viewport, AnimatedBackground(), Cell, PULSE_COLORS (+31 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.13
Nodes (24): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), CardDetailSelection, CardUpgradeBadge() (+16 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.06
Nodes (49): GET(), Params, POST(), GET(), GET(), POST(), DELETE(), displayNameOf() (+41 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.07
Nodes (43): GET(), GET(), GET(), isAuthorized(), calcStreak(), GET(), calcEntryAvg(), Entry (+35 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.12
Nodes (38): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog(), beginTrapCheck() (+30 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.19
Nodes (15): DELETE(), POST(), DELETE(), POST(), DELETE(), POST(), handleCommunityJobReaction(), notifyVoteMilestone() (+7 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.09
Nodes (40): actionSchema, DUEL_STANCES, POST(), GET(), POST(), VALID_DIFFICULTIES, LiveBattlePage(), metadata (+32 more)

### Community 8 - "interactive.ts"
Cohesion: 0.10
Nodes (58): LiveBattleSnapshot, generateBoard(), hasAnyValidMove(), pickEnemyForColumn(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage() (+50 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.04
Nodes (68): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+60 more)

### Community 10 - "time.ts"
Cohesion: 0.07
Nodes (48): GET(), POST(), POST(), POST(), DELETE(), PATCH(), GET(), POST() (+40 more)

### Community 11 - "getSessionUser"
Cohesion: 0.05
Nodes (38): GET(), GET(), POST(), GET(), GET(), GET(), GET(), GET() (+30 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (56): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+48 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.04
Nodes (75): average(), GET(), GET(), POST(), POST(), POST(), GET(), DELETE() (+67 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.12
Nodes (15): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, StatBadges() (+7 more)

### Community 16 - "ranks.ts"
Cohesion: 0.09
Nodes (37): loadProfileOverlayState(), CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), generateMetadata(), COIN_SOURCES, PointsInfoModal(), RANK_LADDER (+29 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.25
Nodes (76): morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets (+68 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.05
Nodes (34): ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction, DuelAttackType (+26 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.14
Nodes (19): api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox(), CoachMentees(), CoachNewcomers(), CoachSpecialties() (+11 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.05
Nodes (31): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+23 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.12
Nodes (26): BracketView(), Match, Participant, roundLabel(), uname(), User, Props, WanderpocalBadge() (+18 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.07
Nodes (28): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+20 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.09
Nodes (34): Membership, Squad, SquadDetailClient(), User, Squad, IdeaPageClient(), Avatar(), EVENT_STATUS_LABEL (+26 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.17
Nodes (25): describeLogEntry(), getArenaBackgroundStyle(), LiveBattleBody(), LiveBattleView(), beep(), getContext(), noiseBurst(), playCardRevealSound() (+17 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.08
Nodes (42): parseBoardSwaps(), POST(), VALID_ACTIONS, BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON (+34 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.10
Nodes (39): GET(), GET(), GET(), isAuthorized(), buildCampaignEnemyTeam(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked() (+31 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.08
Nodes (29): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, CommunityBoardWidget() (+21 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.04
Nodes (81): APPLY, main(), PATCH(), GET(), POST(), POST(), GET(), GET() (+73 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.10
Nodes (24): GET(), PATCH(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage(), PACK_KIND_INFO (+16 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.07
Nodes (22): buildFfaRanking(), buildMatchRanking(), displayName(), ELEMENT_SIZE, ElementSlot, formatEntryStats(), IdentityFlipTile(), LayoutEntry (+14 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.11
Nodes (25): POST(), POST(), GET(), PATCH(), POST(), GET(), GET(), GET() (+17 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.07
Nodes (28): ActivityFeed(), cleanReason(), Filter, Tx, txType(), AdminPage(), formatCountdown(), NOT_ACTIVE_STATUSES (+20 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.22
Nodes (13): POST(), GET(), GET(), POST(), InterviewPage(), answerInterview(), createInterview(), declineInterview() (+5 more)

### Community 36 - "packs.ts"
Cohesion: 0.05
Nodes (56): AlbumPage(), PublicProfilePage(), ProfilePage(), formatBirthday(), ProfileEditor(), Props, Badge, ProfileJobBadge() (+48 more)

### Community 37 - "MobaIcon"
Cohesion: 0.14
Nodes (21): GET(), POST(), DELETE(), DELETE(), AUTHOR, AuthorRow, authorSearch(), contentInfo() (+13 more)

### Community 38 - "types.ts"
Cohesion: 0.07
Nodes (35): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleReplayPage(), metadata, BattleOutcome (+27 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.08
Nodes (57): POST(), POST(), POST(), parseSwaps(), POST(), GET(), POST(), POST() (+49 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.11
Nodes (29): PACK_LABEL, POST(), VALID_KINDS, ShopPage(), CHEST_TABLE, ChestPrize, grantGemsPvpVictoryChest(), rollChestPrize() (+21 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.07
Nodes (55): POST(), GET(), PUT(), requestSchema, GET(), POST(), serializeDrawResult(), GET() (+47 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.09
Nodes (43): GET(), PATCH(), PATCH(), PATCH(), GET(), PATCH(), PATCH(), GET() (+35 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.10
Nodes (37): GET(), GET(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor() (+29 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.10
Nodes (36): POST(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH(), GET(), isAuthorized(), GEMS_DIFFICULTIES, POST() (+28 more)

### Community 45 - "auth.ts"
Cohesion: 0.16
Nodes (19): BodyModel(), CharacterBuilder(), GENDER_LABEL, CharacterRig(), PartModel(), bodyOf(), carryConfigOver(), defaultConfigFor() (+11 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.08
Nodes (42): GET(), POST(), GET(), OptionInput, POST(), POST(), GET(), GET() (+34 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.21
Nodes (19): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+11 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.08
Nodes (37): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+29 more)

### Community 49 - "amp.ts"
Cohesion: 0.09
Nodes (28): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+20 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.22
Nodes (9): DevSkinTestPage(), SkinCanvas, SkinModel(), SkinCanvas, SkinPicker(), SKINS, skinAssetUrl(), SkinClips (+1 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.15
Nodes (29): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+21 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.08
Nodes (38): DELETE(), DELETE(), POST(), GET(), POST(), GET(), IdeaPage(), ReportPage() (+30 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.05
Nodes (37): FullStandingsToggle(), Props, StandingRow, StandingUser, ArchivedSeason, FORMAT_LABELS, LegacyRow, EventCard() (+29 more)

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.13
Nodes (22): CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant, readViewMode() (+14 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.09
Nodes (26): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), awardPoints(), parsePlacementPts() (+18 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.09
Nodes (26): GemsResultScreen(), GemsReward, LineupCard, LineupEditor(), AvailableAction, computeGemsReward(), EFFECT_COLOR, FloatingEffect (+18 more)

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.08
Nodes (19): Props, WinnerClip, DailyMessageBanner(), Message, coverUrl(), DailyPollBanner(), GameSuggestion, GameSuggestionCount (+11 more)

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (25): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+17 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.19
Nodes (16): ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, CLASS_BASE_STATS, isOverridden(), runSeasonUpdate(), toJson(), applyTierJumpLimit(), computePercentiles() (+8 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.15
Nodes (22): BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), LeaderboardTabs(), Tab, TABS, getCombinedElo() (+14 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.14
Nodes (14): clips, file, normal, animations, bodies, genders, female, animations (+6 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.09
Nodes (25): Avatar(), EventTippsList(), Tipp, uname(), UserLite, EventWinnerPredictionWidget(), Prediction, uname() (+17 more)

### Community 65 - "dependencies"
Cohesion: 0.04
Nodes (45): @auth/prisma-adapter, canvas-confetti, discord.js, @google/generative-ai, lucide-react, motion, next, next-auth (+37 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.20
Nodes (12): isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, CLASS_SPEED_MIDPOINT, ensureCommunityCard() (+4 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.08
Nodes (27): BattleLauncher(), Mode, RankRow(), BattleRankBadge(), CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS (+19 more)

### Community 69 - "challenge.ts"
Cohesion: 0.16
Nodes (17): POST(), POST(), requestSchema, userSelect, DELETE(), GET(), POST(), ChallengeError (+9 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.19
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.13
Nodes (17): GameserverWidget(), Server, ServerRow(), ApplyButton(), Light, LIGHT_COLOR, LIGHT_LABEL, Server (+9 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.10
Nodes (16): CardRow, CommunityCardsAdmin(), TacticCardRow, TacticCardsAdmin(), RARITIES, STEP_LABELS, UpgradeEconomyPanel(), SyncButton() (+8 more)

### Community 73 - "visionaer-service.ts"
Cohesion: 0.13
Nodes (14): main(), openSection(), ProfileCompletion(), Props, Props, MONTH_NAMES, QuestsPage(), QuestRegenerateButton() (+6 more)

### Community 74 - "formatBerlinTime"
Cohesion: 0.14
Nodes (16): SeriesOption, SyncDiscordRolesButton(), ConfirmDialog(), ConfirmDialogProps, ConfirmOptions, ConfirmState, EMPTY_STATE, useConfirm() (+8 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.07
Nodes (38): GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET(), EventLiveBadge() (+30 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.07
Nodes (26): SteamGameResult, inputStyle, Series, ServerCredentials(), STACKABLE_ELEMENTS, DEFAULT_POSITIONS, ELEMENT_OPTIONS, ElementOption (+18 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.11
Nodes (19): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+11 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.12
Nodes (19): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+11 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.15
Nodes (18): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), formatDate(), SeasonConfigPanel(), toDateInputValue() (+10 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.15
Nodes (13): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, DailyPollActionBadge(), EventsActionBadge() (+5 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.06
Nodes (36): PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS, ModerationItemDto, ModerationClient(), AuditClient() (+28 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.08
Nodes (23): ClipVotingClient(), Nomination, Props, ClipDesMonatsPage(), MONTH_NAMES, GalleryEntry, MONTH_NAMES, Nomination (+15 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.12
Nodes (16): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+8 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.14
Nodes (16): Interview, InterviewClient(), name(), api(), AreaKey, FoundUser, GameInfo, IdeaForm() (+8 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.21
Nodes (13): GET(), AdsTarget, ampCall(), AmpInstance, callWithSession(), getBaseUrl(), getInstanceDetails(), getSessionId() (+5 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.21
Nodes (12): GET(), GameCover(), GameNameInput(), highlightMatch(), escapeRegExp(), GAME_MAP, getGameCoverUrl(), getGameFallbackGradient() (+4 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.22
Nodes (11): CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS, PokalSection() (+3 more)

### Community 90 - "useConfirm"
Cohesion: 0.23
Nodes (11): gamedig, gamedig, GET(), GET(), StatusEntry, getInstances(), getInstancesRaw(), toInstanceStatus() (+3 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.04
Nodes (46): Health, DesktopProfileTabs(), Tab, AssetOption, buildEventTemplate(), cell(), EventOption, FoundUser (+38 more)

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
Cohesion: 0.31
Nodes (10): GamePlayer, GET(), FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props, FavoriteGame (+2 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.04
Nodes (66): POST(), Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration (+58 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.10
Nodes (25): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+17 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.15
Nodes (12): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+4 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.10
Nodes (21): CreateContestForm(), defaultPeriodEnd(), defaultPeriodStart(), toDateInputValue(), MonthlyContests, Props, YearlyContests, EventsTabs() (+13 more)

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
Cohesion: 0.20
Nodes (17): GET(), isAuthorized(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction() (+9 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.11
Nodes (23): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+15 more)

### Community 107 - "card-provisioning.ts"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 108 - "DailyPollPanel.tsx"
Cohesion: 0.30
Nodes (10): GET(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), getGradientBackground(), getLogoBadge() (+2 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.16
Nodes (15): POST(), POST(), POST(), PATCH(), POST(), sanitizeFavoriteGames(), CATEGORY_LABELS, DAILY_CAPS (+7 more)

### Community 110 - "points.ts"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 111 - "FfaView.tsx"
Cohesion: 0.10
Nodes (22): GET(), GET(), GET(), PATCH(), DELETE(), PATCH(), POST(), DELETE() (+14 more)

### Community 112 - "EventPokalWinners.tsx"
Cohesion: 0.16
Nodes (24): GET(), PATCH(), patchSchema, GET(), isAuthorized(), softResetRating(), addMonthsUTC(), getCurrentSeasonNumber() (+16 more)

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
Cohesion: 0.06
Nodes (34): DonationsPage(), fmt(), MONTH_NAMES, streakBadge(), EventCardLink(), CATEGORY_STRIP, EVENT_STATUS, DashboardLayout() (+26 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.15
Nodes (17): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+9 more)

### Community 118 - "AdminNav.tsx"
Cohesion: 0.36
Nodes (7): Breakdown, fmt(), ScoreBreakdownBlock(), signed(), StreamResult, Week, Scale

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.26
Nodes (12): buildScratchGrid(), CANDIDATE_PRIZES, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR, prizeSymbolId() (+4 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "branded-cover.ts"
Cohesion: 0.07
Nodes (32): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+24 more)

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.20
Nodes (5): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.09
Nodes (31): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+23 more)

### Community 124 - "SeriesAdminRow.tsx"
Cohesion: 0.12
Nodes (12): AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection(), MemberRow() (+4 more)

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.39
Nodes (6): POST(), buildSeasonInputs(), countBy(), runFullSeasonUpdate(), RunSeasonResult, markPreSeasonRan()

### Community 126 - "ServerCard.tsx"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 127 - "include"
Cohesion: 0.53
Nodes (4): GET(), displayName(), EventFacts, getEventFacts()

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "applyForJob"
Cohesion: 0.06
Nodes (24): Badge, CATEGORIES, CATEGORY_LABELS, User, LinkedUser, Partner, PartnerManager(), TwitchPreview (+16 more)

### Community 130 - "updateQuestProgress"
Cohesion: 0.22
Nodes (9): cornerStyle(), ElementContent(), elementPositionStyle(), OverlayClient(), panelWidthFor(), pickTickerMatch(), usePanelRotator(), useStackedElements() (+1 more)

### Community 131 - "SeriesCompleteClient.tsx"
Cohesion: 0.39
Nodes (6): POST(), requestSchema, grantStarterPick(), REQUIRED_CLASSES, StarterPickError, startOrResetTutorial()

### Community 132 - "giant"
Cohesion: 0.10
Nodes (20): base, bodyMaterial, label, parts, regions, bear, giant, guardian (+12 more)

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

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
Cohesion: 0.33
Nodes (5): centeredRect(), Handle, ImageCropTool(), PRESETS, Rect

### Community 138 - "series/[id]/complete/page.tsx"
Cohesion: 0.48
Nodes (6): revokePointsByReason(), applyMatchResult(), ApplyMatchResultInput, finalFinalistReason(), finalWinReason(), loserOf()

### Community 140 - "DailySpin.tsx"
Cohesion: 0.33
Nodes (6): tank, base, bodyMaterial, label, parts, regions

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.11
Nodes (21): BattleChallengeWidget(), ChallengeItem, ChallengesList(), ChallengeUser, displayName(), PlayerBadge(), ChallengeUserPicker(), uname() (+13 more)

### Community 142 - "UserPickerSheet.tsx"
Cohesion: 0.21
Nodes (10): POST(), POST(), checkAndAwardBadges(), loadStats(), BADGE_DEFS, BadgeStats, findNewlyEarnedBadges(), getBadgeDef() (+2 more)

### Community 143 - "process-rank-art.ts"
Cohesion: 0.31
Nodes (8): BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RANKS, RAW_DIR, ringSvg()

### Community 144 - "[userId]/page.tsx"
Cohesion: 0.40
Nodes (5): ELEMENT_KEYS, parseLayout(), ProfileOverlayPage(), ProfileElementKey, ProfileLayoutPositions

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.28
Nodes (13): skin, skin, skin, skin, skin, skin, block, row (+5 more)

### Community 146 - "notifications.ts"
Cohesion: 0.05
Nodes (72): GET(), POST(), GET(), DELETE(), PATCH(), GET(), POST(), GET() (+64 more)

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 152 - "BadgeIcon.tsx"
Cohesion: 0.06
Nodes (42): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+34 more)

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 156 - "[tacticCardId]/route.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 157 - "GameCover.tsx"
Cohesion: 0.03
Nodes (11): DEFAULTS, RULES, RuleSeed, GET(), isAuthorized(), GameSuggestion, GameSuggestion, isAuthorized() (+3 more)

### Community 158 - "SeasonConfigPanel.tsx"
Cohesion: 0.27
Nodes (10): GET(), isAuthorized(), GET(), POST(), generateMonthlyQuests(), MONTH_NAMES, notifyNewQuests(), pick() (+2 more)

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

### Community 191 - "canvas-confetti"
Cohesion: 0.29
Nodes (7): curvy, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 192 - "lucide-react"
Cohesion: 0.29
Nodes (7): strong, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 199 - "seed-standard-cards/route.ts"
Cohesion: 0.70
Nodes (4): GET(), isAuthorized(), POST(), toJson()

## Knowledge Gaps
- **1155 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1150 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `getSessionUser` to `roles.ts`, `app/layout.tsx`, `coach-service.ts`, `time.ts`, `duels-live.ts`, `ranks.ts`, `notifications.ts`, `BadgeIcon.tsx`, `notify-dispatch.ts`, `community-job-service.ts`, `SeasonConfigPanel.tsx`, `gameservers.ts`, `packs.ts`, `MobaIcon`, `resolveAvatarsForCards`, `community-job-config.ts`, `job-recommendations.ts`, `JobBadge.tsx`, `discord-rest.ts`, `DailyPollBanner.tsx`, `CoinIcon.tsx`, `BattleLogEntry`, `visionaer-service.ts`, `SeriesIcon.tsx`, `ClipVotingClient.tsx`, `admin/community-jobs/disputes/route.ts`, `useServerLiveStatus.ts`, `points.ts`, `FfaView.tsx`, `report/[id]/page.tsx`, `getActiveMembership`, `upload/route.ts`, `include`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `packs.ts` to `roles.ts`, `fotograf-service.ts`, `coach-service.ts`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `CommunityJobsAdminPanel.tsx`, `MobaIcon.tsx`, `ProfileMobileView.tsx`, `BadgeIcon.tsx`, `notify-dispatch.ts`, `community-job-service.ts`, `coach-guide-service.ts`, `community-job-config.ts`, `FotografTools.tsx`, `amp.ts`, `DailyPollBanner.tsx`, `CoinIcon.tsx`, `community-board-comment-service.ts`, `dashboard/page.tsx`, `formatBerlinTime`, `SeriesIcon.tsx`, `tutorial.ts`, `ProfileOverlayClient.tsx`, `ConfirmDialog.tsx`, `bot/index.ts`, `CommunityBoardClient.tsx`, `EventSetupWizard.tsx`, `(dashboard)/battle-cards/page.tsx`, `report/[id]/page.tsx`, `AdminNav.tsx`, `SeriesAdminRow.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `getSessionUser`, `series-event-points.ts`, `new-season/page.tsx`, `[tacticCardId]/route.ts`, `shop-config.ts`, `clip-contest.ts`, `community-job-config.ts`, `JobBadge.tsx`, `discord-rest.ts`, `amp.ts`, `revert-event-completion.ts`, `hasMinRole`, `community-job-payout/route.ts`, `CoachTools.tsx`, `MarkdownLite.tsx`, `useConfirm`, `JournalistTools.tsx`, `EventSetupWizard.tsx`, `photo-request-service.ts`, `FfaView.tsx`, `EventPokalWinners.tsx`, `AdminDonationsClient.tsx`, `CommunityBoardWidget.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1155 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.029712272460364064 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05202661826981246 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12903225806451613 - nodes in this community are weakly interconnected._