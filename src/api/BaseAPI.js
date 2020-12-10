export class BaseAPI {

    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async favourite(gallery = null) {
        if (gallery == null) gallery = kiss.PARAMS.gallery_id;
        if (gallery == null) throw new Error('Cannot favourite gallery without an id. Either pass an ID or visit a gallery page');
       
        console.log('Favouriting', gallery);
        return await this.fetch('POST', `/gallery/${gallery}/favourite`);
    }

    async unfavourite(gallery = null) {
        if (gallery == null) gallery = kiss.PARAMS.gallery_id;
        if (gallery == null) throw new Error('Cannot favourite gallery without an id. Either pass an ID or visit a gallery page');
       
        console.log('Unfavouriting', gallery);
        return await this.fetch('DELETE', `/gallery/${gallery}/favourite`);
    }

    /** Queries the API
     * @param {*} method 
     * @param {*} endpoint 
     */
    async fetch(method, endpoint, data = null) {

        const body = data ? JSON.stringify(data) : null;
        let response = await fetch(`${this.baseUrl}${endpoint}`, { 
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: body
        });

        if (!response.ok) {
            console.error("Failed ", method, endpoint, response, await response.json());
            return null;
        }
    
        let json = await response.json();
        console.log(method, endpoint, data, body, json);
        return json.data;
    }
}


