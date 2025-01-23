var rebuildRules = undefined;
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
  rebuildRules = async function (domain) {
    const domains = [domain];
    /** @type {chrome.declarativeNetRequest.Rule[]} */
    const rules = [{
      id: 1,
      condition: {
        requestDomains: domains
      },
      action: {
        type: 'modifyHeaders',
        requestHeaders: [{
          header: 'origin',
          operation: 'set',
          value: `http://${domain}`,
        }],
      },
    }];
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map(r => r.id),
      addRules: rules,
    });
  }
}


var ollama_host = localStorage.getItem("host-address");
if (!ollama_host) {
  ollama_host = 'http://localhost:11434'
} else {
  document.getElementById("host-address").value = ollama_host;
}

const ollama_system_prompt = localStorage.getItem("system-prompt");
if (ollama_system_prompt) {
  document.getElementById("system-prompt").value = ollama_system_prompt;
}

if (rebuildRules) {
  rebuildRules(ollama_host);
}

function setHostAddress() {
  ollama_host = document.getElementById("host-address").value;
  localStorage.setItem("host-address", ollama_host);
  populateModels();
  if (rebuildRules) {
    rebuildRules(ollama_host);
  }
}

function setSystemPrompt() {
  const systemPrompt = document.getElementById("system-prompt").value;
  localStorage.setItem("system-prompt", systemPrompt);
}



async function getModels() {
  const response = await fetch(`${ollama_host}/api/tags`);
  const data = await response.json();
  return data;
}


// Function to send a POST request to the API
async function postRequest() {
  const URL = `${ollama_host}/api/generate`;
  const xhr = new XMLHttpRequest();
  xhr.open('POST', URL, true);
  xhr.setRequestHeader('Content-Type', 'application/json');

  return xhr;
}

// Function to stream the response from the server
async function getResponse(data, xhr, callback) {

  let lastGoodIndex = 0;

  // Handling the streaming response
  xhr.onreadystatechange = () => {
    const chunk = xhr.responseText;

    //console.log("state", xhr.readyState, "chunk", chunk)

    if (chunk != undefined || chunk != "") {
      const lines = chunk.split('\n');

      for (let index = lastGoodIndex; index < lines.length; index++) {
        const line = lines[index];
        if (line.trim() === '') continue;
        try {
          const parsedResponse = JSON.parse(line);
          callback(parsedResponse); // Process each response word
          lastGoodIndex = index+1;
        } catch (e) {
          // console.log(lineIndex, line)
        }
      }
    }
  };

  // Handling errors
  xhr.onerror = () => {
    console.error('Request failed');
  };

  xhr.send(JSON.stringify(data));
}