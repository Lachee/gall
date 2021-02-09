import './manage.scss';

$('.tag-selector').select2({
    width: '100%',
    placeholder: 'select tag...',
    ajax: {
        url: '/api/tags',
        data: (params) => new Object({ q: params.term, page: params.page || 1, select2: true })
    }
});