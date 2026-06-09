// in JSON code name to display text
zbUtils.comparelist2 = [
    'rarity',
    'fromWho',
    'type',
    "description"
]
zbUtils.comparelist = [
    'level',
    'ROC',
    "wx",
    "HP",
    "MP",
    "attack",
    "defense",
    "CHC",
    "MISS",
    "HPHeal",
    "MPHeal",
    "gainHPfromEntity",
    "defense2"
]
zbUtils.lookupStats = (name, displaypos, itemObj) => {
    displaypos.X = displaypos.x;
    displaypos.Y = displaypos.y;
    let baseY = displaypos.Y + 0.015;
    let wordMove = 0.04;
    switch(name) {
        case 'ptdyyc':
            let resultObj = {result: "普通的月牙铲", color: "white", width: 0.18, height: 0, description: "普通的沙沙武器", fromWho: "沙僧", rarity: "普通", type: "武器"}
            let dy = 0;
            zbUtils.comparelist.forEach(description => {
                if (itemObj[description]) dy++;
            });
            zbUtils.comparelist2.forEach(description => {
                if (resultObj[description]) dy++;
            });
            let calcH = wordMove * dy + 0.02; // 0.02 is the margin
            resultObj.height = calcH;
            return resultObj;
        case 'ptdxzg':
            return {result: "普通的行者棍", color: "white"};
        case 'ptddp':
            return {result: "普通的钉耙", color: "white"};
        case 'ptdcc':
            return {result: "普通的禅杖", color: "white"};
    }
}

zbUtils.getWx = (num) => {
    if (num === 0) return "金";
    else if (num === 1) return "木";
    else if (num === 2) return "水";
    else if (num === 3) return "火";
    else if (num === 4) return "土";
    else return {error: "invalid num"}
}


// item stats
zbUtils.renderStats = async (obj, displayobj, displaypos = {X: 0, Y: 0}) => {
    displaypos.X = displaypos.x;
    displaypos.Y = displaypos.y;
    let dy = 0;
    let baseX = displaypos.X + 0.075;
    let baseY = displaypos.Y + 0.015;
    let wordMove = 0.04;
    const explicitSize = 0.025;
    const explicitFamily = "InfoFont";


    let itemName = await drawText(
        displayobj.result || "",
        explicitSize,
        displayobj.color,
        explicitFamily,
        "left",
        1,
        { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
    );
    itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
    instance.extern.tooltip.addChild(itemName);


    if (displayobj.rarity) {
        dy++;
        let itemName = await drawText(
            "品质: " + displayobj.rarity,
            explicitSize,
            "cyan",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
    let firstRun = false;
    if (displayobj.fromWho) {
        firstRun = true;
        dy++;
        let itemName = await drawText(
            "类型: " + displayobj.type + "·" + displayobj.fromWho,
            explicitSize,
            "cyan",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
    if (displayobj.type && !firstRun) {
        dy++;
        let itemName = await drawText(
            "类型: " + displayobj.type,
            explicitSize,
            "cyan",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
    if (obj.level) {
        dy++;
        let itemName = await drawText(
            "等级: " + obj.level,
            explicitSize,
            "cyan",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
    if (obj.ROC) {
        dy++;
        let itemName = await drawText(
            "成长率: " + obj.ROC,
            explicitSize,
            "cyan",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
    if (obj.wx) {
        dy++;
        let cnt = 0;
        let result = "";
        for (const individualwx of obj.wx) {
            if (individualwx) result += zbUtils.getWx(cnt);
            cnt++;
        }
        let itemName = await drawText(
            "五行: " + result,
            explicitSize,
            "cyan",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }













    if (obj.HP) {
        dy++;
        let itemName = await drawText(
            "生命: " + obj.HP,
            explicitSize,
            "orange",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
    if (obj.MP) {
        dy++;
        let itemName = await drawText(
            "魔法: " + obj.MP,
            explicitSize,
            "orange",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
    if (obj.attack) {
        dy++;
        let itemName = await drawText(
            "攻击: " + obj.attack,
            explicitSize,
            "orange",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
    if (obj.defense) {
        dy++;
        let itemName = await drawText(
            "防御: " + obj.defense,
            explicitSize,
            "orange",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
    if (obj.CHC) {
        dy++;
        let itemName = await drawText(
            "暴击: " + obj.CHC * 100 + '%',
            explicitSize,
            "orange",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
    if (obj.MISS) {
        dy++;
        let itemName = await drawText(
            "闪避: " + obj.MISS * 100 + '%',
            explicitSize,
            "orange",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
    if (obj.HPHeal) {
        dy++;
        let itemName = await drawText(
            "回血: " + obj.HPHeal,
            explicitSize,
            "orange",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
    if (obj.MPHeal) {
        dy++;
        let itemName = await drawText(
            "回魔: " + obj.MPHeal,
            explicitSize,
            "orange",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
    if (obj.gainHPfromEntity) {
        dy++;
        let itemName = await drawText(
            "吸血: " + obj.gainHPfromEntity * 100 + '%',
            explicitSize,
            "orange",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
    if (obj.defense2) {
        dy++;
        let itemName = await drawText(
            "魔抗: " + obj.defense2 * 100 + '%',
            explicitSize,
            "orange",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
    if (obj.description) {
        dy++;
        let itemName = await drawText(
            obj.description,
            explicitSize,
            "orange",
            explicitFamily,
            "left",
            1,
            { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
        );
        itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
        instance.extern.tooltip.addChild(itemName);
    }
}