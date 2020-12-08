import bulmaCollapsible from '@creativebulma/bulma-collapsible';

// self executing function here
document.addEventListener('DOMContentLoaded', () => {
    // your page initialization code here
    // the DOM will be available here
 
    // Return an array of bulmaCollapsible instances (empty if no DOM node found)
    const bulmaCollapsibleInstances = bulmaCollapsible.attach('.is-collapsible');

    // Loop into instances
    bulmaCollapsibleInstances.forEach(bulmaCollapsibleInstance => {
    });
 }, false);
