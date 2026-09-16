const SOURCE = 'browser';
const PURPOSES = new Set(['login', 'session']);

export function validateLocationInput(input) {
  if (!input || typeof input !== 'object') throw new Error('invalid_location');
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const accuracy = Number(input.accuracy);
  const timestamp = Number(input.timestamp);
  const source = input.source;
  const purpose = input.purpose;
  const consent = input.consent;

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('invalid_location');
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('invalid_location');
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000) throw new Error('invalid_location');
  if (!Number.isFinite(timestamp) || timestamp <= 0) throw new Error('invalid_location');
  if (source !== SOURCE) throw new Error('invalid_location_source');
  if (!PURPOSES.has(purpose)) throw new Error('invalid_location_purpose');
  if (consent !== true) throw new Error('location_consent_required');

  return {
    latitude,
    longitude,
    accuracy,
    timestamp,
    source: SOURCE,
    purpose,
    consent: true,
  };
}

export const LOCATION_CONTRACT = Object.freeze({
  version: 'v1',
  source: SOURCE,
  fields: ['latitude', 'longitude', 'accuracy', 'timestamp', 'source'],
  consentRequired: true,
  publicPrecision: 'never-expose-exact-coordinates',
});
