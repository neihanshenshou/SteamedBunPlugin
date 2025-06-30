// 全局变量
let isActive = false;
let isCssMode = false;
let highlightedElement = null;
let highlightOverlay = null;
let tooltipElement = null;
let highlightedElements = [];
let highlightOverlays = [];
const excludedAttributes = [
    "id",
    "class",
    "style",
    "href",
    "target",
    "onclick",
    "src",
    "onload",
    "onunload",
    "onbeforeunload",
    "onresize",
    "onscroll",
    "onhashchange",
    "onpopstate",
    "onfocus",
    "onblur",
    "onerror",
    "onafterprint",
    "onbeforeprint",
    "onoffline",
    "ononline",
    "onchange",
    "oninput",
    "oninvalid",
    "onreset",
    "onselect",
    "onsubmit",
    "onkeydown",
    "onkeypress",
    "onkeyup",
    "ondblclick",
    "onmousedown",
    "onmousemove",
    "onmouseout",
    "onmouseover",
    "onmouseup",
    "onmousewheel",
    "onwheel",
    "oncontextmenu",
    "onabort",
    "oncanplay",
    "oncanplaythrough",
    "onended",
    "onloadeddata",
    "onloadedmetadata",
    "onloadstart",
    "onpause",
    "onplay",
    "onplaying",
    "onprogress",
    "onratechange",
    "onseeked",
    "onseeking",
    "onstalled",
    "onsuspend",
    "ontimeupdate",
    "onvolumechange",
    "onwaiting",
    "ontoggle",
    "onanimationstart",
    "onanimationend",
    "onanimationiteration",
    "ontransitionend"
];

// 检查扩展是否可以在当前页面上运行
function canRunOnPage() {
    // 检查是否在常规网页中（不是Chrome内部页面）
    if (
        window.location.protocol === "chrome:" ||
        window.location.protocol === "chrome-extension:" ||
        window.location.protocol === "about:"
    ) {
        return false;
    }

    // 检查dom结构
    try {
        // 直接尝试获取dom
        const test = document.body;
        return true;
    } catch (error) {
        return false;
    }
}

// 初始化插件
function initializeExtension() {
    chrome.runtime.sendMessage({action: "clearXPaths"});
    // 是否可以在此页面上运行
    if (!canRunOnPage()) {
        return;
    }

    // 检查是否在iframe中
    const isInIframe = window !== window.top;

    // 若在iframe中, 创建高亮提示div
    if (!isInIframe) {
        // 创建高亮渲染边框
        if (!highlightOverlay) {
            highlightOverlay = document.createElement("div");
            highlightOverlay.className = "xpath-finder-highlight";
            highlightOverlay.style.display = "none";
            document.body.appendChild(highlightOverlay);
        }

        // 创建高亮提示
        if (!tooltipElement) {
            tooltipElement = document.createElement("div");
            tooltipElement.className = "xpath-finder-tooltip";
            tooltipElement.style.display = "none";
            tooltipElement.style.backgroundColor = "#6c62fa";
            tooltipElement.style.color = "#ffffff";
            document.body.appendChild(tooltipElement);
        }
    }
}

// 当dom结构加载完全后再初始化扩展插件
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeExtension);
} else {
    initializeExtension();
}

window.addEventListener('resize', function () {
    const newHighlightedElements = Array.from(highlightedElements);
    clearHighlightedElements();
    if (newHighlightedElements.length > 0) {
        for (let i = 0; i < newHighlightedElements.length; i++) {
            const element = newHighlightedElements[i];
            highlightMatchedElement(element);
        }
    }
});

// 初始化事件消息监听
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    try {
        // 是否在此页面可运行
        if (!canRunOnPage()) {
            sendResponse({
                success: false,
                error: "不能在该页面是运行",
                canRun: false,
            });
            return true;
        }

        if (request.action === "activate") {
            if (request.isCssMode !== undefined) {
                isCssMode = request.isCssMode;
            }
            activateElementSelection();
            sendResponse({
                success: true,
                message: "元素选择器已生效",
                canRun: true,
                isCssMode: isCssMode
            });
        } else if (request.action === "deactivate") {
            deactivateElementSelection();
            sendResponse({
                success: true,
                message: "元素选择器已失效",
                canRun: true,
            });
        } else if (request.action === "getStatus") {
            sendResponse({isActive: isActive, canRun: true});
        } else if (request.action === "searchXPathAndCss") {
            const result = searchAndHighlightXPathAndCss(request.xpathAndCss);
            sendResponse(result);
        } else if (request.action === "clearHighlightedElements") {
            clearHighlightedElements();
            sendResponse({success: true});
        }
    } catch (error) {
        console.error("Xpath 生成器: 错误信息", error);
        sendResponse({success: false, error: error.message, canRun: false});
    }

    return true;
});

