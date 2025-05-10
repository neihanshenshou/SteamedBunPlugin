function getToken() {
    chrome.webRequest.onBeforeSendHeaders.addListener(
        (details) => {
            const requestHeaders = details.requestHeaders;
            const tokenHeader = requestHeaders.find(header => header.name.toLowerCase() === 'authorization');
            if (tokenHeader) {
                chrome.storage.local.set({token: tokenHeader.value});
            }
        },
        {urls: ["<all_urls>"]},
        ["requestHeaders"]
    );
}

getToken();