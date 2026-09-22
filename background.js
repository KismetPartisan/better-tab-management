var highlightedTab = -2;
var highlightedIndex = -2;

//Listens for commands, and passes them to content.js
browser.commands.onCommand.addListener((command) => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0] && Number.isInteger(tabs[0].id) && tabs[0].id >= 0) {
            if (command === "tabSelectionForward") {
                moveSelection(1);
            } else if (command === "tabSelectionBackward") {
                moveSelection(-1);
            } else if (command === "tabMoveForward") {
                highlightedTab == -2 ? moveTab(tabs[0], 1) : moveTab(highlightedTab, 1);
            } else if (command === "tabMoveBackward") {
                highlightedTab == -2 ? moveTab(tabs[0], -1) : moveTab(highlightedTab, -1);
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

function highLightTab(tab, activeTab) {
    if(tab.id != activeTab.id) {
        browser.tabs.sendMessage(activeTab.id, { type: "makeTabInvisible" });
    } else {
        browser.tabs.sendMessage(activeTab.id, { type: "makeTabVisible" });
    }
    browser.tabs.update(tab.id, { active: false, highlighted: true })
    .catch((error) => {
        console.error("Could not highlight tab: ", error);
    });
    if(highlightedTab != -2 && highlightedTab.id != activeTab.id) {
        browser.tabs.sendMessage(highlightedTab.id, { type: "makeTabVisible" });
        browser.tabs.update(highlightedTab.id, { active: false, highlighted: false })
        .catch((error) => {
            console.error("Could not highlight tab: ", error);
        });
    }
    highlightedTab = tab;
}

function moveSelection(relativeIndex) {
    browser.tabs.query({ currentWindow: true }).then((tabs) => {
        for(let i = 0; i < tabs.length; i++) {
            if(tabs[i].active) {
                var activeIndex = i;
                break;
            } else if(i == tabs.length-1) {
                console.error("Active tab doesn't match any tab in list");
                return;
            }
        }

        browser.tabs.sendMessage(tabs[activeIndex].id, { type: "PING" }).then((response) => {
            if(highlightedIndex == -2) {
                highlightedIndex = activeIndex;
            }
            highlightedIndex += relativeIndex;

            //Handle wrap around cases
            if (highlightedIndex >= tabs.length) {
                highlightedIndex = 0;
            } else if (highlightedIndex < 0) {
                highlightedIndex = tabs.length-1;
            }

            console.log(highlightedIndex);
            highLightTab(tabs[highlightedIndex], tabs[activeIndex]);

            browser.tabs.sendMessage(tabs[activeIndex].id, { type: "switchListener", highlightedTab: tabs[highlightedIndex] })
            .catch((error) => {
                console.error("Could not send switchListener message: ", error);
            });
        })
        .catch((error) => {
            console.error("Could not get a response: ", error);
        });
    })
    .catch((error) => {
        console.error("Could not get list of tabs: ", error);
    });
}

function moveTab(tab, relativeIndex) {
    var newIndex = 0;
    if(tab.pinned) {
        browser.tabs.query({ pinned: true, currentWindow: true }).then((pinnedTabs) => {
            if(tab.index == pinnedTabs.length - 1 && relativeIndex > 0) {
                newIndex = 0;
                browser.tabs.move(tab.id, { index: newIndex });
                if(highlightedTab != -2) { highlightedTab.index = newIndex; highlightedIndex = newIndex; }
                console.log(newIndex);
            } else {
                browser.tabs.move(tab.id, { index: tab.index + relativeIndex }).then((response) => {
                    if(tab.index == response[0].index && relativeIndex < 0) {
                        newIndex = pinnedTabs.length - 1;
                        if(highlightedTab != -2) { highlightedTab.index = newIndex; highlightedIndex = newIndex; }
                    } else {
                        newIndex = tab.index + relativeIndex;
                        if(highlightedTab != -2) { highlightedTab.index = highlightedTab.index + relativeIndex; highlightedIndex = highlightedIndex + relativeIndex; }
                    }
                        browser.tabs.move(tab.id, { index: newIndex });
                });
            }
        });
    } else {
        browser.tabs.query({ currentWindow: true }).then((tabs) => {
            browser.tabs.query({ pinned: true, currentWindow: true }).then((pinnedTabs) => {
                if(tab.index == tabs.length && relativeIndex > 0) {
                    console.log("TEST");
                    newIndex = pinnedTabs.length + 1;
                    if(highlightedTab != -2) { highlightedTab.index = newIndex; highlightedIndex = newIndex-1; }
                } else if(tab.index == pinnedTabs.length + 1 && relativeIndex < 0) {
                    newIndex = tabs.length;
                    if(highlightedTab != -2) { highlightedTab.index = newIndex; highlightedIndex = newIndex-1; }
                } else {
                    newIndex = tab.index + relativeIndex;
                    if(highlightedTab != -2) { highlightedTab.index = newIndex; highlightedIndex = newIndex-1; }
                }
                browser.tabs.move(tab.id, { index: newIndex });
                console.log(newIndex);
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
        moveSelection(-1);
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
            moveSelection(-1);
        })
        .catch((error) => {
            console.error("Error querying tabs: ", error);
            sendResponse({ error: error.message });
        });
    }
}

//Handles incoming messages from content.js
browser.runtime.onMessage.addListener((message, _, sendResponse) => {
    if (message.type === "switchTab") {
        highlightedTab = -2;
        highlightedIndex = -2;
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
