(async () => {
console.log('active');
  function calcChance(probability) {
    return Math.random() < probability;
  }
if (!zmcd.lhValue) zmcd.lhValue = 0;
exposeOutside.qhtableImg = await drawImage(0.1402, 0.1821, 0.3757, 0.564, '/systemfiles/runtime/apps/zm/assets/ldlassets/qhtable.png');
exposeOutside.qhtableImg.setVisible(false);
bagUI.addChild(exposeOutside.qhtableImg);
let qhbtn = await drawButton(0.058, 0.0235, 0.045, 0.0345, '/systemfiles/runtime/apps/zm/assets/ldlassets/qh.png', '/systemfiles/runtime/apps/zm/assets/ldlassets/qh(hover).png', async () => {
    qhbtn.setImage('/systemfiles/runtime/apps/zm/assets/ldlassets/qh(hover).png');
    exposeOutside.qhtableImg.setVisible(true);
    let qhproceedbtn = await drawButton(0.267, 0.199, 0.143, 0.074, '/systemfiles/runtime/apps/zm/assets/ldlassets/qhproceedbtn.png', '/systemfiles/runtime/apps/zm/assets/ldlassets/qhproceedbtn(hover).png', async () => {
        let calcresult = calcqhprob(ldlCache.qhcurzbonldl);
        let succeed = calcChance(calcresult.realChance);
        let lhneeded = calcresult.lhneeded;
        if (lhneeded > zmcd.lhValue) { alert('灵魂不够'); return; }
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
bagUI.addChild(qhbtn);
qhbtn.onClick();
})();
