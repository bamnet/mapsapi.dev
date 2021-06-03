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