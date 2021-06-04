import { asyncFilter } from "./util";

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
    const projects = (<CloudResourceManagerV1Project[]>projectResp.result.projects || []).map(
        p => ({ name: p.name, number: p.projectNumber, keys: [] })
    );

    return asyncFilter(projects, async (project) => await hasMaps(`projects/${project.number}`));
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

    const services = (serviceResp.result.services || []).map((s) => (s.name!.slice(`${project}/services/`.length)));
    const maps_apis = [
        // TODO(bamnet): This list is woefully inadequate.
        'geocoding-backend.googleapis.com',
        'maps-backend.googleapis.com',
        'elevation-backend.googleapis.com',
        'timezone-backend.googleapis.com',
    ];

    return services.some((service) => maps_apis.includes(service));
};