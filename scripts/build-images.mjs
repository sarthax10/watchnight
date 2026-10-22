// Builds the site's images from the game's own renders (D:/GameDev-Tools/site_src, made by the game:
// main_menu.tscn --bare --shot, and the trailer film shots) into public/img:
//   * the estate stills: AVIF + WebP at 640/1280/1920/2560 wide (the <picture> srcsets), and a tiny
//     blurred WebP placeholder per still (inlined as a background while the real one loads);
//   * the gallery's close-ups of the garden, the same sizes; the oak upright (9:16) for phones;
//   * the guests' pixel portraits and their eye layers: lossless PNG, drawn pixelated by CSS.
import sharp from 'sharp'
import { mkdirSync, readdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'D:/GameDev-Tools/site_src/graded'   // (graded key art: scripts/grade.py)
const HUD = '../games/watchnight/assets/hud'
const OUT = 'public/img'
mkdirSync(OUT, { recursive: true })

const estates = ['garden_day', 'garden_gold', 'garden_night']
const placeholders = {}
for (const name of estates) {
  const src = sharp(join(SRC, `${name}.png`))
  for (const w of [640, 1280, 1920, 2560]) {
    await src.clone().resize({ width: w }).avif({ quality: 52, effort: 6 }).toFile(join(OUT, `${name}-${w}.avif`))
    await src.clone().resize({ width: w }).webp({ quality: 78 }).toFile(join(OUT, `${name}-${w}.webp`))
  }
  const tiny = await src.clone().resize({ width: 24 }).blur(1).webp({ quality: 40 }).toBuffer()
  placeholders[name] = `data:image/webp;base64,${tiny.toString('base64')}`
  console.log('estate', name)
}

// the hero on a phone: the garden at night, framed upright (1080x1920)
for (const name of ['gardenP_night', 'gardenP_gold']) {
  const src = sharp(join(SRC, `${name}.png`))
  for (const w of [540, 1080]) {
    await src.clone().resize({ width: w }).avif({ quality: 52, effort: 6 }).toFile(join(OUT, `${name}-${w}.avif`))
    await src.clone().resize({ width: w }).webp({ quality: 78 }).toFile(join(OUT, `${name}-${w}.webp`))
  }
  console.log('portrait', name)
}

// the gallery: close-ups of the garden (16:9), and the oak upright for the hero on a phone
for (const name of ['cu_oak_night', 'cu_oak_gold', 'cu_arch_night', 'cu_beds_day', 'cu_bath_gold']) {
  const src = sharp(join(SRC, `${name}.png`))
  for (const w of [640, 1280, 1920, 2560]) {
    await src.clone().resize({ width: w }).avif({ quality: 52, effort: 6 }).toFile(join(OUT, `${name}-${w}.avif`))
    await src.clone().resize({ width: w }).webp({ quality: 78 }).toFile(join(OUT, `${name}-${w}.webp`))
  }
  const tiny = await src.clone().resize({ width: 24 }).blur(1).webp({ quality: 40 }).toBuffer()
  placeholders[name] = `data:image/webp;base64,${tiny.toString('base64')}`
  console.log('close-up', name)
}
{
  const src = sharp(join(SRC, 'cuP_oak_night.png'))
  for (const w of [540, 1080]) {
    await src.clone().resize({ width: w }).avif({ quality: 52, effort: 6 }).toFile(join(OUT, `cuP_oak_night-${w}.avif`))
    await src.clone().resize({ width: w }).webp({ quality: 78 }).toFile(join(OUT, `cuP_oak_night-${w}.webp`))
  }
}

// the gallery's rooms (scripts/grade_rooms.py): cropped to what is lit, up to 1920 wide
for (const name of ['rm_court_snow', 'rm_graveyard_night', 'rm_hall_day', 'rm_hall_night', 'rm_kitchen_day', 'rm_parlour_night', 'rm_shop_day', 'rm_chapel_night']) {
  const src = sharp(join(SRC, `${name}.png`))
  for (const w of [640, 1280, 1920]) {
    await src.clone().resize({ width: w }).avif({ quality: 54, effort: 6 }).toFile(join(OUT, `${name}-${w}.avif`))
    await src.clone().resize({ width: w }).webp({ quality: 80 }).toFile(join(OUT, `${name}-${w}.webp`))
  }
  console.log('room', name)
}

mkdirSync(join(OUT, 'guests'), { recursive: true })
for (const f of readdirSync(HUD).filter((f) => /^hud_portrait_[a-z]+(_eyes)?\.png$/.test(f))) {
  copyFileSync(join(HUD, f), join(OUT, 'guests', f.replace('hud_portrait_', '')))
}
writeFileSync('src/placeholders.json', JSON.stringify(placeholders, null, 1))
console.log('done')
