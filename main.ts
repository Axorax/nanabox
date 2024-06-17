// - Variables

const uploadElement: Element | null = document.querySelector(".upload-main");
const loader: Element | null = document.querySelector(".loader");
const latest: HTMLElement | null = document.querySelector("#latest");
const historyElement: HTMLElement | null = document.querySelector("#history");
const dropdown: HTMLElement | null = document.querySelector(".dropdown");
const dropdownButton: HTMLButtonElement | null =
  document.querySelector(".dropdown button");
const dropdownContent: HTMLUListElement | null =
  document.querySelector(".dropdown ul");
const popup: HTMLElement | null = document.querySelector(".popup");
const popupButton: HTMLButtonElement | null = document.querySelector(
  ".popup .content button",
);
const overlay: HTMLElement | null = document.querySelector(".overlay");
let host: string = "fileio";

// - Create logs

let logs: string[] = [];

function log(type: string, message: any) {
  logs.push(
    `<span style="color: #a084e8;">[${type}]</span> <span style="color: #80C4E9;">[${new Date().toLocaleString()}]</span> - ${String(
      message,
    )}\n`,
  );
}

// - Open And Close Logs

function closeLogs(): void {
  const modal = document.querySelector(".modal") as HTMLElement | null;
  if (modal) {
    modal.style.display = "none";
    document.body.classList.toggle("no-scroll");
  }
}

async function openLogs(): Promise<void> {
  document.body.classList.toggle("no-scroll");
  const modal = document.querySelector(".modal") as HTMLElement | null;
  if (modal) {
    modal.style.display = "block";
    const frontendLogs = logs.join("").replaceAll("\n", "<br>");
    const leftDiv = document.querySelector(
      ".modal .content .left div",
    ) as HTMLElement;
    leftDiv.innerHTML =
      frontendLogs === "" ? '<p class="none">NO LOGS YET!</p>' : frontendLogs;

    try {
      const response = await fetch("/logs");
      const data = await response.json();
      const backendLogs = String(data.output.join(""))
        .replace(/^(.*[^\-])$/gm, "<span>$1</span>")
        .replaceAll("\n", "<br>");
      const rightDiv = document.querySelector(
        ".modal .content .right div",
      ) as HTMLElement;
      rightDiv.innerHTML =
        backendLogs === "" ? '<p class="none">NO LOGS YET!</p>' : backendLogs;
    } catch (error) {
      log("ERROR", error);
    }
  }
}

// - Dropdown

if (dropdownButton && dropdownContent && dropdown) {
  dropdownButton.addEventListener("click", () => {
    if (dropdownContent.style.display === "grid") {
      dropdownContent.style.display = "none";
      dropdown.classList.toggle("active");
    } else {
      dropdownContent.style.display = "grid";
      dropdown.classList.toggle("active");
    }
  });
}

// - Change Host

function changeHost(name: string): void {
  host = name;
  const selectedElement = document.querySelector(".selected");
  if (selectedElement) {
    selectedElement.classList.remove("selected");
  }
  const hostElement = document.querySelector(`.host-${name}`);
  if (hostElement) {
    hostElement.classList.add("selected");
  }
}

// - Upload File

async function uploadFile(event: Event): Promise<void> {
  event.preventDefault();

  let files: FileList | null = null;

  if (event.type === "change") {
    files = (event.target as HTMLInputElement).files;
  } else if (event.type === "drop") {
    const dropEvent = event as DragEvent;
    files = dropEvent.dataTransfer?.files;
  }

  if (!files || files.length === 0) {
    log("NORMAL", "No files selected/dropped.");
    return;
  }

  const uploadElement = document.querySelector(".upload-main") as HTMLElement;
  const loader = document.querySelector(".loader") as HTMLElement;

  if (uploadElement) uploadElement.style.display = "none";
  if (loader) loader.style.display = "flex";

  const uploadPromises: Promise<any>[] = [];

  for (const file of Array.from(files)) {
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

    if (uploadElement) uploadElement.style.display = "flex";
    if (loader) loader.style.display = "none";

    let total_content = "";

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const data = uploadResponses[i];

      if (data.error) {
        if (uploadElement) uploadElement.style.display = "flex";
        if (loader) loader.style.display = "none";
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

    const historyNoneElement = document.querySelector("#history .none");
    if (historyNoneElement) {
      historyNoneElement.remove();
    }

    const latest = document.querySelector("#latest");
    const historyElement = document.querySelector("#history");

    if (latest) latest.innerHTML = total_content;
    if (historyElement) historyElement.innerHTML += total_content;

    log(
      "SUCCESS",
      `File(s) uploaded successfully: ${JSON.stringify(
        uploadResponses,
        null,
        4,
      )}`,
    );
  } catch (error) {
    if (uploadElement) uploadElement.style.display = "flex";
    if (loader) loader.style.display = "none";
    log("ERROR", `Error uploading file(s): ${String(error)}`);
  }
}

// - Drag & Drop

function allowDrop(event: DragEvent): void {
  event.preventDefault();
  document.body.classList.add("dragging");
}

function dragLeave(): void {
  document.body.classList.remove("dragging");
}

document.querySelectorAll(".dropzone").forEach((zone): void => {
  zone.addEventListener("drop", uploadFile);
  zone.addEventListener("dragover", allowDrop);
  zone.addEventListener("dragleave", dragLeave);
});

// - File Input

const fileInput = document.getElementById("upload-file") as HTMLInputElement;

fileInput.addEventListener("change", (event: Event) => {
  uploadFile(event);
});

// - Clear History

function clearHistory(): void {
  fetch("/clear", {
    method: "DELETE",
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        const historyElement = document.querySelector("#history");
        if (historyElement) {
          historyElement.innerHTML = `<div class="none flex-1"><p>No history!</p></div>`;
        }
      }
    })
    .catch((error) => {
      log("ERROR", error);
    });
}

