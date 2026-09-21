var highlightedTab = -2;

//Listens for commands, and passes them to content.js
browser.commands.onCommand.addListener((command) => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0] && Number.isInteger(tabs[0].id) && tabs[0].id >= 0) {
            if (command === "tabSelectionForward") {
                browser.tabs.sendMessage(tabs[0].id, { type: "tabSelectionForward" })
                .catch((error) => {
                    console.error("Could not send tabSelectionForward message: ", error);
                });
            } else if (command === "tabSelectionBackward") {
                browser.tabs.sendMessage(tabs[0].id, { type: "tabSelectionBackward" })
                .catch((error) => {
                    console.error("Could not send tabSelectionBackward message: ", error);
                });
            } else if (command === "tabMoveForward") {
                moveTab(tabs[0], 1);
            } else if (command === "tabMoveBackward") {
                moveTab(tabs[0], -1);
            } else if (command === "tabClose") {
                highlightedTab == -2 ? closeTab(tabs[0]) : closeTab(highlightedTab);
            } else if (command === "tabDiscard") {
                highlightedTab == -2 ? discardTab(tabs[0]) : discardTab(highlightedTab);
            } else {
                core.error("Command not recognized: ", command)
            }
        } else {
            console.error("Could not find active tab");
        }
    })
    .catch((error) => {
        console.error("Error querying tabs:", error);
    });
});

function moveTab(tab, relativeIndex) {
    if(tab.pinned) {
        browser.tabs.query({ pinned: true, currentWindow: true }).then((pinnedTabs) => {
            if(tab.index == pinnedTabs.length - 1 && relativeIndex > 0) {
                browser.tabs.move(tab.id, { index: 0 });
            } else {
                browser.tabs.move(tab.id, { index: tab.index + relativeIndex }).then((response) => {
                    if(tab.index == response[0].index && relativeIndex < 0) {
                        browser.tabs.move(tab.id, { index: pinnedTabs.length - 1 });
                    }
                });
            }
        });
    } else {
        browser.tabs.query({ currentWindow: true }).then((tabs) => {
            browser.tabs.query({ pinned: true, currentWindow: true }).then((pinnedTabs) => {
                if(tab.index == tabs.length && relativeIndex > 0) {
                    browser.tabs.move(tab.id, { index: pinnedTabs.length + 1 });
                } else if(tab.index == pinnedTabs.length + 1 && relativeIndex < 0) {
                    browser.tabs.move(tab.id, { index: tabs.length });
                } else {
                    browser.tabs.move(tab.id, { index: tab.index + relativeIndex });
                }
            });
        });
    }
}

function closeTab(tab) {
    if(tab.pinned) {
        discardTab(tab);
    } else {
        browser.tabs.remove(tab.id);
    }
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        highlightedTab = -2;
        browser.tabs.sendMessage(tabs[0].id, { type: "tabSelectionBackward" }).then(() => {})
        .catch((error) => {
            console.error("Could not send tabSelectionBackward message: ", error);
        });
    });
}

function discardTab(tab) {
    if(tab.active) {
        browser.tabs.query({ active: false, discarded: false, currentWindow: true }).then((loadedTabs) => {
            var previousTab = loadedTabs.reduce((prev, current) => {
                return prev.lastAccessed > current.lastAccessed ? prev : current;
            });
            browser.tabs.update(previousTab.id, { active: true });
            browser.tabs.discard(tab.id);
        })
        .catch((error) => {
            console.error("Error querying tabs: ", error);
            sendResponse({ error: error.message });
        });
    } else {
        browser.tabs.discard(tab.id);
        browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            browser.tabs.sendMessage(tabs[0].id, { type: "tabSelectionBackward" })
            .catch((error) => {
                console.error("Could not send tabSelectionBackward message: ", error);
            });
        })
        .catch((error) => {
            console.error("Error querying tabs: ", error);
            sendResponse({ error: error.message });
        });
    }
}

//Handles incoming messages from content.js
browser.runtime.onMessage.addListener((message, _, sendResponse) => {
    if (message.type === "getTabList") {
		browser.tabs.query({ currentWindow: true }).then((tabs) => {
            sendResponse(
                tabs.map((tab) => ({
                    id: tab.id,
                    index: tab.index,
                    active: tab.active,
                    pinned: tab.pinned
                })),
            );
        })
        .catch((error) => {
            console.error("Error querying tabs:", error);
            sendResponse({ error: error.message });
        });
		return true;
    } else if (message.type === "setTabHighlight") {
        browser.tabs.update(message.tab.id, { active: false, highlighted: true })
        .catch((error) => {
            console.error("Could not highlight tab: ", error);
            sendResponse({ error: error.message });
        });
        if(highlightedTab != -2 && highlightedTab.id != message.activeTab) {
            browser.tabs.update(highlightedTab.id, { active: false, highlighted: false })
            .catch((error) => {
                console.error("Could not highlight tab: ", error);
            });
        }
        highlightedTab = message.tab;
	} else if (message.type === "switchTab") {
        highlightedTab = -2;
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
