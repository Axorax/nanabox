// - Variables

const uploadElement = document.querySelector(".upload-main");
const loader = document.querySelector(".loader");
const latest = document.querySelector("#latest");
const history = document.querySelector("#history");
const dropdown = document.querySelector(".dropdown");
const dropdownButton = document.querySelector(".dropdown button");
const dropdownContent = document.querySelector(".dropdown ul");
const popup = document.querySelector(".popup");
const popupButton = document.querySelector(".popup .content button");
const overlay = document.querySelector(".overlay");
let host = "fileio";

// - Create logs

let logs = [];

function log(type, message) {
  logs.push(
    `[${type}] [${new Date().toLocaleString()}] - ${String(message)}\n`,
  );
}

// - Open And Close Logs

function closeLogs() {
  document.querySelector(".modal").style.display = "none";
  document.body.classList.toggle("no-scroll");
}

function openLogs() {
  document.body.classList.toggle("no-scroll");
  document.querySelector(".modal").style.display = "block";
  const frontendLogs = logs.join("").replaceAll("\n", "<br>");
  document.querySelector(".modal .content .left div").innerHTML =
    frontendLogs == "" ? '<p class="none">NO LOGS YET!</p>' : frontendLogs;
  fetch("/logs")
    .then((res) => res.json())
    .then((data) => {
      const backendLogs = String(data.output.join(""))
        .replace(/^(.*[^\-])$/gm, "<span>$1</span>")
        .replaceAll("\n", "<br>");
      document.querySelector(".modal .content .right div").innerHTML =
        backendLogs == "" ? '<p class="none">NO LOGS YET!</p>' : backendLogs;
    });
}

// - Dropdown

dropdownButton.addEventListener("click", () => {
  if (dropdownContent.style.display == "grid") {
    dropdownContent.style.display = "none";
    dropdown.classList.toggle("active");
  } else {
    dropdownContent.style.display = "grid";
    dropdown.classList.toggle("active");
  }
});

// - Change Host

function changeHost(name) {
  host = name;
  document.querySelector(".selected").classList.remove("selected");
  document.querySelector(`.host-${name}`).classList.add("selected");
}

// - Upload File

async function uploadFile(event) {
  event.preventDefault();

  const files =
    event.type === "change" ? event.target.files : event.dataTransfer.files;

  if (files.length === 0) {
    log("NORMAL", "No files selected/dropped.");
    return;
  }

  uploadElement.style.display = "none";
  loader.style.display = "flex";

  const uploadPromises = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);

    const url = "/upload" + `?host=${host}`;
    const uploadPromise = fetch(url, {
      method: "POST",
      body: formData,
    }).then((response) => response.json());

    uploadPromises.push(uploadPromise);
  }

  try {
    const uploadResponses = await Promise.all(uploadPromises);

    uploadElement.style.display = "flex";
    loader.style.display = "none";

    let total_content = "";

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const data = uploadResponses[i];

      if (data["error"]) {
        uploadElement.style.display = "flex";
        loader.style.display = "none";
      }

      let content = `<li><p class="t">Name: </p><p class="c">${file.name}</p></li>`;

      Object.keys(data).forEach((key) => {
        content += `<li><p class="t">${key}: </p><p class="c">${data[key]}</p></li>`;
      });

      total_content += `
        <div class="card">
            <ul>
              ${content}
            </ul>
        </div>`;
    }

    if (document.querySelector("#history .none")) {
      document.querySelector("#history .none").remove();
    }

    latest.innerHTML = total_content;
    history.innerHTML += total_content;

    log(
      "SUCCESS",
      `File(s) uploaded successfully: ${JSON.stringify(
        uploadResponses,
        null,
        4,
      )}`,
    );
  } catch (error) {
    uploadElement.style.display = "flex";
    loader.style.display = "none";
    log("ERROR", `Error uploading file(s): ${String(error)}`);
  }
}

