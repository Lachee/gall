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

    /** Gets the user's avatar */
    getAvatarUrl(size = 64) {
        ///api/proxy?url=https%3A%2F%2Fd.lu.je%2Favatar%2F130973321683533824%3Fsize%3D64
        return `https://d.lu.je/avatar/${this.snowflake}?size=${size}`;
    }

    /** Gets the user's avatar in a proxied way */
    getProxiedAvatarUrl(size = 64) {

        return '/api/proxy?url=' + encodeURIComponent(this.getAvatarUrl(size));
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
    proxy;
    origin;
    thumbnail;
    isCover;

    constructor(api, data) {
        super(api);
        this.id = data.id;
        this.url = data.url;
        this.proxy = data.proxy;
        this.origin = data.origin;
        this.isCover = data.is_cover;
        this.thumbnail = data.thumbnail;
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

    /** Gets the URL used to display the image 
     * @return {String} the URL
    */
    getThumbnail() {
        if (this.thumbnail != null && this.thumbnail != '')  return this.thumbnail;
        if (this.proxy != null && this.proxy != '')  return this.proxy;
        return this.getProxyUrl();
    }
}