// - Add host

function addHost(name: string, access: boolean): void {
  fetch(`/add-host/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      get_link_from_json: access.toString(),
    }),
  }).then(() => {
    window.location.reload();
  });
}

// - Add host DOM

if (popupButton) {
  popupButton.addEventListener("click", () => {
    const newNameInput = document.querySelector<HTMLInputElement>(
      ".popup #new-host-name",
    );
    const newLambdaInput = document.querySelector<HTMLInputElement>(
      ".popup #new-host-lambda",
    );

    if (newNameInput && newLambdaInput) {
      addHost(newNameInput.value, newLambdaInput.value === "true");
    }
  });
}

// - Toggle add host popup

function toggleAddHostPopup(): void {
  const popup = document.querySelector<HTMLElement>(".popup");
  const overlay = document.querySelector<HTMLElement>(".overlay");

  if (popup && overlay) {
    if (popup.classList.contains("active")) {
      popup.classList.remove("active");
      overlay.classList.remove("active");
    } else {
      popup.classList.add("active");
      overlay.classList.add("active");
    }
  }
}

// - Accordin

const accordin = document.querySelectorAll<HTMLElement>(".accordin");
const accordinContent =
  document.querySelectorAll<HTMLElement>(".accordin .content");
const accordinButton =
  document.querySelectorAll<HTMLButtonElement>(".accordin button");

for (let i = 0; i < accordinButton.length; i++) {
  accordinButton[i].addEventListener("click", () => {
    if (accordinContent[i].style.display === "block") {
      accordinContent[i].style.display = "none";
      accordin[i].classList.remove("active");
    } else {
      accordinContent[i].style.display = "block";
      accordin[i].classList.add("active");
    }
  });
}

// - History

function loadHistory(): void {
  fetch("/history")
    .then((res) => res.json())
    .then((data: Record<string, string> | string[]) => {
      const historyElement = document.querySelector("#history");

      if (Array.isArray(data) || Object.keys(data).length === 0) {
        historyElement.innerHTML = `<div class="none flex-1"><p>No history!</p></div>`;
      } else {
        Object.keys(data).forEach((key) => {
          historyElement.innerHTML += `
              <div class="card">
                  <ul>
                      <li><p class="t">Name: </p><p class="c">${key}</p></li>
                      <li><p class="t">Link: </p><p class="c">${data[key]}</p></li>
                  </ul>
              </div>
            `;
        });
      }
    })
    .catch((error) => {
      log("ERROR", error);
    });
}

loadHistory();

// - Load hosts in dropdown

fetch("/hosts")
  .then((res) => res.json())
  .then((data: string[]) => {
    const dropdownContent = document.querySelector(".dropdown ul");

    if (dropdownContent) {
      data.forEach((key) => {
        dropdownContent.innerHTML += `
          <li><button class="${
            host === key ? "selected" : ""
          } host-${key}" onclick="changeHost('${key}')">${key}</button></li>
        `;
      });

      dropdownContent.innerHTML += `
        <li><button class="add" onclick="toggleAddHostPopup()"><span>+</span> Add</button></li>
      `;
    }
  })
  .catch((error) => {
    log("ERROR", error);
  });

// - API Location

const urlOrigin: string = window.location.origin + "/";

document.querySelectorAll(".location").forEach((e: Element) => {
  if (e instanceof HTMLElement) {
    e.innerText = urlOrigin;
  }
});

// - Prevent Default

document.addEventListener("contextmenu", (e: Event) => e.preventDefault());

function ctrlShiftKey(e: KeyboardEvent, keyCode: string): boolean {
  return e.ctrlKey && e.shiftKey && e.key === keyCode;
}

document.onkeydown = (e: KeyboardEvent) => {
  if (e.key === "F12" || (e.ctrlKey && e.shiftKey)) {
    e.preventDefault();
    return false;
  }
};
