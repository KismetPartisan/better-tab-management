var lastTabHighlighted = -2;

//Listens for commands, and passes them to content.js
browser.commands.onCommand.addListener((command) => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0] && Number.isInteger(tabs[0].id) && tabs[0].id >= 0) {
            if (command === "tabSelectionForward") {
                browser.tabs.sendMessage(tabs[0].id, { type: "tabSelectionForward", activeTab: tabs[0].id }).then(() => {})
                .catch((error) => {
                    console.error("Could not send tabSelectionForward message: ", error);
                });
            } else if (command === "tabSelectionBackward") {
                browser.tabs.sendMessage(tabs[0].id, { type: "tabSelectionBackward", activeTab: tabs[0].id  }).then(() => {})
                .catch((error) => {
                    console.error("Could not send tabSelectionBackward message: ", error);
                });
            }
        } else {
            console.error("Could not find active tab");
        }
    })
    .catch((error) => {
        console.error("Error querying tabs:", error);
    });
});

//Handles incoming messages from content.js
browser.runtime.onMessage.addListener((message, _, sendResponse) => {
	if (message.type === "getTabList") {
		browser.tabs.query({ currentWindow: true }).then((tabs) => {
            sendResponse(
                tabs.map((tab) => ({
                    id: tab.id
                })),
            );
        })
        .catch((error) => {
            console.error("Error querying tabs:", error);
            sendResponse({ error: error.message });
        });
		return true;
    } else if (message.type === "setTabHighlight") {
        browser.tabs.update(message.index, { active: false, highlighted: true }) //TODO: figure out how to move to top of if (to prevent tab flickering) without breaking things
        .catch((error) => {
            console.error("Could not highlight tab: ", error);
            sendResponse({ error: error.message });
        });
        if(lastTabHighlighted != -2 && lastTabHighlighted != message.activeTab) {
            browser.tabs.update(lastTabHighlighted, { active: false, highlighted: false })
            .catch((error) => {
                console.error("Could not highlight tab: ", error);
            });
        }
        lastTabHighlighted = message.index;
	} else if (message.type === "switchTab") {
        lastTabHighlighted = -2;
		const id = message.tab;
		browser.tabs.get(id).then((tab) => {
            if (!tab || !Number.isInteger(tab.windowId)) {
                console.error("Could not find tab: ", id);
                sendResponse({ error: "Tab does not exist" });
                return;
            }
            browser.windows.update(tab.windowId, { focused: true }).then(() => {
                browser.tabs.update(id, { active: true }).then(() => {
                    sendResponse({ success: true });
                })
                .catch((error) => {
                    console.error("Could not activate tab: ", error);
                    sendResponse({ error: error.message });
                });
            })
            .catch((error) => {
                console.error("Could not focus window: ", error);
                sendResponse({ error: error.message });
            });
        })
        .catch((error) => {
            console.error("Could not get tab: ", error);
            sendResponse({ error: error.message });
        });
		return true;
	}
});

console.log("Background script initialized");
