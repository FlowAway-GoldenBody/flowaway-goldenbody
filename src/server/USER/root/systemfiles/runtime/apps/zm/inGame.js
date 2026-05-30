async function continueInGame(zmcd, cdIndex) {
    console.log('this is used to trace the vmxxxxx files so its able to debug')
    // functions
    function clearOtherCategoryButtons(buttons, activeBtn) {
        buttons.forEach(btn => {
            if (btn !== activeBtn) {
                btn.setImage(btn.defaultImage);
            }
        });
    }
    async function renderBagTopBar() {
        // draw the category buttons
        let categories = ["zb", "dj", "sz", "js"];
        let categoryButtons = [];
        // write everything below in a for loop that iterates through the categories array and creates a button for each category, and adds it to the bagUI
        for (let index = 0; index < categories.length; index++) {
            let cat = categories[index];
            // place category buttons next to each other with small gap
            const baseX = 0.5508;
            const gap = 0.005;
            const btnW = 0.0697;
            const xPos = baseX + index * (btnW + gap);
            let btn = await drawButton(xPos, 0.7583, btnW, 0.0407, `/systemfiles/runtime/apps/zm/assets/zb(cat)(${cat}).png`, `/systemfiles/runtime/apps/zm/assets/zb(cat)(${cat})(hover).png`, () => {
                // handle category button click
                btn.defaultImage = `/systemfiles/runtime/apps/zm/assets/zb(cat)(${cat}).png`;
                btn.setImage(`/systemfiles/runtime/apps/zm/assets/zb(cat)(${cat})(hover).png`);
                clearOtherCategoryButtons(categoryButtons, btn);
            });
            categoryButtons.push(btn);
            bagUI.addChild(btn);
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
    let bagBtn = await drawButton(0.1377, 0.0173, 0.0685, 0.106, "/systemfiles/runtime/apps/zm/assets/inGame(ldl).png", "/systemfiles/runtime/apps/zm/assets/inGame(ldl)(hover).png", async () => {
        bagUI = await drawImage(0,0,1,1,"/systemfiles/runtime/apps/zm/assets/ldlGui.png");
        curminimap.addChild(bagUI);
        let closeBagBtn = await drawButton(0.91, 0.9225, 0.058, 0.04, "/systemfiles/runtime/apps/zm/assets/ldl(return).png", "/systemfiles/runtime/apps/zm/assets/ldl(return)(hover).png", () => {
            bagUI.remove();
        });
        bagUI.addChild(closeBagBtn);

        let categoryButtons = await renderBagTopBar();
        categoryButtons[0].onClick();
        let btn1enlarged = false;
        let btn2enlarged = false;
        let character2Btn = null;
        let character1Btn = await drawButton(0.0389,0.9105,0.0594,0.0491,`/systemfiles/runtime/apps/zm/assets/ldl(${zmcd.player1}).png`,undefined, () => {
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