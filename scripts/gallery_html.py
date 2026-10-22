"""Writes the gallery section of index.html: the house's pictures hung along a corridor.

    python scripts/gallery_html.py
"""
import re

# kind, image name, title, the plaque's line, alt text, shape (wide / reg / tall), object-position, vertical offset (vh)
ITEMS = [
    ('image', 'garden_gold', 'The walled garden', 'Late afternoon, the beds watered', 'The walled garden in golden evening light, long shadows across the lawns and the old oak at its heart.', 'wide', '80% 30%', -5),
    ('image', 'cu_beds_day', 'The kitchen beds', 'Morning, before the gardener comes', 'Raised vegetable beds and clipped hedges on a bright morning.', 'reg', '50% 50%', 7),
    ('image', 'rm_kitchen_day', 'The kitchen', 'Where the cook waits on the gardener', 'The manor kitchen by day: a checked floor, a worktable, the range, and the cook at the counter.', 'wide', '50% 50%', -2),
    ('image', 'rm_shop_day', "Abel's shop", 'Merit, spent on candles and bolts', 'Abel behind the counter of the Merit Shop, shelves of jars and boxes lit around him.', 'tall', '42% 50%', 6),
    ('image', 'rm_hall_day', 'The Great Hall', 'The long table, laid for the Vigil', 'The Great Hall at midday: green walls, a stone fireplace, and the long table set with plates.', 'wide', '50% 50%', -6),
    ('video', 'garden_night', 'Rain over the garden', 'A moving picture', 'The camera hangs over the night garden as rain falls past the lamps.', 'wide', '50% 50%', 4),
    ('image', 'rm_parlour_night', 'The parlour', 'After the Vigil, by the fire', 'The parlour at night, lit by the fire and a candelabra on the table.', 'reg', '50% 50%', -4),
    ('image', 'rm_hall_night', 'The Great Hall, after dark', 'Someone is still up', 'The Great Hall at night, the fire burning low, one figure crossing the floor.', 'reg', '40% 50%', 7),
    ('image', 'rm_chapel_night', 'The chapel', 'Candles lit, for those who pray', 'The chapel at night: pews lit by candles and the altar beyond.', 'tall', '30% 50%', -5),
    ('image', 'cu_arch_night', 'The rose arch', 'The garden gate, past curfew', 'The rose arch and the iron gate at night, lamps lit along the hedges.', 'reg', '50% 50%', 5),
    ('video', 'oak_night', 'The oak', 'A moving picture: it is awake', 'A slow drift toward the old oak at night, its two red eyes lit, rain over the lamps.', 'wide', '50% 50%', -2),
    ('image', 'cu_oak_night', 'Its eyes', 'Past midnight', 'A close view of the oak at night, red eyes glowing in the trunk.', 'tall', '50% 45%', 6),
    ('image', 'rm_court_snow', 'A night of snow', 'About one night in four', 'The garden at night under falling snow, the oak awake at its centre.', 'wide', '55% 50%', -4),
    ('image', 'rm_graveyard_night', 'The churchyard', 'Fog, rain, and the ones who stayed', 'The churchyard at night in fog and rain, pale figures standing among the graves.', 'wide', '50% 50%', 3),
    ('image', 'garden_night', 'The garden, from the wall', 'The whole of it, at night', 'The walled garden at night from above: pale paths, lamps, and the oak at its heart.', 'reg', '72% 40%', -3),
]


def pic(name, alt, pos):
    ws = [640, 1280, 1920]
    a = ', '.join(f'/img/{name}-{w}.avif {w}w' for w in ws)
    b = ', '.join(f'/img/{name}-{w}.webp {w}w' for w in ws)
    sizes = '(max-width: 800px) 85vw, 50vw'
    return (f'<picture><source type="image/avif" srcset="{a}" sizes="{sizes}">'
            f'<img class="tile-img" src="/img/{name}-1280.webp" srcset="{b}" sizes="{sizes}" alt="{alt}" style="object-position:{pos}" loading="lazy" decoding="async"></picture>')


items = []
for i, (kind, name, title, line, alt, shape, pos, y) in enumerate(ITEMS):
    if kind == 'video':
        media = (f'<img class="tile-img" src="/video/{name}.webp" alt="{alt}" style="object-position:{pos}" loading="lazy" decoding="async">'
                 f'<video class="tile-film" data-film="/video/{name}.mp4" muted loop playsinline preload="none" aria-hidden="true"></video>')
        data = f'data-kind="video" data-src="/video/{name}.mp4" data-poster="/video/{name}.webp"'
        label, verb = 'play', 'Play'
    else:
        media = pic(name, alt, pos)
        data = f'data-kind="image" data-src="{name}"'
        label, verb = 'look closer', 'Open'
    items.append(f'''        <li class="hang hang-{shape}" style="--y:{y}vh">
          <button class="tile-btn" type="button" {data} data-caption="{title}. {line}." data-alt="{alt}" data-cursor="{label}" aria-label="{verb}: {title}, {line}">
            <span class="hang-lamp" aria-hidden="true"></span>
            <span class="hang-frame"><span class="tile-media">{media}</span></span>
          </button>
          <p class="plaque"><span class="plaque-no">{i + 1:02d}</span><strong>{title}</strong><span>{line}</span></p>
        </li>''')

section = f'''    <!-- 6. The gallery: the house's pictures, hung along a corridor you walk with your scroll -->
    <section class="gallery" id="garden" aria-labelledby="garden-title">
      <div class="corridor" data-corridor>
        <div class="corridor-stage">
          <header class="corridor-head">
            <h2 id="garden-title" data-reveal>The house, in pictures</h2>
            <p>The garden, the rooms, the nights. Open any of them to look closer; the arrow keys walk you along.</p>
            <p class="corridor-count" aria-hidden="true"><b data-corridor-count>01</b><span>of {len(ITEMS):02d}</span></p>
          </header>
          <ul class="corridor-track" data-mosaic>
{chr(10).join(items)}
          </ul>
          <div class="corridor-bar" aria-hidden="true"><i data-corridor-bar></i></div>
        </div>
      </div>
    </section>

'''

p = 'index.html'
s = open(p, encoding='utf-8').read()
a = s.index('    <!-- 6. The gallery')
b = s.index('    <!-- 7. The house log')
s = s[:a] + section + s[b:]
s = s.replace('<a href="#garden" data-roll>Gallery</a>', '<a href="#garden" data-roll>Gallery</a>')
open(p, 'w', encoding='utf-8').write(s)
print('ok', len(ITEMS))
