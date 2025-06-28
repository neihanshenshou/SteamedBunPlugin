function getToken() {

    // 监听来自 popup.js 的消息
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.action === "updateTokenName") {
            // 更新 token 的逻辑
            let tokenName = request.tokenName
            chrome.storage.local.set({tokenName: tokenName}, function () {
                sendResponse({status: "success", message: "Token 更新成功"});
            });
            // 返回 true 以指示将保持消息通道打开
            return true;
        }
    });

    chrome.webRequest.onBeforeSendHeaders.addListener(
        (details) => {
            // 从存储中获取 token
            chrome.storage.local.get(["tokenName"], (data) => {
                const token = data.tokenName;
                const requestHeaders = details.requestHeaders;
                const tokenHeader = requestHeaders.find(header => header.name.toLowerCase() === token);
                console.log(token);
                if (tokenHeader) {
                    if (token === "token") {
                        chrome.storage.local.set({token: tokenHeader.value});
                    } else if (token === "authorization") {
                        chrome.storage.local.set({authorization: tokenHeader.value});
                    } else if (token === "csrftoken") {
                        chrome.storage.local.set({csrftoken: tokenHeader.value});
                    }
                }
            });
        },
        {urls: ["<all_urls>"]},
        ["requestHeaders"]
    );
}

getToken();