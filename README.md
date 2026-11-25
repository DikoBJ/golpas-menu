# Гол+Пас menu

## Files

index.html    the page structure, plus templates for a section, a dish and a price row
styles.css    all the design, with comments for each part
app.js        loads menu.json and draws the page
menu.json     all menus, dishes, prices and texts
images/       dish photos

You edit menu.json for content, index.html for structure and styles.css for looks.
You almost never need to open app.js.

## Run it

The page loads menu.json, so it needs a web server. Double clicking index.html will not work.
In this folder run:

    python3 -m http.server 8000

Then open http://localhost:8000

To put it online, upload the whole folder to any hosting (Netlify, Vercel, GitHub Pages, your own site).

## How menu.json is built

settings    markup, step, currency, default language
languages   the language buttons
ui          title, notes, badges, units and labels
menus       the menus (Main, Bar). Each has sections, each section has dishes

## Change all prices

Open menu.json and change settings.markup. 1.3 means 30% more. 1.2 means 20% more.
settings.step rounds prices. 50 means the nearest 50 tenge.
Every dish keeps its original price in basePrice. Do not change those.

## Add a dish

Add this to the items list of a section:

    {
      "name": { "ru": "...", "kk": "...", "en": "..." },
      "description": { "ru": "...", "kk": "...", "en": "..." },
      "basePrice": 2000
    }

description is optional.
"note": "per100" shows "price per 100 g". "note": "until15" shows "served until 15.00".
"tag": "new" or "tag": "hot" shows a small badge.
"basePriceRange": [5000, 9000] adds a price range to the name.

## A dish with several prices (sizes, glass and bottle)

Use variants instead of basePrice:

    "variants": [
      { "label": "0,5 {l}", "basePrice": 1500 },
      { "label": "3 {l}", "basePrice": 8700 }
    ]

{l} turns into л, л or l depending on the language. {g} works the same for grams.
"label": "glass" and "label": "bottle" are ready made names in ui.labels.
You can also write a label in every language: { "ru": "...", "kk": "...", "en": "..." }

## Add a photo

Put the image in images/ and add this to the dish:

    "photo": "images/steak.jpg"

## Add a section or a menu

A section goes into menus > sections: an id, a title in every language and a list of items.
A new menu (for example the banquet menu) goes into menus: an id, a title and its sections.
Menu tabs appear at the top when there is more than one menu.

## Add a language

1. Add it to languages in menu.json, for example { "code": "zh", "label": "中文" }.
2. Add that code next to ru, kk and en in every text.
If a translation is missing, the Russian text is shown.

## Change colors, fonts and sizes

Open styles.css. Part 1 at the top has all colors, fonts and sizes with names.
There is a light and a dark version of the colors.

## Change how a dish looks

The HTML of a dish is the template with id "tpl-dish" in index.html.
Each part has a class like dish__name or dish__price, and the same class in styles.css.