// 激活元素 可定位事件
function activateElementSelection() {
    if (isActive) return;
    isActive = true;

    // 加高亮类属性
    document.body.classList.add("xpath-finder-active");
    // 给整个dom添加操作事件
    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    document.addEventListener("click", handleElementClick, true);

    // 给全部的iframe 添加操作事件
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
        try {
            // 可能报错
            const iframeDoc = iframe.contentDocument;

            iframeDoc.addEventListener("mouseover", handleMouseOver, true);
            iframeDoc.addEventListener("mouseout", handleMouseOut, true);
            iframeDoc.addEventListener("click", handleElementClick, true);
        } catch (error) {
        }
    });

    // 加高亮
    if (!highlightOverlay) {
        highlightOverlay = document.createElement("div");
        highlightOverlay.className = "xpath-finder-highlight";
        document.body.appendChild(highlightOverlay);
    }

    highlightOverlay.style.display = "none";

    if (!tooltipElement) {
        tooltipElement = document.createElement("div");
        tooltipElement.className = "xpath-finder-tooltip";
        document.body.appendChild(tooltipElement);
    }

    tooltipElement.style.display = "none";
    // 通知 background.js
    chrome.runtime.sendMessage({
        action: "updatePluginStatus",
        isActive: true,
    });
}

// 使用xpath表达式寻找元素时 使得页面上的目标元素高亮
function searchAndHighlightXPathAndCss(expression) {
    try {
        // 清空上一次匹配上的元素的高亮样式
        clearHighlightedElements();

        try {
            const elements = window.parent.document.querySelectorAll(expression);
            const count = elements.length;

            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                highlightMatchedElement(element);
            }
            return {success: true, count: count};
        } catch (error) {
            // 使用xpath + evaluate 寻找目标
            const result = window.parent.document.evaluate(
                expression,
                window.parent.document,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );

            const count = result.snapshotLength;
            if (count === 0) {
                return {success: false, error: 0};
            }

            // 让匹配上的所有元素高亮
            for (let i = 0; i < count; i++) {
                const element = result.snapshotItem(i);
                highlightMatchedElement(element);
            }

            return {success: true, count: count};
        }
    } catch (error) {
        return {success: false, error: 0};
    }
}

// 元素高亮
function highlightMatchedElement(element) {
    if (!element) return;

    // 创建高亮区域
    const overlay = document.createElement("div");
    overlay.className = "xpath-finder-highlight";
    document.body.appendChild(overlay);

    // 高亮的位置 基于当前窗口 给出可视的坐标
    const rect = element.getBoundingClientRect();
    overlay.style.display = "block";
    overlay.style.top = window.scrollY + rect.top + "px";
    overlay.style.left = window.scrollX + rect.left + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";

    // Add to the list of highlighted elements and overlays
    highlightedElements.push(element);
    highlightOverlays.push(overlay);
}

// 清空所有元素高亮效果
function clearHighlightedElements() {
    for (const overlay of highlightOverlays) {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    highlightedElements = [];
    highlightOverlays = [];
}

// 匹配模式失效
function deactivateElementSelection() {
    if (!isActive) return;
    isActive = false;

    // 移除所有元素的监听事件
    document.body.classList.remove("xpath-finder-active");

    document.removeEventListener("mouseover", handleMouseOver, true);
    document.removeEventListener("mouseout", handleMouseOut, true);
    document.removeEventListener("click", handleElementClick, true);

    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
        try {
            const iframeDoc = iframe.contentDocument;

            iframeDoc.removeEventListener("mouseover", handleMouseOver, true);
            iframeDoc.removeEventListener("mouseout", handleMouseOut, true);
            iframeDoc.removeEventListener("click", handleElementClick, true);
        } catch (error) {
        }
    });

    // 移除高亮提示
    if (highlightOverlay) {
        highlightOverlay.style.display = "none";
    }

    // 移除提示tip
    if (tooltipElement) {
        tooltipElement.style.display = "none";
    }

    // 移除高亮元素
    highlightedElement = null;

    // 清空所有高亮元素
    clearHighlightedElements();
    // 通知 background.js
    chrome.runtime.sendMessage({
        action: "updatePluginStatus",
        isActive: false,
    });
}

// 鼠标悬浮事件
function handleMouseOver(event) {
    if (!isActive) return;
    if (!event.shiftKey) return;
    // 更新高亮元素
    highlightedElement = event.target;

    // 更新高亮元素相对位置
    updateHighlightOverlay(highlightedElement);
}

// 鼠标离开整个dom 后
function handleMouseOut(event) {
    if (!isActive) return;
    if (
        event.relatedTarget === null ||
        event.relatedTarget.nodeName === "HTML" ||
        !document.documentElement.contains(event.relatedTarget)
    ) {
        // 移除高亮效果和 提示
        if (highlightOverlay) {
            highlightOverlay.style.display = "block";
            setTimeout(() => {
                highlightOverlay.style.display = "none";
            }, 3000)
        }

        if (tooltipElement) {
            tooltipElement.style.display = "none";
        }
    }
}

