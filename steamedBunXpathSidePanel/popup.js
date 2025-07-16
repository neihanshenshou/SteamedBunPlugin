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

    // 查看关闭按钮提示
    viewDetailOpenBtn() {
        const open_btn = document.getElementById("open-side-btn-tip");
        const open_msg = document.getElementById("open-side-btn-tip-msg");
        if (!open_btn) return;

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

    // 查看按钮提示
    popPage.viewDetailOpenBtn();

});
