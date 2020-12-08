import { XVE } from "../xve";
import { Component } from "./Component";

export class PageComponent extends Component {
    
    /** @type {XVE} the xve  */
    xve = null;

    constructor(xve) {
        super();
        this.xve = xve;
    }
    
    getName() { return "PageComponent" }
    getTitle(state) {  return state ? state.title || state.placeholder || state.url : 'Webpage'; }

    render(window) {
        if (!window.iframe) {
            //Load the page
            const $iframe = window.iframe = $('<iframe width="100%" height="100%"></iframe>');
            window.prime().append($iframe);

            //When we load, update our own title.
            $iframe.on('load', async (e) => {
                const state = window.state;
                if (!state.title) {
                    let title = this.getTitle(state);

                    try {
                        const document = $iframe.get(0).contentDocument || $iframe.get(0).contentWindow.document;
                        title = document.title;
                    }catch(e) {
                        //We cannot read the contents, so lets proxy fetch it
                        let metadata = await this.xve.api.getProxiedMetadata($iframe.attr('src'));
                        title = metadata['og:title'] || metadata['title'] || title;
                    }

                    //Set the title
                    window.title = title;
                } else {
                    window.title = state.title;
                }
            });

            //SEt the source
            $iframe.attr('src', window.state.url);
        }
    }

    async build(container, state) {
           
        //Create the iframe
        let $iframe = state._iframe;
        if (!$iframe) {
            
            //Create the iframe
            $iframe = state._iframe = $('<iframe width="100%" height="100%"></iframe>');

            //Set the source
            console.log("PageComponent loading:", state.url);

            
            
            //Set the root
            container.getElement().html($iframe);
            container.setState(state);
        }
        
        //When we open, we want to subscribe to the state change event
        container.on('open', () => {
            this.layout.on('stateChanged', () => {
                const state = container.getState();
                if (state._iframe && state._iframe.attr('src') != state.url) {
                    console.log("PageComponent loading (state change):", state._iframe, state.url);
                    state._iframe.attr('src', state.url);
                }

                if (state.title && state.title != container.title) 
                    container.setTitle(state.title);
            });
        });
         
    }
}