"use strict";
let a = document.createElement('input');
a.value = "aaaaaaa";
document.body.appendChild(a);
a.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    let a = await window.__goldenbodyAPI.writeFolder('TEST', { text: true, direct: true });
    console.log(a);
  }
});
window.addEventListener('message', (e) => {
  if (!e.data.type === "styleapplied") return;
  a.style.color = e.data.dark ? 'white' : 'black';
  a.style.background = e.data.dark ? 'black' : 'white';
});
let menu = document.createElement('div');
menu.style.position = 'absolute';
menu.style.background = 'white';
menu.style.border = '1px solid black';
menu.style.padding = '10px';
menu.style.display = 'none';
menu.innerHTML = '<p>Custom Context Menu</p>';
document.body.appendChild(menu);

window.addEventListener('click', (e) => {
  menu.style.display = 'none';
});
window.addEventListener('contextmenu', (e) => {
  menu.style.display = 'block';
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';
});