// 刷新高亮显示位置和大小
function updateHighlightOverlay(element) {
    if (!element || !highlightOverlay) return;

    try {
        const rect = element.getBoundingClientRect();

        // 对于iframe中的元素，需要调整位置
        if (isElementInIframe(element)) {
            const elementDocument = element.ownerDocument;
            const iframes = document.querySelectorAll("iframe");

            for (let i = 0; i < iframes.length; i++) {
                try {
                    if (iframes[i].contentDocument === elementDocument) {
                        // 寻找到后 并调整
                        const iframeRect = iframes[i].getBoundingClientRect();

                        highlightOverlay.style.display = "block";
                        highlightOverlay.style.top =
                            window.scrollY + iframeRect.top + rect.top + "px";
                        highlightOverlay.style.left =
                            window.scrollX + iframeRect.left + rect.left + "px";
                        highlightOverlay.style.width = rect.width + "px";
                        highlightOverlay.style.height = rect.height + "px";
                        return;
                    }
                } catch (e) {
                    // 无权限访问
                    console.log(`可忽略${e}`)
                }
            }

            // 未在iframe发现元素, 隐藏高亮
            highlightOverlay.style.display = "none";
            return;
        }

        // 处理dom中的元素的高亮位置于大小
        highlightOverlay.style.display = "block";
        highlightOverlay.style.top = window.scrollY + rect.top + "px";
        highlightOverlay.style.left = window.scrollX + rect.left + "px";
        highlightOverlay.style.width = rect.width + "px";
        highlightOverlay.style.height = rect.height + "px";
    } catch (error) {
        console.error("Xpath 生成器: Error updating highlight overlay:", error);
        highlightOverlay.style.display = "none";
    }
}

// 刷新提示框的位置和内容
function updateTooltip(event, element) {
    if (!element || !tooltipElement) return;

    const tagName = element.tagName.toLowerCase();
    const shortXPath = getShortXPath(element);

    // 设置内容
    tooltipElement.textContent = `${tagName} - ${shortXPath}`;

    // 显示tip
    tooltipElement.style.display = "block";

    // 调整iframe中的位置
    if (isElementInIframe(element)) {
        const elementDocument = element.ownerDocument;
        const iframes = document.querySelectorAll("iframe");

        for (let i = 0; i < iframes.length; i++) {
            try {
                if (iframes[i].contentDocument === elementDocument) {
                    const iframeRect = iframes[i].getBoundingClientRect();

                    tooltipElement.style.top = iframeRect.top + event.clientY + 15 + "px";
                    tooltipElement.style.left =
                        iframeRect.left + event.clientX + 10 + "px";
                    break;
                }
            } catch (e) {
                // 无权限访问
                console.log(`可忽略${e}`)
            }
        }
    } else {
        // 处理dom中的tip位置
        tooltipElement.style.top = event.clientY + 15 + "px";
        tooltipElement.style.left = event.clientX + 10 + "px";
    }

    // 确保tip在视野范围内
    const tooltipRect = tooltipElement.getBoundingClientRect();
    if (tooltipRect.right > window.innerWidth) {
        tooltipElement.style.left =
            window.innerWidth - tooltipRect.width - 10 + "px";
    }
    if (tooltipRect.bottom > window.innerHeight) {
        tooltipElement.style.top = event.clientY - tooltipRect.height - 10 + "px";
    }
}

// 如果xpath过程, tip 就显示未缩略式
function getShortXPath(element) {
    const isInIframe = isElementInIframe(element);

    if (element.id) {
        if (isInIframe) {
            // For elements with ID inside iframe, include a simplified iframe indicator
            return `iframe → //*[@id="${element.id}"]`;
        }
        return `//*[@id="${element.id}"]`;
    }

    // 校验文本内容长度
    const directText = getDirectTextContent(element);
    if (directText && directText.length > 0 && directText.length < 30) {
        if (isInIframe) {
            return `iframe → //${element.tagName.toLowerCase()}[text()="${directText}"]`;
        }
        return `//${element.tagName.toLowerCase()}[text()="${directText}"]`;
    }

    // 处理选择器
    if (element.tagName === "SELECT") {
        if (element.name) {
            if (isInIframe) {
                return `iframe → //select[@name="${element.name}"]`;
            }
            return `//select[@name="${element.name}"]`;
        }

        // 如果第一个选项携带了文本属性
        if (
            element.options &&
            element.options.length > 0 &&
            element.options[0].text
        ) {
            if (isInIframe) {
                return `iframe → //option[text()="${element.options[0].text}"]/parent::select`;
            }
            return `//option[text()="${element.options[0].text}"]/parent::select`;
        }
    }

    // 使用标签名称和层级位置获取xpath
    let path = "";
    let current = element;
    let parent = current.parentElement;
    let depth = 0;

    // 获取该元素所属的dom
    const elementDocument = element.ownerDocument;

    while (current && parent && depth < 2) {
        let position = 1;
        let sibling = current.previousElementSibling;

        while (sibling) {
            if (sibling.tagName === current.tagName) {
                position++;
            }
            sibling = sibling.previousElementSibling;
        }

        path = `/${current.tagName.toLowerCase()}[${position}]${path}`;
        current = parent;
        parent = current.parentElement;
        depth++;
    }

    if (isInIframe) {
        return `iframe → ...${path}`;
    }
    return `...${path}`;
}

