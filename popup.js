document.addEventListener("DOMContentLoaded", function () {
    const themeToggle = document.getElementById("theme-toggle");
    const themeLabel = document.getElementById("theme-label");

    chrome.storage.sync.get("theme", function (data) {
        if (data.theme === "dark") {
            document.documentElement.classList.add("dark");
            themeToggle.checked = true;
            themeLabel.innerText = "Light Mode";
        } else {
            document.documentElement.classList.remove("dark");
            themeLabel.innerText = "Dark Mode";
        }
    });

    themeToggle.addEventListener("change", function () {
        if (themeToggle.checked) {
            document.documentElement.classList.add("dark");
            chrome.storage.sync.set({ "theme": "dark" });
            themeLabel.innerText = "Light Mode";
        } else {
            document.documentElement.classList.remove("dark");
            chrome.storage.sync.set({ "theme": "light" });
            themeLabel.innerText = "Dark Mode";
        }
    });
});

document.getElementById("summarize-btn").addEventListener("click", async () => {
    const summaryText = document.getElementById("summary-text");
    summaryText.innerText = "Summarizing... Please wait.";

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (
            tab.url.startsWith("chrome://") ||
            tab.url.startsWith("edge://") ||
            tab.url.startsWith("about:") ||
            tab.url.includes("github.com") ||
            tab.url.includes("gitlab.com")
        ) {
            summaryText.innerText = "⚠️ Summarizing this page is currently not supported.";
            return;
        }

        chrome.scripting.executeScript(
            {
                target: { tabId: tab.id },
                function: extractTextFromPage
            },
            async (injectionResults) => {
                if (!injectionResults || !injectionResults[0]?.result) {
                    summaryText.innerText = "⚠️ Error extracting text.";
                    return;
                }

                const pageText = injectionResults[0].result;
                const summary = await summarizeText(pageText);
                summaryText.innerText = summary || "⚠️ Failed to summarize.";
            }
        );
    } catch (error) {
        console.error("Error:", error);
        summaryText.innerText = "⚠️ Error summarizing the text.";
    }
});

function extractTextFromPage() {
    return document.body.innerText.slice(0, 3000);
}

async function summarizeText(text) {
    const API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";
    const API_KEY = "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";  // replace if expired again

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ inputs: text })
        });

        const result = await response.json();

        if (!Array.isArray(result) || result.length === 0 || !result[0].summary_text) {
            console.warn("No summary generated or model still loading:", result);
            if (result.error?.includes("Model")) {
                return "⚠️ Model is loading. Please try again in 30 seconds.";
            }
            return "⚠️ No summary generated.";
        }

        return result[0].summary_text;
    } catch (error) {
        console.error("API Error:", error);
        return "⚠️ Error fetching summary.";
    }
}
