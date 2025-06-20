const { Actor } = require('apify');

Actor.main(async () => {
    const input = await Actor.getInput();

    const { categoryUrl, domainCode = "it", maxProducts = 100 } = input;

    if (!categoryUrl) throw new Error("Missing categoryUrl");

    const sellerIds = new Set();

    const browser = await Actor.launchPuppeteer();
    const page = await browser.newPage();
    await page.goto(categoryUrl, { waitUntil: 'domcontentloaded' });

    let productLinks = await page.$$eval('a.a-link-normal.s-no-outline', links =>
        links.map(link => link.href)
    );

    // Limit to first N products
    productLinks = productLinks.slice(0, maxProducts);

    for (const url of productLinks) {
        try {
            const productPage = await browser.newPage();
            await productPage.goto(url, { waitUntil: 'domcontentloaded' });

            const sellerLink = await productPage.$eval('#sellerProfileTriggerId', el => el.getAttribute('href'));
            const match = sellerLink?.match(/seller=([A-Z0-9]+)/i);

            if (match && match[1]) {
                sellerIds.add(match[1]);
            }

            await productPage.close();
        } catch (err) {
            console.log(`Errore su prodotto: ${url}`, err.message);
        }
    }

    await browser.close();

    const output = Array.from(sellerIds).map(id => ({
        sellerId: id,
        domainCode
    }));

    await Actor.pushData(output);
});
