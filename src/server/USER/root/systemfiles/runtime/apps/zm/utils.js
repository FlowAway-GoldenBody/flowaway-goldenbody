zbUtils.lookupTitle = (name) => {
    switch(name) {
        case 'ptdyyc':
            return {result: "普通的月牙铲", color: "white", width: 0.2, height: 0.2, description: "普通的沙沙武器", fromWho: "1"};
        case 'ptdxzg':
            return {result: "普通的行者棍", color: "white"};
        case 'ptddp':
            return {result: "普通的钉耙", color: "white"};
        case 'ptdcc':
            return {result: "普通的禅杖", color: "white"};
    }
}
zbUtils.renderStats = async (obj) => {
    const explicitSize = 0.025;
    const explicitFamily = "InfoFont";
    if (obj.attack) {
    let itemName = await drawText(
        "攻击: " + obj.attack,
        explicitSize,
        "orange",
        explicitFamily,
        "left",
        1,
        { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: explicitFamily }
    );
    itemName.setRelativePos(0.14, 0.5, 0.9, 0.2); // position text at top center of tooltip
    instance.extern.tooltip.addChild(itemName);
    }
}