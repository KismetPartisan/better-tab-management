(async () => {
    var highLightedId = -2;
    var listenerRunning = false;

	function switchListener(highlightedTab) {
        //document.title="⁠aa";

        highlightedId = highlightedTab.id;

        const controlListener = (e) => {
            if (e.key == "Control") {
                e.preventDefault();
                e.stopPropagation();
                console.log("Control released: switching tabs: ");
                browser.runtime.sendMessage({ type: "switchTab", tab: highlightedId })
                .catch((error) => {
                    console.error("Could not send switchTab message: ", error);
                });
                document.removeEventListener("keyup", controlListener);
                listenerRunning = false;
            }
        };

        if(!listenerRunning) {
            document.addEventListener("keyup", controlListener);
            listenerRunning = true;
        }
	}

	/* Listen for messages from background */
	browser.runtime.onMessage.addListener((message) => {
		if (message.type === "switchListener") {
			switchListener(message.highlightedTab);
        }
    });
})();







