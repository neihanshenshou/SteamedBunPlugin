document.addEventListener('DOMContentLoaded', () => {
    function renderToken() {
        chrome.storage.local.get(['token'], (result) => {
            document.getElementById('token').textContent = result.token;
        });
    }

    renderToken();

    const cookieList = document.getElementById('cookie');
    // 获取当前活动标签页的 URL
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        let url = tabs[0].url;

        // 从 URL 中提取主机名
        try {
            let hostname = (new URL(url)).hostname;
            // 获取所有相关的 Cookie 数据
            getAllCookies(hostname, function (cookies) {
                // 渲染 Cookie 数据到页面
                renderCookies(cookies);
            });
        } catch {

        }
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
                            domain: cookie.domain, name: cookie.name, value: cookie.value
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
        let cookieStr = "";
        if (cookies.length > 0) {
            cookies.forEach(function (cookie) {
                cookieStr += `${cookie.name}=${cookie.value};`
            });
            cookieList.innerText = cookieStr;
        } else {
            cookieList.innerText = '此网站没有Cookie!';
        }
    }

    const clearToken = document.getElementById("clearToken");
    const copyToken = document.getElementById("copyToken");
    const copyCookie = document.getElementById("copyCookie");
    clearToken.addEventListener('click', function () {
        function tip() {
            chrome.storage.local.remove("token");
            document.getElementById('token').textContent = "token已清空! 🌧️";

            // 显示自定义提示框
            const toast = document.getElementById("toast");
            toast.textContent = "Token已清空! ✨"
            toast.style.display = 'block';

            // 设置定时器，几秒后自动隐藏
            setTimeout(function () {
                toast.style.display = 'none';
            }, 2000);
        }
        tip();
    });

    copyToken.addEventListener('click', function () {
        let token = document.getElementById('token').textContent;
        navigator.clipboard.writeText(token).then(function () {
            // 显示自定义提示框
            const toast = document.getElementById("toast");
            toast.textContent = "Token已复制到剪贴板✅！"
            toast.style.display = 'block';

            // 设置定时器，几秒后自动隐藏
            setTimeout(function () {
                toast.style.display = 'none';
            }, 2000);
        }, function (err) {
            console.error('复制失败: ', err);
        });
    });
    copyCookie.addEventListener('click', function () {
        let cookie = document.getElementById('cookie').textContent;
        navigator.clipboard.writeText(cookie).then(function () {
            // 显示自定义提示框
            const toast = document.getElementById("toast");
            toast.textContent = "Cookie已复制到剪贴板✅！"
            toast.style.display = 'block';

            // 设置定时器，几秒后自动隐藏
            setTimeout(function () {
                toast.style.display = 'none';
            }, 2000);
        }, function (err) {
            console.error('复制失败: ', err);
        });
    });

});
