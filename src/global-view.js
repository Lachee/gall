
console.log('Initializing Global');

/**== Navigation Script
 * this script handles the fading of all .has-placeholder-transition objects.
 */
const PLACEHOLDER_TRANSITION_TIME = 1;
const PLACEHOLDER_TRANSITION_DELAY = PLACEHOLDER_TRANSITION_TIME * 3;
setInterval( () => transitionPlaceholders(), (PLACEHOLDER_TRANSITION_DELAY + (PLACEHOLDER_TRANSITION_TIME * 2)) * 1000);
transitionPlaceholders(0);
function transitionPlaceholders(transitionTime = PLACEHOLDER_TRANSITION_TIME) {
    const elements = document.querySelectorAll('.has-placeholder-transition');
    elements.forEach((doc) => {
        doc.classList.add('is-transitioning');
        setTimeout(() => {
            let availablePlaceholders = doc.getAttribute('data-placeholders').split('|');
            if (doc.placeholderIndex == undefined) doc.placeholderIndex = 0;
            doc.placeholder = availablePlaceholders[doc.placeholderIndex++ % availablePlaceholders.length];
            doc.classList.remove('is-transitioning');
        }, transitionTime * 1000);
    });
}

/**== Search Box
 * this script handles the search box changing the "search" button to "post" when a URL is present
 */
document.getElementById('navbar-search').addEventListener('keyup', (event) => {
    const submitButton = document.querySelector('#navbar-submit span');
    const submitIcon = document.querySelector('#navbar-submit i');
    const value = event.target.value;
    if (validURL(value)) { 
        submitButton.innerText = 'Post';
        submitIcon.classList.remove('fa-search');
        submitIcon.classList.add('fa-plus');
    }
    else
    {
      submitButton.innerText = 'Search';
      submitIcon.classList.add('fa-search');
      submitIcon.classList.remove('fa-plus');
    }

    function validURL(str) {
        var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
        '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
        return !!pattern.test(str);
    }
        
});