// 鼠标点击事件
function handleElementClick(event) {
    if (!isActive) return;
    clearHighlightedElements();

    if (event.shiftKey) {
        // 阻止元素的默认事件, 例如a标签、form提交操作等
        event.preventDefault();
        // 阻止事件向上冒泡，避免父元素的事件被触发
        event.stopPropagation();
    }

    // 用于生成xpath的目标元素
    const element = event.target;

    // 生成xpath路径
    if (!event.shiftKey) return;
    const xpathSelectors = generateXPaths(element);


    // 按下shift键 + 鼠标点击 才会有提示
    if (event.shiftKey) {
        // 更新高亮元素
        highlightedElement = event.target;
        updateTooltip(event, highlightedElement);
    }

    // xpath模式
    const selectors = xpathSelectors;
    const selectorType = "XPaths";
    const selectorCount = selectors.length;

    // 检测是否生成xpath
    if (selectorCount === 0) {
        console.warn(
            `Xpath 生成器:  未成功生成对应的${selectorType} 路径`,
            element
        );
    }

    try {
        chrome.runtime.sendMessage(
            {
                action: "elementSelected",
                xpaths: selectors,
                xpathSelectors: xpathSelectors,
                xpathCount: selectorCount,
                elementTag: element.tagName.toLowerCase(),
                elementHasEmptyXPaths: selectorCount === 0,
                isCssMode: isCssMode
            }
        );
    } catch (error) {
        console.error("Xpath 生成器: Error sending message:", error);
    }

    return false;
}

// 多种xpath选择器

// 优化XPath有效性验证和排序
function generateXPaths(element) {
    let xpaths;
    const originalXpaths = [];

    // 1. 绝对路径（仅作为备用）
    const absoluteXPath = getAbsoluteXPath(element);
    originalXpaths.push({
        type: "绝对路径",
        xpath: absoluteXPath,
        description: "绝对路径(不建议使用)",
        score: 1 // 低优先级评分
    });

    // 2. 基于ID（高优先级）
    const idXPaths = getXPathsWithId(element);
    idXPaths.forEach(xpath => {
        originalXpaths.push({
            type: "基于ID",
            xpath: xpath.xpath,
            description: xpath.description,
            score: 5 // 高优先级评分
        });
    });

    // 3. 基于类名
    const classXPaths = getXPathsWithClass(element);
    classXPaths.forEach(xpath => {
        originalXpaths.push({
            type: "基于类名",
            xpath: xpath.xpath,
            description: xpath.description,
            score: 3 // 中优先级评分
        });
    });

    // 4. 基于属性
    const attrXPaths = getXPathsWithAttributes(element);
    attrXPaths.forEach(xpath => {
        originalXpaths.push({
            type: "基于属性",
            xpath: xpath.xpath,
            description: xpath.description,
            score: 2 // 中低优先级评分
        });
    });

    // 5. 优化的XPath
    const optimizedXPaths = getOptimizedXPaths(element);
    optimizedXPaths.forEach(xpath => {
        originalXpaths.push({
            type: "智能优化",
            xpath: xpath.xpath,
            description: xpath.description,
            score: 4 // 较高优先级评分
        });
    });

    // 6. 基于文本
    const textXPaths = getXPathsWithText(element);
    textXPaths.forEach(xpath => {
        originalXpaths.push({
            type: "基于文本",
            xpath: xpath.xpath,
            description: xpath.description,
            score: 3 // 中优先级评分
        });
    });

    // 7. 基于层级
    const positionXPaths = getXPathsWithPosition(element);
    positionXPaths.forEach(xpath => {
        originalXpaths.push({
            type: "基于层级",
            xpath: xpath.xpath,
            description: xpath.description,
            score: 2 // 中低优先级评分
        });
    });

    // 过滤和排序XPath
    xpaths = filterAndSortXPaths(originalXpaths, element);
    return xpaths;
}

// 过滤无效XPath并按优先级排序
function filterAndSortXPaths(xpaths, element) {
    const validXpaths = [];

    xpaths.forEach(xpathObj => {
        const {count, index, error} = getElementIndexByXPath(xpathObj.xpath, element);

        if (count > 0 && index > 0 && !error) {
            // 计算唯一性得分
            const uniquenessScore = 10 - (count / 10);
            // 综合得分 = 基础优先级 + 唯一性得分
            const totalScore = xpathObj.score + uniquenessScore;

            validXpaths.push({
                ...xpathObj,
                count,
                index,
                totalScore
            });
        }
    });

    // 按综合得分降序排序
    return validXpaths.sort((a, b) => b.totalScore - a.totalScore);
}

// 检查元素是否在iframe内部
function isElementInIframe(element) {
    try {
        if (!element || !element.ownerDocument) return false;

        // 检查是否在iframe中，包括嵌套iframe
        let currentDoc = element.ownerDocument;
        while (currentDoc && currentDoc !== document) {
            if (currentDoc.defaultView && currentDoc.defaultView.frameElement) {
                return true;
            }
            currentDoc = currentDoc.parent.document || null;
        }
        return false;
    } catch (e) {
        return false;
    }
}

// 获取元素的iframe路径
// 获取完整的iframe路径
function getIframePath(element) {
    try {
        const elementDocument = element.ownerDocument;
        const iframePathArray = [];

        // 处理嵌套iframe
        let currentDoc = elementDocument;
        while (currentDoc && currentDoc !== document) {
            if (currentDoc.defaultView && currentDoc.defaultView.frameElement) {
                const iframeElement = currentDoc.defaultView.frameElement;
                const iframeXPath = getAbsoluteXPath(iframeElement);
                iframePathArray.unshift(iframeXPath);
                currentDoc = currentDoc.parent.document;
            } else {
                break;
            }
        }

        // 构建完整的iframe路径
        if (iframePathArray.length > 0) {
            return iframePathArray.join("/iframe[1]/");
        }

        return "//iframe";
    } catch (e) {
        console.error("获取iframe路径错误:", e);
        return "//iframe";
    }
}

