from pathlib import Path
import re

PAGE = Path('app/page.tsx')
CSS = Path('app/globals.css')
TEST = Path('tests/rendered-html.test.mjs')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'Missing expected block: {label}')
    return text.replace(old, new, 1)


page = PAGE.read_text(encoding='utf-8')
if 'id="social-proof"' not in page:
    page = replace_once(
        page,
        'import { PortfolioController } from "../components/PortfolioController";',
        'import { PortfolioController } from "../components/PortfolioController";\nimport { ProjectPicture } from "../components/ProjectPicture";',
        'ProjectPicture import',
    )
    page = replace_once(page, '["numbers", "perspectiva", "numbers"],', '["social-proof-scene", "validació social", "social-proof"],', 'scene definition')
    page = replace_once(page, '["perspectiva", 5],', '["validació social", 5],', 'navigation definition')

    page, count = re.subn(r'^const roles = \[.*?^\];\n', '', page, count=1, flags=re.MULTILINE | re.DOTALL)
    if count != 1:
        raise RuntimeError(f'roles removal count: {count}')
    page, count = re.subn(r'^const stats:.*?^\];\n', '', page, count=1, flags=re.MULTILINE | re.DOTALL)
    if count != 1:
        raise RuntimeError(f'stats removal count: {count}')

    page = replace_once(page, '<div className="orbit-copy orbit-copy-a">DESORDEN ✦ DESORDEN ✦ DESORDEN ✦</div>', '<div className="orbit-copy orbit-copy-a">DESCOBRIR • ORDENAR • DENOTAR •</div>', 'orbit A')
    page = replace_once(page, '<div className="orbit-copy orbit-copy-b">AGÈNCIA ✦ AGÈNCIA ✦ AGÈNCIA ✦</div>', '<div className="orbit-copy orbit-copy-b">DESCOBRIR • ORDENAR • DENOTAR •</div>', 'orbit B')

    hero_pattern = re.compile(r'''<ul className="roles">.*?</ul>\s*</header>\s*<ImagePlaceholder number="01" className="hero-placeholder" label="Retrat principal de l'agència DESORDEN" />''', re.DOTALL)
    hero_replacement = '''<ul className="hero-services" aria-label="Proposta de valor de DESORDEN">
                <li>✦ Contingut visual per a xarxes socials</li>
                <li>✦ Vídeo amb IA per visibilitzar marques i comerços</li>
                <li>✦ Creació d&apos;una identitat visual coherent</li>
              </ul>
            </header>
            <ProjectPicture
              file="media/hero/portada-chico-bn.webp"
              alt="Perfil en blanc i negre del creador i director de DESORDEN"
              width={768}
              height={1028}
              className="hero-picture"
              sizes="(max-width: 760px) 82vw, 460px"
              eager
            />'''
    page, count = hero_pattern.subn(hero_replacement, page, count=1)
    if count != 1:
        raise RuntimeError(f'hero replacement count: {count}')

    page, count = re.subn(
        r'export default function Home\(\) \{\n  const verifiedStats = .*?\n\n  return \(',
        'export default function Home() {\n  return (',
        page,
        count=1,
        flags=re.DOTALL,
    )
    if count != 1:
        raise RuntimeError(f'numbers JSON-LD removal count: {count}')

    social_scene = '''        <SceneFrame index={5} name="social-proof" label="validació social">
          <section id="social-proof" className="social-proof" aria-labelledby="social-proof-title">
            <header className="social-proof__heading">
              <p className="social-proof__eyebrow">SOCIAL PROOF</p>
              <h2 id="social-proof-title">Validat per referents del sector</h2>
              <p className="social-proof__description">Peces audiovisuals que trenquen l&apos;scroll i generen interaccions reals.</p>
            </header>
            <div className="social-proof__grid">
              <article className="social-notification" aria-label="Interacció de Rosalía">
                <img className="social-notification__avatar" src="/media/social-proof/rosalia.webp" alt="Foto de perfil de @rosalia.vt" width="52" height="52" loading="lazy" decoding="async" />
                <div className="social-notification__content"><strong>@rosalia.vt</strong><p>Ha interactuat amb tu per missatge directe <span>(Partida guanyada 7-6 🎾).</span></p></div>
              </article>
              <article className="social-notification" aria-label="Interacció de Rozalén">
                <img className="social-notification__avatar" src="/media/social-proof/rozalen.webp" alt="Foto de perfil de @rozalenmusic" width="52" height="52" loading="lazy" decoding="async" />
                <div className="social-notification__content"><strong>@rozalenmusic</strong><p>Ha compartit i comentat el teu reel: <span>“😂😂😂😂😂😂”.</span></p></div>
              </article>
              <article className="social-notification" aria-label="Interacció de Leire">
                <img className="social-notification__avatar" src="/media/social-proof/leire.webp" alt="Foto de perfil de @leiremo_oficial" width="52" height="52" loading="lazy" decoding="async" />
                <div className="social-notification__content"><strong>@leiremo_oficial</strong><p>Ha reaccionat a la teva publicació <span aria-hidden="true">❤️</span>.</p></div>
              </article>
            </div>
          </section>
        </SceneFrame>'''
    scene_pattern = re.compile(r'        <SceneFrame index=\{5\} name="numbers" label="perspectiva">.*?        </SceneFrame>(?=\n\n        <SceneFrame index=\{6\})', re.DOTALL)
    page, count = scene_pattern.subn(social_scene, page, count=1)
    if count != 1:
        raise RuntimeError(f'social scene replacement count: {count}')

    PAGE.write_text(page, encoding='utf-8')

