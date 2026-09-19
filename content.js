(async () => {
    var highLightedIndex = -2;
    var listenerRunning = false;

	function tabSelection(relativeIndex, activeTab) {
        browser.runtime.sendMessage({ type: "getTabList" }).then((tabs) => {
            for(let i = 0; i < tabs.length; i++) {
                if(activeTab == tabs[i].id) {
                    var activeIndex = i;
                    break;
                } else if(i == tabs.length-1) {
                    console.error("Active tab doesn't match any tab in list");
                    return;
                }
            }
            if(highLightedIndex == -2) {
                highLightedIndex = activeIndex;
            }
            highLightedIndex += relativeIndex;

            //Handle wrap around cases
            if (highLightedIndex >= tabs.length) {
                highLightedIndex = 0;
            } else if (highLightedIndex < 0) {
                highLightedIndex = tabs.length-1;
            }

            console.log(highLightedIndex);
            browser.runtime.sendMessage({ type: "setTabHighlight", index:tabs[highLightedIndex].id, activeTab: activeTab });

            const controlListener = (e) => {
                if (e.key == "Control") {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Control released: switching tabs");
                    browser.runtime.sendMessage({ type: "switchTab", tab: tabs[highLightedIndex].id });
                    highLightedIndex = -2;
                    document.removeEventListener("keyup", controlListener);
                    listenerRunning = false;
                }
            };

            if(!listenerRunning) {
                document.addEventListener("keyup", controlListener);
                listenerRunning = true;
            }
        });
	}

	/* Listen for messages from background */
	browser.runtime.onMessage.addListener((message) => {
		if (message.type === "tabSelectionForward") {
			tabSelection(1, message.activeTab);
		} else if (message.type === "tabSelectionBackward") {
			tabSelection(-1, message.activeTab);
		}
	});
})();







