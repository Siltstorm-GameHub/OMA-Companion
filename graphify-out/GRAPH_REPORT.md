# Graph Report - OMA-Companion  (2026-09-24)

## Corpus Check
- 970 files · ~3,144,822 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5020 nodes · 13878 edges · 190 communities (169 shown, 21 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `00723b22`
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
- process-badge-art.ts
- applyForJob
- giant
- overlay/[id]/page.tsx
- requireModeratorOrSquadCaptain
- Product
- GuildHub – Discord Companion
- DailyMessagePanel.tsx
- series/[id]/complete/page.tsx
- widget/events/route.ts
- StarterPickFlow.tsx
- process-rank-art.ts
- requireModeratorOrSquadCaptain
- notifications.ts
- seed-notification-rules.ts
- middleware.ts
- discord-roles.ts
- new-season/page.tsx
- BadgeIcon.tsx
- getWeekBounds
- Monster-Artwork — Edelstein-Kampf
- [tacticCardId]/route.ts
- GameCover.tsx
- SeasonConfigPanel.tsx
- PwaInstallButton.tsx
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
- canvas-confetti
- lucide-react
- @vercel/blob
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
- `main()` --calls--> `awardProfileCompletionIfNeeded()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/profile-completion-award.ts
- `main()` --calls--> `getCommunityJob()`  [EXTRACTED]
  scripts/fix-community-job-payouts.ts → src/lib/community-jobs.ts
- `queryGameServer()` --references--> `gamedig`  [EXTRACTED]
  src/lib/gamedig-query.ts → package.json

## Import Cycles
- None detected.

## Communities (190 total, 21 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (61): POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET(), DELETE() (+53 more)

### Community 1 - "prisma.ts"
Cohesion: 0.18
Nodes (16): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), MessageCircleMore, ShieldCheck (+8 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.14
Nodes (21): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), CardUpgradeBadge(), DuplicateProgress() (+13 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.09
Nodes (30): GET(), POST(), DELETE(), displayNameOf(), PATCH(), UserLite, userSummary(), displayNameOf() (+22 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.03
Nodes (66): ActivityFeed(), cleanReason(), Filter, Tx, txType(), EventUser, Props, SeriesEventItem (+58 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.09
Nodes (47): LiveUnit, LiveDuelSnapshot, allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects() (+39 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.22
Nodes (14): DELETE(), POST(), DELETE(), POST(), DELETE(), POST(), handleCommunityJobReaction(), onCommunityJobVoteCast() (+6 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.05
Nodes (93): actionSchema, DUEL_STANCES, POST(), GET(), POST(), average(), GET(), POST() (+85 more)

### Community 8 - "interactive.ts"
Cohesion: 0.08
Nodes (64): CardUpgradeOverlay(), NextLevelPreview(), teamPower(), unitPower(), hasAnyValidMove(), pickEnemyForColumn(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption() (+56 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.06
Nodes (58): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+50 more)

### Community 10 - "time.ts"
Cohesion: 0.12
Nodes (23): FORMATS, CreationForm(), Event, fmtDate(), Match, MatchEntry, nowForDatetimeLocal(), Participant (+15 more)

### Community 11 - "getSessionUser"
Cohesion: 0.05
Nodes (50): GET(), GET(), GET(), GET(), GET(), POST(), GET(), GET() (+42 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (56): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+48 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.08
Nodes (36): GET(), POST(), DELETE(), PATCH(), POST(), GET(), POST(), GET() (+28 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.25
Nodes (5): DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, StatBadges(), TacticCardTileData

### Community 16 - "ranks.ts"
Cohesion: 0.04
Nodes (74): GamePlayer, GET(), AlbumPage(), IdeaRow(), Item, Props, DesktopProfileTabs(), Tab (+66 more)

### Community 17 - "duel-live-battle.ts"
Cohesion: 0.25
Nodes (76): morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets, morphTargets (+68 more)

### Community 18 - "DuelLiveView.tsx"
Cohesion: 0.06
Nodes (33): ATTACK_LABEL, CardRevealEffect, CLASS_ULTIMATE_DESCRIPTION, DEATH_FX, DeathBurst, describeLogEntry(), DuelAction, DuelAttackType (+25 more)

### Community 19 - "CommunityJobsAdminPanel.tsx"
Cohesion: 0.09
Nodes (26): Anomalies, AnomaliesClient(), Person, api(), CoachAttendance(), CoachAvailability(), CoachGuideList(), CoachHelpInbox() (+18 more)

### Community 20 - "MobaIcon.tsx"
Cohesion: 0.15
Nodes (21): GET(), isAuthorized(), formatStart(), GET(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee(), updateEventStatus() (+13 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.16
Nodes (20): Props, WanderpocalBadge(), Props, WanderpocalBadgeServer(), ordinalSuffix(), Props, WanderpocalSection(), getWanderpocalHoldersMap() (+12 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.04
Nodes (64): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView() (+56 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.05
Nodes (52): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+44 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.16
Nodes (26): computeGemsReward(), describeLogEntry(), getArenaBackgroundStyle(), LiveBattleBody(), LiveBattleView(), beep(), getContext(), noiseBurst() (+18 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.19
Nodes (13): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+5 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.08
Nodes (44): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, AvailableAction, LiveSnapshot, SlotRow() (+36 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.11
Nodes (34): GET(), GET(), GET(), isAuthorized(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked(), CampaignLevelDef (+26 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.14
Nodes (16): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, Thumb() (+8 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.04
Nodes (84): APPLY, main(), PATCH(), POST(), POST(), GET(), POST(), GET() (+76 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.07
Nodes (39): GET(), PATCH(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage(), PACK_KIND_INFO (+31 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.06
Nodes (31): buildFfaRanking(), buildMatchRanking(), cornerStyle(), displayName(), ELEMENT_SIZE, ElementContent(), elementPositionStyle(), ElementSlot (+23 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.12
Nodes (24): POST(), POST(), GET(), PATCH(), POST(), GET(), GET(), GET() (+16 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.22
Nodes (11): CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), CATEGORY_LABELS, DAILY_CAPS, POINT_RULES, PointCategory, PointRule (+3 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.22
Nodes (13): POST(), GET(), GET(), POST(), InterviewPage(), answerInterview(), createInterview(), declineInterview() (+5 more)

### Community 36 - "packs.ts"
Cohesion: 0.26
Nodes (9): PATCH(), patchSchema, characterConfigSchema, PATCH(), requestSchema, CardCharacterSelection, CardContentError, CardContentPatch (+1 more)

### Community 37 - "MobaIcon"
Cohesion: 0.14
Nodes (22): GET(), POST(), DELETE(), DELETE(), AuditActor, AUTHOR, AuthorRow, authorSearch() (+14 more)

### Community 38 - "types.ts"
Cohesion: 0.07
Nodes (39): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), BattleReplayPage(), metadata, BattleOutcome (+31 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.12
Nodes (23): POST(), POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps(), POST() (+15 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.05
Nodes (65): POST(), serializeDrawResult(), PACK_LABEL, POST(), VALID_KINDS, BattleCardsPage(), metadata, userSelect (+57 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.08
Nodes (34): GET(), POST(), requestSchema, DuelDeckPage(), metadata, LineupPage(), metadata, metadata (+26 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.07
Nodes (59): GET(), PATCH(), PATCH(), GET(), PATCH(), PATCH(), GET(), PATCH() (+51 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.11
Nodes (35): berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames(), getDismissedItemKeys() (+27 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.18
Nodes (18): POST(), GEMS_DIFFICULTIES, POST(), POST(), POST(), generateBrandedCoverDataUri(), DISCORD_COLORS, hexToInt() (+10 more)

### Community 45 - "auth.ts"
Cohesion: 0.16
Nodes (19): BodyModel(), CharacterBuilder(), GENDER_LABEL, CharacterRig(), PartModel(), bodyOf(), carryConfigOver(), defaultConfigFor() (+11 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.12
Nodes (27): main(), GET(), POST(), GET(), OptionInput, POST(), POST(), DISCORD_REASONS (+19 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.21
Nodes (19): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), STATUS_TEXT (+11 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.07
Nodes (38): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+30 more)

### Community 49 - "amp.ts"
Cohesion: 0.06
Nodes (39): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+31 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.22
Nodes (9): DevSkinTestPage(), SkinCanvas, SkinModel(), SkinCanvas, SkinPicker(), SKINS, skinAssetUrl(), SkinClips (+1 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (28): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+20 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.08
Nodes (35): DELETE(), DELETE(), POST(), GET(), POST(), GET(), IdeaPage(), ReportPage() (+27 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.29
Nodes (8): GET(), GET(), authHeader(), DiscordEmbed, DiscordGuildEmoji, DiscordTextChannel, listGuildEmojis(), listGuildTextChannels()

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.05
Nodes (74): GET(), POST(), GET(), DELETE(), PATCH(), GET(), GET(), POST() (+66 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.14
Nodes (17): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), awardPoints(), parsePlacementPts() (+9 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.29
Nodes (7): CountdownBadge(), EndsCountdown(), Poll, PollAnswer, Props, PollCountdown(), usePollCountdown()

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.31
Nodes (4): DashboardLayout(), PartnerFooter(), Partner, isLinkPreviewBot()

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (25): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+17 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.22
Nodes (12): BattleLauncher(), Mode, RankRow(), BattleRankBadge(), MatchmakingWidget(), NpcBattleLauncher(), NpcPuzzleBattleLauncher(), BATTLE_RANKS (+4 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.12
Nodes (16): normal, small, bodies, genders, female, base, bodyMaterial, label (+8 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.32
Nodes (3): JobTexts, JobIcon(), JOB_ICONS

### Community 65 - "dependencies"
Cohesion: 0.04
Nodes (47): @auth/prisma-adapter, canvas-confetti, discord.js, @google/generative-ai, lucide-react, motion, next, next-auth (+39 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.14
Nodes (18): isAuthorized(), isOverridden(), POST(), toJson(), isAuthorized(), POST(), isAuthorized(), POST() (+10 more)

### Community 67 - "hasMinRole"
Cohesion: 0.14
Nodes (20): GET(), PATCH(), POST(), POST(), POST(), userSelect, MinigamesConfigPanel(), AdminMinigamesPage() (+12 more)

### Community 68 - "admin/events/[id]/complete/route.ts"
Cohesion: 0.25
Nodes (8): VfxEvent, LiveDuelHandCard, LiveDuelUnit, UltimateBurst, FloatingEffect, GemBeam, LiveDuelHandCard, UnitClass

### Community 69 - "challenge.ts"
Cohesion: 0.11
Nodes (24): POST(), POST(), requestSchema, userSelect, GET(), PUT(), requestSchema, DELETE() (+16 more)

### Community 70 - "ReportEditor.tsx"
Cohesion: 0.19
Nodes (16): EmojiPanel(), Props, UNICODE_GROUPS, Block, EmojiImg(), EmojiText(), INLINE, MarkdownLite() (+8 more)

### Community 71 - "GameNameInput.tsx"
Cohesion: 0.11
Nodes (18): GameserverWidget(), Server, ServerRow(), ApplyButton(), Light, LIGHT_COLOR, LIGHT_LABEL, Server (+10 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 73 - "visionaer-service.ts"
Cohesion: 0.38
Nodes (6): BracketView(), Match, Participant, roundLabel(), uname(), User

### Community 74 - "formatBerlinTime"
Cohesion: 0.04
Nodes (64): Contest, ContestManager(), MONTH_NAMES, Nomination, UserSearchResult, Contest, Nomination, YearlyContestManager() (+56 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.07
Nodes (43): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+35 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.29
Nodes (5): formatBirthday(), ProfileEditor(), Props, Cake, ImageUploadFieldProps

### Community 77 - "tutorial.ts"
Cohesion: 0.11
Nodes (19): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+11 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.10
Nodes (24): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+16 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.14
Nodes (17): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), PLACES, SeasonRewardsPanel(), RARITIES (+9 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.33
Nodes (6): guardian, base, bodyMaterial, label, parts, regions

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.05
Nodes (44): PayoutsClient(), Preview, Run, Week, AdminApplication, AdminDispute, AdminMember, api() (+36 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.12
Nodes (23): GET(), GET(), isAuthorized(), GET(), isAuthorized(), calcStreak(), GET(), formatDate() (+15 more)

### Community 84 - "bot/index.ts"
Cohesion: 0.13
Nodes (19): GET(), api(), AreaKey, FoundUser, GameInfo, IdeaForm(), IdeaPrefill, MediaAsset (+11 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.20
Nodes (14): GET(), AdsTarget, ampCall(), AmpInstance, callWithSession(), getBaseUrl(), getInstanceDetails(), getInstanceSummaries() (+6 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.47
Nodes (6): POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished(), notifyYearlyContestStarted()

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.14
Nodes (18): GET(), loadProfileOverlayState(), NextEventTile(), CoverBrandBadge(), EventCoverDefault(), dynamicCache, GameCover(), GameCoverProps (+10 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.22
Nodes (11): CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS, PokalSection() (+3 more)

### Community 90 - "useConfirm"
Cohesion: 0.23
Nodes (11): gamedig, gamedig, GET(), GET(), StatusEntry, getInstances(), getInstancesRaw(), toInstanceStatus() (+3 more)

### Community 91 - "CommunityBoardClient.tsx"
Cohesion: 0.03
Nodes (79): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, Badge, CATEGORIES (+71 more)

### Community 92 - "manifest.json"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, display_override, icons, id (+9 more)

### Community 93 - "community-job-discord-votes.ts"
Cohesion: 0.08
Nodes (26): blocks, texture, blocks, texture, blocks, materials, texture, blocks (+18 more)

### Community 94 - "JournalistTools.tsx"
Cohesion: 0.10
Nodes (20): api(), Idea, IdeasBoardClient(), IdeaList(), api(), GameCard(), GameInfo, IdeaBody() (+12 more)

### Community 96 - "EventSetupWizard.tsx"
Cohesion: 0.03
Nodes (65): SteamGameResult, Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration (+57 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.04
Nodes (63): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+55 more)

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.10
Nodes (24): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+16 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.10
Nodes (15): MonthlyContests, Props, YearlyContests, EventsTabs(), TabItem, TabPanel(), Tabs(), TabsProps (+7 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.24
Nodes (7): POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, VoteKind, VoteOwnerLookup

### Community 102 - "recurrence.ts"
Cohesion: 0.33
Nodes (6): base, bodyMaterial, label, parts, regions, athlete

### Community 104 - "studio-templates.ts"
Cohesion: 0.21
Nodes (32): defaults, defaults, slim, tank, defaults, Bottom, Eyewear, FacialHair (+24 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.16
Nodes (20): POST(), POST(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction() (+12 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 107 - "card-provisioning.ts"
Cohesion: 0.36
Nodes (8): checkAndAwardBadges(), loadStats(), BADGE_CATEGORY_LABELS, BADGE_DEFS, BadgeDef, BadgeStats, findNewlyEarnedBadges(), getBadgeDef()

### Community 108 - "DailyPollPanel.tsx"
Cohesion: 0.30
Nodes (10): GET(), backgroundGradientSvg(), coverCache, fetchCoverFitBuffer(), frameOverlaySvg(), generateBrandedCoverBuffer(), getGradientBackground(), getLogoBadge() (+2 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.23
Nodes (9): POST(), POST(), POST(), PATCH(), POST(), GET(), sanitizeFavoriteGames(), awardProfileCompletionIfNeeded() (+1 more)

### Community 110 - "points.ts"
Cohesion: 0.13
Nodes (23): POST(), DELETE(), GET(), POST(), GET(), POST(), notifyVoteMilestone(), notifyVoteMilestone() (+15 more)

### Community 111 - "FfaView.tsx"
Cohesion: 0.18
Nodes (17): DELETE(), PATCH(), POST(), POST(), EventSetupWizard(), SeriesAdminRow(), buildBerlinDate(), calcNextDate() (+9 more)

### Community 112 - "EventPokalWinners.tsx"
Cohesion: 0.18
Nodes (21): GET(), PATCH(), patchSchema, GET(), isAuthorized(), softResetRating(), grantDueSeasonRewards(), grantPlacementReward() (+13 more)

### Community 113 - "GamePlayersModal.tsx"
Cohesion: 0.53
Nodes (4): POST(), requestSchema, LineupError, setLineup()

### Community 114 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, bot:dev, bot:start, build, dev, lint (+4 more)

### Community 116 - "report/[id]/page.tsx"
Cohesion: 0.10
Nodes (20): EventCardLink(), BackToTop(), GateButton(), GateLink(), GateOptions, GuestBanner(), GuestGateContext, GuestGateProvider() (+12 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.16
Nodes (16): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+8 more)

### Community 118 - "AdminNav.tsx"
Cohesion: 0.10
Nodes (21): GET(), api(), AssetOption, buildEventTemplate(), EventOption, FoundUser, InterviewOption, PostOption (+13 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 121 - "branded-cover.ts"
Cohesion: 0.10
Nodes (26): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+18 more)

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.18
Nodes (6): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap, LifeBuoy

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.09
Nodes (31): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+23 more)

### Community 124 - "SeriesAdminRow.tsx"
Cohesion: 0.36
Nodes (7): Breakdown, fmt(), ScoreBreakdownBlock(), signed(), StreamResult, Week, Scale

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.14
Nodes (21): POST(), ACTIVITY_TIER_RANK, ACTIVITY_TIER_LABEL, isOverridden(), runSeasonUpdate(), toJson(), buildSeasonInputs(), countBy() (+13 more)

### Community 126 - "ServerCard.tsx"
Cohesion: 0.17
Nodes (18): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+10 more)

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 129 - "applyForJob"
Cohesion: 0.33
Nodes (5): DiscordLoginButton(), Props, GuestLockOverlay(), Props, Lock

### Community 132 - "giant"
Cohesion: 0.12
Nodes (18): clips, file, base, bodyMaterial, label, parts, regions, bear (+10 more)

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.20
Nodes (10): ElementKey, formatStatLabel(), LayoutPositions, SeriesTablePanel(), CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS (+2 more)

### Community 134 - "requireModeratorOrSquadCaptain"
Cohesion: 0.29
Nodes (7): tall, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 135 - "Product"
Cohesion: 0.20
Nodes (9): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 136 - "GuildHub – Discord Companion"
Cohesion: 0.20
Nodes (9): 1. Discord App erstellen, 2. Umgebungsvariablen setzen, 3. Datenbank aufsetzen, 4. Entwicklungsserver starten, GuildHub – Discord Companion, Nächste Schritte, Projektstruktur, Schnellstart (+1 more)

### Community 137 - "DailyMessagePanel.tsx"
Cohesion: 0.29
Nodes (6): centeredRect(), Handle, ImageCropTool(), PRESETS, Rect, Crop

### Community 138 - "series/[id]/complete/page.tsx"
Cohesion: 0.48
Nodes (6): revokePointsByReason(), applyMatchResult(), ApplyMatchResultInput, finalFinalistReason(), finalWinReason(), loserOf()

### Community 139 - "widget/events/route.ts"
Cohesion: 0.07
Nodes (22): RULES, metadata, russoOne, spaceGrotesk, viewport, AnimatedBackground(), Cell, PULSE_COLORS (+14 more)

### Community 141 - "StarterPickFlow.tsx"
Cohesion: 0.05
Nodes (51): Avatar(), EventTippsList(), Tipp, uname(), UserLite, EventWinnerPredictionWidget(), Prediction, uname() (+43 more)

### Community 143 - "process-rank-art.ts"
Cohesion: 0.31
Nodes (8): BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RANKS, RAW_DIR, ringSvg()

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.28
Nodes (13): skin, skin, skin, skin, skin, skin, block, row (+5 more)

### Community 146 - "notifications.ts"
Cohesion: 0.07
Nodes (47): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), GET(), DELETE() (+39 more)

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "discord-roles.ts"
Cohesion: 0.11
Nodes (30): GET(), POST(), PATCH(), PIP_COUNT, RankIcon(), RankIconProps, SIZE_PX, getTierCount() (+22 more)

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

### Community 152 - "BadgeIcon.tsx"
Cohesion: 0.04
Nodes (60): CommunityBoardWidget(), entryImage(), entryLabel(), FeedEntry, KIND_ACCENT, KIND_ICON, ThumbVote(), voteUrl() (+52 more)

### Community 154 - "getWeekBounds"
Cohesion: 0.47
Nodes (8): GET(), displayName(), getCronRuns(), getJobHealth(), getPayoutOverview(), getVoteAnomalies(), previewPayout(), VoteEvent

### Community 155 - "Monster-Artwork — Edelstein-Kampf"
Cohesion: 0.29
Nodes (6): Benötigte Dateien, Bezugsquellen, Format, Kampagnen-Gegner (`src/lib/battle-cards/campaign-monsters.ts`) — Gaming-Kultur-Humor, Monster-Artwork — Edelstein-Kampf, Schnellkampf-Gegner (`src/lib/battle-cards/puzzle-monsters.ts`) — haushaltsthemiert, humorvoll

### Community 156 - "[tacticCardId]/route.ts"
Cohesion: 0.43
Nodes (5): PATCH(), patchSchema, TacticCardContentError, TacticCardContentPatch, updateTacticCardContent()

### Community 157 - "GameCover.tsx"
Cohesion: 0.02
Nodes (18): DEFAULTS, RULES, RuleSeed, GET(), isAuthorized(), GameSuggestion, GameSuggestion, isAuthorized() (+10 more)

### Community 158 - "SeasonConfigPanel.tsx"
Cohesion: 0.16
Nodes (17): GET(), isAuthorized(), GET(), POST(), MONTH_NAMES, QuestsPage(), QuestRegenerateButton(), sendDiscordDM() (+9 more)

### Community 160 - "PwaInstallButton.tsx"
Cohesion: 0.24
Nodes (7): Menu, Share, BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

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

### Community 191 - "canvas-confetti"
Cohesion: 0.29
Nodes (7): curvy, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 192 - "lucide-react"
Cohesion: 0.29
Nodes (7): strong, alwaysOn, base, bodyMaterial, label, parts, regions

### Community 199 - "seed-standard-cards/route.ts"
Cohesion: 0.53
Nodes (5): STANDARD_CARDS, GET(), isAuthorized(), POST(), toJson()

## Knowledge Gaps
- **1155 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1150 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `getSessionUser` to `roles.ts`, `fotograf-service.ts`, `app/layout.tsx`, `coach-service.ts`, `duels-live.ts`, `ranks.ts`, `notifications.ts`, `BadgeIcon.tsx`, `notify-dispatch.ts`, `getWeekBounds`, `community-job-service.ts`, `SeasonConfigPanel.tsx`, `shop-config.ts`, `coach-guide-service.ts`, `gameservers.ts`, `MobaIcon`, `community-job-config.ts`, `JobBadge.tsx`, `DailyPollBanner.tsx`, `CoinIcon.tsx`, `TournamentManager.tsx`, `BattleLogEntry`, `formatBerlinTime`, `SeriesIcon.tsx`, `(dashboard)/events/page.tsx`, `bot/index.ts`, `(dashboard)/battle-cards/page.tsx`, `admin/community-jobs/disputes/route.ts`, `useServerLiveStatus.ts`, `points.ts`, `FfaView.tsx`, `getActiveMembership`, `AdminNav.tsx`, `upload/route.ts`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `ranks.ts` to `roles.ts`, `fotograf-service.ts`, `CommunityJobsPanel.tsx`, `CommunityJobsAdminPanel.tsx`, `ProfileMobileView.tsx`, `notify-dispatch.ts`, `BadgeIcon.tsx`, `community-job-service.ts`, `resolveAvatarsForCards`, `community-job-config.ts`, `FotografTools.tsx`, `amp.ts`, `formatBerlinTime`, `SeriesIcon.tsx`, `tutorial.ts`, `ProfileOverlayClient.tsx`, `ConfirmDialog.tsx`, `(dashboard)/events/page.tsx`, `send/route.ts`, `CommunityBoardClient.tsx`, `JournalistTools.tsx`, `EventSetupWizard.tsx`, `NotificationRulesPanel.tsx`, `(dashboard)/battle-cards/page.tsx`, `adapters.ts`, `AdminNav.tsx`, `SeriesAdminRow.tsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `getSessionUser`, `series-event-points.ts`, `discord-roles.ts`, `new-season/page.tsx`, `[tacticCardId]/route.ts`, `GameCover.tsx`, `shop-config.ts`, `clip-contest.ts`, `packs.ts`, `community-job-config.ts`, `JobBadge.tsx`, `discord-rest.ts`, `amp.ts`, `revert-event-completion.ts`, `hasMinRole`, `events/series/[id]/page.tsx`, `SeriesIcon.tsx`, `community-job-payout/route.ts`, `CoachTools.tsx`, `MarkdownLite.tsx`, `useConfirm`, `photo-request-service.ts`, `useServerLiveStatus.ts`, `points.ts`, `FfaView.tsx`, `EventPokalWinners.tsx`, `AdminDonationsClient.tsx`, `CommunityBoardWidget.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1155 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.029290206648697213 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14153846153846153 - nodes in this community are weakly interconnected._
- **Should `live-battle.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08527131782945736 - nodes in this community are weakly interconnected._