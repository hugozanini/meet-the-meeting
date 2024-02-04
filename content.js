
//Create a link element and appends it to the document head.
function createLinkElement(href, rel) {
  const link = document.createElement('link');
  link.href = href;
  link.rel = rel;
  document.head.appendChild(link);
}

//Create a style element and appends it to the document head.
function createStyleElement(css) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

// Load the Google Sans font by creating a link element.
function loadGoogleSansFont() {
  createLinkElement('https://fonts.googleapis.com/css?family=Google+Sans', 'stylesheet');
}

// Create the highlight style by creating a style element.
function createHighlightStyle() {
  const css = `
    .highlighted {
      background-color: rgba(255, 255, 255, 0.8);
      box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.3);
    }
  `;
  createStyleElement(css);
}

// Initialize global styles by loading the font and creating the highlight style.
function initializeGlobalStyles() {
  loadGoogleSansFont();
  createHighlightStyle();
}

// Create and return the expressions table element, applying necessary styles.
function createExpressionsTable() {
  const table = document.createElement('table');
  table.id = 'expressionsTable';
  Object.assign(table.style, {
    position: 'fixed',           // Fix position to the top left
    left: '0',                   // Left edge
    top: '50%',                  // Vertically in the middle
    transform: 'translateY(-50%)', // Center table vertically
    zIndex: '101',               // Stack above other elements
    boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.5)', // Add shadow
    backgroundColor: 'rgba(255, 255, 255, 0.35)', // Semi-transparent white background
    padding: '10px',             // Padding around the table content
    borderRadius: '5px',         // Rounded corners
    fontFamily: "'Google Sans', sans-serif", // Google Sans font
  });
  document.body.appendChild(table);  // Add table to body of the document
  return table;
}

// Initialization logic for the face-api models.
async function initializeFaceApiModels() {
  const MODEL_URL = chrome.runtime.getURL('models/');
  await faceapi.loadSsdMobilenetv1Model(MODEL_URL);
  await faceapi.loadFaceExpressionModel(MODEL_URL);
}

// Initialize an object to store the count of each expression globally
let globalExpressionsCount = {
  angry: 0,
  disgusted: 0,
  fearful: 0,
  happy: 0,
  neutral: 0,
  sad: 0,
  surprised: 0,
};
let globalTotalExpressions = 0;

let globalLastValidPercentages = {
  angry: '',
  disgusted: '',
  fearful: '',
  happy: '',
  neutral: '',
  sad: '',
  surprised: '',
};

function resetGlobalCounts() {
  globalExpressionsCount = {
    angry: 0,
    disgusted: 0,
    fearful: 0,
    happy: 0,
    neutral: 0,
    sad: 0,
    surprised: 0,
  };
  globalTotalExpressions = 0;
}

// Create and return the expressions table element, applying necessary styles.
function createExpressionsTable() {
  const table = document.createElement('table');
  table.id = 'expressionsTable';
  Object.assign(table.style, {
    position: 'fixed',           // Fix position to the top left
    left: '0',                   // Left edge
    top: '50%',                  // Vertically in the middle
    transform: 'translateY(-50%)', // Center table vertically
    zIndex: '101',               // Stack above other elements
    boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.5)', // Add shadow
    backgroundColor: 'rgba(255, 255, 255, 0.35)', // Semi-transparent white background
    padding: '10px',             // Padding around the table content
    borderRadius: '5px',         // Rounded corners
    fontFamily: "'Google Sans', sans-serif", // Google Sans font
  });
  document.body.appendChild(table);  // Add table to body of the document
  return table;
}

async function detectFaces(canvas, video) {
  //const rect = video.getBoundingClientRect();
  lastDetectionTime = Date.now();

  // Perform detection only if the video is visible
  if (await video_exists(video)) {
    // Perform face detection on the canvas using the face-api.js library
    const detections = await faceapi.detectAllFaces(canvas, new faceapi.SsdMobilenetv1Options()).withFaceExpressions();

    if (detections.length > 0) {
      detections.forEach(detection => {
        const { expressions } = detection;
        // Increment the count for each expression with a score >= 0.5
        for (let expression in expressions) {
          if (expressions[expression] >= 0.5) {
            globalExpressionsCount[expression]++;
            globalTotalExpressions++;
          }
        }
      });
    }
  }
}

// You might want to call this function periodically to update the UI, for example using a setInterval
function updateUI(table) {
  // Clear the existing table rows
  while (table.firstChild) {
    table.removeChild(table.firstChild);
  }

  // Add a new row for each expression count
  for (let expression in globalExpressionsCount) {
    let row = document.createElement('tr');
    let nameCell = document.createElement('td');
    let countCell = document.createElement('td');
    nameCell.textContent = expression;
    let percentage = globalTotalExpressions > 0 ? ((globalExpressionsCount[expression] / globalTotalExpressions) * 100).toFixed(2) : "0.00";

    globalLastValidPercentages[expression] = percentage + '%';
    countCell.textContent = globalLastValidPercentages[expression];

    row.appendChild(nameCell);
    row.appendChild(countCell);
    table.appendChild(row);

    highlightMaxRow(table);
  }
}

