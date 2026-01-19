// var popoutBtn =
// document.createElement('button');
// popoutBtn.textContent = '☄';
// popoutBtn.className = 'sim-open-btn';
// addressRow.appendChild(popoutBtn);

var ssBtn = document.createElement('button');
ssBtn.textContent = '⚙';
ssBtn.className = 'sim-open-btn';
ssBtn.style.fontSize = '20px';
var check = false;
ssBtn.addEventListener('click', function (e) {
    // --- Create Button ---
    if(check) {
        return;
    }
    check = true;
    // --- Create Floating Div ---
    const mainMenuContainer = document.createElement('div');
    mainMenuContainer.style.position = 'absolute';
    mainMenuContainer.style.width = '300px';
    mainMenuContainer.style.height = '400px';
    mainMenuContainer.style.backgroundColor = 'lightblue';
    mainMenuContainer.style.border = '1px solid #333';
    mainMenuContainer.style.display = 'none';
    mainMenuContainer.style.zIndex = '1000';
    mainMenuContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
    mainMenuContainer.style.padding = '10px';
    mainMenuContainer.style.overflowY = 'auto'; // Enable vertical scroll
    mainMenuContainer.classList.add('hide-scrollbar'); // Hide scrollbar visually
    root.appendChild(mainMenuContainer);

    // --- Create Close Button ---
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '5px';
    closeBtn.style.right = '5px';
    closeBtn.style.background = '#ff5c5c';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.borderRadius = '3px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '5px 8px';
    mainMenuContainer.appendChild(closeBtn);
    var saveBtn = document.createElement('button');
    saveBtn.textContent = 'save';
    saveBtn.className = 'sim-open-btn';
    saveBtn.onclick = function () {
        saveSiteSettings();
    }

    // --- Add Sample Content Inside Floating Div ---
    const content = document.createElement('p');
try{content.textContent = 'Site Settings:\n' + mainWebsite(unshuffleURL(activatedTab.iframe.contentWindow.location.href));}catch(e){content.textContent = 'Site Settings:\n' + 'UNDEFINED' + '\n' + 'Error: can\'t read the website of this tab.'; check = false; return;}
    content.style.marginTop = '40px';
    mainMenuContainer.appendChild(content);
    var checkboxes = [];
    var flag = [0,0,0,0,0,0,0,0,0,0,0,0];
    for(let i = 0; i < 13; i++) {
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', function(e){
            if (e.target.checked) {
               // activatedTab.iframe.sandbox.add(flag[i]);
            }
            else {
              // activatedTab.iframe.sandbox.remove(flag[i]);
            }
        });
        checkboxes.push(checkbox);
        var aContent = document.createElement('p');
        //const sandboxPermissions = activatedTab.iframe.sandbox.value.split(' ');
        if(i == 0) {
            aContent.textContent = 'allow-forms';
            flag[i] = 'allow-forms';
            //console.log(activatedTab.iframe.sandbox.value.split(' '));
            if (sandboxPermissions.includes(aContent.textContent)) {
                checkbox.checked = true;
            }
        }
        else if(i == 1) {
            aContent.textContent = 'allow-modals';
            flag[i] = 'allow-modals';
            if (sandboxPermissions.includes(aContent.textContent)) {
                checkbox.checked = true;
            }
        }
        else if(i == 2) {
            flag[i] = 'allow-orientation-lock';
            aContent.textContent = 'allow-orientation-lock';
            if (sandboxPermissions.includes(aContent.textContent)) {
                checkbox.checked = true;
            }
        }
        else if(i == 3) {
            flag[i] = 'allow-pointer-lock';
            aContent.textContent = 'allow-pointer-lock';
            if (sandboxPermissions.includes(aContent.textContent)) {
                checkbox.checked = true;
            }
        }
        else if(i == 4) {
            flag[i] = 'allow-popups';
            aContent.textContent = 'allow-popups';
            if (sandboxPermissions.includes(aContent.textContent)) {
                checkbox.checked = true;
            }
        }
        else if(i == 5) {
            flag[i] = 'allow-popups-to-escape-sandbox';
            aContent.textContent = 'allow-popups-to-escape-sandbox';
            if (sandboxPermissions.includes(aContent.textContent)) {
                checkbox.checked = true;
            }
        }
        else if(i == 6) {
            flag[i] = 'allow-presentation';
            aContent.textContent = 'allow-presentation';
            if (sandboxPermissions.includes(aContent.textContent)) {
                checkbox.checked = true;
            }
        }
        else if(i == 7) {
            flag[i] = 'allow-same-origin';
            aContent.textContent = 'allow-same-origin';
            if (sandboxPermissions.includes(aContent.textContent)) {
                checkbox.checked = true;
            }
        }
        else if(i == 8) {
            flag[i] = 'allow-scripts';
            aContent.textContent = 'allow-scripts';
            if (sandboxPermissions.includes(aContent.textContent)) {
                checkbox.checked = true;
            }
        }
        else if(i == 9) {
            flag[i] = 'allow-storage-access-by-user-activation';
            aContent.textContent = 'allow-storage-access-by-user-activation';
            if (sandboxPermissions.includes(aContent.textContent)) {
                checkbox.checked = true;
            }
        }
        else if(i == 10) {
            flag[i] = 'allow-top-navigation';
            aContent.textContent = 'allow-top-navigation';
            if (sandboxPermissions.includes(aContent.textContent)) {
                checkbox.checked = true;
            }
        }
        else if(i == 11) {
            flag[i] = 'allow-top-navigation-by-user-activation';
            aContent.textContent = 'allow-top-navigation-by-user-activation';
            if (sandboxPermissions.includes(aContent.textContent)) {
                checkbox.checked = true;
            }
        }
        else if(i == 12) {
            flag[i] = 'allow-downloads';
            aContent.textContent = 'allow-downloads';
            if (sandboxPermissions.includes(aContent.textContent)) {
                checkbox.checked = true;
            }
        }
        // else if(i == 13) {
        //     flag[i] = 'allow-downloads-by-user-activation';
        //     aContent.textContent = 'allow-downloads-by-user-activation';
        //     if (sandboxPermissions.includes(aContent.textContent)) {
        //         checkbox.checked = true;
        //     }
        // }
        mainMenuContainer.appendChild(aContent);
        mainMenuContainer.appendChild(checkbox);
        mainMenuContainer.appendChild(saveBtn);
    }
    function saveSiteSettings() {
        var done = false;
        var aSiteSetting = new Object();
        aSiteSetting.website = mainWebsite(unshuffleURL(activatedTab.iframe.contentWindow.location.href));
        aSiteSetting.checkboxstate = [];
        for(let i = 0; i < checkboxes.length; i++) {
            aSiteSetting.checkboxstate.push(checkboxes[i].checked);
        }
        for(let i = 0; i < siteSettings.length; i++){
            if(i == siteSettings.length - 1) {
              if(done == 'disabled') {}
              else {
                done = true;
              }
            }
            if(aSiteSetting.website == siteSettings[i].website) {
                done = 'disabled';
                siteSettings[i] = aSiteSetting;
            }
            else {
                if(done){
                  if(done == 'disabled') {
                    break;
                  }
                siteSettings.push(aSiteSetting);
                }
            }
        }
        if(siteSettings.length == 0) {
            siteSettings.push(aSiteSetting);
        }
        save();
        // applySiteSettings();
    }
    // --- Create Content Below to Show It's Not Pushed ---
     const parentRect = root.getBoundingClientRect();
      const offsetX = e.clientX - parentRect.left;
      const offsetY = e.clientY - parentRect.top;

      mainMenuContainer.style.left = offsetX + 'px';
      mainMenuContainer.style.top = offsetY + 'px';
      mainMenuContainer.style.display = 'block';
    // --- Show the Floating Div on Button Click ---

    // --- Close the Floating Div When Close Button Clicked ---
    closeBtn.addEventListener('click', () => {
      mainMenuContainer.style.display = 'none';
      check = false;
    });

    // --- Hide the Floating Div When Clicking Outside ---
    document.addEventListener('click', (e) => {
      const isClickInside = mainMenuContainer.contains(e.target) || e.target === ssBtn;
      if (!isClickInside && mainMenuContainer.style.display === 'block') {
        mainMenuContainer.style.display = 'none';
        check = false;
      }
    });
});
addressRow.prepend(ssBtn);

