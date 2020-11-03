# Flags

## Localstorage and multiple windows

If you want localstorage you need to pick persistent session storage. If you do this, you can only have one app window. 

If you want to open multiple app windows, they are all temporary and transient and you cannot rely on local storage. 

### Why

This is the case because, Chrome, running with more than one window, and each window having RDP on different ports cannot share the same user data directory. In order to run multiple windows, each window/chrome needs to have its own user data directory. So if you want multiple windows, we need to create them transiently and delete them. If you want persistent localstorage (but hey you can use filesystem since you have node), you must accept one window only.
