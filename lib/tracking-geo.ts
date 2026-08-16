const EARTH_RADIUS_METERS = 6_371_000;

export function normalizeHeading(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return ((value % 360) + 360) % 360;
}

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingBetweenPoints(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));

  return normalizeHeading((Math.atan2(y, x) * 180) / Math.PI) ?? 0;
}

export function movementThresholdMeters(accuracy: number | null | undefined): number {
  if (accuracy == null || !Number.isFinite(accuracy)) return 8;
  return Math.max(5, Math.min(25, accuracy * 0.5));
}

export function headingLabel(heading: number | null | undefined): string {
  const normalized = normalizeHeading(heading);
  if (normalized == null) return "غير محدد";

  const labels = ["شمال", "شمال شرق", "شرق", "جنوب شرق", "جنوب", "جنوب غرب", "غرب", "شمال غرب"];
  return labels[Math.round(normalized / 45) % labels.length];
}
