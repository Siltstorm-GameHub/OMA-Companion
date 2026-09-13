-- CreateTable
CREATE TABLE "CommunityBoardComment" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeReason" TEXT,
    "disputeResolution" TEXT,
    "disputeResolvedById" TEXT,

    CONSTRAINT "CommunityBoardComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityBoardCommentVote" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeReason" TEXT,
    "disputeResolution" TEXT,
    "disputeResolvedById" TEXT,

    CONSTRAINT "CommunityBoardCommentVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityBoardComment_entityType_entityId_idx" ON "CommunityBoardComment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "CommunityBoardComment_authorId_idx" ON "CommunityBoardComment"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityBoardCommentVote_commentId_voterId_key" ON "CommunityBoardCommentVote"("commentId", "voterId");

-- AddForeignKey
ALTER TABLE "CommunityBoardComment" ADD CONSTRAINT "CommunityBoardComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBoardCommentVote" ADD CONSTRAINT "CommunityBoardCommentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CommunityBoardComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBoardCommentVote" ADD CONSTRAINT "CommunityBoardCommentVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
