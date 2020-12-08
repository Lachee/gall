import { Modal } from "../../../kiss/src/bulma/modal";
import './modal.scss';

export class CreateEventModal extends Modal {
    constructor(options) {       

        //Call the upser last, because it will build the UI
        super(options); 

        this.events = options.events;
        if (this.events == null)  console.error("No events loaded!");
    }

    render() {
        const nameTemplate = `
        <form>
            <div class="title">Create Event</div>
            <div class="field">
                <div class="control">
                    <input name="title" class="input" type="text" placeholder="My Best Event">
                </div>
            </div>                
            <div class="field">
                <p class="control has-icons-left">
                    <span class="select">
                        <select name="event" id="event-selector">
                        </select>
                    </span>
                    <span class="icon is-small is-left">
                        <i class="fal fa-trumpet"></i>
                    </span>
                </p>
            </div>
            <button class="button is-primary">
                <span class="icon">
                    <i class="fal fa-plus"></i>
                </span>
                <span>create</span>
            </button>
        </form>
        `;
        const $form = $(nameTemplate);

        const data = this.#getData();
        $form.find('select#event-selector').select2({
            width: '100%',
            data: data,
            templateResult: (state) => {
                if (!state.id) return state.text;
                return $(`<div class='s2-event-item'><span class='title'>${state.text}</span><span class='subtitle'>${state.description}</span>`);
            }
        });

        $form.get(0).addEventListener('submit', (e) => {            
            e.preventDefault();
            e.stopPropagation();
            this.emit('submit', { evt: e, form: e.target });
            this.close();
            return false;
        });
        return $form;
    }

    #getData() {
        return this.events.map(d => new Object({
            id: d.type,
            text: d.title,
            description: d.description || 'Untitled Event',
        }));
    }
}