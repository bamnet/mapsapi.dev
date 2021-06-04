import { CloudProject, CloudResourceManagerV1Project, hasMaps, listProjects } from "./cloud";

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
