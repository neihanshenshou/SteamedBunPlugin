// 核心状态管理
const state = {
    activeTabId: null,
    pluginActive: false, // 跟踪插件激活状态
};

// 图标管理
const icon = {
    setActive() {
        chrome.action.setIcon({
            path: {

                "48": "images/48a_img.png",
                "128": "images/128a_img.png"
            },
        });
    },
    setInactive() {
        chrome.action.setIcon({
            path: {
                "48": "images/48img.png",
                "128": "images/128img.png"
            },
        });
    },
};

// 存储
const storage = {
    async save(data) {
        await chrome.storage.local.set({lastEleKey: data});
    },
    async clear() {
        await chrome.storage.local.remove("lastEleKey");
    },
    async get() {
        const {lastEleKey} = await chrome.storage.local.get("lastEleKey");
        return lastEleKey;
    },
    async saveSettings(settings) {
        const {lastEleKey} = await chrome.storage.local.get("lastEleKey");
        lastEleKey['isCssMode'] = settings['isCssMode'];
        await storage.save(lastEleKey);
    },
    async saveMatchData(matchData) {
        const {lastEleKey} = await chrome.storage.local.get("lastEleKey");
        if (lastEleKey === undefined) {
            await chrome.storage.local.set({lastEleKey: {matchData: matchData}});
        } else {
            lastEleKey['matchData'] = matchData;
            await storage.save(lastEleKey);
        }
    },
    async clearMatchData() {
        const {lastEleKey} = await chrome.storage.local.get("lastEleKey");
        if (lastEleKey !== undefined) {
            delete lastEleKey['matchData'];
            await storage.save(lastEleKey);
        }
    },
};

const badge = {
    set(count) {
        chrome.action.setBadgeText({text: count > 0 ? count.toString() : ""});
        chrome.action.setBadgeBackgroundColor({
            color: count > 0 ? "#019901" : "#ffffff",
        });
        chrome.action.setBadgeTextColor({
            color: count > 0 ? "#ffffff" : "#f11313", // 设置文本颜色
        });

    },
    clear() {
        chrome.action.setBadgeText({text: ""});
        chrome.action.setBadgeTextColor({color: "#ffffff"}); // 清除时设置默认颜色
    },
};

// 扩展状态管理
const extension = {
    async clear() {
        await storage.clear();
        badge.clear();
        try {
            chrome.runtime.sendMessage({action: "clearXPaths"}, (response) => {
                if (chrome.runtime.lastError) {
                }
            });
        } catch (error) {
        }
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (tabs && tabs.length > 0) {
                try {
                    chrome.tabs.sendMessage(
                        tabs[0].id,
                        {action: "clearHighlightedElements"},
                        function (response) {
                            if (chrome.runtime.lastError) {
                                return;
                            }
                        }
                    );
                } catch (error) {
                }
            }
        });
        state.pluginActive = false; // 重置插件状态
        icon.setInactive(); // 更新图标
    },

    async deactivate() {
        if (!state.activeTabId) return;
        try {
            await chrome.runtime.sendMessage(
                {
                    tabId: state.activeTabId,
                    action: "deactivate",
                },
                (response) => {
                    if (chrome.runtime.lastError) {
                    }
                }
            );
            await extension.clear();
        } catch (error) {
        }
        state.pluginActive = false;
        icon.setInactive();
    },
};

// 消息事件
const handlers = {
    async elementSelected(request, sendResponse) {
        let lastSelectedElementData = {
            xpaths: request.xpaths,
            xpathSelectors: request.xpathSelectors || request.xpaths, // 存储XPath选择器
            cssSelectors: request.cssSelectors || request.xpaths,    // 存储CSS选择器
            elementTag: request.elementTag,
            elementHasEmptyXPaths: request.elementHasEmptyXPaths,
            isCssMode: request.isCssMode || false
        };
        await storage.save(lastSelectedElementData);
        badge.set(request.xpathCount || 0);
        sendResponse({success: true});
    },

    async saveSettings(request, sendResponse) {
        await storage.saveSettings(request.settings);
        badge.set(request.settings.count || 0);
        sendResponse({success: true});
    },

    async saveMatchData(request, sendResponse) {
        await storage.saveMatchData(request.data);
        sendResponse({success: true});
    },

    async getLastSelectedElement(_, sendResponse) {
        sendResponse({success: true, data: await storage.get()});
    },

    async clearXPaths(_, sendResponse) {
        await extension.clear();
        sendResponse({success: true});
    },

    async clearMatchData(_, sendResponse) {
        await storage.clearMatchData();
        sendResponse({success: true});
    },

    async checkPageCompatibility(_, sendResponse) {
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tabs?.length) {
            return sendResponse({canRun: false, reason: "No active tab"});
        }

        state.activeTabId = tabs[0].id;
        const isRestricted =
            /^(chrome|chrome-extension|about):/.test(tabs[0].url) ||
            (tabs[0].url.startsWith("file://") && tabs[0].url.endsWith(".pdf"));

        sendResponse({
            canRun: !isRestricted,
            reason: isRestricted ? "不能在此页面运行" : null,
        });
        return true;
    },

    async updatePluginStatus(request, sendResponse) {
        const {tabId, isActive} = request;
        if (state.activeTabId === tabId) {
            state.pluginActive = isActive;
            isActive ? icon.setActive() : icon.setInactive();
        }
        sendResponse({success: true});
    },

    async activate(request, sendResponse) {
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        if (tabs?.length) {
            state.activeTabId = tabs[0].id;
            // 激活后查询当前状态
            chrome.tabs.sendMessage(
                tabs[0].id,
                {action: "getStatus"},
                (response) => {
                    if (response && response.isActive !== undefined) {
                        state.pluginActive = response.isActive;
                        response.isActive ? icon.setActive() : icon.setInactive();
                    }
                }
            );
        }
        sendResponse({success: true});
    },
};

// 监听事件
chrome.runtime.onInstalled.addListener(() => {
});

chrome.tabs.onActivated.addListener(async (tabId) => {
    if (state.activeTabId && state.activeTabId !== tabId) {
        await extension.deactivate();
    }
    state.activeTabId = tabId;
});

chrome.tabs.onUpdated.addListener(async (tabId) => {
    if (tabId === state.activeTabId) {
        await extension.deactivate();
    }
});

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    const handler = handlers[request.action];
    if (handler) {
        handler(request, sendResponse).catch((error) => {
            console.error(`${request.action} error:`, error);
            sendResponse({success: false, error: error.message});
        });
        return true;
    }
    return false;
});