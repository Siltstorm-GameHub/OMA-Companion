import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SettingsClient from "./SettingsClient";

export default async function OverlaySettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id: eventId } = await params;
  const { token } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, format: true, overlayToken: true },
  });

  if (!event || !token || event.overlayToken !== token) notFound();

  return <SettingsClient eventId={event.id} eventTitle={event.title} format={event.format} token={token} />;
}
