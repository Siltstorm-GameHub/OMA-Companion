import NotMemberClient from "./NotMemberClient";

export default function NotMemberPage() {
  const inviteUrl = process.env.DISCORD_INVITE_URL ?? null;
  return <NotMemberClient inviteUrl={inviteUrl} />;
}
