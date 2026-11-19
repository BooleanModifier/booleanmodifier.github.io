// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// The window size at which everything looks "right" at scale 1.
// All scaling is relative to this.
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

// Largest the logo + side bar are allowed to get. 1 = the size they have at
// BASE_WIDTH x BASE_HEIGHT. Bigger windows will not scale past this.
const MAX_SCALE_FACTOR = 1;

// Logo
const BASE_LOGO_SCALE = 1;
const BASE_MARGIN = 100;

// Side bar (the stack of clickable images above the logo)
const BASE_SIDEBAR_SCALE = 0.6; // scales the whole side bar together
const SIDEBAR_ITEM_GAP = 10;    // space between side bar items (base-size px)
// Vertical distance between the side bar and the logo (base-size px).
// Smaller = closer. Negative values pull the side bar down over the logo's
// transparent padding, which is usually what makes it look "closer".
const SIDEBAR_LOGO_OFFSET = -60;

// Shockwaves
// How long each shockwave lasts before the next one spawns somewhere new.
// Lower = more frequent. The wave finishes travelling at about radius / speed
// (1000 / 400 = 2.5), so going much below that cuts waves off early.
// The old value was 5.
const SHOCKWAVE_INTERVAL = 2.5;

// Add more side bar items here, listed top to bottom.
const SIDEBAR_ITEMS = [
    {
        image: 'images/mixSeries.png',
        url: 'https://youtube.com/playlist?list=PLOaQCxp6S4NGmNYYD0kJxc-nVlb6c3wVE&si=JyH0uw44rg8kjO7d'
    }
    // { image: 'images/another.png', url: 'https://example.com' },
];

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundAlpha: 0.5,        // must be 0–1
    backgroundColor: 0x1500ff
});

document.body.appendChild(app.view);

async function setup() {
    // -----------------------------------------------------------------------
    // Load assets
    // -----------------------------------------------------------------------
    const [
        backgroundTexture,
        logoTexture,
        displacementTexture,
        ...sidebarTextures
    ] = await Promise.all([
        PIXI.Assets.load('images/clouds2.png'),
        PIXI.Assets.load('images/logoWhite.png'),
        PIXI.Assets.load('images/noise2.jpg'),
        ...SIDEBAR_ITEMS.map(item => PIXI.Assets.load(item.image))
    ]);

    // -----------------------------------------------------------------------
    // Scene
    // -----------------------------------------------------------------------
    const container = new PIXI.Container();
    app.stage.addChild(container);

    // Background
    const backgroundImage = new PIXI.Sprite(backgroundTexture);
    backgroundImage.anchor.set(0.5);
    container.addChild(backgroundImage);

    // Logo (not part of the side bar)
    const logoSprite = new PIXI.Sprite(logoTexture);
    logoSprite.anchor.set(1, 0.7);   // right edge, 70% down is the pivot
    container.addChild(logoSprite);

    // Side bar: one container holding every item, scaled as a group.
    // Items are right-aligned (anchor 1, 0) and stacked downward in local
    // (unscaled) units, so the whole thing scales from a single number.
    const sidebar = new PIXI.Container();
    let sidebarHeight = 0;   // total unscaled height of the stack

    SIDEBAR_ITEMS.forEach((item, i) => {
        const sprite = new PIXI.Sprite(sidebarTextures[i]);
        sprite.eventMode = 'static';
        sprite.cursor = 'pointer';
        sprite.anchor.set(1, 0);
        sprite.x = 0;
        sprite.y = sidebarHeight;

        sprite.on('pointertap', () => {
            window.open(item.url, '_blank');
        });

        sidebar.addChild(sprite);
        sidebarHeight += sprite.texture.height + SIDEBAR_ITEM_GAP;
    });
    sidebarHeight -= SIDEBAR_ITEM_GAP;   // no gap after the last item

    container.addChild(sidebar);

    // -----------------------------------------------------------------------
    // Displacement + shockwave filters
    // -----------------------------------------------------------------------
    const displacementSprite = new PIXI.Sprite(displacementTexture);
    displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
    displacementSprite.scale.set(0.6);
    container.addChild(displacementSprite);

    const displacementFilter = new PIXI.DisplacementFilter(displacementSprite);

    const shockwaveFilter = new PIXI.filters.ShockwaveFilter(
        randomPoint(),
        {
            amplitude: 40,
            wavelength: 70,
            speed: 400,
            radius: 1000
        },
        0
    );

    container.filters = [displacementFilter, shockwaveFilter];

    // -----------------------------------------------------------------------
    // Layout (runs on load and on every resize)
    // -----------------------------------------------------------------------
    function layout() {
        const { width, height } = app.screen;

        // Background: centred and scaled to cover the window
        backgroundImage.x = width / 2;
        backgroundImage.y = height / 2;
        const coverScale = Math.max(
            width / backgroundTexture.width,
            height / backgroundTexture.height
        );
        backgroundImage.scale.set(coverScale);

        // Shared factor: how much the window differs from the base size
        const factor = Math.min(
            width / BASE_WIDTH,
            height / BASE_HEIGHT,
            MAX_SCALE_FACTOR
        );
        // console.log('factor', factor);   // uncomment to see the current value

        // Logo
        logoSprite.scale.set(BASE_LOGO_SCALE * factor);
        logoSprite.x = width - BASE_MARGIN * factor;
        logoSprite.y = height - BASE_MARGIN * factor;

        // Side bar: right-aligned with the logo, bottom edge just above it.
        // The logo's top edge is 70% of its height above its anchor point.
        const sidebarScale = BASE_SIDEBAR_SCALE * factor;
        const logoTop = logoSprite.y - logoSprite.height * 0.7;

        sidebar.scale.set(sidebarScale);
        sidebar.x = logoSprite.x;
        sidebar.y = logoTop - SIDEBAR_LOGO_OFFSET * factor - sidebarHeight * sidebarScale;
    }

    function randomPoint() {
        return [
            Math.random() * app.screen.width,
            Math.random() * app.screen.height
        ];
    }

    function handleResize() {
        app.renderer.resize(window.innerWidth, window.innerHeight);
        layout();
    }

    window.addEventListener('resize', handleResize);
    layout();

    // -----------------------------------------------------------------------
    // Animation loop
    // -----------------------------------------------------------------------
    app.ticker.add(() => {
        // Scroll the noise texture
        displacementSprite.x++;
        if (displacementSprite.x > displacementSprite.width) {
            displacementSprite.x = 0;
        }

        // Advance the shockwave, then respawn it somewhere new
        shockwaveFilter.time += 0.01;
        if (shockwaveFilter.time > SHOCKWAVE_INTERVAL) {
            shockwaveFilter.time = 0;
            shockwaveFilter.center = randomPoint();
        }
    });
}

setup();