// - Drag & Drop

function allowDrop(event) {
  event.preventDefault();
  document.body.classList.add("dragging");
}

function dragLeave() {
  document.body.classList.remove("dragging");
}

document.querySelectorAll(".dropzone").forEach((zone) => {
  zone.addEventListener("drop", uploadFile);
  zone.addEventListener("dragover", allowDrop);
  zone.addEventListener("dragleave", dragLeave);
});

// - File Input

const fileInput = document.getElementById("upload-file");

fileInput.addEventListener("change", uploadFile);

// - Clear History

function clearHistory() {
  fetch("/clear", {
    method: "DELETE",
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        document.querySelector(
          "#history",
        ).innerHTML = `<div class="none flex-1"><p>No history!</p></div>`;
      }
    });
}

// - Add host

function addHost(name, access) {
  fetch(`/add-host/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      get_link_from_json: String(access),
    }),
  }).then((data) => {
    window.location.reload();
  });
}

// - Add host DOM

popupButton.addEventListener("click", () => {
  addHost(
    document.querySelector(".popup #new-host-name").value,
    document.querySelector(".popup #new-host-lambda").value,
  );
});

// - Toggle add host popup

function toggleAddHostPopup() {
  if (popup.classList.contains("active")) {
    popup.classList.remove("active");
    overlay.classList.remove("active");
  } else {
    popup.classList.add("active");
    overlay.classList.add("active");
  }
}

// - Accordin

const accordin = document.querySelectorAll(".accordin");
const accordinContent = document.querySelectorAll(".accordin .content");
const accordinButton = document.querySelectorAll(".accordin button");

for (let i = 0; i < accordinButton.length; i++) {
  accordinButton[i].addEventListener("click", () => {
    if (accordinContent[i].style.display == "block") {
      accordinContent[i].style.display = "none";
      accordin[i].classList.remove("active");
    } else {
      accordinContent[i].style.display = "block";
      accordin[i].classList.add("active");
    }
  });
}

// - History

function loadHistory() {
  fetch("/history")
    .then((res) => res.json())
    .then((data) => {
      if (Object.keys(data) == 0) {
        document.querySelector(
          "#history",
        ).innerHTML = `<div class="none flex-1"><p>No history!</p></div>`;
      } else {
        if (Array.isArray(data)) {
          document.querySelector(
            "#history",
          ).innerHTML = `<div class="none flex-1"><p>No history!</p></div>`;
          return;
        }
        Object.keys(data).forEach((key) => {
          document.querySelector("#history").innerHTML += `
                <div class="card">
                    <ul>
                    <li><p class="t">Name: </p><p class="c">${key}</p></li>
                    <li><p class="t">Link: </p><p class="c">${data[key]}</p></li>
                    </ul>
                </div>
                `;
        });
      }
    });
}

loadHistory();

// - Load hosts in dropdown

fetch("/hosts")
  .then((res) => res.json())
  .then((data) => {
    data.forEach((key) => {
      dropdownContent.innerHTML += `
        <li><button class="${
          host == key ? "selected" : ""
        } host-${key}" onclick="changeHost('${key}')">${key}</button></li>
        `;
    });
  })
  .then((_) => {
    dropdownContent.innerHTML += `
    <li><button class="add" onclick="toggleAddHostPopup()"><span>+</span> Add</button></li>
    `;
  });

// - API Location

const urlOrigin = window.location.origin + "/";

document.querySelectorAll(".location").forEach((e) => {
  e.innerText = urlOrigin;
});

// - Prevent Default

document.addEventListener("contextmenu", (e) => e.preventDefault());

function ctrlShiftKey(e, keyCode) {
  return e.ctrlKey && e.shiftKey && e.keyCode === keyCode.charCodeAt(0);
}

document.onkeydown = (e) => {
  if (e.keyCode == 123 || (e.ctrlKey && e.shiftKey)) return false;
};
