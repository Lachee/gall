import './emoji-overload.scss';

var emojiPickerContainer = null;

/** creates a new emoji picker */
export async function createEmojiPickerAsync(options) {
    const EmojiPicker               = (await import(/* webpackChunkName: "emojipicker" */ 'rm-emoji-picker')).default;
    const EmojiPickerCSS            = await import(/* webpackChunkName: "emojipicker-css" */'./../../node_modules/rm-emoji-picker/dist/emojipicker.css');

    //Create a new picker
    const picker = new EmojiPicker(options);
    return picker;
}

/** Creates a new emoji container */
export function createContainer() {
    if (emojiPickerContainer) return emojiPickerContainer;

    //Create the container if it doesn't exist yet.
    emojiPickerContainer = document.createElement("div");
    emojiPickerContainer.classList.add('emojipicker');
    return emojiPickerContainer;
}