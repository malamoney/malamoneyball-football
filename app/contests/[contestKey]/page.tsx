import { ContestDetailsPage } from "@/components/contest-details-page";

export default async function ContestPage({
  params,
}: {
  params: Promise<{ contestKey: string }>;
}) {
  const { contestKey } = await params;
  const seasonName = process.env.SEASON_NAME ?? "malamoneyball 2026";

  return <ContestDetailsPage contestKey={contestKey} seasonName={seasonName} />;
}
