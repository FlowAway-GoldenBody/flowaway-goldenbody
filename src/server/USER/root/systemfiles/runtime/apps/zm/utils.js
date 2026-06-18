// in JSON code name to display text
console.log('utils active');
zbUtils.comparelist2 = [
    'rarity',
    'type',
    "description"
];
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
];
zbUtils.remakeNameLookup = {
    1: "一",
    2: "二",
    3: "三",
    4: "四",
    5: "五",
}








zbUtils.generateCalc = (att, displayremakelevel, remakeplsNum, displayqhlevel, qhplsNum, perc) => {
    let qhstring = "";
    if (!perc) {
        if (displayqhlevel !== 0) qhstring = "(+" + parseInt(displayqhlevel * qhplsNum * att) + ')'
        return parseInt(att + att * displayremakelevel * remakeplsNum) + qhstring
    } else {
        if (displayqhlevel !== 0) qhstring = "(+" + (parseInt(parseFloat(displayqhlevel * qhplsNum * att) * 100)) + '%' + ')';
        return parseInt((att + att * displayremakelevel * remakeplsNum) * 100) + '%' + qhstring
    }
}

zbUtils.lookupStats = (name, displaypos, itemObj) => {
    displaypos.X = displaypos.x;
    displaypos.Y = displaypos.y;
    let baseY = displaypos.Y + 0.015;
    let wordMove = 0.04;
    function calcWidth(resultObj) {
        let dy = 0;
        zbUtils.comparelist.forEach(description => {
            if (itemObj[description]) dy++;
        });
        zbUtils.comparelist2.forEach(description => {
            if (resultObj[description]) dy++;
            if (description === 'description' && resultObj[description]) { dy--; dy += resultObj[description].length }
            if (description === 'type' && resultObj[description]) dy++;
        });
        dy += 2;
        let calcH = wordMove * dy + 0.04; // 0.04 is the margin
        return calcH;
    }
    switch(name) {
        case 'ptdyyc':
            var resultObj = {result: "普通的月牙铲", color: "white", width: 0.18, height: 0, description: ["普通的沙沙武器"], fromWho: "沙僧", rarity: "普通", type: "武器"};
            var calcH = calcWidth(resultObj);
            resultObj.height = calcH;
            return resultObj;
        case 'ptdxzg':
            return {result: "普通的行者棍", color: "white"};
        case 'ptddp':
            return {result: "普通的钉耙", color: "white"};
        case 'ptdcc':
            return {result: "普通的禅杖", color: "white"};
        case 'kyz':
            var resultObj = {result: "枯叶杖", color: '#01ff00', width: 0.18, height: 0, description: ["求不得, 放不下, 梧桐化成杖, ", "孤走枯苍道."], fromWho: "唐僧", rarity: "优秀", type: "武器"};
            var calcH = calcWidth(resultObj);
            resultObj.height = calcH;
            return resultObj;
        case 'kyg':
            var resultObj = {result: "枯叶弓", color: '#01ff00', width: 0.18, height: 0, description: ["一落红, 一枯叶, 落红离弦去, ", "从此两难聚."], fromWho: "沙僧", rarity: "优秀", type: "武器"};
            var calcH = calcWidth(resultObj);
            resultObj.height = calcH;
            return resultObj;
        case 'kys':
            var resultObj = {result: "枯叶衫", color: '#01ff00', width: 0.18, height: 0, description: ["落黄昏, 三更雨, 临行密密", "缝, 离愁丝丝苦."], fromWho: "悟空", rarity: "优秀", type: "防具"};
            var calcH = calcWidth(resultObj);
            resultObj.height = calcH;
            return resultObj;
        case 'kyl':
            var resultObj = {result: "枯叶灵", color: '#01ff00', width: 0.18, height: 0, description: ["复苏: 缓慢回复少许生命."], fromWho: null, rarity: "优秀", type: "法宝"};
            var calcH = calcWidth(resultObj);
            resultObj.height = calcH;
            return resultObj;
        case '1qhs': 
            var resultObj = {result: '一级强化石', color: "white", width: 0.18, height: 0, description: ["可以在炼丹炉内", "用来强化装备, ", "提升装备的属性"], fromWho: null, rarity: "普通", type: "强化石"};
            var calcH = calcWidth(resultObj);
            resultObj.height = calcH;
            return resultObj;
        case '2qhs':
            var resultObj = {result: '二级强化石', color: "#01ff00", width: 0.18, height: 0, description: ["由3个1级强化石", "合成, 可以在炼", "丹炉里用来强化", "装备, 提升装备", "的属性. 比1级", "强化石拥有更好", "的成功率."], fromWho: null, rarity: "优秀", type: "强化石"};
            var calcH = calcWidth(resultObj);
            resultObj.height = calcH;
            return resultObj;
        case '3qhs':
            var resultObj = {result: '三级强化石', color: "blue", width: 0.18, height: 0, description: ["由3个2级强化石", "合成, 可以在炼", "丹炉里用来强化", "装备, 提升装备", "的属性. 比2级", "强化石拥有更好", "的成功率."], fromWho: null, rarity: "精良", type: "强化石"};
            var calcH = calcWidth(resultObj);
            resultObj.height = calcH;
            return resultObj;
        case '4qhs':
            var resultObj = {result: '四级强化石', color: "purple", width: 0.18, height: 0, description: ["由3个3级强化石", "合成, 可以在炼", "丹炉里用来强化", "装备, 提升装备", "的属性. 比3级", "强化石拥有更好", "的成功率."], fromWho: null, rarity: "史诗", type: "强化石"};
            var calcH = calcWidth(resultObj);
            resultObj.height = calcH;
            return resultObj;
    }
}