// 绝对路径
function getAbsoluteXPath(element) {
    if (element.nodeType !== Node.ELEMENT_NODE) {
        return "";
    }

    const isInIframe = isElementInIframe(element);

    if (isInIframe) {
        const elementDocument = element.ownerDocument;

        if (element === elementDocument.body) {
            return getIframePath(element) + "/html/body";
        }

        let xpath = "";
        let parent = element;

        while (parent && parent !== elementDocument.body) {
            let index = 1;
            let sibling = parent.previousElementSibling;

            while (sibling) {
                if (sibling.tagName === parent.tagName) {
                    index++;
                }
                sibling = sibling.previousElementSibling;
            }

            xpath = `/${parent.tagName.toLowerCase()}[${index}]${xpath}`;
            parent = parent.parentElement;
        }

        return getIframePath(element) + "/html/body" + xpath;
    }

    // 常规处理dom中的元素
    if (element === document.body) {
        return "/html/body";
    }

    let xpath = "";
    let parent = element;

    while (parent && parent !== document.body) {
        let index = 1;
        let sibling = parent.previousElementSibling;

        while (sibling) {
            if (sibling.tagName === parent.tagName) {
                index++;
            }
            sibling = sibling.previousElementSibling;
        }

        xpath = `/${parent.tagName.toLowerCase()}[${index}]${xpath}`;
        parent = parent.parentElement;
    }

    return `/html/body${xpath}`;
}

// 转义XPath中的特殊字符
function escapeXPathString(value) {
    if (!value) return "";

    // 转义单引号、双引号和&符号
    value = value.replace(/'/g, "'\"'\"'"); // 用于单引号包裹的XPath
    value = value.replace(/"/g, '\\"');     // 用于双引号包裹的XPath
    value = value.replace(/&/g, '&amp;');
    value = value.replace(/</g, '&lt;');
    value = value.replace(/>/g, '&gt;');
    value = value.replace(/\$/g, '\\$');
    value = value.replace(/\^/g, '\\^');
    value = value.replace(/\{/g, '\\{');
    value = value.replace(/\}/g, '\\}');
    value = value.replace(/\|/g, '\\|');
    value = value.replace(/\(/g, '\\(');
    value = value.replace(/\)/g, '\\)');
    value = value.replace(/\*/g, '\\*');
    value = value.replace(/\+/g, '\\+');
    value = value.replace(/\?/g, '\\?');
    value = value.replace(/\[/g, '\\[');
    value = value.replace(/\]/g, '\\]');
    value = value.replace(/\\/g, '\\\\');

    return value;
}

// 基于ID生成xpath
function getXPathsWithId(element, needParent = true) {
    const results = [];

    if (element.id) {
        const escapedId = escapeXPathString(element.id);
        results.push({
            xpath: `//${element.tagName.toLowerCase()}[@id="${escapedId}"]`,
            description: "根据元素的标签名称和ID属性匹配",
        });
    }

    if (needParent) {
        // 基于父元素的ID
        let parent = element.parentElement;
        let depth = 0;

        while (parent && parent !== document.body && depth < 3) {
            if (parent.id) {
                const tagPath = getRelativePathToParent(element, parent);
                results.push({
                    xpath: `//*[@id="${parent.id}"]${tagPath}`,
                    description: `根据父元素ID: "${parent.id}" 匹配`,
                });
                break;
            }
            parent = parent.parentElement;
            depth++;
        }
    }
    return results;
}

// 基于类名
function getXPathsWithClass(element) {
    const results = [];

    if (element.className && typeof element.className === "string") {
        let xpath;
        let clickedItemClass = element.className;
        let splitClass = clickedItemClass.trim().split(" ");
        if (splitClass.length > 2) {
            let cl = `${splitClass[0]} ${splitClass[1]}`;
            xpath = `//${element.tagName.toLowerCase()}[contains(@class,"${cl}")]`;
            let {count, index} = getElementIndexByXPath(xpath, element);
            if (count > 1) {
                xpath = `(//${element.tagName.toLowerCase()}[contains(@class,"${cl}")])[${index}]`;
            }
        } else {
            xpath = `//${element.tagName.toLowerCase()}[@class="${clickedItemClass}"]`;
            let {count, index} = getElementIndexByXPath(xpath, element);
            if (count > 1) {
                xpath = `(//${element.tagName.toLowerCase()}[@class="${clickedItemClass}"])[${index}]`;
            }
        }
        results.push({
            xpath,
            description: "使用确切的类属性匹配",
        });

    }

    return results;
}

// 基于属性
function getXPathsWithAttributes(element) {
    const results = [];

    // 检查所有属性
    for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        // 跳过已经被特殊处理的属性
        if (excludedAttributes.includes(attr.name)) continue;

        if (attr.value) {
            const escapedAttrName = escapeXPathString(attr.name);
            const escapedAttrValue = escapeXPathString(attr.value);

            // 精确匹配
            let xpath = `//${element.tagName.toLowerCase()}[@${escapedAttrName}="${escapedAttrValue}"]`;
            let {count, index} = getElementIndexByXPath(xpath, element);
            if (count > 1) {
                xpath = `(//${element.tagName.toLowerCase()}[@${attr.name}="${attr.value}"])[${index}]`
            }
            results.push({
                xpath: xpath,
                description: `使用 "${attr.name}" 属性`,
            });

            // 属性过长 模糊匹配
            if (attr.value.length > 10) {
                const partialValue = escapeXPathString(attr.value.substring(0, 10));
                xpath = `//${element.tagName.toLowerCase()}[contains(@${
                    escapedAttrName
                }, "${partialValue}")]`;
                if (count > 1) {
                    xpath = `(//${element.tagName.toLowerCase()}[contains(@${
                        attr.name
                    }, "${attr.value.substring(0, 10)}")])[${index}]`;
                }
                results.push({
                    xpath,
                    description: `使用部分 "${attr.name}" 属性匹配`,
                });
            }
        }
    }

    // 特殊处理 select选择器
    if (element.tagName === "SELECT") {
        if (element.options && element.options.length > 0) {
            const firstOption = element.options[0];
            if (firstOption && firstOption.text) {
                results.push({
                    xpath: `//option[text()="${firstOption.text}"]/parent::select`,
                    description: "根据第一个选项文本匹配",
                });
            }

            // 根据选项序号
            results.push({
                xpath: `//select[count(option)=${element.options.length}]`,
                description: `根据选项数量 (${element.options.length})匹配`,
            });
        }

        if (element.id) {
            results.push({
                xpath: `//select[@id="${element.id}"]`,
                description: "根据选择器ID属性匹配",
            });

            results.push({
                xpath: `//label[@for="${element.id}"]/following-sibling::select`,
                description: "使用关联的标签元素",
            });
        }
    }

    // 图片的src属性
    if (element.tagName.toLowerCase() === "img" && element.src) {
        const srcValue = element.getAttribute("src");
        if (srcValue) {
            // Use the filename part of the src
            const filename = srcValue.split("/").pop().split("?")[0];
            results.push({
                xpath: `//img[contains(@src, "${filename}")]`,
                description: "使用图片名称匹配",
            });
        }
    }

    // data属性 正常是测试元素携带
    for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        if (attr.name.startsWith("data-id")) {
            results.push({
                xpath: `//${element.tagName.toLowerCase()}[@${attr.name}="${
                    attr.value
                }"]`,
                description: `使用 "${attr.name}" data 属性`,
            });
        }
    }

    return results;
}

