(async () => {
console.log('active');
  function calcChance(probability) {
    return Math.random() < probability;
  }
if (!zmcd.lhValue) zmcd.lhValue = 0;
let containerImg;
let containerImg2;
function randomNumber(min, max, decimals) {
    const factor = 10 ** decimals;
    return Math.floor((Math.random() * (max - min) + min) * factor) / factor;
}
function calcWx() {
    let wx = [false, false, false, false, false];
    let dblwx = calcChance(0.5);
    let outcome1 = randomNumber(1, 5, 0);
    wx[outcome1] = true;
    if (dblwx) {
        let outcome2 = randomNumber(1, 5, 0);
        wx[outcome2] = true;
    } 
    return wx;
}
function getItemHC(s) {
    if (s.includes('kyz') && s.includes('kyg') && s.includes('kys')) {
        let wx = calcWx();
        let resultObj = {result: { name: 'kyl', player: exposeOutside.getActivePlayer(), ROC: randomNumber(0.5, 1, 1), level: 1, wx, HP: randomNumber(30, 50, 0), MP: randomNumber(30, 50, 0), attack: 10 }, putBackLocation: 'zb'};
        return resultObj;
    }
}
exposeOutside.renderhcPreview = async (slots) => {
    containerImg = await drawImage(0.2986526946107784, 0.4138813859152698, 0.05, 0.074, '/systemfiles/runtime/apps/zm/assets/zb(emptyslot).png');
    let s = '';
    slots.forEach(slot => s+=slot.Item.name);
    let item = getItemHC(s);
    let itemImg = await drawImage(0.2986526946107784, 0.4138813859152698, 0.05, 0.074, `/systemfiles/runtime/apps/zm/assets/zb/${item.result.name}.png`);
    exposeOutside.hctableImg.addChild(containerImg);
    containerImg.addChild(itemImg);
    let chancetxt = await drawText('100%', 0.02, 'white', 'ThinFont', 'left', 1, { fontPath: "/systemfiles/runtime/apps/zm/assets/thinFont.ttf", fontFamily: 'ThinFont' });
    chancetxt.setPosition(0.45434131736526945, 0.34712571168296014);
    exposeOutside.hctableImg.addChild(chancetxt);
    let lhtxt = await drawText('10000', 0.02, 'white', 'ThinFont', 'left', 1, { fontPath: "/systemfiles/runtime/apps/zm/assets/thinFont.ttf", fontFamily: 'ThinFont' });
    lhtxt.setPosition(0.36002994011976047, 0.2857104913892351);
    exposeOutside.hctableImg.addChild(lhtxt);
    let nametxt = await drawText(zbUtils.lookupStats(item.result.name, { x: 0, y: 0 }, item.result).result, 0.02, 'white', 'ThinFont', 'left', 1, { fontPath: "/systemfiles/runtime/apps/zm/assets/thinFont.ttf", fontFamily: 'ThinFont' });
    nametxt.setPosition(0.32110778443113774, 0.3444554847136677);
    exposeOutside.hctableImg.addChild(nametxt);
};
exposeOutside.renderhcReal = async (slots) => {
    containerImg2 = await drawImage(0.1998502994011976, 0.2977265127510509, 0.05, 0.074, '/systemfiles/runtime/apps/zm/assets/zb(emptyslot).png');
    let s = '';
    slots.forEach(slot => s+=slot.Item.name);
    let item = getItemHC(s);
    let slot = item.result;
    let itemBtn = await drawButton(0.1998502994011976, 0.2977265127510509, 0.05, 0.074, `/systemfiles/runtime/apps/zm/assets/zb/${item.result.name}.png`, `/systemfiles/runtime/apps/zm/assets/zb/${item.result.name}.png`, async () => {
        try {
        instance.extern.tooltip.remove();
        instance.extern.tooltip = null;
        } catch (e) {}
        containerImg2.remove();
    });
    itemBtn.onHover = async () => {
        // Only show tooltip if this item doesn't already have one shown
        if (currentTooltipItem === itemBtn) return;
        
        currentTooltipItem = itemBtn;
        let info = zbUtils.lookupStats(slot.name, itemBtn, slot);
        let h = itemBtn.y - info.height + itemBtn.height;
        let tmp = h;
        let lowh = false;
        if (h < 0) {h = 0.007099999999999995; lowh = true}
        if (h === 0.007099999999999995) tmp = h-tmp;
        let textHeight = tmp;
        await instance.extern.displayItemTooltip(slot, itemBtn.x + itemBtn.width, h, info, itemBtn, textHeight, lowh);
    };
    itemBtn.onHoverEnd = () => {
        currentTooltipItem = null;
        instance.extern.tooltip.remove();
        instance.extern.tooltip = null;
    };
    exposeOutside.hctableImg.addChild(containerImg2);
    containerImg2.addChild(itemBtn);
    ldlCache[`cur${item.putBackLocation}ItemsToRender`].push(item.result);
    ldlCache[`removed${item.putBackLocation}saveobject`] = [];
    ldlCache.hcitemslots.forEach(e => {e.PE.remove(); e.PE = null; e.Item = null;});
    return item;
};
exposeOutside.removehcReal = () => {
    containerImg2.remove();
    containerImg2 = null;
}
exposeOutside.removehcPreview = () => {
    if (!containerImg) return;
    containerImg.remove();
    containerImg = null;
};
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
        if (btn.ldltype !== modeLookup[mode]) { btn.setImage(btn.baseImage); exposeOutside[btn.ldltype + 'tableImg'].remove(); }
    });
    exposeOutside.clearLdlState();
}
let menuCoords = { x: 0.1402, y: 0.1821, w: 0.3757, h: 0.564 };
let btnCoords = { x: 0.058, y: 0.0235, w: 0.045, h: 0.0345 };
let qhbtn = await drawButton(btnCoords.x, btnCoords.y, btnCoords.w, btnCoords.h, '/systemfiles/runtime/apps/zm/assets/ldlassets/qh.png', '/systemfiles/runtime/apps/zm/assets/ldlassets/qh(hover).png', async () => {
    if (exposeOutside.qhtableImg?.isConnected) return;
    qhbtn.setImage('/systemfiles/runtime/apps/zm/assets/ldlassets/qh(hover).png');
    qhbtn.baseImage = '/systemfiles/runtime/apps/zm/assets/ldlassets/qh.png';
    exposeOutside.qhtableImg = await drawImage(menuCoords.x, menuCoords.y, menuCoords.w, menuCoords.h, '/systemfiles/runtime/apps/zm/assets/ldlassets/qhtable.png');
bagUI.addChild(exposeOutside.qhtableImg);
    disableOtherModes(1);
    exposeOutside.curLdlMode = 1;
    let qhproceedbtn = await drawButton(0.267, 0.199, 0.143, 0.074, '/systemfiles/runtime/apps/zm/assets/ldlassets/qhproceedbtn.png', '/systemfiles/runtime/apps/zm/assets/ldlassets/qhproceedbtn(hover).png', async () => {
        let calcresult = calcqhprob(ldlCache.qhcurzbonldl);
        let succeed = calcChance(calcresult.realChance);
        let lhneeded = calcresult.lhneeded;
        if (lhneeded > zmcd.lhValue) { alert('灵魂不够'); return; }
        if (calcresult?.realChance == 0 || !calcresult.realChance) return;
        if (!ldlCache.qhcurzbonldl) return;
        if (!ldlCache.qhlastSlotzb) return;
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



let hcbtn = await drawButton(btnCoords.x + 0.08, btnCoords.y, btnCoords.w, btnCoords.h, '/systemfiles/runtime/apps/zm/assets/ldlassets/hc.png', '/systemfiles/runtime/apps/zm/assets/ldlassets/hc(hover).png', async () => {
    hcbtn.setImage('/systemfiles/runtime/apps/zm/assets/ldlassets/hc(hover).png');
    hcbtn.baseImage = '/systemfiles/runtime/apps/zm/assets/ldlassets/hc.png';
    if (exposeOutside.hctableImg?.isConnected) return;
exposeOutside.hctableImg = await drawImage(menuCoords.x, menuCoords.y, menuCoords.w, menuCoords.h, '/systemfiles/runtime/apps/zm/assets/ldlassets/hctable.png');
bagUI.addChild(exposeOutside.hctableImg);
    disableOtherModes(2);
    exposeOutside.curLdlMode = 2;
    let hcproceedbtn = await drawButton(0.273, 0.194, 0.143, 0.074, '/systemfiles/runtime/apps/zm/assets/ldlassets/hcproceedbtn.png', '/systemfiles/runtime/apps/zm/assets/ldlassets/hcproceedbtn(hover).png', async () => {
        let haveItems = 0;
        ldlCache.hcitemslots.forEach(e => { if(e.Item) haveItems++; });
        if (haveItems < 3) return;
        if (zmcd.lhValue < 10000) {alert('灵魂不够'); return}
        exposeOutside.deductLh(10000);
        exposeOutside.removehcPreview();
        await exposeOutside.renderhcReal(ldlCache.hcitemslots);
        let category = exposeOutside.getCurCategory();
        exposeOutside.renderBagItems(category, exposeOutside.getCurPage(), ldlCache[`cur${category}ItemsToRender`])
        zmUtils.saveBtn.onClick();
    });
    exposeOutside.hctableImg.addChild(hcproceedbtn);
});
hcbtn.ldltype = 'hc';
ldlBtns.push(hcbtn);
bagUI.addChild(hcbtn);
})();
