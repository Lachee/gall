import './_view.scss';
import Cookies from 'js-cookie';

$(document).ready(async () => {
    registerLightGallery();
    registerExpandButton();
});

function registerLightGallery() {
    $('#lightgallery').lightGallery({
        //mode: 'lg-slide-circular',
        mode: 'lg-fade',
        preload: 2,
        download: true,
        thumbnail:true,
        share: false,
    });
}

function registerExpandButton() {
    let state = Cookies.get('expanded-control') == 'true';
    setState(state);
    
    $('.expanding-artwork-control').on('click', () => {
        state = setState(!state);
    });

    function setState(state) {
        const $expandingArtwork = $('.expanding-artwork');
        const expandingClass = $expandingArtwork.data('expanding-class');

        if (state) {
            $('.expanding-artwork-control .expand-label').text('Fill Page');
            $('.expanding-artwork-control .icon i').removeClass('fa-compress').addClass('fa-expand');
            $expandingArtwork.removeClass(expandingClass);
        } else {
            $('.expanding-artwork-control .expand-label').text('Fit  Page');
            $('.expanding-artwork-control .icon i').addClass('fa-compress').removeClass('fa-expand');
            $expandingArtwork.addClass(expandingClass);
        } 
        
        Cookies.set('expanded-control', state);
        return state;
    }
}