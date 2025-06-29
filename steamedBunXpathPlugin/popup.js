// UI 元素
const ui = {
    elements: {
        toggleSwitch: null,
        simpleModeSwitch: null,
        statusMessage: null,
        xpathContainer: null,
        xpathList: null,
        xpathInput: null,
        xpathMatchCount: null,
        matchCount: null,
    },

    initialize() {
        // 获取dom元素
        this.elements.toggleSwitch = document.getElementById("toggleSwitch");
        this.elements.simpleModeSwitch = document.getElementById("simpleMode");
        this.elements.simpleModeLabel = document.getElementById('modeType');
        this.elements.statusMessage = document.getElementById("statusMessage");
        this.elements.xpathContainer = document.getElementById("xpathContainer");
        this.elements.xpathList = document.getElementById("xpathList");
        this.elements.xpathInput = document.getElementById("xpathInput");
        this.elements.xpathMatchCount = document.getElementById("xpathMatchCount");
        this.elements.matchCount = document.getElementById("matchCount");
    },

    showErrorState(message) {
        this.elements.statusMessage.textContent =
            message || "当前页面无法运行该插件; 重新刷新~";
        this.elements.statusMessage.classList.add("text-red-600");
        this.elements.toggleSwitch.disabled = true;
    },

    updateStatus(isActive) {
        this.elements.toggleSwitch.checked = isActive;
        this.elements.statusMessage.textContent = isActive
            ? "元素选择器已开启"
            : "元素选择器未开启";

        if (isActive) {
            this.elements.statusMessage.classList.add("text-indigo-600");
            this.elements.statusMessage.classList.remove("text-red-600");

        } else {
            this.elements.statusMessage.classList.remove("text-indigo-600");
            this.elements.statusMessage.classList.add("text-red-600");
            this.elements.xpathContainer.classList.add("hidden");
        }
    },
};

