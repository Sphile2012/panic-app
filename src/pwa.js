let _deferred = null;
let _onReadyCb = null;
let _onInstalledCb = null;
export function initPwa() {
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        _deferred = e;
        _onReadyCb?.();
    });
    window.addEventListener('appinstalled', () => {
        _deferred = null;
        _onInstalledCb?.();
    });
}
export function canInstall() {
    return _deferred !== null;
}
export function isInstalled() {
    const nav = navigator;
    return (window.matchMedia('(display-mode: standalone)').matches ||
        nav.standalone === true);
}
export function isIosSafari() {
    const ua = navigator.userAgent;
    return /iphone|ipad|ipod/i.test(ua) &&
        /safari/i.test(ua) &&
        !/chrome|crios|fxios/i.test(ua);
}
export async function promptInstall() {
    if (!_deferred)
        return 'unavailable';
    await _deferred.prompt();
    const { outcome } = await _deferred.userChoice;
    _deferred = null;
    return outcome;
}
export function onInstallReady(cb) { _onReadyCb = cb; }
export function onInstalled(cb) { _onInstalledCb = cb; }
