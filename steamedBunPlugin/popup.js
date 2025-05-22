document.addEventListener('DOMContentLoaded', () => {

    function welcomeXiaRenPlugin() {
        const welcome = document.getElementById("welcome");
        welcome.textContent = "✨✨欢迎来到虾仁世界✨✨"
        welcome.style.display = 'block';
        setTimeout(function () {
            welcome.style.display = 'none';
        }, 2000);
    }


    function changeSelect() {
        const selectElement = document.getElementById('tokenSelect');

        // 加载并设置上一次的选择
        chrome.storage.local.get(['tokenName'], function (result) {
            if (result.tokenName) {
                selectElement.value = result.tokenName;
            }
        });

        // 监听选择变化并发送消息
        selectElement.addEventListener('change', function () {
            const selectedValue = selectElement.value;

            // 保存选项到 storage
            chrome.storage.local.set({tokenName: selectedValue}, function () {
                console.log('已保存选择:', selectedValue);
            });

            // 发送消息给 background.js
            chrome.runtime.sendMessage({action: "updateTokenName", tokenName: selectedValue}, function (response) {
                console.log("响应:", response);
            });

            function tip() {
                const toast = document.getElementById("toast");
                toast.textContent = `刷新页面, 更新${selectedValue}的值🌹`
                toast.style.display = 'block';

                setTimeout(function () {
                    toast.style.display = 'none';
                }, 3000);
            }

            tip();
        });
    }


    function renderToken() {
        let tokenName = document.getElementById('tokenSelect').value;
        chrome.storage.local.get([tokenName], (result) => {
            document.getElementById('token').textContent = result.token;
        });
    }

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
    const clearCookie = document.getElementById("clearCookie");

    clearToken.addEventListener('click', function () {
        function tip() {
            chrome.storage.local.remove("token");
            document.getElementById('token').textContent = "🌧️ Token已清空 ❌";

            const toast = document.getElementById("toast");
            toast.textContent = "🌧️ Token已清空 ❌"
            toast.style.display = 'block';

            setTimeout(function () {
                toast.style.display = 'none';
            }, 2000);
        }

        tip();
    });
    clearCookie.addEventListener('click', function () {
        function tip() {
            document.getElementById('cookie').textContent = "🌧️ Cookie已清空 ❌";

            const toast = document.getElementById("toast");
            toast.textContent = "🌧️ Cookie已清空 ❌"
            toast.style.display = 'block';

            setTimeout(function () {
                toast.style.display = 'none';
            }, 2000);
        }

        tip();
    });
    copyToken.addEventListener('click', function () {
        let token = document.getElementById('token').textContent;
        navigator.clipboard.writeText(token).then(function () {

            const toast = document.getElementById("toast");
            toast.textContent = "☀️ Token已复制到剪贴板 ✅"
            toast.style.display = 'block';

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

            const toast = document.getElementById("toast");
            toast.textContent = "☀️ Cookie已复制到剪贴板 ✅"
            toast.style.display = 'block';

            setTimeout(function () {
                toast.style.display = 'none';
            }, 2000);
        }, function (err) {
            console.error('复制失败: ', err);
        });
    });

    welcomeXiaRenPlugin();
    changeSelect();
    renderToken();

});