// 基于文本
function getDirectTextContent(element) {
    let text = "";
    let firstTextNodeIndex = Array.from(element.childNodes).findIndex(
        (node) => node.nodeType === Node.TEXT_NODE
    );
    if (firstTextNodeIndex > -1) {
        text = element.childNodes[firstTextNodeIndex].textContent;
    }
    return text;
}

// 获取元素的完整文本内容，包括子元素文本
function getFullTextContent(element) {
    let text = "";

    // 处理直接文本节点
    const textNodes = Array.from(element.childNodes).filter(
        node => node.nodeType === Node.TEXT_NODE
    );

    textNodes.forEach(node => {
        text += node.textContent.trim() + " ";
    });

    // 递归处理子元素文本
    const childElements = Array.from(element.children);
    childElements.forEach(child => {
        text += getFullTextContent(child).trim() + " ";
    });

    return text.trim();
}

// 基于文本
function getXPathsWithText(element) {
    const results = [];

    const fullText = getFullTextContent(element);
    const directText = getDirectTextContent(element);


    if (fullText && fullText.length > 0) {
        // 完整文本匹配（仅当文本较短时使用）
        if (fullText.length < 50) {
            const escapedText = escapeXPathString(fullText);
            results.push({
                xpath: `//${element.tagName.toLowerCase()}[.="${escapedText}"]`,
                description: "使用完整文本内容精准匹配",
            });
        }

        // 部分文本匹配
        const firstWords = escapeXPathString(fullText.slice(0, 10));
        if (fullText.length > 10) {
            results.push({
                xpath: `//${element.tagName.toLowerCase()}[contains(., "${firstWords}")]`,
                description: "使用部分文本内容模糊匹配",
            });
        }
    }

    // 直接文本匹配（仅当直接文本与完整文本不同时使用）
    if (directText && directText.length > 0 && directText !== fullText) {
        if (directText.length < 50) {
            const escapedText = escapeXPathString(directText);
            results.push({
                xpath: `//${element.tagName.toLowerCase()}[normalize-space()="${escapedText}"]`,
                description: "使用直接文本内容精准匹配",
            });
        }
    }

    return results;
}

