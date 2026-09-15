import { TeamDetailsPage } from "@/components/team-details-page";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ userKey: string }>;
}) {
  const { userKey } = await params;
  const seasonName = process.env.SEASON_NAME ?? "malamoneyball 2026";

  return <TeamDetailsPage seasonName={seasonName} userKey={userKey} />;
}
