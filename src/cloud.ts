import {asyncFilter} from './util';

export interface CloudProject {
  name: string;
  number: string;
  keys: Key[];
}

export interface Key {
  name: string;
  sites: string[];
}

/**
 * A Project is a high-level Google Cloud Platform entity.
 *
 * It is a container for ACLs, APIs, App Engine Apps, VMs, and other Google Cloud Platform resources.
 *
 * ref: https://cloudresourcemanager.googleapis.com/$discovery/rest?version=v1
 */
export interface CloudResourceManagerV1Project {
  /**
   * The optional user-assigned display name of the Project.
   *
   * When present it must be between 4 to 30 characters.
   *
   * Example: `My Project`
   */
  name: string;

  /**
   * The unique, user-assigned ID of the Project.
   *
   * It must be 6 to 30 lowercase letters, digits, or hyphens.
   * It must start with a letter. Trailing hyphens are prohibited.
   *
   * Example: `tokyo-rain-123`
   */
  projectId: string;

  /**
   * The number uniquely identifying the project.
   *
   * Example: `415104041262`
   */
  projectNumber: string;
}

/**
 * listProjects finds all the Maps-enabled projects the current user has access to.
 *
 * @returns An array of Maps-enabled projects.
 */
export async function listProjects(): Promise<CloudProject[]> {
  const projectResp = await gapi.client.cloudresourcemanager.projects.list();
  const projects = (
    <CloudResourceManagerV1Project[]>projectResp.result.projects || []
  ).map(p => ({name: p.name, number: p.projectNumber, keys: []}));

  return asyncFilter(
    projects,
    async project => await hasMaps(`projects/${project.number}`)
  );
}

/**
 * hasMaps check if a project has a Maps API enabled.
 *
 * @param project - The projec id, prefixed with "projects/".
 * @returns True if the project has any Maps API enabled.
 */
export async function hasMaps(project: string) {
  // if(project != 'projects/222519753331') {
  //     return false;
  // }
  const serviceResp = await gapi.client.serviceusage.services.list({
    parent: project,
    filter: 'state:ENABLED',
    fields: 'services.name',
  });

  const services = (serviceResp.result.services || []).map(s =>
    s.name!.slice(`${project}/services/`.length)
  );
  const maps_apis = [
    'maps-backend.googleapis.com',
    'geocoding-backend.googleapis.com',
    'places-backend.googleapis.com',
    'directions-backend.googleapis.com',
    'distance-matrix-backend.googleapis.com',
    'geolocation.googleapis.com',
    'elevation-backend.googleapis.com',
    'maps-embed-backend.googleapis.com',
    'maps-android-backend.googleapis.com',
    'maps-ios-backend.googleapis.com',
    'static-maps-backend.googleapis.com',
    'roads.googleapis.com',
    'street-view-image-backend.googleapis.com',
    'timezone-backend.googleapis.com',
  ];

  return services.some(service => maps_apis.includes(service));
}

/**
 * listKeys gets metadata about all the keys associated with a project.
 *
 * @param projectNumber Cloud project number to lookup keys from.
 * @returns Array of Key metadata objects.
 */
export async function listKeys(projectNumber: string) {
  const keys = await gapi.client.apikeys.projects.locations.keys.list({
    parent: `projects/${projectNumber}/locations/global`,
  });

  if (keys.result.keys === undefined) {
    return [];
  }

  return keys.result.keys.map(key => {
    const restrictions: string[] = [];
    if (key.restrictions?.androidKeyRestrictions?.allowedApplications) {
      key.restrictions.androidKeyRestrictions.allowedApplications.forEach(a => {
        if (a.packageName) {
          restrictions.push(a.packageName);
        }
      });
    }
    if (key.restrictions?.browserKeyRestrictions?.allowedReferrers) {
      const referers =
        key.restrictions.browserKeyRestrictions.allowedReferrers.map(k => {
          // TODO(bamnet): Get confirmation in case 34401236 to see if this is correct.
          return k.replace(/^__file_url__\//, 'file://');
        });
      restrictions.push(...referers);
    }
    if (key.restrictions?.iosKeyRestrictions?.allowedBundleIds) {
      restrictions.push(
        ...key.restrictions.iosKeyRestrictions.allowedBundleIds
      );
    }
    return <Key>{name: key.name, sites: restrictions};
  });
}
