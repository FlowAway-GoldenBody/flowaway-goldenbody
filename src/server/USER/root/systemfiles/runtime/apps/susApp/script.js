let a = document.createElement('input');
a.value = "aaaaaaa";
document.body.appendChild(a);
window.addEventListener('message', (e) => {
  console.log('message received', e.data);
  a.style.color = e.data.dark ? 'white' : 'black';
  a.style.background = e.data.dark ? 'black' : 'white';
});