// xpath展示管理器
const xpathManager = {
    currentElementData: null,
    isSimpleMode: true,
    isCssMode: false,

    displayElementData(data) {
        this.currentElementData = data;

        // 检查是否为空
        if (
            !data.xpaths ||
            data.xpaths.length === 0 ||
            data.elementHasEmptyXPaths
        ) {
            return;
        }

        ui.elements.xpathContainer.classList.remove("hidden");

        // 清除之间的xpath 列表
        ui.elements.xpathList.innerHTML = "";

        const headerElement = document.querySelector("#selectorHeader");
        if (headerElement) {
            headerElement.textContent = "生成模式:";
        }

        let typesToShow;
        // xpath分组
        const xpathsByType = this.groupXPathsByType(data.xpaths);
        if (this.isSimpleMode) {
            typesToShow = ["智能优化"];
        } else {
            typesToShow = Object.keys(xpathsByType);
        }

        // 检查简单模式类别中是否有满足知道数量的XPATH
        if (this.isSimpleMode) {
            const hasSimpleModeXPaths = typesToShow.some(
                (type) => xpathsByType[type] && xpathsByType[type].length > 3
            );

            // If no XPaths found in simple mode, automatically switch to full mode
            if (!hasSimpleModeXPaths) {
                this.switchToFullMode();
                typesToShow = Object.keys(xpathsByType);
                ui.elements.simpleModeLabel.textContent = "完整模式";
                ui.elements.simpleModeSwitch.checked = false;
            } else {
                // 设置文案
                ui.elements.simpleModeLabel.textContent = "简单模式";
                ui.elements.simpleModeSwitch.checked = true;

                // Show a notification about the mode switch
                const modeChangeNotice = document.createElement("div");
                modeChangeNotice.className = "text-blue-600 text-xs p-2 bg-blue-50 rounded-md mb-2 notice";
                modeChangeNotice.textContent = "智能优化匹配路径";
                ui.elements.xpathList.appendChild(modeChangeNotice);
            }
        }

        // Create XPath list with categories
        this.renderXPathCategories(typesToShow, xpathsByType);

        // Scroll to the top of the XPath list
        ui.elements.xpathList.scrollTop = 0;
    },

    groupXPathsByType(xpaths) {

        let type_name_mapping = {
            "ID": "基于ID",
            "Attribute": "基于属性",
            "Text": "基于文本",
            "Class": "基于类名",
            "Position": "基于层级",
            "Optimized": "智能优化",
            "Absolute": "绝对路径",
        }

        const xpathsByType = {
            "智能优化": [],
            "基于ID": [],
            "基于属性": [],
            "基于文本": [],
            "基于类名": [],
            "基于层级": [],
            "绝对路径": [],
        };

        // Categorize XPaths
        xpaths.forEach(function (xpathInfo) {
            if (xpathInfo.xpath) {
                const type = xpathInfo.type || "另类定位";
                if (xpathsByType[type]) {
                    xpathsByType[type].push(xpathInfo);
                } else {
                    xpathsByType["另类定位"] = [xpathInfo];
                }
            }
        });

        return xpathsByType;
    },

    switchToFullMode() {
        this.isSimpleMode = false;
        ui.elements.simpleModeSwitch.checked = false;


        // Show a notification about the mode switch
        const modeChangeNotice = document.createElement("div");
        modeChangeNotice.className =
            "text-blue-600 text-xs p-2 bg-blue-50 rounded-md mb-2 notice";
        modeChangeNotice.textContent =
            "自动切换到完整模式以显示更多Xpath选项";
        ui.elements.xpathList.appendChild(modeChangeNotice);
    },

    renderXPathCategories(typesToShow, xpathsByType) {
        for (const type of typesToShow) {
            const xpaths = xpathsByType[type] || [];
            if (xpaths.length > 0) {
                // Create category header
                const categoryHeader = document.createElement("div");
                categoryHeader.className =
                    "text-sm font-medium text-gray-700 mt-3 mb-1";
                categoryHeader.textContent = type;
                ui.elements.xpathList.appendChild(categoryHeader);

                // Add XPaths in this category
                xpaths.forEach((xpathInfo) => {
                    const xpathItem = this.createXPathItem(
                        xpathInfo.xpath,
                        xpathInfo.description
                    );
                    ui.elements.xpathList.appendChild(xpathItem);
                });
            }
        }
    },

    createXPathItem(xpath, description) {
        const xpathItem = document.createElement("div");
        xpathItem.className = "bg-gray-50 p-2 rounded border border-gray-200";

        // Create a container for the XPath content and button
        const container = document.createElement("div");
        container.className = "flex-container";

        // Create the content section (left side)
        const xpathContent = document.createElement("div");
        xpathContent.className = "flex-content";

        const xpathText = document.createElement("div");
        xpathText.className = "text-xs font-mono overflow-x-auto mb-1 xpath-text";
        xpathText.setAttribute("title", xpath);
        xpathText.textContent = xpath;

        const xpathDescription = document.createElement("div");
        xpathDescription.className = "text-xs text-gray-500 italic";
        xpathDescription.textContent = description || "";

        // Create the button section (right side)
        const buttonContainer = document.createElement("div");
        buttonContainer.className = "flex space-x-2";

        // Create Code button
        const codeButton = document.createElement("button");
        codeButton.className =
            "text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600 transition-colors focus:outline-none code-button";
        codeButton.style.border = "none";
        codeButton.textContent = "Code";
        codeButton.addEventListener("click", () =>
            this.copyCodeToClipboard(xpath, codeButton)
        );

        // Create Copy button
        const copyButton = document.createElement("div");
        copyButton.className = "text-xs px-2 py-1 rounded copy-button";
        copyButton.style.border = "none";
        const img = document.createElement("img");
        img.src = "./images/copy.svg";
        img.alt = "Copy";
        img.style.width = "16px";
        img.style.height = "16px";
        copyButton.appendChild(img);
        copyButton.addEventListener("click", () =>
            this.copyXPathToClipboard(xpath, copyButton)
        );

        // Assemble the components
        xpathContent.appendChild(xpathText);
        if (description) {
            xpathContent.setAttribute("title", description);
            xpathContent.appendChild(xpathDescription);
        }

        buttonContainer.appendChild(codeButton);
        buttonContainer.appendChild(copyButton);

        container.appendChild(xpathContent);
        container.appendChild(buttonContainer);
        xpathItem.appendChild(container);

        return xpathItem;
    },

    showTips(button) {
        // Create and show success tip
        const tip = document.createElement("div");
        tip.className =
            "success-tip absolute bg-gray-800 text-white text-xs px-2 py-1 rounded";
        tip.textContent = "Copied!";
        tip.style.zIndex = "1000";

        // Position the tip near the button
        const buttonRect = button.getBoundingClientRect();
        const scrollTop =
            document.documentElement.scrollTop || document.body.scrollTop;
        tip.style.top = `${buttonRect.bottom + scrollTop + 5}px`;
        tip.style.left = `${buttonRect.left}px`;

        document.body.appendChild(tip);

        // Remove tip after animation
        setTimeout(() => {
            tip.style.opacity = "0";
            setTimeout(() => document.body.removeChild(tip), 200);
        }, 1000);
    },

    copyXPathToClipboard(xpath, copyButton) {
        navigator.clipboard.writeText(xpath).then(function () {
            xpathManager.showTips(copyButton);
        });
    },

    copyCodeToClipboard(xpath, codeButton) {
        let code = `driver.find_element("xpath", '${xpath}')`;
        navigator.clipboard.writeText(code).then(function () {
            xpathManager.showTips(codeButton);
        });
    },

    clearXPaths() {
        this.currentElementData = null;
        ui.elements.xpathContainer.classList.add("hidden");
        ui.elements.xpathList.innerHTML = "";
    },
};