function ssObj2str() {
  let string = '';
 for(let i = 0; i < siteSettings.length; i++) {
  string += siteSettings[i].website;
  for(let j = 0; j < siteSettings[i].checkboxstate.length; j++) {
    if(siteSettings[i].checkboxstate[j]) {
      string += '$' + index2sandboxItems[j];
    }
  }
  if(i != siteSettings.length-1) {
  string += ' ';
  }
  else {}
 }
 return string;
}
function preprocessModifiedLinks() {
  for(let i = 0; i < modifiedlinks.length; i++) {
  let link = new Object();
  let items = modifiedlinks[i].split('$');
  link.website = items[0];
  link.checkboxstate = [0,0,0,0,0,0,0,0,0,0,0,0];
  items.splice(0,1)
  for(let j = 0; j < items.length; j++) {
    try {
    if(sandboxItems2Index.hasOwnProperty(items[j])) {
      link.checkboxstate[sandboxItems2Index[items[j]]] = true;
    }
    else {
      link.checkboxstate[sandboxItems2Index[items[j]]] = false;
    }
  }
  catch(e) {
    link.checkboxstate[sandboxItems2Index[items[j]]] = false;
  }
  }
  for(let j = 0; j < link.checkboxstate.length;j++) {
    if(link.checkboxstate[j] != true) {
      link.checkboxstate[j] = false;
    }
  }
  siteSettings.push(link);
  }
}
preprocessModifiedLinks();

