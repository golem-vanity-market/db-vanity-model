export function vanityDurationToSeconds(str: string) {
  const regex = /(\d+\.?\d*)\s*(d|h|m|s)/gi;
  let totalSeconds = 0;

  for (const [, value, unit] of str.matchAll(regex)) {
    if (!value || !unit) continue;
    const num = parseFloat(value);
    switch (unit.toLowerCase()) {
      case "d":
        totalSeconds += num * 86400; // 24 * 60 * 60
        break;
      case "h":
        totalSeconds += num * 3600;
        break;
      case "m":
        totalSeconds += num * 60;
        break;
      case "s":
        totalSeconds += num;
        break;
    }
  }

  return totalSeconds;
}
