import Bricks from 'bricks.js';

import 'viewerjs/dist/viewer.css';
import Viewer from 'viewerjs';
import {delegate} from 'tippy.js';

/** @var {./src/api/BaseAPI} api */
const api = app.api;
const gallery_cache = {};
const includeTooltip = true;

if (includeTooltip) {
    delegate('#grid', {
        target: '[data-tooltip]',
        allowHTML: true,
        multiple: true,
        content: (reference) => {
            const content = reference.getAttribute('data-tooltip');
            return content;
        },
    });
}

/** Animates the button */
const animateButton = (button) => {
    if (button == null) {
        console.error('cannot animate because button is null');
        return false;
    }
    if (button.classList.contains('anim-rubber')) {
        
    console.log('removing class from', button);
        button.classList.remove('anim-rubber');
        setTimeout(() => animateButton(button), 100);
        return;
    }
    console.log('adding class to', button);
    button.classList.add('anim-rubber');
}

(async () => {

    let currentIndex;
    let currentCount = 0;

    //Prepare the grid container
    const container = document.getElementById('grid');
    const $container = $(container);
    

    //Prepare the Bricks.js instance. This handles the masonry for us,
    const sizes = [
        { columns: 1, gutter: 5 },
        { mq: '600px', columns: 2, gutter:1  },
        { mq: '700px', columns: 2, gutter: 5 },
        { mq: '970px', columns: 3, gutter: 5 },
        { mq: '1260px', columns: 4, gutter: 5 },
        { mq: '1560px', columns: 5, gutter: 5 },
        { mq: '1860px', columns: 6, gutter: 5 },
        { mq: '2160px', columns: 7, gutter: 5 },
    ];
    const instance =  Bricks({
        container:  container,
        packed:     'data-packed',
        sizes:      sizes,
        position:   true
    });
    instance.resize(true);

    const viewer = new Viewer(container, {
        container: document.getElementById('grid-viewer'),
        toolbar: {
            zoomIn: 4,
            zoomOut: 4,
            oneToOne: 4,
            reset: 4,
            prev: 4,
            play: {
              show: 4,
              size: 'large',
            },
            next: 4,
            rotateLeft: 4,
            rotateRight: 4,
            visitPage: {
                show: true,
                size: 64,
                click: (e) => { 
                    const index = viewer.index;
                    const $img = $(`#grid-img-${index}`);
                    const id = $img.attr('data-gallery');
                    window.location = `/gallery/${id}/`; 
                },
            },
            favourite: {
                show: true,
                size: 64,
                click: async (e) => { 
                    const index = viewer.index;
                    const $img = $(`#grid-img-${index}`);
                    const id = $img.attr('data-gallery');
                    await api.favourite(id);    //TODO: Improve this to give feedback that it did something
                },
            }
        },
        url: function(image) {
            const url = image.getAttribute('src-alt');
            return url || 'https://http.cat/404';
        },
    });


    /** Loads a Gallery Page and creates DOM elements.
     * @return {Boolean} true if there is more content to be loaded still.
     */
    async function loadPage(page = 1) {
        
        const limit = 5;

        const urlParams = new URLSearchParams(window.location.search);
        const terms = urlParams.get('q');

        //Fetch the next page of galleries. if we got none then we will tell the caller there is none left.
        let galleries = await api.findGalleries({ tags: terms }, page, limit);
        if (galleries.length == 0) { 
            console.warn('no more images, aborting load');
            return false;
        }

        //Reload everything
        let loadPromise = [];
        for(let i in galleries) {

            let load = async () => {
                //Load the gallery and store it in the cache
                const gallery = galleries[i];
                gallery_cache[gallery.id] = gallery;
                console.log('loading gallery', gallery.id, gallery.title);

                //Fetch the image, and add an item for each image.
                const images = await gallery.fetchImages();
                for(var k in images) {

                    const image = images[k];
                    if (image.isCover) continue;
                    
                    const image_url = image.getUrl();
                    const thumbnail_url = image.getThumbnail();

                    //Prepare the container
                    const $div = $('<div>');
                    $div.addClass('grid-image-container');
                    $div.attr('data-gallery', gallery.id);

                    //Add a info box
                    const favouritedStyle = gallery.favourited ? 'fas' : 'fal';
                    const $panel = $(`
                    <div class='grid-panel is-hidden'>
                        <div class='columns'>
                            <div class='column'>
                                <div class="profile-hint" data-tooltip="${gallery.founder.displayName}">
                                    <a href="/profile/${gallery.founder.profileName || gallery.founder.snowflake}/">
                                        <img class="avatar" src="${gallery.founder.getAvatarUrl()}" alt="${gallery.founder.displayName}">
                                    </a>
                                </div>
                            </div>
                            <div class='column'>
                                <div class='buttons has-addons is-full-width'>
                                    <a class='button button-favourite' data-tooltip='Favourite the gallery'>
                                        <span class="icon is-small"><i class="${favouritedStyle} fa-fire"></i></span>
                                    </a>
                                    <a class='button button-pin' data-tooltip='Pin to your profile'>
                                        <span class="icon is-small"><i class="fal fa-map-pin"></i></span>
                                    </a>
                                    
                                    <a href='/gallery/${gallery.id}/' class='button button-view' data-tooltip='Open gallery'>
                                        <span class="icon is-small"><i class="fal fa-eye"></i></span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>`);
                    $div.append($panel);
                    
                    //$panel.find('.button-view').on('click', () => $div.addClass('focused'));
                    $panel.find('.button-favourite').on('click', async (e) => {
                        const setState = function(state) {
                            $container
                                .find(`.grid-image-container[data-gallery=${gallery.id}] .button-favourite i`)
                                .removeClass(state ? 'fal' : 'fas')
                                .addClass(state ? 'fas' : 'fal');
                        };

                        //Set the state, then eventually update it to what the state actually is
                        animateButton($('.button-favourite').get(0));
                        setState(!gallery.favourited);
                        setState(await gallery.toggleFavourite());
                    });
                    
                    $panel.find('.button-pin').on('click', async function(e) {    //cannot use arrow function because that doesn't rebind the context.
                        animateButton($('.button-pin').get(0));
                        await image.pin();
                    });



                    //Add the image
                    const $img = $('<img>').attr('src', thumbnail_url);
                    $img.addClass('grid-image');
                    $img.attr('src-alt', image_url);
                    $img.attr('data-image', image.id);
                    $img.attr('id', 'grid-img-' + (currentCount++));
                    $div.append($img);

                    //Append to container
                    $container.append($div);
                    

                    //Add the image load event as a promise
                    loadPromise.push(
                        new Promise((imageResolve, imageReject) => {
                            $img.one('load', () => { $panel.removeClass('is-hidden'); pack(); imageResolve(); });
                            $img.one('error', () => { imageReject(); });
                        })
                    );
                }

            };

            //Push the function
            loadPromise.push(load());
        }

        //We need to wait for all the images to finish loading so we can more accurately pack them.
        await Promise.any([
            new Promise((resolve, reject) => setTimeout(() => { resolve(); }, 5000) ),
            Promise.all(loadPromise),
        ]);

        //pack();
        //instance.update(); // While update is faster, it doesn't produce accurate results.

        //If we did not get a full list, then we are done.
        return galleries.length == limit;
    }

    // Slowly load all the pages.
    // The loadPage function returns true if it thinks there is more images left. 
    //   - This will result in a extra request when we have finished loading everything, but this is easy for now.
    let page = 1;
    let isLoadingPage = false;
    let moreImagesAvailable = true;
    moreImagesAvailable = await loadPage(page);

    container.addEventListener('viewed', async (e) => { 
        console.log('viewed', e, viewer);
        currentIndex = e.detail.index;
        if (e.detail.index == viewer.length-1) {
            console.log('Load Next Page');
            await loadPage(++page);
            viewer.view(e.detail.index);
        }
    });

    //When the button becomes visible, load the next page
    const loader = document.getElementById('grid-loader');
    loader.isVisible = () => isElementInViewport(loader);
    loader.shouldLoadMore = () => loader.isVisible() && !isLoadingPage && moreImagesAvailable;

    //We hook the visibility handler to some key events in the dom, mainly scroll.
    // But we will also call it once too, so we can immediately update if we didn't load enough images initially
    $(loader).on('click', () => { 
        console.log('Forcing to next page');
        isLoadingPage = true;
        moreImagesAvailable = true;
        nextPage(); 
    });
    $(window).on('DOMContentLoaded load resize scroll touch', (e) => {
        if (loader.shouldLoadMore()) nextPage();
    });
    
    async function nextPage() {
        console.log('Next Page was called. Pages Available:', moreImagesAvailable);
                
        try {
            //Load the pages
            isLoadingPage = true;
            loader.innerText = 'loading';
            moreImagesAvailable = await loadPage(++page);
            
            //Update our states
            console.log('Finished loading pages. Pages Available:', moreImagesAvailable);
            if (moreImagesAvailable) {
                //Check if we should load more
                if (loader.isVisible()) 
                    await nextPage();
            }

        }catch(e) { 
            loader.innerText = 'error occured';
            throw e; 
        } finally {
            loader.innerText = 'waiting';
            isLoadingPage = false;
            
            if (!moreImagesAvailable) {
                loader.innerText = 'no more images';
                loader.style.display = 'none';
            } 
        }
    }

    function pack() {
        instance.pack();
        viewer.update();
        if (viewer.isShown)
            viewer.view(currentIndex);
    }

    //Perform the initial load
    nextPage();
    
})();


// jQuery

/** Invokes Callback if the element is within the viewport */
function onVisibilityChange(el, callback) {
    var old_visible;
    return function () {
        var visible = isElementInViewport(el);
        if (visible != old_visible) {
            old_visible = visible;
            if (typeof callback == 'function') {
                callback();
            }
        }
    }
}

//Checks if the element is within the view port
function isElementInViewport (el) {

    // Special bonus for those using jQuery
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }

    var rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /* or $(window).height() */
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) /* or $(window).width() */
    );
}