import './styles/main.css'

const API_KEY_API_DISCOVERY = 'https://apikeys.googleapis.com/$discovery/rest?version=v2';
const SCOPE = 'https://www.googleapis.com/auth/cloud-platform.read-only';

// TODO(bamnet): Move the key and client id to configs.
const API_KEY = 'AIzaSyByDFeQu8GObexTfwDf4n5xKxSyx3QCARg';
const CLIENT_ID = '822692363328-ukj4juardgrhh9bh7rhr5i46dphn3h8e.apps.googleusercontent.com';

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

let googleAuth: gapi.auth2.GoogleAuth;

function initAuth() {
    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: [API_KEY_API_DISCOVERY],
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
        getKey();
    } else {
        btn.innerHTML = 'Sign In';
    }
}

function getKey() {
    // TODO(bamnet): Don't hardcode the project.
    gapi.client.apikeys.projects.locations.keys.list(
        { parent: 'projects/822692363328/locations/global' }
    ).then((response: any) => {
        const results = <gapi.client.apikeys.V2ListKeysResponse>response.result;
        if (results.keys && results.keys?.length > 0) {
            const keyName = results.keys[0].name || '';
            return gapi.client.apikeys.projects.locations.keys.getKeyString(
                { name: keyName });
        }
    }).then((response: any) => {
        const result = <gapi.client.apikeys.V2GetKeyStringResponse>response.result;
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