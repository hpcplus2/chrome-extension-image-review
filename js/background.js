const COMMAND_TYPE = {
    'TRAVELS': 'travels',
};


const sendMessage = (params, tabId) => {
    if (tabId) {
        chrome.tabs.sendMessage(tabId, params);
    } else {
        chrome.tabs.query(
            {
                currentWindow: true,
                active: true
            },
            function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, params);
                }
            } 
        )
    }
}

chrome.browserAction.onClicked.addListener(function (tab) {
    sendMessage({ type: COMMAND_TYPE.TRAVELS }, tab.id);
})