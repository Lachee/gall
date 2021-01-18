import { BaseAPI} from './BaseAPI.mjs';
export class APIObject {
    
    /** @type {BaseAPI} */
    #api;

    /** @return {BaseAPI} the base API */
    get api() { return this.#api; }

    /** @param {BaseAPI} api the base api*/
    constructor(api) {
        this.#api = api;
    }

}

export class User extends APIObject{

    uuid;
    snowflake;
    username;
    displayName;
    profileName;
    profileImage;

    constructor(api, data) {
        super(api);
        this.uuid = data.uuid;
        this.snowflake = data.snowflake;
        this.username = data.username;
        this.displayName = data.displayName;
        this.profileName = data.profileName;
        this.profileImage = data.profileImage ? new Image(api, data.profileImage) : null;
    }

}

export class Gallery extends APIObject{

    id;
    identifier;
    type;
    founder;
    title;
    description;
    url;
    cover;
    views;
    isNew;

    constructor(api, data) {
        super(api);
        this.id             = data.id;
        this.identifier     = data.identifier;
        this.type           = data.type;
        this.founder        = data.founder ? new User(api, data.founder) : null;
        this.title          = data.title;
        this.description    = data.description;
        this.url            = data.url;
        this.cover          = data.cover ? new Image(api, data.cover) : null;
        this.views          = data.views !== null ? data.views : 0;
        this.isNew          = data.views === null;
    }

}

export class Image extends APIObject{

    id;
    url;
    origin;
    isCover;

    constructor(api, data) {
        super(api);
        this.id = data.id;
        this.url = data.url;
        this.origin = data.origin;
        this.isCover = data.is_cover;
    }

    /** Gets the Proxy URL
     * @return {String} the URL
     */
    getProxyUrl(size = 250, algo = 'BICUBIC') {
        const url = encodeURIComponent(this.url || this.origin);
        return `${this.api.baseUrl}/proxy?url=${url}&size=${size}&algo=${algo}`;
    }

    /** Gets the URL used to display the image 
     * @return {String} the URL
    */
    getUrl() {
        if (this.url != null && this.url != '')  return this.url;
        if (this.proxy != null && this.proxy != '')  return this.proxy;
        const url = encodeURIComponent(this.origin);
        return `${this.api.baseUrl}/proxy?url=${url}`;
    }

}