// 基于层级
function getXPathsWithPosition(element) {
    const results = [];

    let path = "";
    let current = element;
    let parent = current.parentElement;

    let previousSiblings = getPreviousSiblings(current);
    if (previousSiblings.length > 0) {
        previousSiblings = previousSiblings.reverse();
        previousSiblings.some((previousSibling) => {

            let result = getXPathsWithId(previousSibling, false);
            if (result.length === 0) {
                result = getXPathsWithText(previousSibling);
            }
            if (result.length === 0) {
                result = getXPathsWithClass(previousSibling);
            }
            if (result.length === 0) {
                result = getXPathsWithAttributes(previousSibling);
            }

            if (result.length > 0) {
                path = result[0]["xpath"];
                let xpath = `${path}/following-sibling::${element.tagName.toLowerCase()}`;
                let {count, index} = getElementIndexByXPath(xpath, element);
                if (count > 1) {
                    xpath = `(${path}/following-sibling::${element.tagName.toLowerCase()})[${index}]`;
                    if (count === index) {
                        xpath = `(${path}/following-sibling::${element.tagName.toLowerCase()})[last()]`;
                    }
                }
                results.push({
                    xpath: xpath,
                    description: `根据下一级兄弟的xpath: ${path}`,
                });
                return true;
            }
            return false;
        });
    }

    // 基于兄弟层级
    let nextSiblings = getNextSiblings(current);
    if (nextSiblings.length > 0) {
        nextSiblings.some((nextSibling) => {
            let result = getXPathsWithId(nextSibling);
            if (result.length === 0) {
                result = getXPathsWithText(nextSibling);
            }
            if (result.length === 0) {
                result = getXPathsWithClass(nextSibling);
            }
            if (result.length === 0) {
                result = getXPathsWithAttributes(nextSibling);
            }
            if (result.length > 0) {
                path = result[0]["xpath"];
                let xpath = `${path}/preceding-sibling::${element.tagName.toLowerCase()}`;
                let {count, index} = getElementIndexByXPath(xpath, element);
                if (count > 1) {
                    xpath = `(${path}/preceding-sibling::${element.tagName.toLowerCase()})[${index}]`;
                    if (count === index) {
                        xpath = `(${path}/preceding-sibling::${element.tagName.toLowerCase()})[last()]`;
                    }
                }

                results.push({
                    xpath: xpath,
                    description: `相对前一级兄弟元素的xpath: ${path}`,
                });
                return true;
            }
            return false;
        });
    }

    // 特殊span标签
    if (current.tagName.toLowerCase() === "span") {
        let result = getXPathsWithText(current);
        if (result.length === 0) {
            result = getXPathsWithClass(current);
        }
        if (result.length === 0) {
            result = getXPathsWithAttributes(current);
        }
        if (result.length > 0) {
            path = result[0]["xpath"];
            let xpath = `${path}/ancestor::button`;
            let {count, index} = getElementIndexByXPath(xpath, current);
            if (count > 1) {
                xpath = `(${path}/ancestor::button)[${index}]`;
                if (count === index) {
                    xpath = `(${path}/ancestor::button)[last()]`;
                }
                results.push({
                    xpath: xpath,
                    description: `结合轴和节点来选取特定路径 ${path}`,
                });
            }
        }
    }

    // 使用独特父元素的相对路径
    path = "";
    current = element;
    parent = current.parentElement;

    let result;
    if (parent && parent !== document.body) {
        result = getXPathsWithId(parent, false);
        if (result.length === 0) {
            result = getXPathsWithText(parent);
        }
        if (result.length === 0) {
            result = getXPathsWithClass(parent);
        }
        if (result.length === 0) {
            result = getXPathsWithAttributes(parent);
        }
        if (result.length > 0) {
            path = result[0]["xpath"];
            let {sibLingPosition} = getElementPositionInParent(
                element,
                parent
            );
            // 元素标签名称添加到路径中
            results.push({
                xpath: `${path}/${element.tagName.toLowerCase()}[${sibLingPosition}]`,
                description: "相对父级元素属性较唯一的路径",
            });
        }
    }

    let position = 1;
    let elementInfo = getElementInfo(element);
    if (elementInfo["totalElements"] > 1) {
        path = `(//${element.tagName.toLowerCase()})[${elementInfo["position"]}]`;
    } else {
        path = `//${element.tagName.toLowerCase()}`;
    }

    results.push({
        xpath: path,
        description: `兄弟元素第${elementInfo["position"]}${getOrdinalSuffix(
            position
        )}${element.tagName.toLowerCase()}`,
    });

    // 基于父级层级
    if (parent && parent !== document.body) {
        const parentTag = parent.tagName.toLowerCase();
        let elementInfo = getElementInfo(parent);
        let {sibLingPosition} = getElementPositionInParent(
            element,
            parent
        );
        if (elementInfo["totalElements"] > 1 && sibLingPosition > 1) {
            path = `(//${parentTag})[${
                elementInfo["position"]
            }]/${element.tagName.toLowerCase()}[${sibLingPosition}]`;
        } else if (elementInfo["totalElements"] > 1 && sibLingPosition === 1) {
            path = `(//${parentTag})[${
                elementInfo["position"]
            }]/${element.tagName.toLowerCase()}[${sibLingPosition}]`;
        } else {
            path = `//${parentTag}/${element.tagName.toLowerCase()}[${sibLingPosition}]`;
        }
        // 相对父元素
        results.push({
            xpath: path,
            description: `相对父元素: ${parentTag} 直达目标元素`,
        });
    }
    return results;
}

