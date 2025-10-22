export interface ProviderDataEntry {
  providerName: string;
  providerId: string;
  numberOfJobs: number;
  numberOfJobs24h: number;
  totalWork: number;
  totalWork24h: number;
  jobId: string;
  totalCost: number;
  totalCost24h: number;
  totalWorkHours: number;
  totalWorkHours24h: number;
  lastJobDate: string;
  longestJob: number;
  longestJob24h: number;
  speed: number; // jobs per hour (optional field)
  speed24h: number; // jobs per hour in the last 24h (optional field)
  efficiency: number; // work units per cost (optional field)
  efficiency24h: number; // work units per cost in the last 24h (optional field)
  key?: string;
}

export interface FilterCriteria {
  minWorkHours: number | null;
  minWorkHours24h: number | null;
  minTotalCost: number | null;
  minTotalCost24h: number | null;
  minNumberOfJobs: number | null;
  minNumberOfJobs24h: number | null;
  providerNameSearch: string | null;

  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface ProviderDataType {
  grouped: string;
  byProviderId: Record<string, ProviderDataEntry>;
}

export const recomputeFields = (entry: ProviderDataEntry) => {
  entry.speed = entry.totalWorkHours
    ? entry.totalWork / entry.totalWorkHours / 3600
    : 0;
  entry.speed24h = entry.totalWorkHours24h
    ? entry.totalWork24h / entry.totalWorkHours24h / 3600
    : 0;
  entry.efficiency = entry.totalCost
    ? entry.totalWork / entry.totalCost
    : Infinity;
  entry.efficiency24h = entry.totalCost24h
    ? entry.totalWork24h / entry.totalCost24h
    : Infinity;
  return entry;
};

export class ProviderData implements ProviderDataType {
  grouped: string;
  byProviderId: Record<string, ProviderDataEntry>;

  constructor(data: ProviderDataType) {
    this.grouped = data.grouped;
    this.byProviderId = {};
    for (const key in data.byProviderId) {
      const value = data.byProviderId[key];
      this.byProviderId[key] = recomputeFields({
        providerName: value.providerName,
        providerId: value.providerId,
        numberOfJobs: value.numberOfJobs,
        numberOfJobs24h: value.numberOfJobs24h,
        totalWork: value.totalWork,
        totalWork24h: value.totalWork24h,
        jobId: value.jobId,
        totalCost: value.totalCost,
        totalCost24h: value.totalCost24h,
        totalWorkHours: value.totalWorkHours,
        totalWorkHours24h: value.totalWorkHours24h,
        lastJobDate: value.lastJobDate,
        longestJob: value.longestJob,
        longestJob24h: value.longestJob24h,
        speed: 0,
        speed24h: 0,
        efficiency: 0,
        efficiency24h: 0,
        key: value.key,
      }); // create a copy of each entry
    }
  }

  clone(): ProviderData {
    return new ProviderData(this);
  }
}

function writeString(view: DataView, offset: number, str: string): number {
  const utf8 = new TextEncoder().encode(str);
  view.setUint32(offset, utf8.length, true);
  utf8.forEach((b, i) => view.setUint8(offset + 4 + i, b));
  return offset + (4 + utf8.length);
}

function readString(view: DataView, offset: number): [string, number] {
  const len = view.getUint32(offset, true);
  const bytes = new Uint8Array(view.buffer, offset + 4, len);
  return [new TextDecoder().decode(bytes), 4 + len];
}

const writeUint32 = (view: DataView, offset: number, value: number): number => {
  view.setUint32(offset, value, true);
  return offset + 4;
};

const writeFloat64 = (
  view: DataView,
  offset: number,
  value: number,
): number => {
  view.setFloat64(offset, value, true);
  return offset + 8;
};

export function serializeProvider(entry: ProviderDataEntry): Uint8Array {
  // Rough upper bound to avoid reallocating
  const buf = new ArrayBuffer(4096);
  const view = new DataView(buf);
  let offset = 0;

  offset = writeString(view, offset, entry.providerName);
  offset = writeString(view, offset, entry.providerId);

  // ---- integers (uint32) ----
  offset = writeUint32(view, offset, entry.numberOfJobs);
  offset = writeUint32(view, offset, entry.numberOfJobs24h);

  // ---- floats ----

  offset = writeFloat64(view, offset, entry.totalWork);
  offset = writeFloat64(view, offset, entry.totalWork24h);
  offset = writeFloat64(view, offset, entry.totalCost);
  offset = writeFloat64(view, offset, entry.totalCost24h);
  offset = writeFloat64(view, offset, entry.totalWorkHours);
  offset = writeFloat64(view, offset, entry.totalWorkHours24h);

  offset = writeString(view, offset, entry.jobId);

  // ---- dates (as float64 timestamp) ----
  offset = writeFloat64(view, offset, new Date(entry.lastJobDate).getTime());

  // ---- durations (float64 here) ----
  offset = writeFloat64(view, offset, entry.longestJob);
  offset = writeFloat64(view, offset, entry.longestJob24h);

  return new Uint8Array(buf, 0, offset);
}

export function deserializeProvider(data: Uint8Array): ProviderDataEntry {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;

  let str: string, consumed: number;

  [str, consumed] = readString(view, offset);
  const providerName = str;
  offset += consumed;

  [str, consumed] = readString(view, offset);
  const providerId = str;
  offset += consumed;

  const numberOfJobs = view.getUint32(offset, true);
  offset += 4;
  const numberOfJobs24h = view.getUint32(offset, true);
  offset += 4;

  const totalWork = view.getFloat64(offset, true);
  offset += 8;
  const totalWork24h = view.getFloat64(offset, true);
  offset += 8;
  const totalCost = view.getFloat64(offset, true);
  offset += 8;
  const totalCost24h = view.getFloat64(offset, true);
  offset += 8;
  const totalWorkHours = view.getFloat64(offset, true);
  offset += 8;
  const totalWorkHours24h = view.getFloat64(offset, true);
  offset += 8;

  [str, consumed] = readString(view, offset);
  const jobId = str;
  offset += consumed;

  const lastJobDate = new Date(view.getFloat64(offset, true)).toISOString();
  offset += 8;

  const longestJob = view.getFloat64(offset, true);
  offset += 8;
  const longestJob24h = view.getFloat64(offset, true);
  offset += 8;

  return recomputeFields({
    providerName,
    providerId,
    numberOfJobs,
    numberOfJobs24h,
    totalWork,
    totalWork24h,
    totalCost,
    totalCost24h,
    totalWorkHours,
    totalWorkHours24h,
    jobId,
    lastJobDate,
    longestJob,
    longestJob24h,
    speed: 0,
    speed24h: 0,
    efficiency: 0,
    efficiency24h: 0,
  });
}

const original: ProviderDataEntry = {
  providerName: "Acme",
  providerId: "123",
  numberOfJobs: 10,
  numberOfJobs24h: 2,
  totalWork: 100,
  totalWork24h: 20,
  jobId: "job-xyz",
  totalCost: 50,
  totalCost24h: 5,
  totalWorkHours: 40,
  totalWorkHours24h: 8,
  lastJobDate: new Date().toISOString(),
  longestJob: 12,
  longestJob24h: 4,
  speed: 0,
  speed24h: 0,
  efficiency: 0,
  efficiency24h: 0,
};

const bin = serializeProvider(original);

console.log(`Serialized size: ${bin.length}`);
console.log("Json size:", JSON.stringify(original).length);
const restored = deserializeProvider(bin);

console.log(restored);
