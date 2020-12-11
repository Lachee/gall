import './app.scss';

//Get the route and remove the first element
export let view;
export let action;
export let widgets = [];

import { BaseAPI } from './api/BaseAPI';
export const api = new BaseAPI('/api');

//export const route = kiss.ROUTE || window.location.pathname.split('/'); 
//route.shift();
//
////Prepare hte directories
//const sourceDirectory =  route.slice(0, -1).join('/') || 'main';
//const actionName = route.slice(-1)[0] || 'index'; 

const sourceDirectory = kiss.JS_PATH;
const actionName = kiss.ACTION;
console.log("Loading route's JS", { sourceDirectory, actionName });

//TODO: Put this in KISS

//Actually load the actions index
// It has to be manually written out because webpack will generate a pattern
export const globalPromise = new Promise((resolve, reject) => {
    document.addEventListener('DOMContentLoaded', () => {
        import(
            `./global-view.js` 
        ).then(v => {
            if (v == null)  console.error("Failed to load the global. Please ensure the global.js exists");
            console.log('Loaded Global. Application is ready to roll!');
            view = v;
            resolve(v);
        }).catch(e => reject(e));
    });
}).catch(e => { console.error("Failed to initialize the Global View.", e); });

//Actually load the index
// It has to be manually written out because webpack will generate a pattern
export const viewPromise = new Promise((resolve, reject) => {
    import(
        /* webpackChunkName: `[request]` */ 
        `../views${sourceDirectory}/_view.js`
    ).then(v => {
        if (v == null)  console.warn("Failed to find the view ", sourceDirectory + "/_view.js");
        console.log('Loaded View');
        view = v;
        resolve(v);
    }).catch(e => reject(e));
}).catch(e => { console.error("Failed to initialize the View.", e); });

//Actually load the actions index
// It has to be manually written out because webpack will generate a pattern
export const actionPromise = new Promise((resolve, reject) => {
    import(
        /* webpackChunkName: "[request]" */
        "../views" + sourceDirectory + `/${actionName}.js` 
    ).then(v => {
        if (v == null)  console.warn("Failed to find the action ", sourceDirectory + actionName + ".js");
        console.log('Loaded Action');
        view = v;
        resolve(v);
    }).catch(e => reject(e));
}).catch(e => { console.error("Failed to initialize the Action.", e); });

//Load allt he widgets
export const widgetPromise = new Promise((resolve, reject) => {
    import(
        /* webpackChunkName: "[widgets]" */
        "../widget/src/" 
    ).then(w => {
        if (w == null)  console.warn("Failed to load widgets");
        console.log('Loaded Widgets');
        widgets.push(w);
        resolve(w);
    }).catch(e => reject(e));
}).catch(e => { console.error("Failed to initialize the Widgets.", e); });
