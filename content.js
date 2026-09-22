(async () => {
    var highLightedId = -2;
    var listenerRunning = false;
    var title = document.title;

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
                makeTabVisible();
            }
        };

        if(!listenerRunning) {
            document.addEventListener("keyup", controlListener);
            listenerRunning = true;
        }
	}

    function makeTabInvisible() {
        if (!document.title.startsWith("⁠")) {
            document.title="⁠"+title;
        }
        /*if (!document.title.startsWith("A")) {
            document.title="A"+title;
        }*/
    }

    function makeTabVisible() {
        if (document.title.startsWith("⁠")) {
            document.title = document.title.slice(1);
        }
        /*if (document.title.startsWith("A")) {
            document.title = document.title.slice(1);
        }*/
    }

	/* Listen for messages from background */
	browser.runtime.onMessage.addListener((message) => {
		if (message.type === "switchListener") {
			switchListener(message.highlightedTab);
        } else if (message.type === "makeTabInvisible") {
            makeTabInvisible();
        } else if (message.type === "makeTabVisible") {
            makeTabVisible();
        }
    });
})();







