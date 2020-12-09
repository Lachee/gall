import './GalleryList.scss';

console.log('gallery-list');
(() => {
    console.log('loaded');
    initCardList();
})();

export function initCardList() {
    console.log('initializing card list');
    fixScrollBehaviours();
    fixClickBehaviours();
}

function fixScrollBehaviours() {
    
    const elements = document.querySelectorAll(".flexcard .card-list");    
    for(let i in elements) {
        const elm = elements[i];
        if (!elm.addEventListener) continue;

        elm.addEventListener('mousedown', (event) => { 
            elm.mouseDown = true;
        });
        elm.addEventListener('mouseup', (event) => {
            elm.mouseDown = false;
        });

        elm.addEventListener('mousemove', (event) => {
            if (!elm.mouseDown) return;
            elm.scrollBy({
                left: -event.movementX
            });
        });

        /*
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
        */
    }
}

function fixClickBehaviours() {
    const clickLongTime = 25;
    const clickMove = 5;
    const touchLongTime = 1000;
    const touchMove = 15;

    const elements = document.querySelectorAll('.smart-link');

    for(let i in elements) {
        const elm = elements[i];
        if (!elm.addEventListener) continue;
        
        elm.addEventListener('click', (event) => {
            event.preventDefault();
        });

        elm.addEventListener('mousedown', (event) => {
            if (window.isMobile()) return;

            event.preventDefault();
            elm.clickStart = event.screenX;
            elm.clickTimeout = setTimeout(() => {
                elm.classList.add('click-long');
            }, clickLongTime);
        });

        elm.addEventListener('mouseup', (event) => {
            if (window.isMobile()) return;
            
            event.preventDefault();
            if (elm.classList.contains('click-long')) navigate(elm, event.button == 1);
            clearTouchTimeout(elm);
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

    document.addEventListener('mousemove', (event) => {            
        for(let i in elements) {
            const elm = elements[i];
            let delta = elm.clickStart - event.screenX;
            if (Math.abs(delta) > clickMove)
                clearClickTimeout(elm);
        }
    });

    function clearTouchTimeout(elm) {
        elm.classList.remove('touch-long');
        if (elm.touchTimeout)
            clearTimeout(elm.touchTimeout);
    }

    function clearClickTimeout(elm) {
        elm.classList.remove('touch-long');
        elm.classList.remove('click-long');
        if (elm.clickTimeout) {
            clearTimeout(elm.clickTimeout);
        }
    }

    function navigate(element, newtab = false) {
        const href = element.getAttribute('data-href');
        console.log('navigating ', href, newtab);
        
        if (newtab) {
            window.open(href, '_blank');
        } else {
            window.location = href;
        }
    }
}

