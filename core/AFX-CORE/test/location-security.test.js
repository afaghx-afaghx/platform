import test from 'node:test';
import assert from 'node:assert/strict';
import { PersistentAfxCore } from '../src/persistent-core.js';
import { LOCATION_CONTRACT, toPublicLocationEvent } from '../src/location-contract.js';

test('location reads are tenant-scoped and publicly coarse', async () => {
  let query;
  const repository = {
    async listLocationEvents(args) {
      query = args;
      return [{
        id: 'loc_1', userId: 'usr_1', sessionId: 'ses_1', tenantId: 'tenant-a',
        latitude: 35.721234, longitude: 51.334567, accuracy: 10, timestamp: 1000,
        source: 'browser', purpose: 'session', consent: true,
      }];
    },
  };
  const core = new PersistentAfxCore({ repository });
  const result = await core.listLocationEvents({
    context: { userId: 'usr_1', tenantId: 'tenant-a', sessionId: 'ses_1' },
    sessionId: 'ses_1',
  });

  assert.deepEqual(query, { tenantId: 'tenant-a', userId: 'usr_1', sessionId: 'ses_1', limit: 20 });
  assert.equal(result[0].latitude, 35.72);
  assert.equal(result[0].longitude, 51.33);
  assert.notEqual(result[0].latitude, 35.721234);
  assert.notEqual(result[0].longitude, 51.334567);
  assert.equal(LOCATION_CONTRACT.exactCoordinates, 'internal-only');
});

test('location read rejects an event returned from another tenant', async () => {
  const repository = {
    async listLocationEvents() {
      return [{ id: 'loc-cross', userId: 'usr_1', sessionId: 'ses_1', tenantId: 'tenant-b', latitude: 1, longitude: 2, accuracy: 10, timestamp: 1000, source: 'browser', purpose: 'session', consent: true }];
    },
  };
  const core = new PersistentAfxCore({ repository });
  await assert.rejects(
    () => core.listLocationEvents({ context: { userId: 'usr_1', tenantId: 'tenant-a', sessionId: 'ses_1' } }),
    /forbidden/
  );
});

test('public location mapper never returns exact stored coordinates', () => {
  const result = toPublicLocationEvent({
    id: 'loc_2', userId: 'usr_2', sessionId: 'ses_2', tenantId: 'tenant-a',
    latitude: 48.856612, longitude: 2.352221, accuracy: 5, timestamp: 2000,
    source: 'browser', purpose: 'login', consent: true,
  });
  assert.equal(result.latitude, 48.86);
  assert.equal(result.longitude, 2.35);
});