marker = '/* DESORDEN VISUAL UPDATE — START */'
css = CSS.read_text(encoding='utf-8')
if marker not in css:
    css_block = r'''
/* DESORDEN VISUAL UPDATE — START */
:root{--desorden-orange:#f69504;--desorden-black:#000;--desorden-white:#f5f5f5;--desorden-muted:#a3a3a3;--paper:#000;--paper-soft:#090909;--ink:#f5f5f5;--dim:rgba(245,245,245,.52);--line:rgba(245,245,245,.18)}
html,body,.site-shell,.cosmos{background:#000}.orbit-copy{font-size:clamp(28px,4.8vw,73px);-webkit-text-stroke:1px rgba(246,149,4,.24);opacity:.75}.decorative-spark{color:rgba(246,149,4,.78)}
.display-name{color:var(--desorden-orange);font-size:clamp(68px,10vw,150px)}.outline-word{-webkit-text-stroke-color:rgba(245,245,245,.92)}.micro-label,.eyebrow{color:var(--desorden-orange)}
.progress-rail{background:rgba(245,245,245,.22)}.progress-rail i{background:var(--desorden-orange)}.section-toggle b,.section-navigation li button.active,.fixed-ui header>p{color:var(--desorden-orange)}
.pitch-copy h1{font-size:clamp(36px,4.6vw,72px)}.partners-copy h2{font-size:clamp(30px,3.5vw,54px)}.experience-panel h2,.about-panel h2,.manifesto-copy h2,.contact-copy h2{color:var(--desorden-orange)}.experience-panel h2,.about-panel h2{font-size:clamp(40px,5vw,72px)}
.intro-layout{position:relative;min-height:min(76vh,820px)}.intro-heading{position:relative;z-index:3}.hero-picture{position:relative;z-index:1;display:block;width:100%;max-width:460px;justify-self:end;overflow:hidden;background:#000}.hero-picture img{width:100%;height:min(72vh,790px);object-fit:cover;object-position:42% center;filter:contrast(1.08) brightness(.9)}
.intro-layout::after{content:"";position:absolute;z-index:2;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(0,0,0,.98) 0%,rgba(0,0,0,.9) 35%,rgba(0,0,0,.36) 67%,transparent 100%)}
.hero-services{position:relative;z-index:4;display:grid;gap:.75rem;margin:1.5rem 0 0;padding:0;list-style:none}.hero-services li{color:var(--desorden-white);font-size:clamp(1rem,3.8vw,1.35rem);font-weight:500;line-height:1.3}.hero-services li::first-letter{color:var(--desorden-orange)}
.scene-social-proof{padding:0}.social-proof{position:relative;width:100%;min-height:100svh;display:grid;align-content:center;gap:clamp(2rem,7vw,4rem);padding:clamp(5rem,12vw,8rem) clamp(1.25rem,5vw,5rem);background:var(--desorden-black);color:var(--desorden-white);overflow:hidden}.social-proof__heading{width:min(100%,850px)}.social-proof__eyebrow{margin:0 0 1rem;color:var(--desorden-orange);font-size:clamp(.72rem,2.4vw,.95rem);font-weight:700;letter-spacing:.22em;text-transform:uppercase}.social-proof__heading h2{max-width:820px;margin:0;color:var(--desorden-orange);font-size:clamp(3rem,11vw,6.5rem);font-weight:900;line-height:.92;letter-spacing:-.045em;text-wrap:balance}.social-proof__description{max-width:660px;margin:1.5rem 0 0;color:var(--desorden-muted);font-size:clamp(1.05rem,4vw,1.5rem);line-height:1.45;text-wrap:pretty}.social-proof__grid{display:grid;grid-template-columns:1fr;gap:1rem}
.social-notification{display:grid;grid-template-columns:52px minmax(0,1fr);align-items:center;gap:1rem;min-width:0;margin:0;padding:1rem;border:1px solid rgba(255,255,255,.11);border-radius:1.25rem;background:linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.015)),rgba(18,18,18,.78);box-shadow:0 16px 45px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.045);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.social-notification__avatar{width:52px;height:52px;display:block;border:2px solid rgba(246,149,4,.65);border-radius:50%;object-fit:cover;background:#171717}.social-notification__content{min-width:0}.social-notification__content strong{display:block;margin-bottom:.25rem;color:var(--desorden-white);font-size:.98rem;font-weight:750;line-height:1.2;overflow-wrap:anywhere}.social-notification__content p{margin:0;color:var(--desorden-muted);font-size:.9rem;line-height:1.4;text-wrap:pretty}.social-notification__content p span{color:var(--desorden-white)}
@media(min-width:820px){.social-proof__grid{grid-template-columns:repeat(3,minmax(0,1fr))}.social-notification{align-content:start;min-height:150px;padding:1.25rem}}
@supports not (backdrop-filter:blur(18px)){.social-notification{background:rgba(18,18,18,.96)}}
@media(max-width:760px){.orbit-copy{font-size:32px}.scene-intro{padding:64px 18px 66px}.intro-layout{display:block;width:100%;min-height:calc(100svh - 130px)}.hero-picture{position:absolute;inset:0 -18px 0 20%;width:auto;max-width:none}.hero-picture img{width:100%;height:100%;object-position:42% center}.intro-layout::after{background:linear-gradient(90deg,rgba(0,0,0,.98) 0%,rgba(0,0,0,.9) 39%,rgba(0,0,0,.38) 72%,rgba(0,0,0,.08) 100%),linear-gradient(0deg,rgba(0,0,0,.95) 0%,transparent 54%)}.intro-heading{position:absolute;left:6px;bottom:20px;width:min(82vw,440px);margin:0}.outline-word{font-size:clamp(27px,7vw,38px)}.display-name{font-size:clamp(58px,18vw,86px)}.intro-heading .micro-label{margin:10px 0 14px}.hero-services{gap:.55rem;margin-top:1rem}.hero-services li{font-size:clamp(.9rem,3.7vw,1.08rem)}.social-proof{gap:1.5rem;padding:5rem 2.4rem 4.5rem 1.25rem}.social-proof__heading h2{font-size:clamp(2.5rem,11vw,4rem)}.social-proof__description{font-size:1rem;margin-top:1rem}}
@media(prefers-reduced-motion:reduce){.social-notification{transition:none}}
/* DESORDEN VISUAL UPDATE — END */
'''
    CSS.write_text(css.rstrip() + '\n\n' + css_block.strip() + '\n', encoding='utf-8')

tests = TEST.read_text(encoding='utf-8')
old_assertions = '''  assert.match(page, /QuantitativeValue/);
  assert.match(page, /itemType="https:\/\/schema\.org\/ItemList"/);'''
new_assertions = '''  assert.match(page, /id="social-proof"/);
  assert.equal((page.match(/className="social-notification"/g) ?? []).length, 3);
  assert.match(page, /\/media\/social-proof\/rosalia\.webp/);
  assert.match(page, /media\/hero\/portada-chico-bn\.webp/);'''
if old_assertions in tests:
    tests = tests.replace(old_assertions, new_assertions, 1)
elif 'className="social-notification"' not in tests:
    raise RuntimeError('Legacy test assertions were not found')
TEST.write_text(tests, encoding='utf-8')
