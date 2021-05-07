/// <reference types="@maxim_mazurok/gapi.client.apikeys" />

import './styles/main.css'

import { asyncFilter } from './util';

const API_KEY_API_DISCOVERY = 'https://apikeys.googleapis.com/$discovery/rest?version=v2';
const CLOUD_RESOURCE_MANAGER_API_DISCOVERY = 'https://cloudresourcemanager.googleapis.com/$discovery/rest?version=v1';
const SERVICE_USAGE_API_DISCOVERY = 'https://serviceusage.googleapis.com/$discovery/rest?version=v1';
const SCOPE = 'https://www.googleapis.com/auth/cloud-platform.read-only';

// TODO(bamnet): Move the key and client id to configs.
const API_KEY = 'AIzaSyByDFeQu8GObexTfwDf4n5xKxSyx3QCARg';
const CLIENT_ID = '822692363328-ukj4juardgrhh9bh7rhr5i46dphn3h8e.apps.googleusercontent.com';

let googleAuth: gapi.auth2.GoogleAuth;

function init() {
    const btn = <HTMLButtonElement>document.getElementById('auth');
    btn.onclick = handleAuthClick;

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
        gapi.load('client:auth2', initAuth);
    };
    script.async = true;
    document.body.appendChild(script);
}

function initAuth() {
    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: [
            API_KEY_API_DISCOVERY,
            CLOUD_RESOURCE_MANAGER_API_DISCOVERY,
            SERVICE_USAGE_API_DISCOVERY,
        ],
        scope: SCOPE,
    }).then(() => {
        googleAuth = gapi.auth2.getAuthInstance();
        googleAuth.isSignedIn.listen(authChange);
        authChange();
    });
}

function authChange() {
    const btn = <HTMLButtonElement>document.getElementById('auth');
    const user = googleAuth.currentUser.get();
    if (user.hasGrantedScopes(SCOPE)) {
        btn.innerHTML = 'Sign Out';
        projectSummary().then((projects) => {
            // console.log(projects);
            const select = <HTMLSpanElement>document.getElementById('projects');
            if (Object.keys(projects).length <= 0) {
                return;
            }
            
            let selected = '';

            select.innerHTML = ''; // Remove the placeholder
            Object.keys(projects).forEach((number) => {
                const summary = projects[number];
                if (selected == '') {
                    selected = number;
                    select.innerText = summary.name;

                    showKey(summary.keys[0].name);

                    const siteElem = <HTMLSpanElement>document.getElementById('site');
                    const sites = summary.keys[0].sites;
                    if (sites.length >= 1) {
                        siteElem.innerText = sites[0];
                    } else {
                        siteElem.innerText = 'anywhere';
                    }
                }
                
            });            
        });
    } else {
        btn.innerHTML = 'Sign In';
    }
}

interface CloudProject {
    name: string;
    number: string;
    keys: Key[];
}

interface Key {
    name: string;
    sites: string[];
}

async function listProjects() {
    const projectResp = await gapi.client.cloudresourcemanager.projects.list();
    const projects = (projectResp.result.projects || []).map(
        (p: any) => (<CloudProject>{ name: p.name, number: p.projectNumber, keys: [] })
    );

    return asyncFilter(projects, async (project) => await hasMaps(`projects/${project.number}`));
}

async function projectSummary() {
    const projects = await listProjects();
    return await projects.reduce(async (obj, proj) => {
        proj.keys = await listKeys(proj.number);
        obj.then(obj => obj[proj.number] = proj );
        return obj;
    }, Promise.resolve(<{ [key: string]: CloudProject; }>{}));
}

async function listKeys(projectNumber: string) {
    const keys = await gapi.client.apikeys.projects.locations.keys.list(
        { parent: `projects/${projectNumber}/locations/global` }
    );

    if (keys.result.keys == undefined) {
        return [];
    }

    return keys.result.keys.map((key) => {
        const restrictions: string[] = [];
        if (key.restrictions?.androidKeyRestrictions?.allowedApplications) {
            key.restrictions.androidKeyRestrictions.allowedApplications.forEach(a => {
                if (a.packageName) {
                    restrictions.push(a.packageName);
                }
            });
        }
        if (key.restrictions?.browserKeyRestrictions?.allowedReferrers) {
            restrictions.push(...key.restrictions.browserKeyRestrictions.allowedReferrers);
        }
        if (key.restrictions?.iosKeyRestrictions?.allowedBundleIds) {
            restrictions.push(...key.restrictions.iosKeyRestrictions.allowedBundleIds);
        }
        return <Key>{name: key.name, sites: restrictions};
    });
}

// hasMaps returns true if a project has a Maps API enabled.
async function hasMaps(project: string) {
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
}

function showKey(keyName: string) {
    gapi.client.apikeys.projects.locations.keys.getKeyString(
                { name: keyName }).then((response) => {
        const result = response.result;
        const elem = document.getElementById('key')!;
        elem.innerHTML = result.keyString || '';
    });
}

function handleAuthClick() {
    if (googleAuth.isSignedIn.get()) {
        // Don't just sign out, revoke the authorization entirely.
        googleAuth.disconnect();
        const elem = document.getElementById('key')!;
        elem.innerHTML = '...'
    } else {
        googleAuth.signIn();
    }
}

init();