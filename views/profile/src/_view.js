import './_view.scss';

$(document).ready(async () => {
    registerSmartLinks();
    registerLightGallery();
    registerCardList();
});

function registerCardList() {
    const elements = document.querySelectorAll(".flexcard .card-list");    
    for(let i in elements) {
        const elm = elements[i];
        if (!elm.addEventListener) continue;
        elm.addEventListener('mousewheel', (event) => {
            return;
            
            event.preventDefault();
            if (elm.smoothScrollLeft === undefined) elm.smoothScrollLeft = 0;
            elm.smoothScrollLeft += event.deltaY * 5;
            elm.scrollBy({
                top: 0,
                left: event.deltaY ,
                behavior: 'smooth'
            });
        });
    }
}

function registerSmartLinks() {
    const touchLongTime = 1000;
    const touchMove = 15;

    const elements = document.querySelectorAll('.smart-link');
    for(let i in elements) {
        const elm = elements[i];
        if (!elm.addEventListener) continue;
        
        elm.addEventListener('mousedown', (event) => {
            event.preventDefault();
        });

        elm.addEventListener('mouseup', (event) => {
            if (window.isMobile()) return;
            event.preventDefault();

            if(event.button == 0)
                navigate(elm);
            if(event.button == 1)
                navigate(elm, true);
        });

        elm.addEventListener('auxclick', (event) => {
            console.log('aux', event.button);
            event.preventDefault();

            if (window.isMobile()) { 
                //window.location.hash = elm.id;
                return;
            }
        });
        

        elm.addEventListener('touchstart', (event) => {
            elm.touchStart = event.touches[0].pageX;
            elm.touchTimeout = setTimeout(() => {
                elm.classList.add('touch-long');
            }, touchLongTime);
        });
        elm.addEventListener('touchend', (event) => {
            if (elm.classList.contains('touch-long')) navigate(elm);
            clearTouchTimeout(elm);
        });     
        elm.addEventListener('touchcancel', (event) => {
            clearTouchTimeout(elm);
        });
        elm.addEventListener('touchmove', (event) => {
            let delta = elm.touchStart - event.touches[0].pageX;
            if (Math.abs(delta) > touchMove)
                clearTouchTimeout(elm);
        });
    }

    function clearTouchTimeout(elm) {
        elm.classList.remove('touch-long');
        if (elm.touchTimeout)
            clearTimeout(elm.touchTimeout);
    }

    function navigate(element, newtab = false) {
        if (newtab) {
            window.open(element.getAttribute('data-href'), '_blank');
        } else {
            window.location = element.getAttribute('data-href');
        }
    }
}

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