(async () => {
console.log('active');
  function calcChance(probability) {
    return Math.random() < probability;
  }
if (!zmcd.lhValue) zmcd.lhValue = 0;
let modeLookup = {
    1: 'qh',
    2: 'hc',
    3: "fj",
    4: "dz",
    5: "remake",
    6: "xq"
};
let ldlBtns = [];
function disableOtherModes(mode) {
    ldlBtns.forEach(btn => {
        if (btn.ldltype !== modeLookup[mode]) { btn.setImage(btn.baseImage); exposeOutside[btn.ldltype + 'tableImg'].setVisible(false); }
    })
}
let menuCoords = { x: 0.1402, y: 0.1821, w: 0.3757, h: 0.564 };
let btnCoords = { x: 0.058, y: 0.0235, w: 0.045, h: 0.0345 };
exposeOutside.qhtableImg = await drawImage(menuCoords.x, menuCoords.y, menuCoords.w, menuCoords.h, '/systemfiles/runtime/apps/zm/assets/ldlassets/qhtable.png');
exposeOutside.qhtableImg.setVisible(false);
bagUI.addChild(exposeOutside.qhtableImg);
let qhbtn = await drawButton(btnCoords.x, btnCoords.y, btnCoords.w, btnCoords.h, '/systemfiles/runtime/apps/zm/assets/ldlassets/qh.png', '/systemfiles/runtime/apps/zm/assets/ldlassets/qh(hover).png', async () => {
    qhbtn.setImage('/systemfiles/runtime/apps/zm/assets/ldlassets/qh(hover).png');
    qhbtn.baseImage = '/systemfiles/runtime/apps/zm/assets/ldlassets/qh.png';
    exposeOutside.qhtableImg.setVisible(true);
    disableOtherModes(1);
    exposeOutside.curLdlMode = 1;
    let qhproceedbtn = await drawButton(0.267, 0.199, 0.143, 0.074, '/systemfiles/runtime/apps/zm/assets/ldlassets/qhproceedbtn.png', '/systemfiles/runtime/apps/zm/assets/ldlassets/qhproceedbtn(hover).png', async () => {
        let calcresult = calcqhprob(ldlCache.qhcurzbonldl);
        let succeed = calcChance(calcresult.realChance);
        let lhneeded = calcresult.lhneeded;
        if (lhneeded > zmcd.lhValue) { alert('灵魂不够'); return; }
        if (succeed.realChance == 0) return;
        if (!qhcurzbonldl) return;
        exposeOutside.deductLh(lhneeded);
        if (succeed) {
            ldlCache.qhcurzbonldl.qhLevel += 1;
            alert('强化成功');
        } else {
            ldlCache.qhcurzbonldl.qhLevel -= 1;
            alert('强化失败');
        }
        ldlCache.removeddjsaveobject = [];
        ldlCache.removedzbsaveobject = [];
        ldlCache.qhlastSlotzb = null;
        try {
            ldlCache.qhdjslots.forEach(e => { e.PE.remove(); e.Item = null; e.PE = null; });
        } catch (e) {}
        ldlCache.qhcurzbonldlPE.remove();
        ldlCache.curzbItemsToRender.push(ldlCache.qhcurzbonldl);
        ldlCache.qhcurzbonldl = null;
        ldlCache.qhcurzbonldlPE = null;
        exposeOutside.categoryButtons[0].onClick();
        zmUtils.saveBtn.onClick();
    }, 10);
    exposeOutside.qhtableImg.addChild(qhproceedbtn);
});
qhbtn.ldltype = 'qh';
ldlBtns.push(qhbtn);
bagUI.addChild(qhbtn);
qhbtn.onClick();



exposeOutside.hctableImg = await drawImage(menuCoords.x, menuCoords.y, menuCoords.w, menuCoords.h, '/systemfiles/runtime/apps/zm/assets/ldlassets/hctable.png');
exposeOutside.hctableImg.setVisible(false);
bagUI.addChild(exposeOutside.hctableImg);
let hcbtn = await drawButton(btnCoords.x + 0.08, btnCoords.y, btnCoords.w, btnCoords.h, '/systemfiles/runtime/apps/zm/assets/ldlassets/hc.png', '/systemfiles/runtime/apps/zm/assets/ldlassets/hc(hover).png', async () => {
    hcbtn.setImage('/systemfiles/runtime/apps/zm/assets/ldlassets/hc(hover).png');
    hcbtn.baseImage = '/systemfiles/runtime/apps/zm/assets/ldlassets/hc.png';
    exposeOutside.hctableImg.setVisible(true);
    disableOtherModes(2);
    exposeOutside.curLdlMode = 2;
    let hcproceedbtn = await drawButton(0.273, 0.194, 0.143, 0.074, '/systemfiles/runtime/apps/zm/assets/ldlassets/hcproceedbtn.png', '/systemfiles/runtime/apps/zm/assets/ldlassets/hcproceedbtn(hover).png', async () => {

    });
    exposeOutside.hctableImg.addChild(hcproceedbtn);
});
hcbtn.ldltype = 'hc';
ldlBtns.push(hcbtn);
bagUI.addChild(hcbtn);
})();
