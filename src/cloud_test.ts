import { CloudProject, CloudResourceManagerV1Project, hasMaps, listKeys, listProjects } from './cloud';

describe('listProjects', function () {
  beforeEach(() => {
    (global as any).gapi = {
      client: {
        serviceusage: { services: { list: () => { } } },
        cloudresourcemanager: { projects: { list: () => { } } },
      }
    };
  });
  it('finds and filters projects', async function () {
    spyOn(gapi.client.cloudresourcemanager.projects, 'list').and.resolveTo({
      result: {
        projects: <CloudResourceManagerV1Project[]>[
          { projectNumber: '415104041262', projectId: 'tokyo-rain-123', 'name': 'My Project' },
          { projectNumber: '123', projectId: 'no-maps-here', name: 'No Maps Here' },
        ]
      },
      body: '',
    });
    spyOn(gapi.client.serviceusage.services, 'list')
      .withArgs({
        parent: 'projects/415104041262',
        filter: 'state:ENABLED',
        fields: 'services.name',
      }).and.resolveTo({
        result: {
          services: [
            { name: 'projects/415104041262/services/another-api.googleapis.com' },
            { name: 'projects/415104041262/services/maps-backend.googleapis.com' },
          ],
        },
        body: '',
      })
      .withArgs({
        parent: 'projects/123',
        filter: 'state:ENABLED',
        fields: 'services.name',
      }).and.resolveTo({
        result: {
          services: [
            { name: 'projects/123/services/another-api.googleapis.com' },
          ],
        },
        body: '',
      });

    const results = await listProjects();
    expect(results).toEqual(<CloudProject[]>[{ name: 'My Project', number: '415104041262', keys: [] }]);
  });
});

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

describe('listKeys', function () {
  beforeEach(() => {
    (global as any).gapi = {
      client: { apikeys: { projects: { locations: { keys: { list: () => { } } } } } }
    };
  });

  it('lists key metadata', async function () {
    spyOn(gapi.client.apikeys.projects.locations.keys, 'list').and.resolveTo({
      result: {
        keys: [
          { name: 'projects/123/locations/global/keys/unrestricted-key' },
          {
            name: 'projects/123/locations/global/keys/http-restrictions',
            restrictions: {
              browserKeyRestrictions: {
                allowedReferrers: ['http://localhost:8080', 'http://test.com/page']
              }
            }
          }, {
            name: 'projects/123/locations/global/keys/android-restrictions',
            restrictions: {
              androidKeyRestrictions: {
                allowedApplications: [{ packageName: 'com.my.android.package' }]
              }
            }
          }, {
            name: 'projects/123/locations/global/keys/ios-restrictions',
            restrictions: {
              iosKeyRestrictions: {
                allowedBundleIds: ['com.my.ios.package']
              }
            }
          },
        ],
      },
      body: '',
    });

    const result = await listKeys('123');
    expect(result).toEqual([
      { name: 'projects/123/locations/global/keys/unrestricted-key', sites: [] },
      { name: 'projects/123/locations/global/keys/http-restrictions', sites: ['http://localhost:8080', 'http://test.com/page'] },
      { name: 'projects/123/locations/global/keys/android-restrictions', sites: ['com.my.android.package'] },
      { name: 'projects/123/locations/global/keys/ios-restrictions', sites: ['com.my.ios.package'] },
    ]);
  });

  it('handles no keys', async function () {
    spyOn(gapi.client.apikeys.projects.locations.keys, 'list').and.resolveTo({
      result: {},
      body: '',
    });

    const result = await listKeys('empty');
    expect(result).toEqual([]);
  });

  it('formats file keys correctly', async function () {
    spyOn(gapi.client.apikeys.projects.locations.keys, 'list').and.resolveTo({
      result: {
        keys: [{
          name: 'file_key',
          restrictions: {
            browserKeyRestrictions: {
              allowedReferrers: ['__file_url__//path/to/']
            }
          }
        }]
      },
      body: '',
    });

    const result = await listKeys('empty');
    expect(result).toEqual([{ name: 'file_key', sites: ['file:///path/to/'] }]);
  });
});
