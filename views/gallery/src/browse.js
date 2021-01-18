import Bricks from 'bricks.js';

/** @var {./src/api/BaseAPI} api */
const api = app.api;

$(document).ready(async () => {

    //Prepare the grid container
    const container = document.getElementById('grid');
    const $container = $(container);

    //Prepare the Bricks.js instance. This handles the masonry for us,
    const sizes = [
        { columns: 2, gutter: 5 },
        { mq: '768px', columns: 3, gutter: 5 },
        { mq: '1024px', columns: 4, gutter: 5 }
    ];
    const instance =  Bricks({
        container: container,
        packed: 'data-packed',
        sizes: sizes,
        position: true
    });

    /** Loads a Gallery Page and creates DOM elements.
     * @return {Boolean} true if there is more content to be loaded still.
     */
    async function loadPage(page = 1) {
        
        const limit = 5;

        //Fetch the next page of galleries. if we got none then we will tell the caller there is none left.
        let galleries = await api.findGalleries('', page, limit);
        if (galleries.length == 0) { 
            console.warn('no more images, aborting load');
            return false;
        }

        //Reload everything
        let imageLoadPromises = [];
        for(let i in galleries) {
            const gallery = galleries[i];
            const image_url = gallery.cover.getUrl();
            
            //Load image
            const $img = $('<img>').attr('src', image_url);
            $img.addClass('grid-image');
            imageLoadPromises.push(
                new Promise((resolve, reject) => {
                    $img.one('load', () => {
                        console.log('image loaded', image_url);
                        instance.pack();
                        resolve();
                    });
                })
            );

            //Prepare the link
            const $href = $('<a>').attr('href', `/gallery/${gallery.id}/`);
            $href.addClass('grid-link');
            $href.append($img);

            const $div = $('<div>');
            $div.addClass('grid-image-container');
            $div.append($href);

            //Append to container
            $container.append($div);
        }

        //We need to wait for all the images to finish loading so we can more accurately pack them.
        await Promise.all(imageLoadPromises);
        //instance.pack();
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

    //When the button becomes visible, load the next page
    const button = document.getElementById('next-page');
    const visibilityHandler = onVisibilityChange(button, async () => {
        if (moreImagesAvailable) {
            console.log('button visible', button);
            moreImagesAvailable = await loadPage(++page);
        }
    });
    
    //We hook the visibility handler to some key events in the dom, mainly scroll.
    // But we will also call it once too, so we can immediately update if we didn't load enough images initially
    $(window).on('DOMContentLoaded load resize scroll', visibilityHandler);
    visibilityHandler();

    $(button).on('click', () => {
        instance.pack();
    });
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