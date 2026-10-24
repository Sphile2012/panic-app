export function wirePasswordToggles(root: HTMLElement): void {
    root.querySelectorAll<HTMLButtonElement>('.pw-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const input = root.querySelector<HTMLInputElement>(`#${button.dataset['target']}`);
            if (!input)
                return;
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            button.textContent = show ? 'Hide' : 'Show';
            button.setAttribute('aria-label', `${show ? 'Hide' : 'Show'} ${button.dataset['description']}`);
        });
    });
}