// background 与 content 通信
const communication = {
    checkPageCompatibility() {
        try {
            chrome.runtime.sendMessage(
                {action: "checkPageCompatibility"},
                function (response) {
                    if (chrome.runtime.lastError) {
                        console.error(
                            "页面兼容性过程出错:",
                            chrome.runtime.lastError
                        );
                        ui.showErrorState("与该页面存在兼容性错误");
                        return;
                    }

                    if (!response || response.canRun === false) {
                        ui.showErrorState(
                            response ? response.reason : "Cannot run on this page"
                        );
                        return;
                    }

                    // Page is compatible, check if the extension is already active
                    communication.checkExtensionStatus();

                    // Check if there's any recently selected element data
                    communication.checkForRecentElementData();
                }
            );
        } catch (error) {
        }
    },

    checkExtensionStatus() {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (tabs && tabs.length > 0) {
                try {
                    chrome.tabs.sendMessage(
                        tabs[0].id,
                        {action: "getStatus"},
                        function (response) {
                            if (chrome.runtime.lastError) {
                                return;
                            }

                            if (response) {
                                if (response.canRun === false) {
                                    ui.showErrorState(
                                        "内容脚本报告它无法在此页面上运行"
                                    );
                                    return;
                                }

                                if (response.isActive) {
                                    ui.updateStatus(true);
                                }
                            }
                        }
                    );
                } catch (error) {
                }
            }
        });
    },

    checkForRecentElementData() {
        try {
            chrome.runtime.sendMessage(
                {action: "getLastSelectedElement"},
                function (response) {
                    if (chrome.runtime.lastError) {
                        return;
                    }

                    if (response && response.success && response.data) {

                        if (response.data.matchData) {
                            ui.elements.xpathMatchCount.classList.remove("hidden");
                            ui.elements.matchCount.textContent =
                                response.data.matchData.count;
                            ui.elements.xpathInput.value = response.data.matchData.xpath;
                        }

                        if (
                            !xpathManager.isCssMode &&
                            response.data.xpathSelectors
                        ) {
                            response.data.xpaths = response.data.xpathSelectors;
                        }
                        xpathManager.displayElementData(response.data);
                    }
                }
            );
        } catch (error) {
        }
    },

    activateExtension() {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (tabs && tabs.length > 0) {
                try {
                    chrome.tabs.sendMessage(
                        tabs[0].id,
                        {
                            action: "activate",
                            isCssMode: xpathManager.isCssMode,
                        },
                        function (response) {
                            if (chrome.runtime.lastError) {
                                ui.elements.toggleSwitch.checked = false;
                                ui.elements.statusMessage.textContent =
                                    "错误: 暂不能在此页面生效, 请刷新";
                                ui.elements.statusMessage.classList.add("text-red-600");
                                return;
                            }

                            if (response) {
                                if (response.canRun === false) {
                                    ui.elements.toggleSwitch.checked = false;
                                    ui.showErrorState(
                                        "内容脚本报告它无法在此页面上运行"
                                    );
                                    return;
                                }

                                ui.updateStatus(true);

                                // 扩展是否可用 通信事件
                                chrome.runtime.sendMessage({action: "activate"});
                            } else {
                                ui.elements.toggleSwitch.checked = false;
                                ui.elements.statusMessage.textContent =
                                    "错误: 该页面没有响应内容";
                                ui.elements.statusMessage.classList.add("text-red-600");
                            }
                        }
                    );
                } catch (error) {
                    console.error("启动插件失败:", error);
                    ui.elements.toggleSwitch.checked = false;
                    ui.elements.statusMessage.textContent = "错误: " + error.message;
                    ui.elements.statusMessage.classList.add("text-red-600");
                }
            }
        });
    },

    deactivateExtension() {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (tabs && tabs.length > 0) {
                try {
                    chrome.tabs.sendMessage(
                        tabs[0].id,
                        {action: "deactivate"},
                        function (response) {
                            if (chrome.runtime.lastError) {
                                return;
                            }

                            ui.updateStatus(false);

                            // 插件关闭时 清空xpath记录
                            chrome.runtime.sendMessage({action: "clearXPaths"});
                            communication.clearHighlightedElements();
                        }
                    );
                } catch (error) {
                    console.error("启停插件失败:", error);
                }
            }
        });
    },

    searchXPath() {
        const expression = ui.elements.xpathInput.value.trim();
        if (!expression) {
            return;
        }

        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (tabs && tabs.length > 0) {
                try {
                    chrome.tabs.sendMessage(
                        tabs[0].id,
                        {action: "searchXPathAndCss", xpathAndCss: expression},
                        function (response) {
                            if (chrome.runtime.lastError) {
                                ui.elements.xpathMatchCount.classList.remove("hidden");
                                ui.elements.matchCount.textContent =
                                    "" + chrome.runtime.lastError.message;
                                return;
                            }

                            if (response && response.success) {
                                ui.elements.xpathMatchCount.classList.remove("hidden");
                                ui.elements.matchCount.textContent = response.count;
                                chrome.runtime.sendMessage({
                                    action: "saveMatchData",
                                    data: {xpath: expression, count: response.count},
                                });
                            } else {
                                ui.elements.xpathMatchCount.classList.remove("hidden");
                                ui.elements.matchCount.textContent =
                                    "" + (response ? response.error : "未知错误");
                            }
                        }
                    );
                } catch (error) {
                    console.error("查询xpath失败:", error);
                    ui.elements.xpathMatchCount.classList.remove("hidden");
                    ui.elements.matchCount.textContent = "" + error.message;
                }
            }
        });
    },
    clearHighlightedElements() {
        // 清空input字段
        ui.elements.xpathInput.value = "";
        // 隐藏匹配数量
        ui.elements.xpathMatchCount.classList.add("hidden");
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
        chrome.runtime.sendMessage({action: "clearMatchData"});
    },
};

