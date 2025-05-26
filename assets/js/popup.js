document.addEventListener("DOMContentLoaded", () => {
  document.title = chrome.i18n.getMessage("extName");

  document.querySelectorAll("[data-i18n-text]").forEach(elm => {
    const key = elm.getAttribute("data-i18n-text");
    elm.textContent = chrome.i18n.getMessage(key);
  });

  document.querySelectorAll("[data-i18n-value]").forEach(elm => {
    const key = elm.getAttribute("data-i18n-value");
    elm.value = chrome.i18n.getMessage(key);
  });
});

document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("extension-list");
  const backupBtn = document.getElementById("backup-btn");
  const importBtn = document.getElementById("import-btn");
  const importInput = document.getElementById("import");
  const importSection = document.getElementById("import-section");
  const progress = document.getElementById("progress");

  const collator = new Intl.Collator(undefined, {
    sensitivity: 'base',
    numeric: true,
    ignorePunctuation: true,
  });
  const extensions = await chrome.management.getAll();
  const userExtensions = extensions.filter(ext => ext.type === "extension" && ext.id !== chrome.runtime.id);

  userExtensions.sort((a, b) => collator.compare(a.name, b.name));

  const storeEndpoint = "https://chrome.google.com/webstore/detail";
  const backupData = userExtensions.map(ext => ({
    id: ext.id,
    name: ext.name,
    enabled: ext.enabled,
    storeUrl: `${storeEndpoint}/${ext.id}`
  }));

  userExtensions.forEach(ext => {
    const li = document.createElement("li");
    li.className = "extension-item";

    const icon = document.createElement("img");
    icon.src = ext.icons && ext.icons.length > 0 ? ext.icons[ext.icons.length - 1].url : "icon.png";
    icon.className = "extension-icon";

    const infoWrapper = document.createElement("div");
    infoWrapper.className = "extension-info";

    const name = document.createElement("div");
    name.textContent = ext.name;
    name.className = "extension-name";

    const description = document.createElement("div");
    description.textContent = ext.description || "";
    description.className = "extension-description";

    infoWrapper.appendChild(name);
    infoWrapper.appendChild(description);

    const toggleWrapper = document.createElement("label");
    toggleWrapper.className = "toggle-switch";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = ext.enabled;

    const slider = document.createElement("span");
    slider.className = "slider";

    toggleWrapper.appendChild(toggle);
    toggleWrapper.appendChild(slider);

    toggle.addEventListener("change", () => {
      chrome.management.setEnabled(ext.id, toggle.checked);
    });

    const removeButton = document.createElement("button");
    removeButton.textContent = "🗑️";
    removeButton.className = "remove-button";
    removeButton.addEventListener("click", () => {
      chrome.management.uninstall(ext.id, { showConfirmDialog: true });
    });

    li.appendChild(icon);
    li.appendChild(infoWrapper);
    li.appendChild(toggleWrapper);
    li.appendChild(removeButton);
    list.appendChild(li);
  });

  backupBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url,
      filename: "chrome-extensions-backup.json",
      saveAs: false
    });
  });

  importBtn.addEventListener("click", () => {
    importSection.style.display = "block";
  });

  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    const text = await file.text();
    const imported = JSON.parse(text);
    const installed = await chrome.management.getAll();
    const installedIds = new Set(installed.map(ext => ext.id));

    let total = imported.length;
    let completed = 0;

    progress.style.display = "block";
    progress.value = 0;

    imported.forEach((ext, index) => {
      setTimeout(() => {
        if (!installedIds.has(ext.id)) {
          chrome.tabs.create({ url: `${storeEndpoint}/${ext.id}`, active: false });
        }
        completed++;
        progress.value = Math.round((completed / total) * 100);

        if (completed === total) {
          setTimeout(() => {
            importSection.style.display = "none";
            progress.style.display = "none";
            progress.value = 0;
          }, 800);
        }
      }, index * 500);
    });
  });
});
