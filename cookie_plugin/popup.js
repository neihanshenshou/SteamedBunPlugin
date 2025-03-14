document.addEventListener('DOMContentLoaded', function () {
    const cookieList = document.getElementById('cookie-list');

    // 获取当前活动标签页的 URL
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        let url = tabs[0].url;

        // 从 URL 中提取主机名
        let hostname = (new URL(url)).hostname;

        // 获取所有相关的 Cookie 数据
        getAllCookies(hostname, function (cookies) {
            // 渲染 Cookie 数据到页面
            renderCookies(cookies);
        });
    });

    // 获取当前域名及其父域名的所有 Cookie
    function getAllCookies(hostname, callback) {
        let domainParts = hostname.split('.');
        let cookiesData = [];
        let displayedCookies = {};
        let pendingRequests = 0;
        let domainsToProcess = [];

        // 生成所有可能的父级域名
        for (let i = 0; i <= domainParts.length - 2; i++) {
            let domain = domainParts.slice(i).join('.');
            domainsToProcess.push(domain);
        }

        pendingRequests = domainsToProcess.length;

        domainsToProcess.forEach(function (domain) {
            chrome.cookies.getAll({domain: domain}, function (cookies) {
                cookies.forEach(function (cookie) {
                    let cookieKey = cookie.name + "@" + cookie.domain;
                    if (!displayedCookies[cookieKey]) {
                        displayedCookies[cookieKey] = true;
                        cookiesData.push({
                            domain: cookie.domain,
                            name: cookie.name,
                            value: cookie.value
                        });
                    }
                });
                pendingRequests--;
                if (pendingRequests === 0) {
                    callback(cookiesData);
                }
            });
        });
    }

    // 渲染 Cookie 数据到页面
    function renderCookies(cookies) {
        cookieList.innerHTML = '';

        if (cookies.length > 0) {
            let cookieDiv = document.createElement('div');
            let cookieStr = "";
            cookies.forEach(function (cookie) {
                cookieStr += `${cookie.name}=${cookie.value};`
            });
            cookieDiv.textContent = cookieStr;
            cookieList.appendChild(cookieDiv);
        } else {
            cookieList.textContent = '此网站没有 Cookie。';
        }
    }
});
