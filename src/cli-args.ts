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