// 事件处理器
const eventHandlers = {
    setupEventListeners() {
        // 扩展开关
        ui.elements.toggleSwitch.addEventListener("change", function () {
            if (ui.elements.toggleSwitch.disabled) return;

            if (ui.elements.toggleSwitch.checked) {
                communication.activateExtension();
            } else {
                communication.deactivateExtension();
            }
        });

        // xpath模式
        ui.elements.simpleModeSwitch.addEventListener("change", function () {
            xpathManager.isSimpleMode = ui.elements.simpleModeSwitch.checked;

            if (xpathManager.isSimpleMode) {
                ui.elements.simpleModeLabel.textContent = "简单模式";
            } else {
                ui.elements.simpleModeLabel.textContent = "完整模式";
            }

            // 如果有数据，切换模式后 就展示之前的数据
            if (xpathManager.currentElementData) {
                xpathManager.displayElementData(xpathManager.currentElementData);
            }
        });

        // 回车键触发搜索
        ui.elements.xpathInput.addEventListener("keyup", function (event) {
            if (event.key === "Enter") {
                communication.searchXPath();
            }
        });

        // 橙汁按钮
        document
            .getElementById("resetButton")
            .addEventListener("click", function () {
                communication.clearHighlightedElements();
            });

        // 监听事件消息
        chrome.runtime.onMessage.addListener(function (
            request,
            sender,
            sendResponse
        ) {
            if (request.action === "elementSelected") {

                xpathManager.displayElementData(request);
                sendResponse({success: true});
            } else if (request.action === "clearXPaths") {
                // Clear XPath display
                xpathManager.clearXPaths();
                sendResponse({success: true});
            }
            return true;
        });
    },
};

// 初始化pop页面
document.addEventListener("DOMContentLoaded", function () {
    // 初始化UI
    ui.initialize();

    // 初始化事件监听
    eventHandlers.setupEventListeners();

    // 检查页面兼容性
    communication.checkPageCompatibility();
});
