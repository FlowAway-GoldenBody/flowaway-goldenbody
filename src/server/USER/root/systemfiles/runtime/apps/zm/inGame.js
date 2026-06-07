async function continueInGame(zmcd, cdIndex) {
    let bagInfo = {};
    let curCategory = "zb";
    let curPage = 1;
    let activeplayer = 1;
    let tooltipshown = false; // flag to track if tooltip is currently shown

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
    }
    async function renderBagItems(category, pageNum = 1) {
        // clear existing items
        let existingItems = bagUI.children.filter(child => child.isItem);
        existingItems.forEach(item => item.remove());
        // render items for the selected category
        let itemsToRender = zmcd[`bag${category}saveobject`] || [];
        // render empty slots for the current page
        let yindex = 0;
        let startSlot = (pageNum - 1) * 25;
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
            if (slot.player !== activeplayer) continue;
            let itemImg = "/systemfiles/runtime/apps/zm/assets/" + category + "/" + slot.name + ".png";
            let item = await drawButton(0.55 + (renderedCount % 5) * 0.06, 0.6421 - yindex * 0.095, 0.05, 0.07, itemImg, undefined, 
            () => {
                // handle item click (e.g. show item details, equip item, etc.)
            }, 
            1, // zindex
            {onHover: () => {    
                // handle item hover (e.g. show tooltip with item name)
                if (tooltipshown) return; // if tooltip is already displayed, do nothing
                tooltipshown = true;
                let h = item.y-0.42+item.height;
                if (h < 0) h = 0; // if tooltip would go above the screen, align it to the top of the screen instead
                window.zmGlobals.displayItemTooltip(slot, item.x + item.width, h); // show tooltip at center of item
            },
            onHoverEnd: () => {
                // handle hover out (e.g. hide tooltip)
                tooltipshown = false;
                if (instance.extern.tooltip) {
                    instance.extern.tooltip.remove();
                    instance.extern.tooltip = null;
                }
            }});
            bagUI.addChild(item);
            item.isItem = true; // mark as item so we can easily remove later
            renderedCount++;
            if (renderedCount % 5 === 0) yindex++; // move to next row after every 5 items
        }

    }
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
                renderBagItems(curCategory, pageNum);
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
                renderBagItems(cat, curPage);
                curCategory = cat;
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

    curminimap = await drawImage(0, 0, 1, 1, "/systemfiles/runtime/apps/zm/assets/minimap(overworld).png", 10);
    let saveBtn = await drawButton(0.0013, 0.0096, 0.0675, 0.117, "/systemfiles/runtime/apps/zm/assets/saveGame.png", "/systemfiles/runtime/apps/zm/assets/saveGame(hover).png", async () => {
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
        }
    });
    let exitBtn = await drawButton(0.48, 0.0117, 0.0685, 0.106, "/systemfiles/runtime/apps/zm/assets/inGame(exit).png", "/systemfiles/runtime/apps/zm/assets/inGame(exit)(hover).png", () => {
        lobby.mainimg.setVisible(true);
        curminimap.remove();
    });
    let bagUI = null;
    instance.extern = {};
instance.extern.tooltip = null; // store the currently displayed tooltip so we can remove it when needed
window.zmGlobals.displayItemTooltip = async function(itemData, posX, posY) {
    if (instance.extern.tooltip) {return;} // if tooltip is already displayed, do nothing
    instance.extern.tooltip = await drawScaleableImage('/systemfiles/runtime/apps/zm/assets/zb/itemTooltip.png', 0.1, { x: posX, y: posY, width: 0.2, height: 0.42 });
    bagUI.addChild(instance.extern.tooltip);
    let itemName = await drawText(itemData.name);
    itemName.setRelativePos(0.5, 0.1, 0.9, 0.2); // position text at top center of tooltip
    instance.extern.tooltip.addChild(itemName);
    // add more item details to the tooltip as needed (e.g. stats, description, etc.)
    return instance.extern.tooltip;
};
    let bagBtn = await drawButton(0.1377, 0.0173, 0.0685, 0.106, "/systemfiles/runtime/apps/zm/assets/inGame(ldl).png", "/systemfiles/runtime/apps/zm/assets/inGame(ldl)(hover).png", async () => {
        if (bagUI) return; // prevent multiple bagUIs from being opened
        bagUI = await drawImage(0,0,1,1,"/systemfiles/runtime/apps/zm/assets/ldlGui.png");
        curminimap.children.forEach(child => {
            if (child.setDisableAccess) child.setDisableAccess(true);
        });
        curminimap.addChild(bagUI);
        let closeBagBtn = await drawButton(0.91, 0.9225, 0.058, 0.04, "/systemfiles/runtime/apps/zm/assets/ldl(return).png", "/systemfiles/runtime/apps/zm/assets/ldl(return)(hover).png", () => {
            bagUI.remove();
            bagUI = null;
            curminimap.children.forEach(child => {
                if (child.setDisableAccess) child.setDisableAccess(false);
            });
        });
        bagUI.addChild(closeBagBtn);

        let categoryButtons = await renderBagTopBar();
        let pageButtons = await renderBagPages();
        pageButtons[0].onClick();
        categoryButtons[0].onClick();
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
    curminimap.addChild(saveBtn);
    curminimap.addChild(bagBtn);
}