function mainWebsite(string) {
let afterString = '';
let i = 0
if (string.startsWith('https://')) {
    afterString = 'https://';
    i = 8;
}
else if (string.startsWith('http://')) {
    afterString = 'http://';
    i = 7;
}
else {
    console.error('invalid link: make sure it starts with either http:// or https://');
    return;
}
for(; i < string.length; i++) {
    if(string[i] == '/') {
    afterString += string[i];
    return afterString;
    }
    else {
    afterString += string[i]
    }
}
return afterString;
}
var siteSettings = [];
var index2sandboxItems = {
  0:'allow-forms',
  1:'allow-modals',
  2:'allow-orientation-lock',
  3:'allow-pointer-lock',
  4:'allow-popups',
  5:'allow-popups-to-escape-sandbox',
  6:'allow-presentation',
  7:'allow-same-origin',
  8:'allow-scripts',
  9:'allow-storage-access-by-user-activation',
  10:'allow-top-navigation',
  11:'allow-top-navigation-by-user-activation',
  12:'allow-downloads',
};
var sandboxItems2Index = {
  'allow-forms':0,
  'allow-modals':1,
  'allow-orientation-lock':2,
  'allow-pointer-lock':3,
  'allow-popups':4,
  'allow-popups-to-escape-sandbox':5,
  'allow-presentation':6,
  'allow-same-origin':7,
  'allow-scripts':8,
  'allow-storage-access-by-user-activation':9,
  'allow-top-navigation':10,
  'allow-top-navigation-by-user-activation':11,
  'allow-downloads':12,
};

<iframe src="https://gointerstellar.app/a/hvtrs8%2F-gmoelg.aoo" style="position: fixed; inset: 0px; outline: none; border: none; height: 100%; width: 100%;"></iframe>