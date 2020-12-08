import $ from 'jquery';

export class Toolbar {

    /** @type {DOMElement} */
    element;

    /** @type {ToolbarItem[]} items */
    items;

    constructor(element, items = []) {
        this.element = element;
        this.items = items;
    }

    init() { 
        this.#render();
    }

    #render() {
        this.$navigation = $('<nav class="level toolbar"></nav>');
        this.$left = $('<div class="level-left"></div>');
        this.$right = $('<div class="level-right"></div>');

        this.$navigation.append(this.$left);
        this.$navigation.append(this.$right);

        $(this.element).html('');
        $(this.element).append(this.$navigation);

        this.#renderItems();
    }

    #renderItems() {
        for(let i in this.items) {
            const item = this.items[i];            
            const $container = $('<div class="level-item toolbar-item"></div>');

            const content = item.render();
            if (typeof content === 'string') {
                $container.html(content);
            } else {
                $container.append(content);
            }

            if (item.isRight)   this.$right.append($container);
            else                this.$left.append($container);
        }
    }
}

export class ToolbarItem {
    
    isRight = false;

    constructor(options) {
        this.isRight = options.isRight;
    }

    render() { return ''; }
}

export class ToolbarButton extends ToolbarItem {
    
    constructor(options) {
        super(options);
        this.icon = options.icon;
        this.action = options.action;
    }

    
    render() {
        let item = $(`<a class="button"><i class="fal ${this.icon}"></i></a>`);
        item.on('click', this.onClick.bind(this));
        return item;
    }

    /** Process the menu selection event */
    onClick(e) {
        if (this.action) this.action(e);
        e.preventDefault();
    }
}

export class ToolbarDropdown extends ToolbarButton {

    constructor(options) {
        super(options);
        this.items = options.items;
    }


    render() {
        const template = `
            <div class="dropdown is-hoverable">
                <div class="dropdown-trigger">
                    <button class="button" aria-haspopup="true" aria-controls="dropdown-menu4">
                        <span><i class="fal ${this.icon}"></i></span>
                        <span class="icon is-small"><i class="fal fa-angle-down" aria-hidden="true"></i></span>
                    </button>
                </div>
                <div class="dropdown-menu" role="menu">
                    <div class="dropdown-content">
                    </div>
                </div>
            </div>
        `;
        const $root = $(template);
        const $container = $root.find('.dropdown-content');

        for (let i in this.items) {
            const item = this.items[i];
            if (item == '-') {
                $container.append(`<hr class="dropdown-divider">`);
            } else {
                $container.append(`<a data-item="${i}" class="dropdown-item">${item.label}</a>`);
            }
        }

        $root.on('click', this.onClick.bind(this));
        return $root;
    }

    /** Process the menu selection event */
    onClick(e) {        
        if (e.target && e.target.getAttribute('data-item')) {
            const item = this.items[ e.target.getAttribute('data-item')];
            item.action(e);
        }
        
        e.currentTarget.classList.remove('dropdown');
        setTimeout(() => { e.currentTarget.classList.add('dropdown'); }, 100);
        super.onClick(e);
    }
    
}