import './_view.scss';

$(document).ready(async () => {
    registerLightGallery();
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