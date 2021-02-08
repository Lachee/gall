import Bricks from 'bricks.js';

import 'viewerjs/dist/viewer.css';
import Viewer from 'viewerjs';
import {delegate} from 'tippy.js';

/** @var {./src/api/BaseAPI} api */
const api = app.api;
const gallery_cache = {};

delegate('#grid', {
    target: '.grid-image-container > img',
    allowHTML: true,
    multiple: true,
    interactive: true,
    content: (reference) => {
        const gallery_id = reference.getAttribute('data-gallery');
        const gallery = gallery_cache[gallery_id];
        if (!gallery) return 'No Author';
        
        return `<div class="profile-hint">
                    <img class="avatar" src="${gallery.founder.getAvatarUrl()}" alt="Avatar Picture"> 
                    <span><a href="/profile/${gallery.founder.profileName || gallery.founder.snowflake}/">${gallery.founder.displayName}</a></span>
                </div>`;
    },
});


$(document).ready(async () => {

    let currentIndex;
    let currentCount = 0;

    //Prepare the grid container
    const incapsulateLink = false;
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
        let imageLoadPromises = [];
        for(let i in galleries) {

            //Load the gallery and store it in the cache
            const gallery = galleries[i];
            gallery_cache[gallery.id] = gallery;

            //const image_url = gallery.cover.getUrl();
            const image_url = gallery.cover.getUrl();
            const thumbnail_url = gallery.cover.getThumbnail();

            //Load image
            const $img = $('<img>').attr('src', thumbnail_url);
            $img.addClass('grid-image');
            $img.attr('src-alt', image_url);
            $img.attr('data-gallery', gallery.id);
            $img.attr('id', 'grid-img-' + (currentCount++));

            imageLoadPromises.push(
                new Promise((resolve, reject) => {
                    $img.one('load', () => {
                        pack();
                        resolve();
                    });
                })
            );

            //Prepaare the container
            const $div = $('<div>');
            $div.addClass('grid-image-container');

            //Prepare the link
            if (incapsulateLink) {
                let $href = $('<a>').attr('href', `/gallery/${gallery.id}/`);
                $href.addClass('grid-link');
                $href.append($img);
                $div.append($href);
            } else {
                $div.append($img);
            }

            //Append to container
            $container.append($div);
        }

        //We need to wait for all the images to finish loading so we can more accurately pack them.
        await Promise.all(imageLoadPromises);
        //pack();
        //instance.update(); // While update is faster, it doesn't produce accurate results.

        //If we did not get a full list, then we are done.
        return galleries.length == limit;
    }

    // Slowly load all the pages.
    // The loadPage function returns true if it thinks there is more images left. 
    //   - This will result in a extra request when we have finished loading everything, but this is easy for now.
    let page = 1;
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
    const button = document.getElementById('grid-loader');
    const visibilityHandler = onVisibilityChange(button, async () => {
        if (moreImagesAvailable) {
            moreImagesAvailable = await loadPage(++page);
            if (!moreImagesAvailable) {
                button.innerText = 'no more images';
                //button.style.display = 'none';
            }    
        }
    });
    
    //We hook the visibility handler to some key events in the dom, mainly scroll.
    // But we will also call it once too, so we can immediately update if we didn't load enough images initially
    $(window).on('DOMContentLoaded load resize scroll mousemove touch', visibilityHandler);
    visibilityHandler();

    $(button).on('click', () => { pack(); });

    function pack() {
        instance.pack();
        viewer.update();
        if (viewer.isShown)
            viewer.view(currentIndex);
    }
    
});


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