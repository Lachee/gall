
console.log('Initializing Global');

/**== Navigation Script
 * this script handles the fading of all .has-placeholder-transition objects.
 */
const PLACEHOLDER_TRANSITION_TIME = 0.5;
const PLACEHOLDER_TRANSITION_DELAY = 2;
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