// 优化短xpath
function getOptimizedXPaths(element) {
    const results = [];

    // 匹配唯一的 结合所有属性

    let xPathsWithId = getXPathsWithId(element);
    results.push(...xPathsWithId);

    // 1. 结合标签和属性
    for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        if (!excludedAttributes.includes(attr.name)) {
            const xpath = `//${element.tagName.toLowerCase()}[@${attr.name}="${
                attr.value
            }"]`;
            try {
                if (
                    document.evaluate(
                        xpath,
                        document,
                        null,
                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                        null
                    ).snapshotLength === 1
                ) {
                    results.push({
                        xpath: xpath,
                        description: `结合 tag 和 ${attr.name} 属性匹配`,
                    });
                }
            } catch (e) {
                // 跳过无效的xpath
            }
        }
    }

    // 2. 结合标签和属性
    let xPathsWithClass = getXPathsWithClass(element);
    results.push(...xPathsWithClass);

    // 3. 结合标签和文本
    const directText = getDirectTextContent(element);
    if (directText && directText.length > 0) {
        if (directText.length < 30) {
            const xpath = `//${element.tagName.toLowerCase()}[text()="${directText}"]`;
            try {
                if (
                    document.evaluate(
                        xpath,
                        document,
                        null,
                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                        null
                    ).snapshotLength === 1
                ) {
                    results.push({
                        xpath: xpath,
                        description: "标签和文本内容的独特组合",
                    });
                }
            } catch (e) {
                // 跳过无效的xpath
            }

            // 尝试文本模糊匹配
            const containsXpath = `//${element.tagName.toLowerCase()}[contains(text(), "${directText}")]`;
            try {
                if (
                    document.evaluate(
                        containsXpath,
                        document,
                        null,
                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                        null
                    ).snapshotLength === 1 &&
                    !results.some((r) => r.xpath === xpath) // Don't add if exact match already added
                ) {
                    results.push({
                        xpath: containsXpath,
                        description:
                            "标签和部分直接文本内容的组合",
                    });
                }
            } catch (e) {
                // 跳过无效xpath
            }
        }
    }

    // 4. 尝试使用父上下文以获得更多独特性
    if (element.parentElement && element.parentElement !== document.body) {
        const parent = element.parentElement;
        const parentTag = parent.tagName.toLowerCase();

        // Position within parent
        let position = 1;
        let sibling = element.previousElementSibling;

        while (sibling) {
            if (sibling.tagName === element.tagName) {
                position++;
            }
            sibling = sibling.previousElementSibling;
        }

        // 父级类属性 + 子级层级
        if (parent.className && typeof parent.className === "string") {
            const classes = parent.className.trim().split(/\s+/);
            for (const cls of classes) {
                if (cls.length > 0) {
                    const xpath = `//${parentTag}[contains(@class, "${cls}")]/${element.tagName.toLowerCase()}[${position}]`;
                    try {
                        if (
                            document.evaluate(
                                xpath,
                                document,
                                null,
                                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                                null
                            ).snapshotLength === 1
                        ) {
                            results.push({
                                xpath: xpath,
                                description: `使用父元素的类属性: "${cls}" 和 相对层级匹配`,
                            });
                        }
                    } catch (e) {
                        // 跳过无效
                    }
                }
            }
        }
    }

    let xPathsWithPosition = getXPathsWithPosition(element);
    results.push(...xPathsWithPosition.slice(0, 2));
    return results;
}

// 获取从元素到父的相对路径
function getRelativePathToParent(element, parent) {
    let path = "";
    let current = element;

    while (current && current !== parent) {
        let position = 1;
        let sibling = current.previousElementSibling;

        while (sibling) {
            if (sibling.tagName === current.tagName) {
                position++;
            }
            sibling = sibling.previousElementSibling;
        }

        path = `/${current.tagName.toLowerCase()}[${position}]${path}`;
        current = current.parentElement;
    }

    return path;
}

// 辅助功能获得序列后缀
function getOrdinalSuffix(n) {
    const s = ["个", "个", "个", "个"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

function getElementInfo(element) {
    const tagName = element.tagName.toLowerCase();
    const allSameTagElements = document.querySelectorAll(tagName);
    const elementsArray = Array.from(allSameTagElements);

    return {
        tagName: tagName,
        totalElements: elementsArray.length,
        position: elementsArray.indexOf(element) + 1,
    };
}

function getElementPositionInParent(element, parent) {
    const tagName = element.tagName.toLowerCase();
    const sameTagChildren = Array.from(parent.children).filter(
        child => child.tagName.toLowerCase() === tagName
    );
    const sibLingPosition = sameTagChildren.indexOf(element) + 1;
    return {
        parentTagName: parent.tagName.toLowerCase(),
        sibLingPosition: sibLingPosition,
    };
}

function getPreviousSiblings(element) {
    const siblings = [];
    let sibling = element.previousElementSibling;

    while (sibling) {
        siblings.unshift(sibling);
        sibling = sibling.previousElementSibling;
    }

    return siblings;
}

function getNextSiblings(element) {
    const siblings = [];
    let sibling = element.nextElementSibling;

    while (sibling) {
        siblings.push(sibling);
        sibling = sibling.nextElementSibling;
    }

    return siblings;
}

function getElementIndexByXPath(xpath, element) {
    try {
        const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const snapshotLength = result.snapshotLength;

        if (snapshotLength === 0) {
            return {count: 0, index: -1};
        }

        for (let i = 0; i < snapshotLength; i++) {
            const node = result.snapshotItem(i);
            if (node === element) {
                return {count: snapshotLength, index: i + 1};
            }
        }

        return {count: snapshotLength, index: -1};
    } catch (error) {
        console.error("XPath evaluation error:", error);
        return {count: -1, index: -1, error: error.message};
    }
}