function highlightMaxRow(table) {
    // Add the code to highlight the row with the highest percentage here
    const rows = table.getElementsByTagName('tr');
    let maxPercentage = 0;
    let maxRow = null;

    for (let row of rows) {
      const expression = row.getElementsByTagName('td')[0].textContent;
      const percentage = parseFloat(globalLastValidPercentages[expression]);

      // Remove the highlighted class from the row
      row.classList.remove('highlighted');

      // If this row has a higher percentage, remember it
      if (percentage > maxPercentage) {
        maxPercentage = percentage;
        maxRow = row;
      }
    }

    // Add the highlighted class to the row with the highest percentage
    if (maxRow) {
      maxRow.classList.add('highlighted');
    }
}

async function video_exists(video){
  const rect = video.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0){
    return true;
  }
  else{
    return false;
  }
}

async function position_canvas(video, canvas){
  const rect = video.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  canvas.style.position = "absolute";
  canvas.style.left = rect.left + "px";
  canvas.style.top = rect.top + "px";
  canvas.getContext("2d", { willReadFrequently: true }).drawImage(video, 0, 0, rect.width, rect.height);
}

window.onload = async () => {
  initializeGlobalStyles();
  await initializeFaceApiModels();

  // Map to store the canvas, table, and observers associated with each video element
  const videoMap = new Map();
  resetGlobalCounts(); // Reset the counts initially

  let lastDetectionTime = Date.now();

  // Create the table once and use it globally.
  const expressionsTable = createExpressionsTable();

  setInterval(() => {
    resetGlobalCounts(); // Reset the counts for the new interval
  }, 3000);

  // Function to update the canvas size and position and draw video onto canvas
  const updateCanvas = async (canvas, video) => {

    if (await video_exists(video)){
      await position_canvas(video, canvas);
    }

    if (Date.now() - lastDetectionTime > 100) {
      await detectFaces(canvas, video);
      updateUI(document.getElementById('expressionsTable'));
    }
    requestAnimationFrame(() => updateCanvas(canvas, video)); // Keep the animation frame loop running
  };

  // Create a new IntersectionObserver instance
  const intersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // Get the canvas and observers from the map
      const data = videoMap.get(entry.target);

      if (data) {
        // If the video element is not in the viewport or not visible
        if (!entry.isIntersecting) {
          // Remove the canvas and table from the body
          if (data.canvas.parentNode) {
            data.canvas.parentNode.removeChild(data.canvas);
            data.table.parentNode.removeChild(data.table); // Remove the table
          }
        } else {
          // Add the canvas and table to the body
          if (!data.canvas.parentNode) {
            document.body.appendChild(data.canvas);
            document.body.appendChild(data.table); // Add the table
          }
        }
      }
    });
  });

  const observeDocument = (document) => {
    // Create a new MutationObserver instance
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        // If new nodes are added
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach(function (node) {
            // If the new node is a video element
            if (node.nodeName.toLowerCase() === "video") {
              // Create a new canvas element
              const canvas = document.createElement("canvas");

              // Create a table for the expressions data
              const table = document.createElement("div");
              table.id = "table" + Math.random().toString(36).substring(2); // Set a unique id for each table
              document.body.appendChild(table); // Add the table to the document body immediately after creation

              // Create a new ResizeObserver instance
              const resizeObserver = new ResizeObserver(function () {
                updateCanvas(canvas, node, table);
              });

              // Start observing the video element for resize events
              resizeObserver.observe(node);

              // Create a new MutationObserver instance
              const mutationObserver = new MutationObserver(function () {
                updateCanvas(canvas, node, table);
              });

              // Start observing the video element for attribute changes
              mutationObserver.observe(node, { attributes: true });

              // Store the canvas, table, and observers in the map
              videoMap.set(node, {
                canvas: canvas,
                table: table,
                resizeObserver: resizeObserver,
                mutationObserver: mutationObserver,
              });

              // Start observing the video element for intersection changes
              intersectionObserver.observe(node);
            }
            // If the new node is an iframe element
            if (node.nodeName.toLowerCase() === "iframe") {
              // Try to access the iframe's document and observe it
              try {
                const iframeDoc = node.contentWindow.document;
                observeDocument(iframeDoc);
              } catch (error) {
                console.error("Unable to access iframe's document:", error);
              }
            }
          });
        }

        // If nodes are removed
        if (mutation.removedNodes) {
          mutation.removedNodes.forEach(function (node) {
            // If the removed node is a video element
            if (node.nodeName.toLowerCase() === "video") {
              // Get the canvas, table, and observers from the map
              const data = videoMap.get(node);

              if (data) {
                // Remove the canvas and table from the body
                if (data.canvas.parentNode) {
                  data.canvas.parentNode.removeChild(data.canvas);
                  const table = document.getElementById(data.table.id);
                  if (table) {
                    table.parentNode.removeChild(table);
                  }
                }

                // Disconnect the observers
                data.resizeObserver.disconnect();
                data.mutationObserver.disconnect();

                // Stop observing the video element for intersection changes
                intersectionObserver.unobserve(node);

                // Remove the data from the map
                videoMap.delete(node);
              }
            }
          });
        }
      });
    });

    // Start observing the document with the configured parameters
    observer.observe(document, { childList: true, subtree: true });
  };
  // Start observing the main document
  observeDocument(document);
};