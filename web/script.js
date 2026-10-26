const $ = (id) => document.getElementById(id);
const inr = (n) => "\u20B9" + Math.round(n).toLocaleString("en-IN");

// Same maths as the Python model: scale numbers, add coefficients, add the intercept.
function predict(x) {
  let p = MODEL.intercept;
  for (const key in MODEL.num) {
    const f = MODEL.num[key];
    p += ((x[key] - f.mean) / f.scale) * f.coef;
  }
  p += MODEL.brand[x.brand];
  p += MODEL.platform[x.platform];
  return Math.min(Math.max(p, MODEL.lower), MODEL.upper); // keep inside the capped range
}

function fillSelect(id, values) {
  $(id).innerHTML = values.map((v) => `<option value="${v}">${v}</option>`).join("");
}

function readForm() {
  return {
    brand: $("brand").value,
    platform: $("platform").value,
    ram_gb: Number($("ram_gb").value),
    storage_gb: Number($("storage_gb").value),
    battery_mah: Number($("battery_mah").value),
    rating: Number($("rating").value),
  };
}

function onPredict() {
  const x = readForm();
  const o = MODEL.options;
  const bad =
    isNaN(x.battery_mah) || x.battery_mah < o.battery_mah.min || x.battery_mah > o.battery_mah.max ||
    isNaN(x.rating) || x.rating < o.rating.min || x.rating > o.rating.max;
  if (bad) {
    $("error").textContent =
      `Battery must be ${o.battery_mah.min}-${o.battery_mah.max} mAh and rating ${o.rating.min}-${o.rating.max}.`;
    return;
  }
  $("error").textContent = "";
  $("price").textContent = inr(predict(x));
}

function showSensitivity() {
  const n = MODEL.num;
  const per = (k) => n[k].coef / n[k].scale; // rupees per 1 unit
  const rows = [
    ["+1 GB RAM", per("ram_gb")],
    ["+1 GB storage", per("storage_gb")],
    ["+100 mAh battery", per("battery_mah") * 100],
    ["+0.1 rating", per("rating") * 0.1],
  ];
  $("sens").innerHTML = rows
    .map(([label, v]) => `<li><span>${label}</span><strong>${v < 0 ? "-" : "+"}${inr(Math.abs(v))}</strong></li>`)
    .join("");
}

function showBrandChart() {
  const entries = Object.entries(MODEL.brand_premium).sort((a, b) => b[1] - a[1]);
  const max = entries[0][1];
  $("chart").innerHTML = entries
    .map(([name, v]) => `
      <div class="bar-row">
        <span class="bar-name">${name}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(v / max) * 100}%"></div></div>
        <span class="bar-val">${inr(v)}</span>
      </div>`)
    .join("");
}

function init() {
  if (typeof MODEL === "undefined") {
    $("error").textContent = "model.js not found. Run next_steps.py first to create it.";
    return;
  }
  const o = MODEL.options;
  fillSelect("brand", Object.keys(MODEL.brand));
  fillSelect("platform", Object.keys(MODEL.platform));
  fillSelect("ram_gb", o.ram_gb);
  fillSelect("storage_gb", o.storage_gb);
  $("battery_mah").value = o.battery_mah.default;
  $("rating").value = ((o.rating.min + o.rating.max) / 2).toFixed(1);

  $("metrics").textContent =
    `Test R\u00B2 ${MODEL.metrics.r2.toFixed(3)} | RMSE ${inr(MODEL.metrics.rmse)} | MAE ${inr(MODEL.metrics.mae)}`;
  showSensitivity();
  showBrandChart();
  $("predictBtn").addEventListener("click", onPredict);
  onPredict();
}

init();
