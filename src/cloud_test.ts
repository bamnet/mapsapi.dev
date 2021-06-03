import { hasMaps } from "./cloud";

describe('hasMaps', function () {
  beforeEach(() => {
    (global as any).gapi = {
      client: { serviceusage: { services: { list: () => { } } } }
    };
  });
  it('returns true when project has maps', async function () {
    spyOn(gapi.client.serviceusage.services, 'list').and.resolveTo({
      result: {
        services: [
          { name: 'projects/0123/services/another-api.googleapis.com' },
          { name: 'projects/0123/services/maps-backend.googleapis.com' },
        ],
      },
      body: '',
    });

    const result = await hasMaps('projects/MAPS');
    expect(result).toBeTrue();
  });

  it('returns false when project has no maps', async function () {
    spyOn(gapi.client.serviceusage.services, 'list').and.resolveTo({
      result: {
        services: [
          { name: 'projects/0123/services/another-api.googleapis.com' },
        ],
      },
      body: '',
    });

    const result = await hasMaps('projects/NO_MAPS');
    expect(result).toBeFalse();
  });
});
