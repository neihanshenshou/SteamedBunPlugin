const popPage = {

    // 开启侧边栏
    openSidePanel() {
        const button = document.getElementById('openSideButton');
        if (!button) return;

        button.addEventListener('click', async () => {
            try {
                const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
                await chrome.sidePanel.open({tabId: tab.id});
                window.close(); // 可选：关闭弹窗
            } catch (error) {
                console.error('打开侧边栏失败:', error);
                button.textContent = `错误: ${error.message}`;
            }
        });
    },

    // 关闭插件
    deactivateExtension() {

        const button = document.getElementById('closePluginBtn');
        if (!button) return;

        button.addEventListener('click', async () => {
            await chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                if (tabs && tabs.length > 0) {
                    try {
                        chrome.tabs.sendMessage(
                            tabs[0].id,
                            {action: "deactivate"},
                            function (response) {
                                if (chrome.runtime.lastError) {
                                    return;
                                }
                                // 插件关闭时 清空xpath记录
                                chrome.runtime.sendMessage({action: "clearXPaths"});
                            }
                        );
                    } catch (error) {
                        console.error("启停插件失败:", error);
                    }
                }
            });
        });
    },

    // 查看关闭按钮提示
    viewDetailCloseBtn() {
        const close_btn = document.getElementById("close-btn-tip");
        const close_msg = document.getElementById("close-btn-tip-msg")
        const open_btn = document.getElementById("open-side-btn-tip")
        const open_msg = document.getElementById("open-side-btn-tip-msg")
        if (!close_btn) return;
        if (!close_msg) return;

        close_btn.addEventListener("mouseenter", () => {
            close_msg.classList.remove("hidden");
        });

        close_btn.addEventListener("mouseleave", () => {
            setTimeout(() => {
                close_msg.classList.add("hidden");
            }, 700);
        });

        open_btn.addEventListener("mouseenter", () => {
            open_msg.classList.remove("hidden");
        });

        open_btn.addEventListener("mouseleave", () => {
            setTimeout(() => {
                open_msg.classList.add("hidden");
            }, 700);
        });

    }

}


// 初始化pop页面
document.addEventListener("DOMContentLoaded", function () {
    // 开启侧边栏
    popPage.openSidePanel();

    // 关闭插件应用
    popPage.deactivateExtension();

    // 查看按钮提示
    popPage.viewDetailCloseBtn();

});
