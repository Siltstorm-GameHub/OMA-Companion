# Graph Report - OMA-Companion  (2026-09-24)

## Corpus Check
- 966 files · ~3,129,798 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4991 nodes · 13852 edges · 214 communities (180 shown, 34 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fd054990`
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
- duels/[id]/respond/route.ts
- AdminDonationsClient.tsx
- CommunityBoardWidget.tsx
- ServerCard.tsx
- promotion-request-service.ts
- process-badge-art.ts
- DashboardChrome.tsx
- series/[id]/complete/route.ts
- giant
- overlay/[id]/page.tsx
- Product
- GuildHub – Discord Companion
- widget/events/route.ts
- StarterPickFlow.tsx
- small
- tank
- requireModeratorOrSquadCaptain
- notifications.ts
- [userId]/page.tsx
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
- NotMemberClient.tsx
- DailyPollPanel.tsx
- tailwind.config.ts
- vercel.json
- { GET, POST }
- size
- MIN_MATCHES_FOR_RANKING
- SeriesStandingsTable.tsx
- PwaInstallButton.tsx
- battle-cards-tactic-seed-data.ts
- sync-discord-roles/route.ts
- BadgeIcon.tsx
- ScoreBreakdownBlock.tsx
- normal
- [contribId]/route.ts
- HeroStatValue.tsx
- notifications/page.tsx
- [id]/settings/page.tsx
- [userId]/settings/page.tsx

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
- `main()` --calls--> `createNotification()`  [EXTRACTED]
  scripts/backfill-profile-completion-rewards.ts → src/lib/notifications.ts
- `main()` --calls--> `getCommunityJob()`  [EXTRACTED]
  scripts/fix-community-job-payouts.ts → src/lib/community-jobs.ts
- `StandardCardSeed` --references--> `ActiveSkillData`  [EXTRACTED]
  prisma/battle-cards-seed-data.ts → src/lib/battle-engine/types.ts

## Import Cycles
- None detected.

## Communities (214 total, 34 thin omitted)

### Community 0 - "roles.ts"
Cohesion: 0.03
Nodes (70): POST(), DELETE(), GET(), PATCH(), DELETE(), PUT(), GET(), POST() (+62 more)

### Community 1 - "prisma.ts"
Cohesion: 0.18
Nodes (16): BottomNav(), NAV, FloatingPill(), NAV, NavLink, useTheme(), MessageCircleMore, ShieldCheck (+8 more)

### Community 2 - "ranked-season.ts"
Cohesion: 0.13
Nodes (20): GET(), PATCH(), patchSchema, rowSchema, tableSchema, POST(), RARITIES, STEP_LABELS (+12 more)

### Community 3 - "live-battle.ts"
Cohesion: 0.05
Nodes (33): DEFAULTS, RULES, RuleSeed, isAuthorized(), POST(), GET(), POST(), displayNameOf() (+25 more)

### Community 4 - "fotograf-service.ts"
Cohesion: 0.08
Nodes (30): Avatar(), computeGroups(), computePlacementMap(), DominionChange, EventCompleteClient(), MEDALS, MultiPollConfig, PlacementReward (+22 more)

### Community 5 - "journalist-service.ts"
Cohesion: 0.11
Nodes (40): allFieldUnits(), applyAction(), applyClassUltimate(), applyRawDamageToUnit(), applyStatModifier(), applyTacticEffects(), asBattleLog(), beginTrapCheck() (+32 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.19
Nodes (15): DELETE(), POST(), DELETE(), POST(), DELETE(), POST(), handleCommunityJobReaction(), notifyVoteMilestone() (+7 more)

### Community 7 - "GuestGate.tsx"
Cohesion: 0.07
Nodes (51): actionSchema, DUEL_STANCES, POST(), GET(), average(), GET(), POST(), VALID_DIFFICULTIES (+43 more)

### Community 8 - "interactive.ts"
Cohesion: 0.08
Nodes (71): hasAnyValidMove(), LEVEL_STAT_MULTIPLIER, applyShieldAbsorption(), DamageRoll, rollDamage(), ActionEstimate, candidateTargetIds(), DecisionTargetKind (+63 more)

### Community 9 - "coach-service.ts"
Cohesion: 0.06
Nodes (56): POST(), PATCH(), GET(), POST(), DELETE(), PATCH(), GET(), POST() (+48 more)

### Community 10 - "time.ts"
Cohesion: 0.05
Nodes (48): Event, EventAdminRow(), Match, MatchEntry, parseTmtConfig(), Participant, Registration, Series (+40 more)

### Community 11 - "getSessionUser"
Cohesion: 0.09
Nodes (29): GET(), GET(), GET(), PATCH(), GET(), GET(), OPEN_EVENT_STATUS_FILTER, PATCH() (+21 more)

### Community 12 - "series-event-points.ts"
Cohesion: 0.27
Nodes (9): computeStandings(), DEFAULT_REWARDS, LegacyRow, parseRewards(), PlacementReward, resolveWinnerTargetKeys(), RewardsConfig, SeriesCompletePage() (+1 more)

### Community 13 - "CommunityJobsPanel.tsx"
Cohesion: 0.04
Nodes (43): api(), Application, ASSET_TYPE_OPTIONS, AssetUploadMode, CatalogEntry, CatalogHolder, ClipUploadField(), CoachRatingsReceived() (+35 more)

### Community 14 - "duels-live.ts"
Cohesion: 0.05
Nodes (59): GET(), POST(), POST(), POST(), GET(), DELETE(), PATCH(), PATCH() (+51 more)

### Community 15 - "RankedAvatar.tsx"
Cohesion: 0.08
Nodes (23): BattleCardsTabsInner(), isTabKey(), TabKey, TABS, DuelDeckEditor(), DuelDeckTacticCard, DuelDeckUnitCard, MobaIcon() (+15 more)

### Community 16 - "ranks.ts"
Cohesion: 0.05
Nodes (55): CustomBadgeDisplay, Props, PublicProfilePage(), ProfilePage(), formatBirthday(), ProfileEditor(), Props, Badge (+47 more)

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
Cohesion: 0.07
Nodes (28): GET(), GET(), POST(), GET(), GET(), DELETE(), POST(), GET() (+20 more)

### Community 21 - "(dashboard)/leaderboard/page.tsx"
Cohesion: 0.17
Nodes (19): Props, WanderpocalBadge(), Props, WanderpocalBadgeServer(), ordinalSuffix(), Props, WanderpocalSection(), getWanderpocalHoldersMap() (+11 more)

### Community 22 - "BattleCardView.tsx"
Cohesion: 0.08
Nodes (30): ACTIVITY_TIER_ICON, BattleCardData, BattleCardSkill, BattleCardView(), LEVEL_BORDER, CardClassFilter, FILTERS, OwnedCardEntry (+22 more)

### Community 23 - "ProfileMobileView.tsx"
Cohesion: 0.14
Nodes (14): ReportList(), api(), FoundUser, InterviewItem, InterviewsBlock(), JournalistExtras(), JournalistStatsBlock(), PhotoRequestItem (+6 more)

### Community 24 - "notify-dispatch.ts"
Cohesion: 0.04
Nodes (71): Event, EventRow(), needsAttention(), NOT_ACTIVE_STATUSES, Series, SeriesRow(), STATUS_LABELS, STATUS_STYLES (+63 more)

### Community 25 - "LiveBattleView.tsx"
Cohesion: 0.10
Nodes (39): GemsResultScreen(), GemsReward, AvailableAction, computeGemsReward(), describeLogEntry(), EFFECT_COLOR, formatModifierDuration(), formatModifierValue() (+31 more)

### Community 26 - "EventCompleteClient.tsx"
Cohesion: 0.12
Nodes (20): AddVoteForm(), AdminPoll, answerOptionsFor(), candidatePoolFor(), eligibleVoters(), LivePollsPanel(), Props, PublicPoll (+12 more)

### Community 27 - "board-match3.ts"
Cohesion: 0.04
Nodes (66): CATEGORIES, DEFAULT_REWARDS, derivePointsConfigFromSeries(), deriveStatFieldsFromSeries(), EMPTY_EVENT_STAT_CONFIG, EventEditClient(), EventStatConfigForm, normalizePoll() (+58 more)

### Community 28 - "gems-tournament.ts"
Cohesion: 0.10
Nodes (39): GET(), GET(), GET(), isAuthorized(), buildCampaignEnemyTeam(), CampaignBoardLevel, getCampaignBoard(), isCampaignLevelUnlocked() (+31 more)

### Community 29 - "requireModeratorOrEventSquadCaptain"
Cohesion: 0.14
Nodes (16): AdminContentSection(), AdminEditForm(), Author, entryImage(), FeedEntry, KIND_ICON, KIND_LABEL, Thumb() (+8 more)

### Community 30 - "community-job-service.ts"
Cohesion: 0.05
Nodes (65): APPLY, main(), PATCH(), POST(), POST(), POST(), GET(), GET() (+57 more)

### Community 31 - "shop-config.ts"
Cohesion: 0.09
Nodes (27): GET(), PATCH(), GET(), POST(), rollPrize(), todayStr(), AdminShopPage(), PACK_KIND_INFO (+19 more)

### Community 32 - "OverlayClient.tsx"
Cohesion: 0.06
Nodes (31): buildFfaRanking(), buildMatchRanking(), cornerStyle(), displayName(), ELEMENT_SIZE, ElementContent(), elementPositionStyle(), ElementSlot (+23 more)

### Community 33 - "clip-contest.ts"
Cohesion: 0.11
Nodes (27): POST(), POST(), GET(), PATCH(), POST(), GET(), POST(), GET() (+19 more)

### Community 34 - "coach-guide-service.ts"
Cohesion: 0.12
Nodes (17): BroadcastPanel(), SendResult, UserResult, CATEGORY_LABELS, CATEGORY_ORDER, DiscordEmoji, fillSample(), NotificationRuleRow (+9 more)

### Community 35 - "gameservers.ts"
Cohesion: 0.16
Nodes (17): POST(), GET(), GET(), POST(), Interview, InterviewClient(), name(), InterviewPage() (+9 more)

### Community 36 - "packs.ts"
Cohesion: 0.09
Nodes (34): POST(), serializeDrawResult(), PACK_LABEL, POST(), VALID_KINDS, ShopPage(), ShoppingBag, CHEST_TABLE (+26 more)

### Community 37 - "MobaIcon"
Cohesion: 0.14
Nodes (21): GET(), POST(), DELETE(), DELETE(), AUTHOR, AuthorRow, authorSearch(), contentInfo() (+13 more)

### Community 38 - "types.ts"
Cohesion: 0.24
Nodes (12): GET(), IdeaPage(), ReportPage(), AUTHOR, ideaFeedInclude(), IdeaWithFeedData, toIdeaFeedEntry(), getSeriesParts() (+4 more)

### Community 39 - "tournament/[id]/page.tsx"
Cohesion: 0.12
Nodes (35): POST(), parseBoardSwaps(), POST(), VALID_ACTIONS, POST(), parseSwaps(), POST(), GET() (+27 more)

### Community 40 - "resolveAvatarsForCards"
Cohesion: 0.27
Nodes (9): POST(), requestSchema, LineupPage(), metadata, grantStarterPick(), hasStarterDeck(), REQUIRED_CLASSES, StarterPickError (+1 more)

### Community 41 - "formatBerlinDate"
Cohesion: 0.07
Nodes (56): POST(), GET(), PUT(), requestSchema, POST(), GET(), POST(), requestSchema (+48 more)

### Community 42 - "community-job-config.ts"
Cohesion: 0.09
Nodes (42): GET(), PATCH(), PATCH(), PATCH(), GET(), PATCH(), PATCH(), GET() (+34 more)

### Community 43 - "job-recommendations.ts"
Cohesion: 0.10
Nodes (36): GET(), berlinDateParts(), coachRecommendationsFor(), daysBetween(), EventRecommendation, eventsWithoutReports(), fotografRecommendationsFor(), getCommunityPlayedGameNames() (+28 more)

### Community 44 - "JobBadge.tsx"
Cohesion: 0.13
Nodes (28): POST(), GET(), isAuthorized(), GEMS_DIFFICULTIES, POST(), POST(), POST(), generateBrandedCoverDataUri() (+20 more)

### Community 45 - "auth.ts"
Cohesion: 0.16
Nodes (19): BodyModel(), CharacterBuilder(), GENDER_LABEL, CharacterRig(), PartModel(), bodyOf(), carryConfigOver(), defaultConfigFor() (+11 more)

### Community 46 - "discord-rest.ts"
Cohesion: 0.11
Nodes (30): POST(), GET(), GET(), findEventByDiscordId(), notifyTournamentStarted(), syncAttendee(), updateEventStatus(), authHeader() (+22 more)

### Community 47 - "podium/[id]/route.tsx"
Cohesion: 0.20
Nodes (20): CONFETTI, confettiOverlaySvg(), GET(), PLACE_COLORS, PODIUM_HEIGHTS, PodiumEntry, staticFallback(), formatStart() (+12 more)

### Community 48 - "FotografTools.tsx"
Cohesion: 0.10
Nodes (23): AssetList(), UploadAssetForm(), AlbumOption, AlbumsBlock(), AlbumSelect(), api(), BulkFile, BulkUploadForm() (+15 more)

### Community 49 - "amp.ts"
Cohesion: 0.27
Nodes (10): applyEloResult(), applyOneSidedEloResult(), EloResult, EloUpdateInput, EloUpdateOutput, expectedScore(), kFactor(), OneSidedEloUpdateInput (+2 more)

### Community 50 - "dispatchNotification"
Cohesion: 0.22
Nodes (9): DevSkinTestPage(), SkinCanvas, SkinModel(), SkinCanvas, SkinPicker(), SKINS, skinAssetUrl(), SkinClips (+1 more)

### Community 51 - "BattleScreen.tsx"
Cohesion: 0.16
Nodes (26): BattleScreen(), delayForEntry(), DerivedState, deriveState(), describeEntry(), hpBarColor(), UnitRuntime, UnitTile() (+18 more)

### Community 52 - "DailyPollBanner.tsx"
Cohesion: 0.12
Nodes (21): DELETE(), DELETE(), POST(), GET(), POST(), addComment(), AddCommentResult, COMMENT_ENTITY_TYPES (+13 more)

### Community 53 - "CoinIcon.tsx"
Cohesion: 0.38
Nodes (8): buildSegments(), DailySpin(), PALETTE_BY_TYPE, pt(), rimPath(), segPath(), splitLabel(), useMidnightCountdown()

### Community 54 - "TournamentManager.tsx"
Cohesion: 0.44
Nodes (9): GET(), displayName(), getCronRuns(), getJobHealth(), getPayoutOverview(), getVoteAnomalies(), previewPayout(), VoteEvent (+1 more)

### Community 55 - "BattleLogEntry"
Cohesion: 0.10
Nodes (28): POST(), DELETE(), PATCH(), POST(), DELETE(), POST(), awardPoints(), parsePlacementPts() (+20 more)

### Community 56 - "EventEditClient.tsx"
Cohesion: 0.33
Nodes (7): DELETE(), PATCH(), POST(), DELETE(), GET(), PATCH(), requireModeratorOrSquadCaptain()

### Community 57 - "SeriesDetailClient.tsx"
Cohesion: 0.33
Nodes (7): DISCORD_REASONS, GET(), isAuthorized(), createNotification(), isTypeEnabled(), NotificationType, PREF_KEY

### Community 58 - "revert-event-completion.ts"
Cohesion: 0.10
Nodes (25): DELETE(), GEMS_DIFFICULTIES, PATCH(), DELETE(), DeleteEventOptions, deleteEventRecord(), deleteDiscordScheduledEvent(), deleteDiscordMessage() (+17 more)

### Community 59 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+17 more)

### Community 60 - "skill-pool.ts"
Cohesion: 0.08
Nodes (44): BoardMatch3(), hasSeenBoardLegend(), markBoardLegendSeen(), SPECIAL_ICON, TILE_ICON, LiveSnapshot, SlotRow(), cell() (+36 more)

### Community 61 - "community-board-comment-service.ts"
Cohesion: 0.10
Nodes (22): Mode, RankRow(), BattleRankBadge(), CampaignBoardLevel, LevelNode(), offsetFor(), ZIGZAG_OFFSETS, ErrorNotice() (+14 more)

### Community 62 - "EmptyState.tsx"
Cohesion: 0.08
Nodes (28): clips, file, base, bodyMaterial, label, parts, regions, athlete (+20 more)

### Community 63 - "Skeleton.tsx"
Cohesion: 0.14
Nodes (7): Skeleton(), SkeletonCard(), SkeletonHero(), SkeletonLeaderboardRow(), SkeletonList(), SkeletonStatCards(), cn()

### Community 64 - "dashboard/page.tsx"
Cohesion: 0.29
Nodes (6): centeredRect(), Handle, ImageCropTool(), PRESETS, Rect, Crop

### Community 65 - "dependencies"
Cohesion: 0.09
Nodes (23): discord.js, gamedig, @google/generative-ai, motion, next, dependencies, discord.js, gamedig (+15 more)

### Community 66 - "awardProfileCompletionIfNeeded"
Cohesion: 0.18
Nodes (13): isAuthorized(), POST(), isAuthorized(), POST(), userRecordSchema, webhookPayloadSchema, CLASS_BASE_STATS, CLASS_SPEED_MIDPOINT (+5 more)

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
Cohesion: 0.13
Nodes (21): BattleReplayPage(), metadata, BattleOutcome, BattleResultBanner(), OUTCOME_CONFIG, BattleStatsPanel(), isStoredBattleLog(), StoredBattleLog (+13 more)

### Community 72 - "events/series/[id]/page.tsx"
Cohesion: 0.38
Nodes (5): DELETE(), GET(), PATCH(), RuleUpdate, invalidateNotificationRuleCache()

### Community 73 - "visionaer-service.ts"
Cohesion: 0.33
Nodes (6): ElementKey, formatStatLabel(), SeriesTablePanel(), buildDefaultLayoutParam(), DEFAULT_POSITIONS, ELIMINATION_FORMATS

### Community 74 - "formatBerlinTime"
Cohesion: 0.08
Nodes (24): ClipVotingClient(), Nomination, Props, ClipDesMonatsPage(), MONTH_NAMES, GalleryEntry, MONTH_NAMES, Nomination (+16 more)

### Community 75 - "SeriesIcon.tsx"
Cohesion: 0.07
Nodes (44): POST(), GET(), loadOverlayState(), loadStreamer(), parseOverlayControl(), GET(), UserLite, GET() (+36 more)

### Community 76 - "[id]/settings/SettingsClient.tsx"
Cohesion: 0.14
Nodes (19): PATCH(), patchSchema, characterConfigSchema, PATCH(), requestSchema, CardCharacterSelection, CardContentError, CardContentPatch (+11 more)

### Community 77 - "tutorial.ts"
Cohesion: 0.05
Nodes (39): api(), Author, authorLabel(), CommentEntry, CommentSection(), CommunityBoardClient(), ContributionItem(), FeedCard() (+31 more)

### Community 78 - "ProfileOverlayClient.tsx"
Cohesion: 0.12
Nodes (19): combinedElementStyle(), Corner, ElementCycle, FavoriteGame, FavoritesPanel(), MotionStyles(), OverlayStreamer, panelMotionStyle() (+11 more)

### Community 79 - "community-job-payout/route.ts"
Cohesion: 0.15
Nodes (18): GET(), PATCH(), patchSchema, placementSchema, AdminBattleCardsPage(), formatDate(), SeasonConfigPanel(), toDateInputValue() (+10 more)

### Community 80 - "AdminEventsClient.tsx"
Cohesion: 0.22
Nodes (12): YearReviewPage(), checkAndAwardBadges(), loadStats(), BADGE_CATEGORY_LABELS, BADGE_DEFS, BadgeDef, BadgeStats, findNewlyEarnedBadges() (+4 more)

### Community 81 - "ConfirmDialog.tsx"
Cohesion: 0.05
Nodes (42): Anomalies, AnomaliesClient(), Person, PayoutsClient(), Preview, Run, Week, MODERATION_TYPE_OPTIONS (+34 more)

### Community 82 - "ClipVotingClient.tsx"
Cohesion: 0.21
Nodes (11): CATEGORY_ACCENT, CATEGORY_ICONS, PointsPage(), formatRelative(), RelativeTime(), RelativeTimeProps, CATEGORY_LABELS, DAILY_CAPS (+3 more)

### Community 83 - "(dashboard)/events/page.tsx"
Cohesion: 0.33
Nodes (6): LogOut, Moon, Sun, MobileTopBar(), ROUTE_TITLES, useTheme()

### Community 84 - "bot/index.ts"
Cohesion: 0.11
Nodes (26): GET(), api(), Idea, IdeasBoardClient(), IdeaList(), IdeaBody(), api(), AreaKey (+18 more)

### Community 85 - "CoachTools.tsx"
Cohesion: 0.13
Nodes (23): GET(), GET(), GET(), StatusEntry, AdsTarget, ampCall(), AmpInstance, callWithSession() (+15 more)

### Community 86 - "MarkdownLite.tsx"
Cohesion: 0.33
Nodes (6): giant, base, bodyMaterial, label, parts, regions

### Community 87 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 88 - "send/route.ts"
Cohesion: 0.06
Nodes (45): GET(), GET(), loadProfileOverlayState(), GameserverWidget(), Server, ServerRow(), ApplyButton(), Light (+37 more)

### Community 89 - "EventAdminRow.tsx"
Cohesion: 0.22
Nodes (11): CATEGORY_BADGE_CLASS, EventPokalWinners(), PokalWithOwner, Props, PokalPreview(), Props, CATEGORY_BADGE_CLASS, PokalSection() (+3 more)

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
Cohesion: 0.60
Nodes (3): NewEventPage(), AdminLayout(), requireModeratorOrAnySquadCaptain()

### Community 95 - "apply-season-results.ts"
Cohesion: 0.03
Nodes (79): AdminNav(), CATEGORIES, hasRole(), HIERARCHY, Role, Tab, Health, AdminPage() (+71 more)

### Community 97 - "NotificationRulesPanel.tsx"
Cohesion: 0.35
Nodes (8): POST(), buildBerlinDate(), calcNextDate(), daysInMonthOf(), nthWeekdayOfMonth(), ORDINALS_DE, weekdayOf(), WEEKDAYS_DE

### Community 98 - "(dashboard)/battle-cards/page.tsx"
Cohesion: 0.08
Nodes (28): AdminDonationsClient(), Donation, Expense, fmt(), Idea, inputStyle, MONTH_NAMES, now (+20 more)

### Community 99 - "PackOpener.tsx"
Cohesion: 0.14
Nodes (12): PACK_ACCENT, PACK_ART, PACK_CLIP_PATH, PACK_COVER_LABEL, PACK_TEXTURE, PackCoverArt(), PackVisualKind, OpenPackResponse (+4 more)

### Community 100 - "adapters.ts"
Cohesion: 0.05
Nodes (35): SteamGameResult, FavoriteGamesSection(), Props, GamePlayersModal(), LoadState, Props, PollOptionGameInputProps, Props (+27 more)

### Community 101 - "admin/community-jobs/disputes/route.ts"
Cohesion: 0.24
Nodes (7): POST(), VALID_KINDS, DisputeResult, fileDispute(), lookups, VoteKind, VoteOwnerLookup

### Community 102 - "recurrence.ts"
Cohesion: 0.22
Nodes (11): api(), Campaign, dueAt(), EventOption, MarketingCampaignsBlock(), MarketingStatsBlock(), PromotionRequestItem, PromotionRequestList() (+3 more)

### Community 104 - "studio-templates.ts"
Cohesion: 0.20
Nodes (33): defaults, defaults, slim, tall, defaults, Bottom, Eyewear, FacialHair (+25 more)

### Community 105 - "minigames-config.ts"
Cohesion: 0.16
Nodes (20): POST(), POST(), checkpointVoice(), findUser(), handleMemberJoin(), trackInvite(), trackMessage(), trackReaction() (+12 more)

### Community 106 - "photo-request-service.ts"
Cohesion: 0.11
Nodes (22): POST(), PUT(), DELETE(), PUT(), GET(), GET(), POST(), POST() (+14 more)

### Community 107 - "card-provisioning.ts"
Cohesion: 0.04
Nodes (63): POST(), AdminApplication, AdminDispute, AdminMember, api(), CommunityJobsAdminPanel(), JobRef, JobSettingsSection() (+55 more)

### Community 109 - "useServerLiveStatus.ts"
Cohesion: 0.18
Nodes (14): main(), POST(), POST(), POST(), PATCH(), GamePlayer, GET(), isSameGame() (+6 more)

### Community 110 - "points.ts"
Cohesion: 0.23
Nodes (13): DELETE(), GET(), POST(), activeRequesterJob(), closePhotoRequest(), createPhotoRequest(), fulfillPhotoRequest(), listMyPhotoRequests() (+5 more)

### Community 111 - "FfaView.tsx"
Cohesion: 0.21
Nodes (11): VfxEvent, LiveDuelUnit, UltimateBurst, LineupCard, LineupEditor(), FloatingEffect, GemBeam, applySynergies() (+3 more)

### Community 112 - "EventPokalWinners.tsx"
Cohesion: 0.15
Nodes (16): BattleCardsPage(), metadata, userSelect, BattleCardsLogo(), BattleLauncher(), RANK_STYLE, LeaderboardTabs(), Tab (+8 more)

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
Nodes (12): EventCardLink(), DiscordLoginButton(), Props, GateButton(), GateLink(), GateOptions, GuestBanner(), GuestGateContext (+4 more)

### Community 117 - "getActiveMembership"
Cohesion: 0.15
Nodes (17): DELETE(), PATCH(), DELETE(), POST(), GET(), POST(), createGuide(), CreateGuideResult (+9 more)

### Community 118 - "AdminNav.tsx"
Cohesion: 0.10
Nodes (22): GET(), api(), AssetOption, buildEventTemplate(), EventOption, FoundUser, InterviewOption, PostOption (+14 more)

### Community 119 - "VictoryChestReveal.tsx"
Cohesion: 0.23
Nodes (13): buildScratchGrid(), CANDIDATE_PRIZES, ChestPrize, colorFor(), DEFAULT_PRIZE_COLOR, PACK_LABEL, PACK_LABEL_SHORT, PRIZE_COLOR (+5 more)

### Community 120 - "upload/route.ts"
Cohesion: 0.29
Nodes (9): GET(), isAuthorized(), ALLOWED_TYPES, checkBlobToken(), Kind, KINDS, POST(), ROLE_ORDER (+1 more)

### Community 122 - "duels/[id]/respond/route.ts"
Cohesion: 0.36
Nodes (9): applyTierJumpLimit(), computePercentiles(), computeSeasonResults(), hashSeed(), MemberSeasonResult, resolveClass(), TIER_ORDER, TIER_PERCENTILE_CEILING (+1 more)

### Community 123 - "AdminDonationsClient.tsx"
Cohesion: 0.14
Nodes (21): completeEvent(), DEFAULT_REWARDS, isSystemCall(), parseRewards(), PlacementReward, POST(), RewardsConfig, SeriesStandings (+13 more)

### Community 125 - "CommunityBoardWidget.tsx"
Cohesion: 0.24
Nodes (11): POST(), ACTIVITY_TIER_LABEL, isOverridden(), runSeasonUpdate(), toJson(), buildSeasonInputs(), countBy(), runFullSeasonUpdate() (+3 more)

### Community 126 - "ServerCard.tsx"
Cohesion: 0.21
Nodes (15): GET(), Params, POST(), GET(), GET(), OverlayControl, parseControl(), PATCH() (+7 more)

### Community 127 - "promotion-request-service.ts"
Cohesion: 0.18
Nodes (6): api(), Coach, CoachRatingSection(), RateableSession, GraduationCap, LifeBuoy

### Community 128 - "process-badge-art.ts"
Cohesion: 0.24
Nodes (10): BADGES, BG, isolateSymbol(), main(), maskSvg(), OUT_DIR, RAW_DIR, ringSvg() (+2 more)

### Community 130 - "DashboardChrome.tsx"
Cohesion: 0.15
Nodes (7): DashboardLayout(), BackToTop(), GuestGateProvider(), PartnerFooter(), Partner, NewsItem, isLinkPreviewBot()

### Community 131 - "series/[id]/complete/route.ts"
Cohesion: 0.36
Nodes (6): DEFAULT_REWARDS, parseRewards(), PlacementReward, POST(), RewardsConfig, awardSeriesPokal()

### Community 132 - "giant"
Cohesion: 0.33
Nodes (6): base, bodyMaterial, label, parts, regions, bear

### Community 133 - "overlay/[id]/page.tsx"
Cohesion: 0.29
Nodes (7): LayoutPositions, CORNERS, ELEMENT_KEYS, OverlayPage(), PANEL_KEYS, PanelKey, parseLayout()

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
Cohesion: 0.17
Nodes (14): BattleChallengeWidget(), ChallengeUserPicker(), uname(), UserLite, GemsChallengeUserPicker(), uname(), UserLite, CONFIG (+6 more)

### Community 142 - "small"
Cohesion: 0.11
Nodes (17): MonthlyContests, Props, YearlyContests, EventsTabs(), TabItem, TabPanel(), Tabs(), TabsProps (+9 more)

### Community 144 - "tank"
Cohesion: 0.20
Nodes (14): POST(), POST(), GET(), POST(), GET(), collectYearlyNominations(), finalizeYearlyContest(), notifyYearlyContestFinished() (+6 more)

### Community 145 - "requireModeratorOrSquadCaptain"
Cohesion: 0.28
Nodes (13): skin, skin, skin, skin, skin, skin, block, row (+5 more)

### Community 146 - "notifications.ts"
Cohesion: 0.05
Nodes (76): GET(), POST(), GET(), GET(), POST(), GET(), GET(), POST() (+68 more)

### Community 148 - "[userId]/page.tsx"
Cohesion: 0.40
Nodes (5): ELEMENT_KEYS, parseLayout(), ProfileOverlayPage(), ProfileElementKey, ProfileLayoutPositions

### Community 149 - "middleware.ts"
Cohesion: 0.36
Nodes (7): cleanupExpiredEntries(), config, getClientKey(), isRateLimited(), middleware(), requestLog, WIDGET_CORS_HEADERS

### Community 150 - "discord-roles.ts"
Cohesion: 0.20
Nodes (13): JobBadgeProps, useJobBadge(), RankRing(), RankRingProps, JobBadgeData, JOB_ICONS, getJobRing(), isEmployed() (+5 more)

### Community 151 - "new-season/page.tsx"
Cohesion: 0.32
Nodes (7): NewSeasonPage(), parsePollConfigs(), PlacementReward, PollConfig, StatConfig, StatRow, suggestNextSeasonName()

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
Cohesion: 0.10
Nodes (29): GET(), GET(), isAuthorized(), GET(), isAuthorized(), GET(), isAuthorized(), calcStreak() (+21 more)

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
Cohesion: 0.03
Nodes (79): ActivityFeed(), cleanReason(), Filter, Tx, txType(), inputStyle, Series, CompareProfilePage() (+71 more)

### Community 212 - "NotMemberClient.tsx"
Cohesion: 0.15
Nodes (7): RULES, AnimatedBackground(), Cell, PULSE_COLORS, CheckSquare, LogIn, ShieldAlert

### Community 214 - "DailyPollPanel.tsx"
Cohesion: 0.04
Nodes (62): DailyMessagePanel(), defaultForm(), formatDate(), FormState, isCurrentlyActive(), Message, toLocalInputValue(), DailyPollPanel() (+54 more)

### Community 233 - "SeriesStandingsTable.tsx"
Cohesion: 0.05
Nodes (30): Badge, CATEGORIES, CATEGORY_LABELS, User, CardRow, TacticCardRow, FullStandingsToggle(), Props (+22 more)

### Community 242 - "PwaInstallButton.tsx"
Cohesion: 0.22
Nodes (8): Download, Menu, Share, BeforeInstallPromptEvent, isIosSafari(), isMobileBrowser(), Mode, PwaInstallButton()

### Community 243 - "battle-cards-tactic-seed-data.ts"
Cohesion: 0.36
Nodes (7): TACTIC_CARDS, TacticCardSeed, isAuthorized(), POST(), toJson(), Effect, TrapTriggerCondition

### Community 248 - "sync-discord-roles/route.ts"
Cohesion: 0.43
Nodes (6): GET(), POST(), COMMUNITY_JOB_ROLE_ENV_KEYS, discordRequest(), getRoleId(), syncCommunityJobDiscordRole()

### Community 252 - "BadgeIcon.tsx"
Cohesion: 0.39
Nodes (6): BadgeIcon(), BadgeIconProps, badgeArt(), CUSTOM_BADGE_ART, isImageIcon(), SYSTEM_BADGE_ART

### Community 254 - "ScoreBreakdownBlock.tsx"
Cohesion: 0.36
Nodes (7): Breakdown, fmt(), ScoreBreakdownBlock(), signed(), StreamResult, Week, Scale

### Community 263 - "normal"
Cohesion: 0.33
Nodes (6): normal, base, bodyMaterial, label, parts, regions

### Community 270 - "[contribId]/route.ts"
Cohesion: 0.07
Nodes (47): DELETE(), PATCH(), DELETE(), POST(), POST(), POST(), DELETE(), GET() (+39 more)

### Community 274 - "HeroStatValue.tsx"
Cohesion: 0.70
Nodes (3): HeroStatValue(), useValueDelta(), ValueDeltaBadge()

### Community 276 - "notifications/page.tsx"
Cohesion: 0.67
Nodes (3): AdminNotificationsPage(), DiscordEmoji, fetchGuildEmojis()

## Knowledge Gaps
- **1144 isolated node(s):** `proc`, `eslintConfig`, `requestLog`, `WIDGET_CORS_HEADERS`, `config` (+1139 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionUser()` connect `MobaIcon.tsx` to `roles.ts`, `app/layout.tsx`, `coach-service.ts`, `getSessionUser`, `duels-live.ts`, `[contribId]/route.ts`, `tank`, `ranks.ts`, `notifications.ts`, `notify-dispatch.ts`, `community-job-service.ts`, `SeasonConfigPanel.tsx`, `clip-contest.ts`, `gameservers.ts`, `packs.ts`, `MobaIcon`, `types.ts`, `community-job-config.ts`, `job-recommendations.ts`, `JobBadge.tsx`, `discord-rest.ts`, `DailyPollBanner.tsx`, `TournamentManager.tsx`, `BattleLogEntry`, `EventEditClient.tsx`, `formatBerlinTime`, `compare/[id]/page.tsx`, `SeriesIcon.tsx`, `AdminEventsClient.tsx`, `ClipVotingClient.tsx`, `bot/index.ts`, `JournalistTools.tsx`, `(dashboard)/battle-cards/page.tsx`, `admin/community-jobs/disputes/route.ts`, `card-provisioning.ts`, `points.ts`, `getActiveMembership`, `AdminNav.tsx`, `upload/route.ts`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `roles.ts` to `ranked-season.ts`, `series/[id]/complete/route.ts`, `live-battle.ts`, `getSessionUser`, `series-event-points.ts`, `tank`, `notifications/page.tsx`, `MobaIcon.tsx`, `new-season/page.tsx`, `[tacticCardId]/route.ts`, `shop-config.ts`, `clip-contest.ts`, `community-job-config.ts`, `JobBadge.tsx`, `discord-rest.ts`, `EventEditClient.tsx`, `revert-event-completion.ts`, `hasMinRole`, `events/series/[id]/page.tsx`, `SeriesIcon.tsx`, `[id]/settings/SettingsClient.tsx`, `community-job-payout/route.ts`, `CoachTools.tsx`, `DailyPollPanel.tsx`, `CommunityBoardClient.tsx`, `NotificationRulesPanel.tsx`, `photo-request-service.ts`, `card-provisioning.ts`, `ThemeProvider.tsx`, `sync-discord-roles/route.ts`, `CommunityBoardWidget.tsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `formatBerlinDate()` connect `card-provisioning.ts` to `time.ts`, `CommunityJobsPanel.tsx`, `duels-live.ts`, `ranks.ts`, `CommunityJobsAdminPanel.tsx`, `ProfileMobileView.tsx`, `notify-dispatch.ts`, `board-match3.ts`, `SeasonConfigPanel.tsx`, `community-job-service.ts`, `gameservers.ts`, `FotografTools.tsx`, `compare/[id]/page.tsx`, `SeriesIcon.tsx`, `tutorial.ts`, `ProfileOverlayClient.tsx`, `ConfirmDialog.tsx`, `ClipVotingClient.tsx`, `bot/index.ts`, `DailyPollPanel.tsx`, `(dashboard)/battle-cards/page.tsx`, `recurrence.ts`, `EventPokalWinners.tsx`, `AdminNav.tsx`, `ScoreBreakdownBlock.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `proc`, `eslintConfig`, `requestLog` to the rest of the system?**
  _1144 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03290129611166501 - nodes in this community are weakly interconnected._
- **Should `ranked-season.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13105413105413105 - nodes in this community are weakly interconnected._
- **Should `live-battle.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04688832054560955 - nodes in this community are weakly interconnected._