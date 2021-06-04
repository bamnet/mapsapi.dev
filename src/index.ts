import './styles/main.css';

import {listProjects, CloudProject, listKeys} from './cloud';

const API_KEY_API_DISCOVERY =
  'https://apikeys.googleapis.com/$discovery/rest?version=v2';
const CLOUD_RESOURCE_MANAGER_API_DISCOVERY =
  'https://cloudresourcemanager.googleapis.com/$discovery/rest?version=v1';
const SERVICE_USAGE_API_DISCOVERY =
  'https://serviceusage.googleapis.com/$discovery/rest?version=v1';
const SCOPE = 'https://www.googleapis.com/auth/cloud-platform.read-only';

const API_KEY = process.env.API_KEY;
const CLIENT_ID = process.env.CLIENT_ID;

let googleAuth: gapi.auth2.GoogleAuth;

function init() {
  const btn = <HTMLButtonElement>document.getElementById('auth');
  btn.onclick = handleAuthClick;

  const modalContinue = <HTMLButtonElement>document.getElementById('continue');
  modalContinue.onclick = () => {
    document.getElementById('modal')!.classList.add('hidden');
    googleAuth.signIn();
  };

  const modalCancel = <HTMLButtonElement>document.getElementById('cancel');
  modalCancel.onclick = () => {
    document.getElementById('modal')!.classList.add('hidden');
  };

  const script = document.createElement('script');
  script.src = 'https://apis.google.com/js/api.js';
  script.onload = () => {
    gapi.load('client:auth2', initAuth);
  };
  script.async = true;
  document.body.appendChild(script);
}

function initAuth() {
  gapi.client
    .init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: [
        API_KEY_API_DISCOVERY,
        CLOUD_RESOURCE_MANAGER_API_DISCOVERY,
        SERVICE_USAGE_API_DISCOVERY,
      ],
      scope: SCOPE,
    })
    .then(() => {
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
    document.querySelectorAll('.signed-out').forEach(e => {
      e.classList.add('hidden');
    });
    projectSummary().then(projects => {
      const select = <HTMLSpanElement>document.getElementById('projects');
      if (Object.keys(projects).length <= 0) {
        document.getElementById('auth-details')!.style.display = 'none';
        document.getElementById('no-projects')!.style.display = '';
        document.getElementById('key')!.innerHTML = '...';
        return;
      }

      document.getElementById('auth-details')!.style.display = '';
      document.getElementById('no-projects')!.style.display = 'none';

      let selected = '';

      select.innerHTML = ''; // Remove the placeholder
      Object.keys(projects).forEach(number => {
        const summary = projects[number];
        if (selected === '') {
          selected = number;
          select.innerText = summary.name;

          showKey(summary.keys[0].name);

          const siteElem = <HTMLSpanElement>document.getElementById('site');
          const sites = summary.keys[0].sites;
          if (sites.length >= 1) {
            siteElem.innerHTML = sites.join('<br>');
          } else {
            siteElem.innerText = 'anywhere';
          }
        }
      });
    });
  } else {
    btn.innerHTML = 'Sign In';
    document.querySelectorAll('.signed-out').forEach(e => {
      e.classList.remove('hidden');
    });
  }
}

async function projectSummary() {
  const projects = await listProjects();
  return await projects.reduce(async (obj, proj) => {
    proj.keys = await listKeys(proj.number);
    obj.then(obj => (obj[proj.number] = proj));
    return obj;
  }, Promise.resolve(<{[key: string]: CloudProject}>{}));
}

function showKey(keyName: string) {
  gapi.client.apikeys.projects.locations.keys
    .getKeyString({name: keyName})
    .then(response => {
      const result = response.result;
      document.getElementById('key')!.innerHTML = result.keyString || '';
    });
}

function handleAuthClick() {
  if (googleAuth.isSignedIn.get()) {
    // Don't just sign out, revoke the authorization entirely.
    googleAuth.disconnect();
    document.getElementById('key')!.innerHTML = '...';
  } else {
    const modal = document.getElementById('modal')!;
    modal.classList.remove('hidden');
  }
}

init();
