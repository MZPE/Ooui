
// Create WebSocket connection.
const socket = new WebSocket ("ws://localhost:8080" + rootElementPath, "ooui-1.0");

console.log("Web socket created");

const nodes = {}

function getNode (id) {
    switch (id) {
        case "window": return window;
        case "document": return document;
        case "document.body": return document.body;
        default: return nodes[id];
    }
}

function msgCreate (m) {
    const id = m.id;
    const tagName = m.k;
    const node = tagName === "#text" ?
        document.createTextNode ("") :
        document.createElement (tagName);
    if (tagName !== "#text")
        node.id = id;
    nodes[id] = node;
    console.log ("Created node", node);
}

function msgSet (m) {
    const id = m.id;
    const node = getNode (id);
    if (!node) {
        console.error ("Unknown node id", m);
        return;
    }
    node[m.k] = m.v;
    console.log ("Set", node, m.k, m.v);
}

function msgCall (m) {
    const id = m.id;
    const node = getNode (id);
    if (!node) {
        console.error ("Unknown node id", m);
        return;
    }
    const f = node[m.k];
    console.log ("Call", node, f, m.v);
    f.apply (node, m.v);
}

function msgListen (m) {
    const node = getNode (m.id);
    if (!node) {
        console.error ("Unknown node id", m);
        return;
    }
    console.log ("Listen", node, m.k);
    node.addEventListener(m.k, function () {
        const em = {
            m: "event",
            id: m.id,
            k: m.k,
        };
        const ems = JSON.stringify (em);
        socket.send (ems);
        console.log ("Send event", em);
    });
}

function processMessage (m) {
    switch (m.m) {
        case "nop":
            break;
        case "create":
            msgCreate (m);
            break;
        case "set":
            msgSet (m);
            break;
        case "call":
            msgCall (m);
            break;
        case "listen":
            msgListen (m);
            break;
        default:
            console.error ("Unknown message type", m.m, m);
    }
}

function fixupValue (v) {
    if (Array.isArray (v)) {
        for (x in v) {
            v[x] = fixupValue (v[x]);
        }
        return v;
    }
    else if (typeof v === 'string' || v instanceof String) {
        if ((v.length > 1) && (v[0] === "\u2999")) {
            // console.log("V", v);
            return getNode (v);
        }
    }
    return v;
}

socket.addEventListener('open', function (event) {
    console.log("Web socket opened");
});

socket.addEventListener('message', function (event) {
    const message = JSON.parse (event.data);
    // console.log('Raw value from server', message.v);
    message.v = fixupValue (message.v);
    // console.log('Message from server', message);
    processMessage (message);
});
