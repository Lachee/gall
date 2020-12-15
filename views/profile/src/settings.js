import './settings.scss';

$('.tag-selector').select2({
    width: '100%',
    ajax: {
        url: '/api/tags',
        data: (params) => new Object({ q: params.term, page: params.page || 1, select2: true })
    }
});

$('.emote-selector').select2({
    width: '100%',
    ajax: {
        url: '/api/emotes',
        data: (params) => new Object({ q: params.term, page: params.page || 1, select2: true })
    },
    templateResult: emoteTemplate,
    templateSelection: emoteTemplate,
});

function emoteTemplate(state) {
    if (!state.id) return state.text;
    var $state = $(`<span><img src="${state.url}" class="emote" /><span class="emote-tag">:${state.text}:</span></span>`);
    return $state;
}