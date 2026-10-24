export function wirePasswordToggles(root) {
    root.querySelectorAll('.pw-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const input = root.querySelector(`#${button.dataset['target']}`);
            if (!input)
                return;
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            button.dataset['visible'] = String(show);
            button.setAttribute('aria-label', `${show ? 'Hide' : 'Show'} ${button.dataset['description']}`);
        });
    });
}
