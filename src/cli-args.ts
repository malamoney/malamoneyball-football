export function readFlag(name: string): string | undefined {
  const flag = "--" + name;
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(flag + " requires a value.");
  }

  return value;
}

export function requireFlag(name: string): string {
  const value = readFlag(name);
  if (!value) {
    throw new Error("Missing required argument --" + name + ".");
  }

  return value;
}

export function parseSeasonName(value: string | undefined): string {
  const seasonName = value?.trim();
  if (!seasonName) {
    throw new Error(
      "Season name is required. Set SEASON_NAME or pass --season-name NAME.",
    );
  }

  return seasonName;
}

export function requireSeasonName(): string {
  return parseSeasonName(readFlag("season-name") ?? process.env.SEASON_NAME);
}