zbUtils.getWx = (num, channel = 0) => {
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
    let remakeString = '';
    let qhString = '';
    if (obj.remakeLevel) remakeString = zbUtils.remakeNameLookup[obj.remakeLevel] + '重';
    if (obj.qhLevel) qhString = "(" + "+" + obj.qhLevel + ")"

    let itemName = await drawText(
        remakeString + displayobj.result + qhString,
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












    let displayremakelevel = obj.remakeLevel ? obj.remakeLevel : 0;
    let displayqhlevel = obj.qhLevel ? obj.qhLevel : 0;
    let qhplsNum = 0.167;
    let remakeplsNum = 0.1

    if (obj.HP) {
        dy++;
        let itemName = await drawText(
            "生命: " + zbUtils.generateCalc(obj.HP, displayremakelevel, remakeplsNum, displayqhlevel, qhplsNum, false),
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
            "魔法: " + zbUtils.generateCalc(obj.MP, displayremakelevel, remakeplsNum, displayqhlevel, qhplsNum, false),
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
            "攻击: " + zbUtils.generateCalc(obj.attack, displayremakelevel, remakeplsNum, displayqhlevel, qhplsNum, false),
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
            "防御: " + zbUtils.generateCalc(obj.defense, displayremakelevel, remakeplsNum, displayqhlevel, qhplsNum, false),
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
            "暴击: " + zbUtils.generateCalc(obj.CHC, displayremakelevel, remakeplsNum, displayqhlevel, qhplsNum, true),
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
            "闪避: " + zbUtils.generateCalc(obj.MISS, displayremakelevel, remakeplsNum, displayqhlevel, qhplsNum, true),
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
            "回血: " + zbUtils.generateCalc(obj.HPHeal, displayremakelevel, remakeplsNum, displayqhlevel, qhplsNum, false),
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
            "回魔: " + zbUtils.generateCalc(obj.MPHeal, displayremakelevel, remakeplsNum, displayqhlevel, qhplsNum, false),
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
            "吸血: " + zbUtils.generateCalc(obj.gainHPfromEntity, displayremakelevel, remakeplsNum, displayqhlevel, qhplsNum, true),
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
            "魔抗: " + zbUtils.generateCalc(obj.defense2, displayremakelevel, remakeplsNum, displayqhlevel, qhplsNum, true),
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
    if (displayobj.description) {
        for (const description of displayobj.description) {
            dy++;
            let itemName = await drawText(
                description,
                0.0205,
                "white",
                explicitFamily,
                "left",
                1,
                { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
            );
            itemName.setPosition(baseX, baseY - wordMove * dy); // position text at top center of tooltip
            instance.extern.tooltip.addChild(itemName);
        }
    }
    dy+=2
    if (displayobj.color) {
        let lhCount;
        if (displayobj.color === 'white') lhCount = 20;
        else if (displayobj.color === "#01ff00") lhCount = 40;
        else if (displayobj.color === 'blue') lhCount = 80;
        else if (displayobj.color === 'purple') lhCount = 160;
        else if (displayobj.color === 'orange') lhCount = 320;
        else if (displayobj.color === 'gray') lhCount = 640;
        else if (displayobj.color === 'cyan') lhCount = 1280;
        let itemName = await drawText(
            "价值: " + lhCount + '灵魂',
            0.0205,
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