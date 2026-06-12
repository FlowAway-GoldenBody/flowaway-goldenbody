(async () => {
console.log('active');
if (!zmcd.lhValue) zmcd.lhValue = 0;
exposeOutside.qhtableImg = await drawImage(0.1402, 0.1821, 0.3757, 0.564, '/systemfiles/runtime/apps/zm/assets/ldlassets/qhtable.png');
exposeOutside.qhtableImg.setVisible(false);
bagUI.addChild(exposeOutside.qhtableImg);
let qhbtn = await drawButton(0.058, 0.0235, 0.045, 0.0345, '/systemfiles/runtime/apps/zm/assets/ldlassets/qh.png', '/systemfiles/runtime/apps/zm/assets/ldlassets/qh(hover).png', async () => {
    qhbtn.setImage('/systemfiles/runtime/apps/zm/assets/ldlassets/qh(hover).png');
    exposeOutside.qhtableImg.setVisible(true);
    let qhproceedbtn = await drawButton(0.267, 0.199, 0.143, 0.074, '/systemfiles/runtime/apps/zm/assets/ldlassets/qhproceedbtn.png', '/systemfiles/runtime/apps/zm/assets/ldlassets/qhproceedbtn(hover).png', async () => {
        alert('clicked');
    }, 10);
    exposeOutside.qhtableImg.addChild(qhproceedbtn);
});
bagUI.addChild(qhbtn);
qhbtn.onClick();
})();
