import { deserializeProvider, type ProviderDataEntry } from "./provider.ts";
import { PublicArkivClient, Entity } from "@arkiv-network/sdk";

export function numberToSortableString(
  num: number,
  {
    intWidth = 10, // max digits for integer part
    fracWidth = 8, // digits after decimal
    unit = "",
  } = {},
) {
  if (Number.isNaN(num)) {
    // NaN → zero, should not happen
    console.warn("numberToSortableString: got NaN, treating as 0");
    num = 0;
  }
  if (num < 0) {
    // negative → zero, should not happen
    console.warn("numberToSortableString: got negative, clamping to 0");
    num = 0; // negative → 0
  }
  //big numbers → max representable, can happen with e.g. efficiency
  num = Math.min(num, 0.9999 * 10 ** intWidth); // clamp to max representable
  if (!isFinite(num)) {
    // Infinity → max sortable value
    return `${"9".repeat(intWidth)}.${"9".repeat(fracWidth)}${unit}`;
  }

  // format with at least fracWidth digits, no scientific notation
  const abs = Math.abs(num);
  const fixed = abs.toFixed(fracWidth + 2); // a bit extra to avoid rounding loss
  const [intPartRaw, fracPartRaw = ""] = fixed.split(".");

  // Pad/truncate to requested widths
  const intPadded = intPartRaw.padStart(intWidth, "0");
  const fracPadded = fracPartRaw.padEnd(fracWidth, "0").slice(0, fracWidth);

  return `${intPadded}.${fracPadded}${unit}`;
}

export function mapValueForAnnotation(val: number, field: string): string {
  if (field === "totalWorkHours") {
    return numberToSortableString(val, {
      intWidth: 3,
      fracWidth: 2,
      unit: "h",
    });
  } else if (field === "totalWorkHours24h") {
    return numberToSortableString(val, {
      intWidth: 3,
      fracWidth: 2,
      unit: "h",
    });
  } else if (field === "totalWork") {
    return numberToSortableString(val / 1e9, {
      unit: "G",
      intWidth: 6,
      fracWidth: 2,
    });
  } else if (field === "totalWork24h") {
    return numberToSortableString(val / 1e9, {
      unit: "G",
      intWidth: 6,
      fracWidth: 2,
    });
  } else if (field === "totalCost") {
    return numberToSortableString(val, {
      intWidth: 4,
      fracWidth: 5,
      unit: "GLM",
    });
  } else if (field === "totalCost24h") {
    return numberToSortableString(val, {
      intWidth: 4,
      fracWidth: 5,
      unit: "GLM",
    });
  } else if (field === "longestJob") {
    return numberToSortableString(val, {
      intWidth: 2,
      fracWidth: 2,
      unit: "h",
    });
  } else if (field === "longestJob24h") {
    return numberToSortableString(val, {
      intWidth: 2,
      fracWidth: 2,
      unit: "h",
    });
  } else if (field === "speed") {
    return numberToSortableString(val / 1e6, {
      intWidth: 4,
      fracWidth: 3,
      unit: "M/s",
    });
  } else if (field === "speed24h") {
    return numberToSortableString(val / 1e6, {
      intWidth: 4,
      fracWidth: 3,
      unit: "M/s",
    });
  } else if (field === "efficiency") {
    return numberToSortableString(val / 1e12, {
      intWidth: 5,
      fracWidth: 3,
      unit: "TH/GLM",
    });
  } else if (field === "efficiency24h") {
    return numberToSortableString(val / 1e12, {
      intWidth: 5,
      fracWidth: 3,
      unit: "TH/GLM",
    });
  } else if (field === "lastJobDate") {
    return new Date(val).toISOString().slice(0, 19) + "Z";
  } else {
    throw new Error(`Unknown field: ${field}`);
  }
}

export function mapValueForNumberAnnotation(
  val: number,
  field: string,
): number {
  if (field === "numberOfJobs") {
    return val + 1;
  } else if (field === "numberOfJobs24h") {
    return val + 1;
  } else {
    throw new Error(`Unknown field: ${field}`);
  }
}

export async function fetchAllEntitiesRaw(
  client: PublicArkivClient,
  numberOfGroups: number,
  owner: string,
): Promise<Record<string, Entity>> {
  // Placeholder for actual implementation
  const proms = [];
  for (let groupNo = 1; groupNo <= numberOfGroups; groupNo++) {
    proms.push(client.query(`group = ${groupNo} && $owner = "${owner}"`));
  }
  const byProviderId: Record<string, Entity> = {};

  for (const prom of proms) {
    const entities = await prom;
    for (const entity of entities) {
      let data;
      try {
        data = deserializeProvider(entity.payload!);
      } catch (e) {
        console.error("Failed to deserialize provider data:", e);
        continue;
      }
      byProviderId[data.providerId] = entity;
    }
  }
  return byProviderId;
}

export async function fetchAllEntities(
  client: PublicArkivClient,
  numberOfGroups: number,
  owner: string,
  internalQuery: string | null,
): Promise<Record<string, ProviderDataEntry>> {
  // Placeholder for actual implementation
  const proms = [];
  for (let groupNo = 1; groupNo <= numberOfGroups; groupNo++) {
    if (internalQuery) {
      proms.push(client.query(`(${internalQuery}) && group = ${groupNo}`));
    } else {
      proms.push(client.query(`group = ${groupNo} && $owner = "${owner}"`));
    }
  }
  const byProviderId: Record<string, ProviderDataEntry> = {};

  for (const prom of proms) {
    const entities = await prom;
    for (const entity of entities) {
      let data;
      try {
        data = deserializeProvider(entity.payload!);
      } catch (e) {
        console.error("Failed to deserialize provider data:", e);
        continue;
      }
      data.key = entity.key;
      byProviderId[data.providerId] = data;
    }
  }
  return byProviderId;
}
