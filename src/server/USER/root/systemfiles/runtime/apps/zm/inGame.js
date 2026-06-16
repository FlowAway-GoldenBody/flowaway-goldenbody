async function continueInGame(zmcd, cdIndex) {
    let bagInfo = {};
    let zmUtils = {};
    let curCategory = "zb";
    let curPage = 1;
    let activeplayer = 1;
    let currentTooltipItem = null; // track which item currently has a tooltip shown
    let zbUtils = {};
    let curLdlMode = 1;
    let lhText;
    let exposeOutside = {};
    let ldlCache = {};
    let categoryButtons = [];
    let qhChance = null;
    let lhConsumptionDisplay = null;
    exposeOutside.deductLh = (val) => {
        zmcd.lhValue -= val;
        zmcd.lhValue = parseInt(zmcd.lhValue);
        renderLhtext();
    }
    // // process dj sec of zmcd
    // try {
    // (() => {
    //     let processedObject = [];
    //     let no = [];
    //     let baseElement = null;
    //     let baseObject = {};
    //     let elementcnt = 0;
    //     let i = 0;
    //     for (const element of zmcd.bagdjsaveobject) {
    //         i++
    //         if (element.cnt) continue;
    //         if (!baseElement) { elementcnt++; baseElement = element; baseObject = { baseElement, cnt: elementcnt }; processedObject.push(baseObject); continue; }
    //         if (element.name == baseElement.name && element.player === baseElement.player) { elementcnt++; if (i === zmcd.bagdjsaveobject.length) processedObject[processedObject.indexOf(baseObject)].cnt = elementcnt; }
    //         else {
    //             processedObject[processedObject.indexOf(baseObject)].cnt = elementcnt;
    //             elementcnt = 1;
    //             baseElement = element;
    //             baseObject = { baseElement, cnt: elementcnt };
    //             processedObject.push(baseObject);
    //         }
    //     }
    //     processedObject.forEach(e => {
    //         e.baseElement.cnt = e.cnt;
    //         no.push(e.baseElement);
    //     });
    //     zmcd.bagdjsaveobject = no;
    // })();
    // } catch (e) {
    //     // ignore
    // }
    async function qhdisplayChance (obj) {
        if (qhChance) { qhChance.remove(); qhChance = null; }
        qhChance = await drawText(obj.displayChance, 0.02, "white", "ThinFont", 'left', 1, { fontPath: "/systemfiles/runtime/apps/zm/assets/thinFont.ttf", fontFamily: 'ThinFont' });
        qhChance.setPosition(0.44461077844311375, 0.29238605881246615);
        exposeOutside.qhtableImg.addChild(qhChance);
        // this also display the lh needed for this
        if (lhConsumptionDisplay) { lhConsumptionDisplay.remove(); lhConsumptionDisplay = null; }
        lhConsumptionDisplay = await drawText(parseInt(obj.lhneeded), 0.02, "white", "ThinFont", 'left', 1, { fontPath: "/systemfiles/runtime/apps/zm/assets/thinFont.ttf", fontFamily: 'ThinFont' });
        lhConsumptionDisplay.setPosition(0.27694610778443113, 0.29238605881246615);
        exposeOutside.qhtableImg.addChild(lhConsumptionDisplay);
    }
    ldlCache.qhdjslots = [
        {x: 0.30538922155688625, y: 0.3684875274372992, Item: false, PE: null},
        {x: 0.39820359281437123, y: 0.5100095568097959, Item: false, PE: null},
        {x: 0.30538922155688625, y: 0.654201813151585, Item: false, PE: null},
        {x: 0.2028443113772455, y: 0.5887812524039213, Item: false, PE: null},
        {x: 0.20359281437125748, y: 0.44859433651607095, Item: false, PE: null}
    ];
    ldlCache.qhcurzbonldl = null;
    function calcqhprob(item) {
        let levels = [];
        let chances = 0;
        if (!item.qhLevel) item.qhLevel = 0;
        const chanceDecrease = item.qhLevel + 1;
        ldlCache.qhdjslots.forEach(e => {try {levels.push(parseInt(e.Item.name[0]))} catch(e){}});
        levels.forEach(e => {
            switch(e) {
                case 1:
                    chances += 0.1 / chanceDecrease;
                    break;
                case 2:
                    chances += 0.4 / chanceDecrease;
                    break;
                case 3:
                    chances += 1.5 / chanceDecrease;
                    break;
                case 4:
                    chances += 5 / chanceDecrease;
            }
        });
        if (chances > 1) chances = 1;
        let lhneeded = chances * 10000;
        chances = { realChance: chances, displayChance: String(parseInt(chances * 100)) + '%', lhneeded }
        return chances;
    }
    ldlCache.removedzbsaveobject = [];
    ldlCache.removeddjsaveobject = [];
    ldlCache.curzbItemsToRender = zmcd.bagzbsaveobject;
    ldlCache.curdjItemsToRender = zmcd.bagdjsaveobject;
    async function renderLhtext() {
        if (lhText) {lhText.remove(); lhText = null;}
        lhText = await drawText(zmcd.lhValue, 0.04, "white", "ThinFont", "left", 1, { fontPath: "/systemfiles/runtime/apps/zm/assets/thinFont.ttf", fontFamily: 'ThinFont' });
        lhText.setPosition(0.854, 0.0227);
        bagUI.addChild(lhText);
    }
    (async () => {
      let scriptText = await window.protectedGlobals.ReadFile("/systemfiles/runtime/apps/zm/utils.js", { text: true, direct: true });
      eval(scriptText);
    })();

    async function generateTooltipText(itemData, arg, textHeight, lowh) {
        const explicitSize = 0.025;
        const explicitFamily = "InfoFont";
        let newarg = { x: arg.x, y: arg.y }
        let displayObject = zbUtils.lookupStats(itemData.name, newarg, itemData);
        if (lowh) newarg.y += textHeight;
        zbUtils.renderStats(itemData, displayObject, newarg)
        return displayObject;
    }
    console.log('this is used to trace the vmxxxxx files so its able to debug')
    // functions
    function clearOtherCategoryButtons(buttons, activeBtn) {
        buttons.forEach(btn => {
            if (btn !== activeBtn) {
                btn.setImage(btn.defaultImage);
            }
        });
    }
    function removeBagItems() {
        if (!bagUI) return;
        let existingItems = bagUI.children.filter(child => child.isItem);
        existingItems.forEach(item => item.remove());
        // Clean up any leftover tooltip when clearing items
        if (instance.extern.tooltip) {
            instance.extern.tooltip.remove();
            instance.extern.tooltip = null;
            currentTooltipItem = null;
        }
    }
    let renderingBag = false;

    async function renderBagItems(category, pageNum = 1, itemsToRender) {
        if (renderingBag) return;
        renderingBag = true;
        try {
        // clear existing items
        let existingItems = bagUI.children.filter(child => child.isItem);
        existingItems.forEach(item => item.remove());
        // render items for the selected category
        if (!itemsToRender) itemsToRender = Array.from(zmcd[`bag${category}saveobject`]) || [];
        ldlCache[`cur${curCategory}ItemsToRender`] = itemsToRender;
        itemsToRender = itemsToRender.filter(itemFilter => itemFilter.player === activeplayer);
        // render empty slots for the current page
        let yindex = 0;
        let startSlot = (pageNum - 1) * 25;
        let origPush = bagUI.children.push;
        let origSplice = bagUI.children.splice;
// bagUI.children.push = function(...args) {
//     console.log("PUSH", args);
//     return origPush.apply(this, args);
// };

// bagUI.children.splice = function(...args) {
//     console.trace("SPLICE", args);
//     return origSplice.apply(this, args);
// };
        for (let i = 0; i < 25; i++) {
            let slotNum = startSlot + i;
            let emptySlot = await drawImage(0.55 + (i % 5) * 0.06, 0.6421 - yindex * 0.095, 0.05, 0.07, "/systemfiles/runtime/apps/zm/assets/zb(emptyslot).png", 0);
            emptySlot.isItem = true; // mark as item so we can easily remove later
            bagUI.addChild(emptySlot);
            if (i % 5 === 4) yindex++; // move to next row after every 5 items
        }
        yindex = 0;
        let endSlot = Math.min(startSlot + 25, itemsToRender.length);
        let renderedCount = 0;
        for (let i = startSlot; i < endSlot; i++) {
            let slot = itemsToRender[i];
            // only render items for the active player
            if (!slot.cnt && category === 'dj') { continue; }
            let itemImg = "/systemfiles/runtime/apps/zm/assets/" + category + "/" + slot.name + ".png";

            // Create button first without handlers
            const itemButton = await drawButton(0.55 + (renderedCount % 5) * 0.06, 0.6421 - yindex * 0.095, 0.05, 0.07, itemImg, undefined, 
            async () => {
                // handle item click
                switch(curLdlMode) {
                    case 1:
                        let djslots = ldlCache.qhdjslots;
                        if (instance.extern.tooltip) instance.extern.tooltip.remove();
                        instance.extern.tooltip = null;
                        if (curCategory === 'zb') {
                            if (slot.qhLevel >= 7) return;
                            ldlCache.removedzbsaveobject.push(ldlCache.curzbItemsToRender.splice(ldlCache.curzbItemsToRender.indexOf(slot), 1)[0]);
                            if (ldlCache.qhlastSlotzb) ldlCache.curzbItemsToRender.push(ldlCache.qhlastSlotzb);
                            if (ldlCache.qhlastSlotzb) ldlCache.removedzbsaveobject.splice(ldlCache.removedzbsaveobject.indexOf(ldlCache.qhlastSlotzb), 1);
                            ldlCache.qhlastSlotzb = slot;
                            exposeOutside.qhtableImg.children.forEach(element => {
                                if (element.locatorID === 'containerImg') {
                                    element.remove(); 
                                }
                            });
                            renderBagItems(curCategory, curPage, ldlCache.curzbItemsToRender);
                            try {
                            instance.extern.tooltip.remove();
                            instance.extern.tooltip = null;
                            currentTooltipItem = null;
                            } catch (e) {}
                            let containerImg = await drawImage(0.305, 0.51, 0.05, 0.074, '/systemfiles/runtime/apps/zm/assets/zb(emptyslot).png');
                            containerImg.locatorID = 'containerImg';
                            ldlCache.qhcurzbonldl = slot;
                            ldlCache.qhcurzbonldlPE = containerImg;
                            try {
                            let chanceObj = calcqhprob(slot);
                            qhdisplayChance(chanceObj);
                            } catch(e) {}
                            let itemBtn = await drawButton(0.305, 0.51, 0.05, 0.074, "/systemfiles/runtime/apps/zm/assets/" + category + "/" + slot.name + ".png", "/systemfiles/runtime/apps/zm/assets/" + category + "/" + slot.name + ".png", () => {
                                if (ldlCache.qhlastSlotzb) ldlCache.removedzbsaveobject.splice(ldlCache.removedzbsaveobject.indexOf(ldlCache.qhlastSlotzb), 1);
                                if (ldlCache.qhlastSlotzb) ldlCache.curzbItemsToRender.push(ldlCache.qhlastSlotzb);
                                itemBtn.parent.remove();
                                try {
                                let chanceObj = calcqhprob(slot);
                                qhdisplayChance(chanceObj);
                                } catch (e) {}
                                if (instance.extern.tooltip) {instance.extern.tooltip.remove(); instance.extern.tooltip = null; currentTooltipItem = null;}
                                ldlCache.qhlastSlotzb = null;
                                categoryButtons[0].onClick();
                                renderBagItems(curCategory, curPage);
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
                            exposeOutside.qhtableImg.addChild(containerImg);
                            containerImg.addChild(itemBtn);
                        }
                        if (curCategory === 'dj') {
                            if (!slot.name.includes('qhs')) return; // we dont put these items there
                            for (const djSlot of djslots) {
                                if (djSlot.Item) continue;
                                let newSlot = {};
                                Object.assign(newSlot, slot);
                                newSlot.cnt = 1;
                                ldlCache.removeddjsaveobject.push(newSlot);
                                slot.cnt--;
                                djSlot.Item = slot;
                                let containerImg = await drawImage(djSlot.x, djSlot.y, 0.05, 0.074, '/systemfiles/runtime/apps/zm/assets/zb(emptyslot).png');
                                djSlot.PE = containerImg;
                                try {
                                let chanceObj = calcqhprob(ldlCache.qhcurzbonldl);
                                qhdisplayChance(chanceObj);
                                } catch(e) {}
                                let itemBtn = await drawButton(djSlot.x, djSlot.y, 0.05, 0.074, "/systemfiles/runtime/apps/zm/assets/" + category + "/" + slot.name + ".png", "/systemfiles/runtime/apps/zm/assets/" + category + "/" + slot.name + ".png", () => {
                                    containerImg.remove();
                                    containerImg = null;
                                    slot.cnt++;
                                    // decrement aggregated removeddjsaveobject count (return one unit to inventory)
                                    try {
                                        const ridx = ldlCache.removeddjsaveobject.findIndex(e => e.name === slot.name && e.player === slot.player);
                                        if (ridx !== -1) {
                                            ldlCache.removeddjsaveobject[ridx].cnt = (ldlCache.removeddjsaveobject[ridx].cnt || 1) - 1;
                                            if (ldlCache.removeddjsaveobject[ridx].cnt <= 0) ldlCache.removeddjsaveobject.splice(ridx, 1);
                                        }
                                    } catch (e) {}
                                    categoryButtons[1].onClick();
                                    renderBagItems('dj', 1, ldlCache.curdjItemsToRender);
                                    djSlot.Item = false;
                                    djSlot.PE = null;
                                    try {
                                    let chanceObj = calcqhprob(ldlCache.qhcurzbonldl);
                                    qhdisplayChance(chanceObj);
                                    } catch(e) {}
                                    currentTooltipItem = null;
                                    instance.extern.tooltip.remove();
                                    instance.extern.tooltip = null;
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
                                exposeOutside.qhtableImg.addChild(containerImg);
                                containerImg.addChild(itemBtn);
                                renderBagItems('dj', 1, ldlCache.curdjItemsToRender);
                                break;
                            }
                        }
                        break;
                }
            }, 
            1 // zindex
            );
            if (slot.cnt) {
                let cntElement = await drawText(slot.cnt, 0.02, "orange", "InfoFont", "right", { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: "InfoFont" });
                cntElement.setPosition(itemButton.x + itemButton.width - 0.003, itemButton.y);
                itemButton.addChild(cntElement);
            }
            itemButton.onHover = async () => {
                // Only show tooltip if this item doesn't already have one shown
                if (currentTooltipItem === itemButton) return;
                
                currentTooltipItem = itemButton;
                let info = zbUtils.lookupStats(slot.name, itemButton, slot);
                let h = itemButton.y - info.height + itemButton.height;
                let tmp = h;
                let lowh = false;
                if (h < 0) {h = 0.007099999999999995; lowh = true}
                if (h === 0.007099999999999995) tmp = h-tmp;
                let textHeight = tmp;
                await instance.extern.displayItemTooltip(slot, itemButton.x + itemButton.width, h, info, itemButton, textHeight, lowh);
            };
            
            itemButton.onHoverEnd = () => {
                // cancel any pending tooltip load and remove any shown tooltip safely
                try { instance.extern._tooltipToken++; } catch (e) { instance.extern._tooltipToken = (instance.extern._tooltipToken || 0) + 1; }
                instance.extern.tooltipShowing = false;
                currentTooltipItem = null;
                instance.extern.tooltip.remove();
                instance.extern.tooltip = null;
            };
            
            bagUI.addChild(itemButton);
            itemButton.isItem = true; // mark as item so we can easily remove later
            renderedCount++;
            if (renderedCount % 5 === 0) yindex++; // move to next row after every 5 items
        }
        } finally {
            renderingBag = false;
        }

    }
    exposeOutside.renderBagItems = renderBagItems;
    async function renderBagPages() {
        // draw the page buttons
        let pages = [1, 2, 3];
        let pageButtons = [];
        for (let index = 0; index < pages.length; index++) {
            let pageNum = pages[index];
            const baseX = 0.7542;
            const gap = 0.005;
            const btnW = 0.0307;
            const xPos = baseX + index * (btnW + gap);
            let btn = await drawButton(xPos, 0.1789, btnW, 0.0316, `/systemfiles/runtime/apps/zm/assets/zb(page${pageNum}).png`, `/systemfiles/runtime/apps/zm/assets/zb(page${pageNum})(hover).png`, () => {
                // handle page button click
                btn.setImage(`/systemfiles/runtime/apps/zm/assets/zb(page${pageNum})(hover).png`);
                removeBagItems();
                renderBagItems(curCategory, pageNum, ldlCache[`cur${curCategory}ItemsToRender`]);
                clearOtherCategoryButtons(pageButtons, btn);
                curPage = pageNum;
            });
            btn.defaultImage = `/systemfiles/runtime/apps/zm/assets/zb(page${pageNum}).png`;
            pageButtons.push(btn);
            bagUI.addChild(btn);
        }
        return pageButtons;
    }
    async function renderBagTopBar() {
        // draw the category buttons
        let categories = ["zb", "dj", "sz", "js"];
        let categoryButtons = [];
        let pages = [1,2,3];
        // write everything below in a for loop that iterates through the categories array and creates a button for each category, and adds it to the bagUI
        for (let index = 0; index < categories.length; index++) {
            let cat = categories[index];
            // place category buttons next to each other with small gap
            const baseX = 0.5508;
            const gap = 0.005;
            const btnW = 0.0697;
            const xPos = baseX + index * (btnW + gap);
            let btn = await drawButton(xPos, 0.7383, btnW, 0.0407, `/systemfiles/runtime/apps/zm/assets/zb(cat)(${cat}).png`, `/systemfiles/runtime/apps/zm/assets/zb(cat)(${cat})(hover).png`, () => {
                // handle category button click
                btn.setImage(`/systemfiles/runtime/apps/zm/assets/zb(cat)(${cat})(hover).png`);
                clearOtherCategoryButtons(categoryButtons, btn);
                curCategory = cat;
                renderBagItems(cat, curPage, ldlCache[`cur${curCategory}ItemsToRender`]);
            });
            categoryButtons.push(btn);
            bagUI.addChild(btn);
            btn.defaultImage = `/systemfiles/runtime/apps/zm/assets/zb(cat)(${cat}).png`;
            if (cat === "zb") btn.onClick();
        }
        return categoryButtons;
    }
    function enlargechbtn(btn) {
        btn.setX(btn.x - 0.01);
        btn.setY(btn.y - 0.01);
        btn.setW(btn.width + 0.02);
        btn.setH(btn.height + 0.02);
    }
    function shrinkchbtn(btn) {
        btn.setX(btn.x + 0.01);
        btn.setY(btn.y + 0.01);
        btn.setW(btn.width - 0.02);
        btn.setH(btn.height - 0.02);
    }

    let curminimap = await drawImage(0, 0, 1, 1, "/systemfiles/runtime/apps/zm/assets/187.jpg", 10, { noParent: true });
    zmUtils.saveBtn = await drawButton(0.0013, 0.0096, 0.0675, 0.117, "/systemfiles/runtime/apps/zm/assets/saveGame.png", "/systemfiles/runtime/apps/zm/assets/saveGame(hover).png", async () => {
        let hasError = false;
        try {
            await window.protectedGlobals.WriteFile("/systemfiles/runtime/apps/zm/data/" + `cd#(${cdIndex})` + ".json", btoa(JSON.stringify(zmcd)));
        } catch (e) {
            hasError = true;
        }
        if (!hasError) {
            let img = await drawImage(0.395, 0.215, 0.233, 0.099, "/systemfiles/runtime/apps/zm/assets/saveSuccessful.png");
            curminimap.addChild(img);
            setTimeout(() => {
                img.remove();
            }, 2000);
        } else {
            let img = await drawImage(0.395, 0.215, 0.233, 0.099, "/systemfiles/runtime/apps/zm/assets/saveFailed.png");
            curminimap.addChild(img);
            setTimeout(() => {
                img.remove();
            }, 2000);
        }
    });
    let exitBtn = await drawButton(0.48, 0.0117, 0.0685, 0.106, "/systemfiles/runtime/apps/zm/assets/inGame(exit).png", "/systemfiles/runtime/apps/zm/assets/inGame(exit)(hover).png", () => {
        lobby.mainimg.setVisible(true);
        curminimap.remove();
    });
    let bagUI = null;
    instance.extern = {};
    instance.extern.tooltipShowing = false;
    // token used to cancel stale async tooltip loads
    instance.extern.tooltip = null; // store the currently displayed tooltip so we can remove it when needed
    instance.extern._tooltipToken = 0;
    instance.extern.displayItemTooltip = async function(itemData, posX, posY, info, arg, textHeight, lowh) {
        // cancel if already showing (or allow re-show by incrementing token)
        const myToken = ++instance.extern._tooltipToken;
        // mark that a tooltip is pending/showing for input logic
        instance.extern.tooltipShowing = true;
        let createdTooltip = null;
        try {
            createdTooltip = await drawImage(posX, posY, info.width, info.height, '/systemfiles/runtime/apps/zm/assets/zb/itemTooltip2.png', 1.1);
        } catch (e) {
            // loading failed (e.g. image couldn't be read). Ensure state is cleaned up and do not leave a stale flag.
            // only clear tooltipShowing if no newer tooltip request was made
            if (instance.extern._tooltipToken === myToken) instance.extern.tooltipShowing = false;
            return null;
        }

        // if another tooltip request happened after we started, cancel this one
        if (instance.extern._tooltipToken !== myToken) {
            try { if (createdTooltip && typeof createdTooltip.remove === 'function') createdTooltip.remove(); } catch (e) {}
            return null;
        }

        // attach the created tooltip
        instance.extern.tooltip = createdTooltip;
        try {
            bagUI.addChild(instance.extern.tooltip);
            // create text with explicit params and diagnostics to detect rendering issues
            await generateTooltipText(itemData, arg, textHeight, lowh);
        } catch (e) {
            // if anything fails while adding children, remove tooltip and clear state
            try { if (instance.extern.tooltip && typeof instance.extern.tooltip.remove === 'function') instance.extern.tooltip.remove(); } catch (e2) {}
            instance.extern.tooltip = null;
            instance.extern.tooltipShowing = false;
            return null;
        }

        // finally, ensure tooltipShowing is true only if this token is still current
        if (instance.extern._tooltipToken === myToken) {
            instance.extern.tooltipShowing = true;
            return instance.extern.tooltip;
        }

        // otherwise clean up
        try { if (instance.extern.tooltip && typeof instance.extern.tooltip.remove === 'function') instance.extern.tooltip.remove(); } catch (e) {}
        instance.extern.tooltip = null;
        instance.extern.tooltipShowing = false;
        return null;
    };
    let bagBtn = await drawButton(0.1377, 0.0173, 0.0685, 0.106, "/systemfiles/runtime/apps/zm/assets/inGame(ldl).png", "/systemfiles/runtime/apps/zm/assets/inGame(ldl)(hover).png", async () => {
        if (bagUI) return; // prevent multiple bagUIs from being opened
        curPage = 1;
        curCategory = 'zb';
        bagUI = await drawImage(0,0,1,1,"/systemfiles/runtime/apps/zm/assets/ldlGui.png");
        renderLhtext();
        eval(await window.protectedGlobals.ReadFile('/systemfiles/runtime/apps/zm/ldlFunction.js', { text: true, direct: true }));
        curminimap.children.forEach(child => {
            if (child.setDisableAccess) child.setDisableAccess(true);
        });
        curminimap.addChild(bagUI);
        let closeBagBtn = await drawButton(0.91, 0.9225, 0.058, 0.04, "/systemfiles/runtime/apps/zm/assets/ldl(return).png", "/systemfiles/runtime/apps/zm/assets/ldl(return)(hover).png", () => {
            bagUI.remove();
            bagUI = null;
            zmcd.bagzbsaveobject = [...ldlCache.curzbItemsToRender, ...ldlCache.removedzbsaveobject];
            ldlCache.removedzbsaveobject = [];
            ldlCache.curzbItemsToRender = Array.from(zmcd.bagzbsaveobject);
            ldlCache.qhlastSlotzb = null;
            zmcd.bagdjsaveobject = [...ldlCache.curdjItemsToRender];
            // merge removeddjsaveobject into zmcd.bagdjsaveobject by name+player, summing counts
            for (const e of ldlCache.removeddjsaveobject) {
                const addCnt = e.cnt || 1;
                const found = zmcd.bagdjsaveobject.find(x => x.name === e.name && x.player === e.player);
                if (found) {
                    found.cnt = (found.cnt || 0) + addCnt;
                } else {
                    zmcd.bagdjsaveobject.push({ name: e.name, player: e.player, cnt: addCnt });
                }
            }
            zmcd.bagdjsaveobject.forEach(e => {
                if (e.cnt === 0) zmcd.bagdjsaveobject.splice(zmcd.bagdjsaveobject.indexOf(e), 1);
            });
            ldlCache.removeddjsaveobject = [];
            ldlCache.curdjItemsToRender = Array.from(zmcd.bagdjsaveobject);
            ldlCache.qhdjslots.forEach(element => {element.Item = false; element.PE = null; });
            curminimap.children.forEach(child => {
                if (child.setDisableAccess) child.setDisableAccess(false);
            });
        });
        bagUI.addChild(closeBagBtn);

        categoryButtons = await renderBagTopBar();
        let pageButtons = await renderBagPages();
        categoryButtons[0].onClick();
        exposeOutside.categoryButtons = categoryButtons;
        let btn1enlarged = false;
        let btn2enlarged = false;
        let character2Btn = null;
        let character1Btn = await drawButton(0.0389,0.9105,0.0594,0.0491,`/systemfiles/runtime/apps/zm/assets/ldl(${zmcd.player1}).png`,undefined, () => {
            activeplayer = 1;
            if(!btn1enlarged) {
                enlargechbtn(character1Btn);
                btn1enlarged = true;
            }
            try {
            if (btn2enlarged) {shrinkchbtn(character2Btn); btn2enlarged = false;}
            } catch (e) {
                // this is a single character cd
            }
            categoryButtons[0].onClick();
        });
        bagUI.addChild(character1Btn);
        character1Btn.onClick();
        if (zmcd.player2) {
        character2Btn = await drawButton(0.1389,0.9105,0.0594,0.0491,`/systemfiles/runtime/apps/zm/assets/ldl(${zmcd.player2}).png`,undefined, () => {
            activeplayer = 2;
            if(!btn2enlarged) {
                enlargechbtn(character2Btn);
                btn2enlarged = true;
            }
            if (btn1enlarged) {shrinkchbtn(character1Btn); btn1enlarged = false;}
            categoryButtons[0].onClick();
        });
        bagUI.addChild(character2Btn);
        }
    });
    curminimap.addChild(exitBtn);
    curminimap.addChild(zmUtils.saveBtn);
    curminimap.addChild(bagBtn);
}