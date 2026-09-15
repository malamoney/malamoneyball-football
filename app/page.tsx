import { Dashboard } from "@/components/dashboard";

export default function HomePage() {
  const seasonName = process.env.SEASON_NAME ?? "malamoneyball 2026";

  return <Dashboard seasonName={seasonName} />;
}
