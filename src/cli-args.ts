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

export function parseSeasonYear(value: string | undefined): number {
  if (!value) {
    throw new Error(
      "Season is required. Set SEASON_YEAR or pass --season YYYY.",
    );
  }

  if (!/^\d{4}$/.test(value)) {
    throw new Error("Season must be a four-digit year from 2000 through 9999.");
  }

  const year = Number(value);
  if (year < 2000) {
    throw new Error("Season must be a four-digit year from 2000 through 9999.");
  }

  return year;
}

export function requireSeasonYear(): number {
  return parseSeasonYear(readFlag("season") ?? process.env.SEASON_YEAR);
}
