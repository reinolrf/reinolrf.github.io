<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Calculadora de rebajas</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;900&family=Space+Mono:wght@400;700&display=swap');
  :root{
    --papel:#FAF7F2; --tinta:#22242C; --gris:#8A8D98; --linea:#E4E0D8;
    --rebaja:#E4372E; --rebaja-suave:#FDEAE8; --ok:#1B8A56;
  }
  *{box-sizing:border-box}
  body{
    margin:0;min-height:100vh;font-family:'Archivo',system-ui,sans-serif;color:var(--tinta);
    background:
      repeating-linear-gradient(-45deg, transparent 0 34px, rgba(228,55,46,.045) 34px 68px),
      var(--papel);
    display:flex;align-items:center;justify-content:center;padding:28px 18px;
  }
  .wrap{width:100%;max-width:860px}
  header{margin-bottom:26px}
  .eyebrow{display:inline-block;background:var(--rebaja);color:#fff;font-weight:900;font-size:12px;
    letter-spacing:.14em;padding:5px 12px;transform:rotate(-2deg);margin-bottom:12px}
  h1{margin:0;font-weight:900;font-size:clamp(28px,5vw,42px);letter-spacing:-.02em;line-height:1.05}
  header p{margin:8px 0 0;color:var(--gris);font-size:15px}

  .grid{display:grid;grid-template-columns:1fr 340px;gap:26px;align-items:start}

  /* ------- panel de entrada ------- */
  .panel{background:#fff;border:1.5px solid var(--linea);border-radius:18px;padding:26px;
    box-shadow:0 20px 40px -30px rgba(34,36,44,.35)}
  label{display:block;font-weight:700;font-size:13px;margin-bottom:9px}
  .campo{position:relative;margin-bottom:22px}
  .campo input[type=number]{
    width:100%;border:1.5px solid var(--linea);border-radius:12px;background:var(--papel);
    font-family:'Space Mono',monospace;font-size:26px;font-weight:700;color:var(--tinta);
    padding:14px 52px 14px 16px;outline:0;transition:.15s;
    -moz-appearance:textfield;
  }
  .campo input::-webkit-outer-spin-button,.campo input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  .campo input:focus{border-color:var(--rebaja);box-shadow:0 0 0 3px var(--rebaja-suave);background:#fff}
  .sufijo{position:absolute;right:16px;top:50%;transform:translateY(-50%);
    font-family:'Space Mono',monospace;font-size:20px;font-weight:700;color:var(--gris);pointer-events:none}
  input[type=range]{width:100%;accent-color:var(--rebaja);margin:6px 0 10px;cursor:pointer}
  .presets{display:flex;gap:7px;flex-wrap:wrap}
  .preset{border:1.5px solid var(--linea);background:#fff;border-radius:20px;padding:6px 13px;
    font-family:inherit;font-weight:700;font-size:13px;color:var(--tinta);cursor:pointer;transition:.13s}
  .preset:hover{border-color:var(--rebaja);color:var(--rebaja)}
  .preset.on{background:var(--rebaja);border-color:var(--rebaja);color:#fff}
  .aviso{font-size:12.5px;color:var(--gris);margin:14px 2px 0;line-height:1.5}

  /* ------- ticket ------- */
  .ticket{
    background:#fff;font-family:'Space Mono',monospace;color:var(--tinta);
    padding:26px 24px 20px;position:relative;
    filter:drop-shadow(0 18px 26px rgba(34,36,44,.18));
    /* borde dentado arriba y abajo */
    --diente:12px;
    clip-path:polygon(
      0 var(--diente), 4% 0, 8% var(--diente), 12% 0, 16% var(--diente), 20% 0, 24% var(--diente), 28% 0,
      32% var(--diente), 36% 0, 40% var(--diente), 44% 0, 48% var(--diente), 52% 0, 56% var(--diente), 60% 0,
      64% var(--diente), 68% 0, 72% var(--diente), 76% 0, 80% var(--diente), 84% 0, 88% var(--diente), 92% 0,
      96% var(--diente), 100% 0,
      100% calc(100% - var(--diente)), 96% 100%, 92% calc(100% - var(--diente)), 88% 100%, 84% calc(100% - var(--diente)),
      80% 100%, 76% calc(100% - var(--diente)), 72% 100%, 68% calc(100% - var(--diente)), 64% 100%,
      60% calc(100% - var(--diente)), 56% 100%, 52% calc(100% - var(--diente)), 48% 100%,
      44% calc(100% - var(--diente)), 40% 100%, 36% calc(100% - var(--diente)), 32% 100%,
      28% calc(100% - var(--diente)), 24% 100%, 20% calc(100% - var(--diente)), 16% 100%,
      12% calc(100% - var(--diente)), 8% 100%, 4% calc(100% - var(--diente)), 0 100%
    );
  }
  .t-head{text-align:center;border-bottom:1.5px dashed var(--linea);padding-bottom:14px;margin-bottom:14px}
  .t-head b{font-size:15px;letter-spacing:.08em}
  .t-head span{display:block;font-size:11px;color:var(--gris);margin-top:3px}
  .t-fila{display:flex;justify-content:space-between;align-items:baseline;font-size:14px;margin:9px 0}
  .t-fila .k{color:var(--gris)}
  .tachado{text-decoration:line-through;text-decoration-color:var(--rebaja);text-decoration-thickness:2px}
  .t-desc{color:var(--rebaja);font-weight:700}
  .t-ahorro{color:var(--ok);font-weight:700}
  .t-total{border-top:1.5px dashed var(--linea);margin-top:14px;padding-top:14px;
    display:flex;justify-content:space-between;align-items:baseline}
  .t-total .k{font-weight:700;font-size:14px;letter-spacing:.06em}
  .t-total .v{font-size:34px;font-weight:700;letter-spacing:-.02em;transition:.15s}
  .t-total .v.pop{transform:scale(1.06)}
  .sello{position:absolute;top:52px;right:16px;border:2.5px solid var(--rebaja);color:var(--rebaja);
    font-weight:700;font-size:13px;letter-spacing:.1em;padding:4px 10px;transform:rotate(8deg);
    border-radius:6px;opacity:.9;background:rgba(255,255,255,.7)}
  .t-pie{text-align:center;font-size:10.5px;color:var(--gris);margin-top:16px;letter-spacing:.06em}
  .barras{display:flex;justify-content:center;gap:2px;margin-top:8px;opacity:.85}
  .barras i{display:block;width:2px;background:var(--tinta)}

  @media (max-width:720px){
    .grid{grid-template-columns:1fr}
    .ticket{max-width:360px;margin:0 auto}
  }
  @media (prefers-reduced-motion:reduce){*{transition-duration:.01ms!important}}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <span class="eyebrow">REBAJAS</span>
    <h1>¿Cuánto me queda con el descuento?</h1>
    <p>Escribe el precio y el porcentaje: el ticket se actualiza al momento.</p>
  </header>

  <div class="grid">
    <section class="panel">
      <div class="campo">
        <label for="precio">Precio original</label>
        <input id="precio" type="number" inputmode="decimal" min="0" step="0.01" value="20" />
        <span class="sufijo">€</span>
      </div>

      <div class="campo" style="margin-bottom:10px">
        <label for="pct">Descuento</label>
        <input id="pct" type="number" inputmode="decimal" min="0" max="100" step="1" value="10" />
        <span class="sufijo">%</span>
      </div>
      <input id="slider" type="range" min="0" max="100" step="1" value="10" aria-label="Descuento en porcentaje" />

      <div class="presets" id="presets">
        <button class="preset on" data-p="10">−10%</button>
        <button class="preset" data-p="20">−20%</button>
        <button class="preset" data-p="30">−30%</button>
        <button class="preset" data-p="50">−50%</button>
        <button class="preset" data-p="70">−70%</button>
      </div>

      <p class="aviso" id="regla"></p>
    </section>

    <aside class="ticket" aria-live="polite">
      <div class="sello" id="sello">−10%</div>
      <div class="t-head">
        <b>* TU COMPRA *</b>
        <span id="fecha"></span>
      </div>
      <div class="t-fila"><span class="k">Precio original</span><span class="tachado" id="t-orig">20,00 €</span></div>
      <div class="t-fila"><span class="k">Descuento</span><span class="t-desc" id="t-desc">−10%</span></div>
      <div class="t-fila"><span class="k">Te ahorras</span><span class="t-ahorro" id="t-ahorro">−2,00 €</span></div>
      <div class="t-total"><span class="k">A PAGAR</span><span class="v" id="t-final">18,00 €</span></div>
      <div class="t-pie">GRACIAS POR SU VISITA</div>
      <div class="barras" id="barras"></div>
    </aside>
  </div>
</div>

<script>
  const $ = (id) => document.getElementById(id);
  const eur = (n) => n.toLocaleString("es-ES", { style:"currency", currency:"EUR" });

  // código de barras decorativo
  (() => {
    const b = $("barras");
    for (let i = 0; i < 44; i++) {
      const s = document.createElement("i");
      s.style.height = (8 + Math.random() * 14) + "px";
      if (Math.random() < .3) s.style.width = "3px";
      b.appendChild(s);
    }
    $("fecha").textContent = new Date().toLocaleDateString("es-ES", { day:"2-digit", month:"2-digit", year:"numeric" });
  })();

  function leer() {
    let precio = parseFloat(String($("precio").value).replace(",", "."));
    let pct = parseFloat(String($("pct").value).replace(",", "."));
    if (!isFinite(precio) || precio < 0) precio = 0;
    if (!isFinite(pct)) pct = 0;
    pct = Math.min(100, Math.max(0, pct));
    return { precio, pct };
  }

  function pintar() {
    const { precio, pct } = leer();
    const ahorro = precio * pct / 100;
    const final = precio - ahorro;

    $("t-orig").textContent = eur(precio);
    $("t-desc").textContent = "−" + pct.toLocaleString("es-ES") + "%";
    $("t-ahorro").textContent = "−" + eur(ahorro);
    $("sello").textContent = "−" + pct.toLocaleString("es-ES") + "%";

    const v = $("t-final");
    v.textContent = eur(final);
    v.classList.add("pop");
    setTimeout(() => v.classList.remove("pop"), 140);

    $("regla").textContent =
      "Cómo se calcula: " + eur(precio) + " × " + pct.toLocaleString("es-ES") + "% = " +
      eur(ahorro) + " de descuento → " + eur(precio) + " − " + eur(ahorro) + " = " + eur(final) + ".";

    // sincroniza slider y chips
    $("slider").value = pct;
    document.querySelectorAll(".preset").forEach((c) =>
      c.classList.toggle("on", parseFloat(c.dataset.p) === pct));
  }

  $("precio").addEventListener("input", pintar);
  $("pct").addEventListener("input", pintar);
  $("slider").addEventListener("input", () => { $("pct").value = $("slider").value; pintar(); });
  $("presets").addEventListener("click", (e) => {
    const b = e.target.closest(".preset");
    if (!b) return;
    $("pct").value = b.dataset.p;
    pintar();
  });

  pintar();
</script>
</body>
</html>
